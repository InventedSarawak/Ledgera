package handler

import (
	"net/http"

	"github.com/inventedsarawak/ledgera/internal/middleware"
	"github.com/inventedsarawak/ledgera/internal/model/counter"
	"github.com/inventedsarawak/ledgera/internal/server"
	"github.com/inventedsarawak/ledgera/internal/service"
	"github.com/labstack/echo/v4"
)

type CounterHandler struct {
	Handler
	counterService *service.CounterService
}

func NewCounterHandler(s *server.Server, counterService *service.CounterService) *CounterHandler {
	return &CounterHandler{
		Handler:        NewHandler(s),
		counterService: counterService,
	}
}

func (h *CounterHandler) GetOrCreateCounter(c echo.Context) error {
	return Handle(
		h.Handler,
		func(c echo.Context, payload *counter.GetCounterPayload) (*counter.Counter, error) {
			userID := middleware.GetUserID(c)
			return h.counterService.GetOrCreateCounter(c, userID)
		},
		http.StatusOK,
		&counter.GetCounterPayload{},
	)(c)
}

func (h *CounterHandler) IncrementCounter(c echo.Context) error {
	return Handle(
		h.Handler,
		func(c echo.Context, payload *counter.IncrementPayload) (*counter.Counter, error) {
			userID := middleware.GetUserID(c)
			return h.counterService.IncrementCounter(c, userID)
		},
		http.StatusOK,
		&counter.IncrementPayload{},
	)(c)
}

func (h *CounterHandler) DecrementCounter(c echo.Context) error {
	return Handle(
		h.Handler,
		func(c echo.Context, payload *counter.DecrementPayload) (*counter.Counter, error) {
			userID := middleware.GetUserID(c)
			return h.counterService.DecrementCounter(c, userID)
		},
		http.StatusOK,
		&counter.DecrementPayload{},
	)(c)
}

func (h *CounterHandler) ResetCounter(c echo.Context) error {
	return Handle(
		h.Handler,
		func(c echo.Context, payload *counter.ResetPayload) (*counter.Counter, error) {
			userID := middleware.GetUserID(c)
			return h.counterService.ResetCounter(c, userID)
		},
		http.StatusOK,
		&counter.ResetPayload{},
	)(c)
}
