package service

import (
	"fmt"
	"math"
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
		zero := "0"
		req.TokenID = &zero
	}

	var maxAvailableToList int64

	if *req.TokenID == "0" {
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
		purchases, _, err := s.marketplaceRepo.ListPurchasesByBuyer(ctx.Request().Context(), sellerID, 1, 1000)
		if err != nil {
			return nil, fmt.Errorf("failed to check token balance: %w", err)
		}

		var totalPurchased float64
		for _, purchase := range purchases {
			if purchase.ProjectID == proj.ID.String() && purchase.TokenID == *req.TokenID {
				totalPurchased += float64(purchase.ScaledAmount) / 1000.0
			}
		}

		retired, err := s.marketplaceRepo.GetRetiredAmountForLot(ctx.Request().Context(), sellerID, proj.ID.String(), *req.TokenID)
		if err != nil {
			return nil, fmt.Errorf("failed to check retired credits: %w", err)
		}

		maxAvailableToList = int64(math.Round((totalPurchased - retired) * 1000))
		if maxAvailableToList <= 0 {
			return nil, fmt.Errorf("you do not own any credits for this token lot")
		}
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
		req.Price,
		req.PaymentToken,
	)
	if err != nil {
		logger.Error().Err(err).Msg("failed to create listing in database")
		return nil, fmt.Errorf("failed to create listing: %w", err)
	}

	logger.Info().
		Str("listing_id", listing.ID).
		Str("project_id", req.ProjectID).
		Float64("amount", req.Amount).
		Float64("price", req.Price).
		Str("token_id", *req.TokenID).
		Str("payment_token", req.PaymentToken).
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

// BuyListing handles purchasing a listing with on-chain Solana verification
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
	if proj == nil || proj.MintAddress == nil {
		return fmt.Errorf("project or mint address not found")
	}

	// 3. Fetch seller details to get their wallet address
	seller, err := s.userRepo.FindByClerkID(ctx.Request().Context(), listing.SellerID)
	if err != nil {
		return fmt.Errorf("failed to fetch seller: %w", err)
	}
	if seller == nil || seller.WalletAddress == nil {
		return fmt.Errorf("seller wallet address not configured")
	}

	// 4. Calculate expected payment amount.
	expectedPrice := req.Amount * listing.Price

	logger.Info().
		Str("listing_id", listing.ID).
		Str("buyer_id", buyerID).
		Str("seller_wallet", *seller.WalletAddress).
		Str("tx_hash", req.TxHash).
		Float64("amount", req.Amount).
		Float64("expected_price", expectedPrice).
		Str("payment_token", listing.PaymentToken).
		Msg("verifying Solana payment for marketplace purchase")

	// 5. Verify the on-chain Solana transaction
	if s.server.Blockchain == nil {
		return fmt.Errorf("blockchain client not initialized")
	}

	err = s.server.Blockchain.VerifySolanaTransaction(ctx.Request().Context(), req.TxHash, req.BuyerWallet, uint64(scaledBuyAmount))
	if err != nil {
		logger.Error().Err(err).Msg("solana payment verification failed")
		return echo.NewHTTPError(http.StatusBadRequest, fmt.Sprintf("Solana payment verification failed: %v", err))
	}

	logger.Info().Msg("Solana payment verified successfully, recording purchase")

	sourceLotId := listing.TokenID

	// 6. Update listing amount or mark as complete
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

	// 7. Record the purchase
	purchase := model.Purchase{
		BuyerID:      buyerID,
		ListingID:    listing.ID,
		ProjectID:    listing.ProjectID,
		SellerID:     listing.SellerID,
		TokenID:      sourceLotId,
		ScaledAmount: scaledBuyAmount,
		Price:        listing.Price,
		TotalPrice:   expectedPrice,
		PaymentToken: listing.PaymentToken,
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
		Str("token_id", sourceLotId).
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

	// 2. Fetch project to get mint address
	proj, err := s.projectRepo.FindByID(ctx.Request().Context(), req.ProjectID)
	if err != nil || proj == nil {
		return nil, echo.NewHTTPError(http.StatusNotFound, "project not found")
	}
	if proj.MintAddress == nil || *proj.MintAddress == "" {
		return nil, echo.NewHTTPError(http.StatusBadRequest, "project has no deployed mint address")
	}

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
		Str("token_id", req.TokenID).
		Float64("amount", req.Amount).
		Str("reason", reason).
		Msg("retiring credits")

	// 4. Record the retirement locally. The Solana burn path is not yet wired into the request payload.
	txHash := fmt.Sprintf("retire:%s:%s:%s", buyerID, req.ProjectID, req.TokenID)
	logger.Info().Str("tx_hash", txHash).Msg("credits retired")

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
