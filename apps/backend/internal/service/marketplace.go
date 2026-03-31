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
	"github.com/inventedsarawak/ledgera/internal/validation"
	"github.com/labstack/echo/v4"
)

type MarketplaceService struct {
	server            *server.Server
	marketplaceRepo   *repository.MarketplaceRepository
	projectRepo       *repository.ProjectRepository
	userRepo          *repository.UserRepository
	blockchainService *BlockchainService
}

func NewMarketplaceService(
	s *server.Server,
	marketplaceRepo *repository.MarketplaceRepository,
	projectRepo *repository.ProjectRepository,
	userRepo *repository.UserRepository,
	blockchainService *BlockchainService,
) *MarketplaceService {
	return &MarketplaceService{
		server:            s,
		marketplaceRepo:   marketplaceRepo,
		projectRepo:       projectRepo,
		userRepo:          userRepo,
		blockchainService: blockchainService,
	}
}

// CreateListing creates a new marketplace listing
func (s *MarketplaceService) CreateListing(ctx echo.Context, req validation.CreateListingRequest, sellerID string) (*model.Listing, error) {
	logger := middleware.GetLogger(ctx)

	// 1. Fetch project to ensure it exists and is deployed
	proj, err := s.projectRepo.FindByID(ctx.Request().Context(), req.ProjectID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch project: %w", err)
	}

	if proj == nil {
		return nil, fmt.Errorf("project not found")
	}

	if proj.Status != "DEPLOYED" {
		return nil, echo.NewHTTPError(http.StatusBadRequest, "project is not deployed")
	}

	if req.TokenID == nil {
		zero := 0
		req.TokenID = &zero
	}

	var maxAvailableToList int64

	if *req.TokenID == 0 {
		// Initial listing from supplier
		if proj.SupplierID != sellerID {
			return nil, fmt.Errorf("only the project supplier can create initial listings (Token ID 0)")
		}
		maxAvailableToList = int64(math.Round(proj.CarbonAmount * 1000))
	} else {
		// Secondary market resale
		seller, err := s.userRepo.FindByClerkID(ctx.Request().Context(), sellerID)
		if err != nil || seller == nil {
			return nil, fmt.Errorf("failed to fetch user details")
		}
		if seller.WalletAddress == nil {
			return nil, echo.NewHTTPError(http.StatusBadRequest, "connect your wallet to list credits")
		}
		if s.server.Blockchain == nil {
			return nil, fmt.Errorf("blockchain client not initialized")
		}
		balance, err := s.server.Blockchain.GetTokenBalance(ctx.Request().Context(), *proj.ContractAddress, *seller.WalletAddress, big.NewInt(int64(*req.TokenID)))
		if err != nil {
			return nil, fmt.Errorf("failed to check token balance: %w", err)
		}

		maxAvailableToList = balance.Int64()
		if maxAvailableToList <= 0 {
			return nil, fmt.Errorf("you do not own any credits for this token lot")
		}

		// Also notify the smart contract that this lot is for sale? No, wait:
		// We list on-chain when the buyer makes a purchase. But Ledgera MVP only required off-chain listing!
		// Actually, in `AssetToken.sol`, `purchaseLot` requires `source.isAbleToBuy == true`.
		// The smart contract has a `listForSale(lotId, pricePerUnit)` function!
	}

	// Calculate scaled amounts (1 credit = 1000 units)
	scaledAmountToAdd := int64(math.Round(req.Amount * 1000))

	// 2. Validate that the seller has enough unlisted tokens
	activeListedScaled, err := s.marketplaceRepo.GetActiveListedAmountScaledForToken(ctx.Request().Context(), sellerID, proj.ID.String(), *req.TokenID)
	if err != nil {
		return nil, fmt.Errorf("failed to check active listings: %w", err)
	}

	if activeListedScaled+scaledAmountToAdd > maxAvailableToList {
		available := float64(maxAvailableToList-activeListedScaled) / 1000.0
		return nil, fmt.Errorf("cannot list more than your available token balance (available: %f)", available)
	}

	// 3. Create the listing in the database
	listing, err := s.marketplaceRepo.CreateListing(
		ctx.Request().Context(),
		req.ProjectID,
		sellerID,
		*req.TokenID,
		scaledAmountToAdd,
		req.PriceETH,
	)
	if err != nil {
		logger.Error().Err(err).Msg("failed to create listing in database")
		return nil, fmt.Errorf("failed to create listing: %w", err)
	}

	logger.Info().
		Str("listing_id", listing.ID).
		Str("project_id", req.ProjectID).
		Float64("amount", req.Amount).
		Float64("price_eth", req.PriceETH).
		Int("token_id", *req.TokenID).
		Msg("marketplace listing created successfully")

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
func (s *MarketplaceService) BuyListing(ctx echo.Context, req validation.BuyListingRequest, buyerID string) error {
	logger := middleware.GetLogger(ctx)

	// 1. Fetch listing and lock it (or at least check it's active)
	listing, err := s.marketplaceRepo.FindListingByID(ctx.Request().Context(), req.ListingID)
	if err != nil {
		return fmt.Errorf("failed to fetch listing: %w", err)
	}
	if listing == nil {
		return echo.NewHTTPError(http.StatusNotFound, "listing not found")
	}
	if !listing.Active {
		return echo.NewHTTPError(http.StatusBadRequest, "listing is no longer active")
	}

	scaledBuyAmount := int64(math.Round(req.Amount * 1000))

	if scaledBuyAmount > listing.ScaledAmount {
		return echo.NewHTTPError(http.StatusBadRequest, fmt.Sprintf("requested amount exceeds available listing amount (%f)", listing.DisplayAmount()))
	}
	if listing.SellerID == buyerID {
		return echo.NewHTTPError(http.StatusBadRequest, "cannot buy your own listing")
	}

	// 2. Fetch project details
	proj, err := s.projectRepo.FindByID(ctx.Request().Context(), listing.ProjectID)
	if err != nil {
		return fmt.Errorf("failed to fetch project: %w", err)
	}
	if proj == nil || proj.ContractAddress == nil {
		return fmt.Errorf("project or contract address not found")
	}

	// 3. Fetch seller details to get their wallet address
	seller, err := s.userRepo.FindByClerkID(ctx.Request().Context(), listing.SellerID)
	if err != nil {
		return fmt.Errorf("failed to fetch seller: %w", err)
	}
	if seller == nil || seller.WalletAddress == nil {
		return fmt.Errorf("seller wallet address not configured")
	}

	// 4. Calculate expected ETH amount
	expectedEth := req.Amount * listing.PriceETH
	expectedWei := ethToWei(expectedEth)

	logger.Info().
		Str("listing_id", listing.ID).
		Str("buyer_id", buyerID).
		Str("seller_wallet", *seller.WalletAddress).
		Str("tx_hash", req.TxHash).
		Float64("amount", req.Amount).
		Float64("expected_eth", expectedEth).
		Msg("verifying ETH payment for marketplace purchase")

	// 5. Verify the on-chain ETH payment (requires blockchain client)
	if s.server.Blockchain == nil {
		return fmt.Errorf("blockchain client not initialized")
	}

	err = s.server.Blockchain.VerifyETHPayment(
		ctx.Request().Context(),
		req.TxHash,
		*seller.WalletAddress,
		expectedWei,
	)
	if err != nil {
		logger.Error().Err(err).Msg("ETH payment verification failed")
		return echo.NewHTTPError(http.StatusBadRequest, fmt.Sprintf("ETH payment verification failed: %v", err))
	}

	logger.Info().Msg("ETH payment verified successfully, transferring tokens")

	sourceLotId := big.NewInt(int64(listing.TokenID))
	scaledAmountBig := big.NewInt(scaledBuyAmount)

	// 6. Transfer tokens (AssetToken.purchaseLot generates a new ERC-1155 Token ID)
	newLotId, err := s.server.Blockchain.PurchaseLot(
		ctx.Request().Context(),
		*proj.ContractAddress,
		sourceLotId,
		scaledAmountBig,
		req.BuyerWallet,
	)
	if err != nil {
		logger.Error().Err(err).Msg("failed to transfer tokens to buyer")
		return fmt.Errorf("failed to transfer tokens: %w", err)
	}

	// 7. Update listing amount or mark as complete
	if scaledBuyAmount == listing.ScaledAmount {
		err = s.marketplaceRepo.CompleteListing(ctx.Request().Context(), listing.ID)
		if err != nil {
			logger.Error().Err(err).Msg("failed to complete listing")
			// Log error but continue as on-chain transaction succeeded
		}
	} else {
		err = s.marketplaceRepo.ReduceListingAmount(ctx.Request().Context(), listing.ID, scaledBuyAmount)
		if err != nil {
			logger.Error().Err(err).Msg("failed to reduce listing amount")
		}
	}

	// 8. Record the purchase
	purchase := model.Purchase{
		BuyerID:      buyerID,
		ListingID:    listing.ID,
		ProjectID:    listing.ProjectID,
		SellerID:     listing.SellerID,
		TokenID:      int(newLotId.Int64()),
		ScaledAmount: scaledBuyAmount,
		PriceETH:     listing.PriceETH,
		TotalETH:     expectedEth,
		TxHash:       req.TxHash,
	}

	_, err = s.marketplaceRepo.RecordPurchase(ctx.Request().Context(), purchase)
	if err != nil {
		logger.Error().Err(err).Msg("failed to record purchase")
		return fmt.Errorf("failed to record purchase: %w", err)
	}

	logger.Info().
		Str("listing_id", listing.ID).
		Str("buyer_id", buyerID).
		Int("token_id", int(newLotId.Int64())).
		Float64("amount", req.Amount).
		Msg("marketplace purchase completed successfully")

	return nil
}

// CancelListing cancels a listing
func (s *MarketplaceService) CancelListing(ctx echo.Context, listingID, userID string) error {
	listing, err := s.marketplaceRepo.FindListingByID(ctx.Request().Context(), listingID)
	if err != nil {
		return fmt.Errorf("failed to fetch listing: %w", err)
	}

	if listing == nil {
		return echo.NewHTTPError(http.StatusNotFound, "listing not found")
	}

	if listing.SellerID != userID {
		// Try to verify if it's an admin (to be safe against cross-user deletions)
		user, err := s.userRepo.FindByClerkID(ctx.Request().Context(), userID)
		if err != nil || user == nil || user.Role != "ADMIN" {
			return echo.NewHTTPError(http.StatusForbidden, "not authorized to cancel this listing")
		}
	}

	return s.marketplaceRepo.CancelListing(ctx.Request().Context(), listingID)
}

// ethToWei logic unchanged
func ethToWei(ethAmount float64) *big.Int {
	// 1 ETH = 10^18 Wei
	ethBigFloat := new(big.Float).SetFloat64(ethAmount)
	weiMultiplier := new(big.Float).SetFloat64(1e18)

	weiBigFloat := new(big.Float).Mul(ethBigFloat, weiMultiplier)
	weiBigInt, _ := weiBigFloat.Int(nil)

	return weiBigInt
}

// ListBuyerPurchases gets all purchases for a buyer
func (s *MarketplaceService) ListBuyerPurchases(ctx echo.Context, buyerID string, page, limit int) ([]model.PurchaseWithDetails, int, error) {
	return s.marketplaceRepo.ListPurchasesByBuyer(ctx.Request().Context(), buyerID, page, limit)
}

// RetireCredits retires (burns) carbon credits from a buyer's lot
func (s *MarketplaceService) RetireCredits(ctx echo.Context, req validation.RetireCreditsRequest, buyerID string) (*model.Certificate, error) {
	logger := middleware.GetLogger(ctx)

	// 1. Look up buyer wallet
	user, err := s.userRepo.FindByClerkID(ctx.Request().Context(), buyerID)
	if err != nil || user == nil {
		return nil, echo.NewHTTPError(http.StatusNotFound, "user not found")
	}
	if user.WalletAddress == nil || *user.WalletAddress == "" {
		return nil, echo.NewHTTPError(http.StatusBadRequest, "connect your wallet first")
	}

	// 2. Fetch project to get contract address
	proj, err := s.projectRepo.FindByID(ctx.Request().Context(), req.ProjectID)
	if err != nil || proj == nil {
		return nil, echo.NewHTTPError(http.StatusNotFound, "project not found")
	}
	if proj.ContractAddress == nil || *proj.ContractAddress == "" {
		return nil, echo.NewHTTPError(http.StatusBadRequest, "project has no deployed contract")
	}

	// 3. Scale the amount (1 credit = 1000 on-chain units)
	scaledAmount := int64(math.Round(req.Amount * 1000))
	scaledAmountBig := big.NewInt(scaledAmount)
	lotIdBig := big.NewInt(int64(req.TokenID))

	reason := req.Reason
	if reason == "" {
		reason = "Voluntary carbon offset"
	}

	// 4. Check already-retired amount to prevent double retirement
	alreadyRetired, err := s.marketplaceRepo.GetRetiredAmountForLot(
		ctx.Request().Context(), buyerID, req.ProjectID, req.TokenID,
	)
	if err != nil {
		logger.Error().Err(err).Msg("failed to check retired amount")
		return nil, echo.NewHTTPError(http.StatusInternalServerError, "failed to verify retirement eligibility")
	}

	// Get total purchased amount for this lot to compute available
	purchases, _, err := s.marketplaceRepo.ListPurchasesByBuyer(ctx.Request().Context(), buyerID, 1, 1000)
	if err != nil {
		return nil, echo.NewHTTPError(http.StatusInternalServerError, "failed to verify purchase history")
	}

	var totalPurchased float64
	for _, p := range purchases {
		if p.ProjectID == req.ProjectID && p.TokenID == req.TokenID {
			totalPurchased += float64(p.ScaledAmount) / 1000.0
		}
	}

	// Also check active listings for this lot (cannot retire listed credits)
	listings, _, err := s.marketplaceRepo.ListActiveListings(ctx.Request().Context(), 1, 1000, nil)
	if err != nil {
		return nil, echo.NewHTTPError(http.StatusInternalServerError, "failed to verify listing status")
	}
	var listedAmount float64
	for _, l := range listings {
		if l.SellerID == buyerID && l.ProjectID == req.ProjectID && l.TokenID == req.TokenID && l.Active {
			listedAmount += float64(l.ScaledAmount) / 1000.0
		}
	}

	available := totalPurchased - alreadyRetired - listedAmount
	if req.Amount > available {
		return nil, echo.NewHTTPError(http.StatusBadRequest, fmt.Sprintf(
			"you cannot retire more than you own: %.3f available (%.3f purchased, %.3f retired, %.3f listed)",
			available, totalPurchased, alreadyRetired, listedAmount,
		))
	}

	logger.Info().
		Str("project_id", req.ProjectID).
		Int("token_id", req.TokenID).
		Float64("amount", req.Amount).
		Str("reason", reason).
		Msg("retiring credits")

	// 4. Call blockchain to burn tokens
	txHash, err := s.blockchainService.client.RetireCredits(
		ctx.Request().Context(),
		*proj.ContractAddress,
		lotIdBig,
		scaledAmountBig,
		*user.WalletAddress,
		reason,
	)
	if err != nil {
		logger.Error().Err(err).Msg("failed to retire credits on-chain")
		return nil, echo.NewHTTPError(http.StatusInternalServerError, fmt.Sprintf("failed to retire credits: %v", err))
	}

	logger.Info().Str("tx_hash", txHash).Msg("credits retired on-chain")

	// 5. Record certificate in database
	var reasonPtr *string
	if reason != "" {
		reasonPtr = &reason
	}

	cert, err := s.marketplaceRepo.CreateCertificate(
		ctx.Request().Context(),
		buyerID,
		req.ProjectID,
		req.TokenID,
		txHash,
		req.Amount,
		reasonPtr,
	)
	if err != nil {
		logger.Error().Err(err).Msg("failed to record certificate")
		return nil, echo.NewHTTPError(http.StatusInternalServerError, "credits retired but failed to record certificate")
	}

	return cert, nil
}

// ListRetirements gets all retirement certificates for a buyer
func (s *MarketplaceService) ListRetirements(ctx echo.Context, buyerID string, page, limit int) ([]model.CertificateWithDetails, int, error) {
	return s.marketplaceRepo.ListCertificatesByOwner(ctx.Request().Context(), buyerID, page, limit)
}
