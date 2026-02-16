package service

import (
	"fmt"
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
	blockchainService *BlockchainService
}

func NewMarketplaceService(s *server.Server, marketplaceRepo *repository.MarketplaceRepository, projectRepo *repository.ProjectRepository, blockchainService *BlockchainService) *MarketplaceService {
	return &MarketplaceService{
		server:            s,
		marketplaceRepo:   marketplaceRepo,
		projectRepo:       projectRepo,
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

	// TODO: Verify seller owns the tokens (check balance on-chain)
	// For MVP, we'll trust the seller

	// 2. Create listing in database
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

// BuyListing handles purchasing a listing
func (s *MarketplaceService) BuyListing(ctx echo.Context, listingID, buyerID string) error {
	logger := middleware.GetLogger(ctx)
	logger.Info().
		Str("listing_id", listingID).
		Str("buyer_id", buyerID).
		Msg("processing listing purchase")

	// 1. Get listing
	listing, err := s.marketplaceRepo.FindListingByID(ctx.Request().Context(), listingID)
	if err != nil {
		return fmt.Errorf("listing not found: %w", err)
	}

	if !listing.Active {
		return fmt.Errorf("listing is not active")
	}

	// 2. Get project to fetch contract address
	project, err := s.projectRepo.FindByID(ctx.Request().Context(), listing.ProjectID)
	if err != nil {
		return fmt.Errorf("project not found: %w", err)
	}

	if project.ContractAddress == nil {
		return fmt.Errorf("project not deployed")
	}

	// 3. TODO: Process payment (ETH transfer on-chain)
	// This would involve:
	// - Verifying buyer has sent correct amount of ETH
	// - Transferring tokens from marketplace contract to buyer
	// - Paying seller (minus platform fee)
	// For now, we'll just mark the listing as sold

	logger.Info().Msg("TODO: Implement on-chain token transfer and payment")

	// 4. Mark listing as complete
	err = s.marketplaceRepo.CompleteListing(ctx.Request().Context(), listingID)
	if err != nil {
		return fmt.Errorf("failed to complete listing: %w", err)
	}

	logger.Info().Str("listing_id", listingID).Msg("listing purchase completed")
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
