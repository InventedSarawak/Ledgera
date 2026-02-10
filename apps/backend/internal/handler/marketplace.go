package handler

import (
	"fmt"
	"net/http"

	"github.com/inventedsarawak/ledgera/internal/middleware"
	"github.com/inventedsarawak/ledgera/internal/model"
	"github.com/inventedsarawak/ledgera/internal/server"
	"github.com/inventedsarawak/ledgera/internal/service"
	"github.com/inventedsarawak/ledgera/internal/validation"
	"github.com/labstack/echo/v4"
)

type MarketplaceHandler struct {
	Handler
	marketplaceService *service.MarketplaceService
}

func NewMarketplaceHandler(s *server.Server, marketplaceService *service.MarketplaceService) *MarketplaceHandler {
	return &MarketplaceHandler{
		Handler:            NewHandler(s),
		marketplaceService: marketplaceService,
	}
}

// CreateListing creates a new marketplace listing
func (h *MarketplaceHandler) CreateListing(c echo.Context) error {
	return Handle(
		h.Handler,
		func(c echo.Context, req *validation.CreateListingRequest) (*model.Listing, error) {
			userID := middleware.GetUserID(c)
			return h.marketplaceService.CreateListing(c, req.ProjectID, userID, req.Amount, req.PriceETH)
		},
		http.StatusCreated,
		&validation.CreateListingRequest{},
	)(c)
}

// ListActiveListings gets all active marketplace listings
func (h *MarketplaceHandler) ListActiveListings(c echo.Context) error {
	return Handle(
		h.Handler,
		func(c echo.Context, req *validation.ListMarketplaceRequest) ([]model.ListingWithDetails, error) {
			listings, total, err := h.marketplaceService.ListActiveListings(c, req.Page, req.Limit, req.ProjectID)
			if err != nil {
				return nil, err
			}
			c.Response().Header().Set("X-Total-Count", fmt.Sprintf("%d", total))
			c.Response().Header().Set("X-Page", fmt.Sprintf("%d", req.Page))
			c.Response().Header().Set("X-Limit", fmt.Sprintf("%d", req.Limit))
			return listings, nil
		},
		http.StatusOK,
		&validation.ListMarketplaceRequest{},
	)(c)
}

// GetListing gets a specific listing
func (h *MarketplaceHandler) GetListing(c echo.Context) error {
	return Handle(
		h.Handler,
		func(c echo.Context, req *validation.GetListingRequest) (*model.Listing, error) {
			return h.marketplaceService.GetListing(c, req.ListingID)
		},
		http.StatusOK,
		&validation.GetListingRequest{},
	)(c)
}

// BuyListing handles purchasing a listing
func (h *MarketplaceHandler) BuyListing(c echo.Context) error {
	return HandleNoContent(
		h.Handler,
		func(c echo.Context, req *validation.BuyListingRequest) error {
			userID := middleware.GetUserID(c)
			return h.marketplaceService.BuyListing(c, req.ListingID, userID)
		},
		http.StatusOK,
		&validation.BuyListingRequest{},
	)(c)
}

// CancelListing cancels a marketplace listing
func (h *MarketplaceHandler) CancelListing(c echo.Context) error {
	return HandleNoContent(
		h.Handler,
		func(c echo.Context, req *validation.CancelListingRequest) error {
			userID := middleware.GetUserID(c)
			return h.marketplaceService.CancelListing(c, req.ListingID, userID)
		},
		http.StatusNoContent,
		&validation.CancelListingRequest{},
	)(c)
}

// MintTokens mints new tokens (admin only)
func (h *MarketplaceHandler) MintTokens(c echo.Context) error {
	return HandleNoContent(
		h.Handler,
		func(c echo.Context, req *validation.MintTokenRequest) error {
			// Check if user is admin
			role := middleware.GetUserRole(c)
			if role != "ADMIN" {
				return echo.NewHTTPError(http.StatusForbidden, "only admins can mint tokens")
			}
			return h.marketplaceService.MintTokens(c, req.ProjectID.String(), req.ToAddress, req.Amount)
		},
		http.StatusOK,
		&validation.MintTokenRequest{},
	)(c)
}

// DeployProjectToken manually deploys a project token (admin only)
func (h *MarketplaceHandler) DeployProjectToken(c echo.Context) error {
	return HandleNoContent(
		h.Handler,
		func(c echo.Context, req *validation.DeployProjectTokenRequest) error {
			// This would call the blockchain service directly
			// For now, it's handled automatically in the Approve flow
			return echo.NewHTTPError(http.StatusNotImplemented, "Token deployment happens automatically on project approval")
		},
		http.StatusOK,
		&validation.DeployProjectTokenRequest{},
	)(c)
}
