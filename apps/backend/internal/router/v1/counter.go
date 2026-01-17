package v1

import (
	"github.com/inventedsarawak/ledgera/internal/handler"
	"github.com/inventedsarawak/ledgera/internal/middleware"
	"github.com/labstack/echo/v4"
)

func RegisterCounterRoutes(r *echo.Group, h *handler.CounterHandler, auth *middleware.AuthMiddleware) {
	// Counter operations
	counters := r.Group("/counter")
	counters.Use(auth.RequireAuth)

	counters.GET("", h.GetOrCreateCounter)
	counters.POST("/increment", h.IncrementCounter)
	counters.POST("/decrement", h.DecrementCounter)
	counters.POST("/reset", h.ResetCounter)
}
