package service

import (
	"fmt"
	"math"
	"math/big"
	"net/http"

	"github.com/inventedsarawak/ledgera/internal/middleware"
	"github.com/inventedsarawak/ledgera/internal/model"
	"github.com/inventedsarawak/ledgera/internal/repository"
	"github.com/inventedsarawak/ledgera/internal/server"
	"github.com/labstack/echo/v4"
)

type MarketplaceService struct {
	server            *server.Server
	marketplaceRepo   *repository.MarketplaceRepository
	projectRepo       *repository.ProjectRepository
	userRepo          *repository.UserRepository
	blockchainService *BlockchainService
}

func NewMarketplaceService(s *server.Server, marketplaceRepo *repository.MarketplaceRepository, projectRepo *repository.ProjectRepository, userRepo *repository.UserRepository, blockchainService *BlockchainService) *MarketplaceService {
	return &MarketplaceService{
		server:            s,
		marketplaceRepo:   marketplaceRepo,
		projectRepo:       projectRepo,
		userRepo:          userRepo,
		blockchainService: blockchainService,
	}
}

// CreateListing creates a new marketplace listing
func (s *MarketplaceService) CreateListing(ctx echo.Context, projectID, sellerID string, amount, priceETH float64) (*model.Listing, error) {
	logger := middleware.GetLogger(ctx)
	logger.Info().
		Str("project_id", projectID).
		Str("seller_id", sellerID).
		Float64("amount", amount).
		Float64("price_eth", priceETH).
		Msg("creating marketplace listing")

	// 1. Verify project exists and is deployed
	project, err := s.projectRepo.FindByID(ctx.Request().Context(), projectID)
	if err != nil {
		return nil, fmt.Errorf("project not found: %w", err)
	}

	if project.ContractAddress == nil || *project.ContractAddress == "" {
		return nil, echo.NewHTTPError(http.StatusBadRequest, "project not deployed yet")
	}

	// 2. Check how much the seller already has listed for this project
	alreadyListed, err := s.marketplaceRepo.GetActiveListedAmount(ctx.Request().Context(), sellerID, projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing listings: %w", err)
	}

	// 3. Verify seller has enough tokens
	if s.blockchainService != nil && s.blockchainService.client != nil {
		// On-chain validation: check actual token balance
		seller, err := s.userRepo.FindByClerkID(ctx.Request().Context(), sellerID)
		if err != nil || seller == nil {
			return nil, echo.NewHTTPError(http.StatusBadRequest, "seller not found")
		}
		if seller.WalletAddress == nil || *seller.WalletAddress == "" {
			return nil, echo.NewHTTPError(http.StatusBadRequest, "please connect your wallet before creating a listing")
		}

		balance, err := s.blockchainService.client.GetTokenBalance(
			ctx.Request().Context(),
			*project.ContractAddress,
			*seller.WalletAddress,
		)
		if err != nil {
			logger.Warn().Err(err).Msg("failed to check on-chain balance, falling back to DB check")
		} else {
			// Convert from 18-decimal token units to human-readable float
			decimals := new(big.Int).Exp(big.NewInt(10), big.NewInt(18), nil)
			balanceFloat, _ := new(big.Float).Quo(
				new(big.Float).SetInt(balance),
				new(big.Float).SetInt(decimals),
			).Float64()

			if amount+alreadyListed > balanceFloat {
				return nil, echo.NewHTTPError(http.StatusBadRequest,
					fmt.Sprintf("insufficient balance: you have %.2f credits (%.2f already listed), but tried to list %.2f",
						balanceFloat, alreadyListed, amount))
			}
		}
	} else {
		// Fallback DB validation when blockchain client is not available
		if project.SupplierID == sellerID {
			// Supplier: check against project's total carbon amount
			if amount+alreadyListed > project.CarbonAmount {
				return nil, echo.NewHTTPError(http.StatusBadRequest,
					fmt.Sprintf("insufficient credits: project has %.2f total credits (%.2f already listed), but tried to list %.2f",
						project.CarbonAmount, alreadyListed, amount))
			}
		} else {
			// Buyer reselling: check against total purchased amount
			totalPurchased, err := s.marketplaceRepo.GetTotalPurchasedAmount(ctx.Request().Context(), sellerID, projectID)
			if err != nil {
				return nil, fmt.Errorf("failed to check purchase history: %w", err)
			}
			if amount+alreadyListed > totalPurchased {
				return nil, echo.NewHTTPError(http.StatusBadRequest,
					fmt.Sprintf("insufficient credits: you own %.2f credits (%.2f already listed), but tried to list %.2f",
						totalPurchased, alreadyListed, amount))
			}
		}
	}

	// 4. Create listing in database
	listing, err := s.marketplaceRepo.CreateListing(ctx.Request().Context(), projectID, sellerID, amount, priceETH)
	if err != nil {
		return nil, fmt.Errorf("failed to create listing: %w", err)
	}

	logger.Info().Str("listing_id", listing.ID).Msg("marketplace listing created")
	return listing, nil
}

// ListActiveListings gets all active marketplace listings
func (s *MarketplaceService) ListActiveListings(ctx echo.Context, page, limit int, projectID *string) ([]model.ListingWithDetails, int, error) {
	return s.marketplaceRepo.ListActiveListings(ctx.Request().Context(), page, limit, projectID)
}

// GetListing gets a single listing by ID
func (s *MarketplaceService) GetListing(ctx echo.Context, listingID string) (*model.Listing, error) {
	return s.marketplaceRepo.FindListingByID(ctx.Request().Context(), listingID)
}

// BuyListing handles purchasing a listing with on-chain verification
func (s *MarketplaceService) BuyListing(ctx echo.Context, listingID, buyerID, txHash, buyerWallet string, buyAmount float64) error {
	logger := middleware.GetLogger(ctx)
	logger.Info().
		Str("listing_id", listingID).
		Str("buyer_id", buyerID).
		Str("tx_hash", txHash).
		Str("buyer_wallet", buyerWallet).
		Float64("buy_amount", buyAmount).
		Msg("processing listing purchase")

	// 1. Get listing
	listing, err := s.marketplaceRepo.FindListingByID(ctx.Request().Context(), listingID)
	if err != nil {
		return fmt.Errorf("listing not found: %w", err)
	}

	if !listing.Active {
		return echo.NewHTTPError(http.StatusBadRequest, "listing is not active")
	}

	// Validate buy amount against available
	if buyAmount > listing.Amount {
		return echo.NewHTTPError(http.StatusBadRequest, fmt.Sprintf("requested %.2f credits but only %.2f available", buyAmount, listing.Amount))
	}

	// Prevent self-purchase
	if listing.SellerID == buyerID {
		return echo.NewHTTPError(http.StatusBadRequest, "cannot buy your own listing")
	}

	// 2. Get project to fetch contract address
	project, err := s.projectRepo.FindByID(ctx.Request().Context(), listing.ProjectID)
	if err != nil {
		return fmt.Errorf("project not found: %w", err)
	}

	if project.ContractAddress == nil {
		return fmt.Errorf("project not deployed")
	}

	// 3. Get seller info to verify payment recipient
	seller, err := s.userRepo.FindByClerkID(ctx.Request().Context(), listing.SellerID)
	if err != nil || seller == nil {
		return fmt.Errorf("seller not found")
	}
	if seller.WalletAddress == nil || *seller.WalletAddress == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "seller has no wallet address")
	}

	// 4. Buyer wallet is provided directly from MetaMask via the request
	if buyerWallet == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "please connect your wallet before purchasing")
	}

	// 5. Verify ETH payment on-chain (based on requested amount, not full listing)
	totalPriceETH := buyAmount * listing.PriceETH
	expectedWei := ethToWei(totalPriceETH)

	logger.Info().
		Str("tx_hash", txHash).
		Str("seller_wallet", *seller.WalletAddress).
		Float64("buy_amount", buyAmount).
		Float64("total_price_eth", totalPriceETH).
		Str("expected_wei", expectedWei.String()).
		Msg("verifying ETH payment on-chain")

	if s.blockchainService.client != nil {
		err = s.blockchainService.client.VerifyETHPayment(
			ctx.Request().Context(),
			txHash,
			*seller.WalletAddress,
			expectedWei,
		)
		if err != nil {
			logger.Error().Err(err).Msg("ETH payment verification failed")
			return echo.NewHTTPError(http.StatusBadRequest, fmt.Sprintf("payment verification failed: %v", err))
		}

		logger.Info().Msg("ETH payment verified successfully")

		// 6. Transfer tokens to buyer (mint via admin key)
		tokenAmount := new(big.Int)
		tokenAmount.SetInt64(int64(buyAmount))
		// Convert to token decimals (18 decimals for ERC20)
		decimals := new(big.Int).Exp(big.NewInt(10), big.NewInt(18), nil)
		tokenAmount.Mul(tokenAmount, decimals)

		err = s.blockchainService.client.TransferTokensToBuyer(
			ctx.Request().Context(),
			*project.ContractAddress,
			buyerWallet,
			tokenAmount,
		)
		if err != nil {
			logger.Error().Err(err).Msg("failed to transfer tokens to buyer")
			return fmt.Errorf("failed to transfer tokens: %w", err)
		}

		logger.Info().
			Str("buyer_wallet", buyerWallet).
			Str("token_amount", tokenAmount.String()).
			Msg("tokens transferred to buyer")
	} else {
		logger.Warn().Msg("blockchain client not initialized, skipping on-chain verification")
	}

	// 7. Update listing: complete if fully bought, reduce amount if partial
	if buyAmount >= listing.Amount {
		err = s.marketplaceRepo.CompleteListing(ctx.Request().Context(), listingID)
		if err != nil {
			return fmt.Errorf("failed to complete listing: %w", err)
		}
	} else {
		err = s.marketplaceRepo.ReduceListingAmount(ctx.Request().Context(), listingID, buyAmount)
		if err != nil {
			return fmt.Errorf("failed to reduce listing amount: %w", err)
		}
	}

	// 8. Record purchase in database
	purchaseRecord := model.Purchase{
		BuyerID:   buyerID,
		ListingID: listingID,
		ProjectID: listing.ProjectID,
		SellerID:  listing.SellerID,
		Amount:    buyAmount,
		PriceETH:  listing.PriceETH,
		TotalETH:  totalPriceETH,
		TxHash:    txHash,
	}
	_, err = s.marketplaceRepo.RecordPurchase(ctx.Request().Context(), purchaseRecord)
	if err != nil {
		logger.Error().Err(err).Msg("failed to record purchase (listing already updated)")
	}

	logger.Info().Str("listing_id", listingID).Float64("amount_bought", buyAmount).Msg("listing purchase completed successfully")
	return nil
}

// CancelListing cancels a listing
func (s *MarketplaceService) CancelListing(ctx echo.Context, listingID, userID string) error {
	logger := middleware.GetLogger(ctx)

	// 1. Get listing
	listing, err := s.marketplaceRepo.FindListingByID(ctx.Request().Context(), listingID)
	if err != nil {
		return fmt.Errorf("listing not found: %w", err)
	}

	// 2. Verify ownership
	if listing.SellerID != userID {
		return fmt.Errorf("unauthorized: only the seller can cancel this listing")
	}

	// 3. Cancel listing
	err = s.marketplaceRepo.CancelListing(ctx.Request().Context(), listingID)
	if err != nil {
		return fmt.Errorf("failed to cancel listing: %w", err)
	}

	logger.Info().Str("listing_id", listingID).Msg("listing cancelled")
	return nil
}

// ethToWei converts ETH (float64) to Wei (big.Int)
func ethToWei(ethAmount float64) *big.Int {
	// Multiply by 10^18 to convert ETH to Wei
	weiFloat := ethAmount * math.Pow(10, 18)
	wei := new(big.Int)
	wei.SetString(fmt.Sprintf("%.0f", weiFloat), 10)
	return wei
}

// ListBuyerPurchases gets all purchases for a buyer
func (s *MarketplaceService) ListBuyerPurchases(ctx echo.Context, buyerID string, page, limit int) ([]model.PurchaseWithDetails, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	return s.marketplaceRepo.ListPurchasesByBuyer(ctx.Request().Context(), buyerID, page, limit)
}
