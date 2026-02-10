package v1

import (
	"github.com/inventedsarawak/ledgera/internal/handler"
	"github.com/inventedsarawak/ledgera/internal/middleware"
	"github.com/labstack/echo/v4"
)

func RegisterMarketplaceRoutes(g *echo.Group, h *handler.MarketplaceHandler, auth *middleware.AuthMiddleware) {
	marketplaceGroup := g.Group("/marketplace")

	// Public routes - anyone can view listings
	marketplaceGroup.GET("", h.ListActiveListings)
	marketplaceGroup.GET("/:id", h.GetListing)

	// Protected routes - require authentication
	marketplaceGroup.Use(auth.RequireAuth)

	// Seller actions
	marketplaceGroup.POST("/listings", h.CreateListing)
	marketplaceGroup.DELETE("/listings/:id", h.CancelListing)

	// Buyer actions
	marketplaceGroup.POST("/listings/:id/buy", h.BuyListing)

	// Admin only - token minting
	marketplaceGroup.POST("/tokens/:id/mint", h.MintTokens)
}
