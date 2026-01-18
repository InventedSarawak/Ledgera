package handler

import (
	"net/http"

	"github.com/inventedsarawak/ledgera/internal/middleware"
	"github.com/inventedsarawak/ledgera/internal/model/user"
	"github.com/inventedsarawak/ledgera/internal/server"
	"github.com/inventedsarawak/ledgera/internal/service"
	"github.com/labstack/echo/v4"
)

type AuthHandler struct {
	Handler
	authService *service.AuthService
}

func NewAuthHandler(s *server.Server, authService *service.AuthService) *AuthHandler {
	return &AuthHandler{
		Handler:     NewHandler(s),
		authService: authService,
	}
}

func (h *AuthHandler) SyncUser(c echo.Context) error {
	return Handle(
		h.Handler,
		func(c echo.Context, payload *user.SyncUserPayload) (*user.User, error) {
			userID := middleware.GetUserID(c)
			return h.authService.SyncUser(c, userID, payload.Email)
		},
		http.StatusOK,
		&user.SyncUserPayload{},
	)(c)
}
