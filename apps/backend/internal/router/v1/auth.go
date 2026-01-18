package v1

import (
	"github.com/inventedsarawak/ledgera/internal/handler"
	"github.com/inventedsarawak/ledgera/internal/middleware"
	"github.com/labstack/echo/v4"
)

func RegisterAuthRoutes(r *echo.Group, h *handler.AuthHandler, auth *middleware.AuthMiddleware) {
	// Auth operations
	authGroup := r.Group("/auth")
	authGroup.Use(auth.RequireAuth)

	authGroup.POST("/sync-user", h.SyncUser)
}