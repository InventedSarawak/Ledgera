package v1

import (
	"github.com/inventedsarawak/ledgera/internal/handler"
	"github.com/inventedsarawak/ledgera/internal/middleware"
	"github.com/labstack/echo/v4"
)

func RegisterProjectRoutes(g *echo.Group, h *handler.ProjectHandler, auth *middleware.AuthMiddleware) {
	projectGroup := g.Group("/projects")

	// Protected routes
	projectGroup.Use(auth.RequireAuth)

	projectGroup.POST("", h.Create)
	projectGroup.GET("/mine", h.ListMine)
	projectGroup.GET("/:id", h.GetByID)
}
