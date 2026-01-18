package service

import (
	"github.com/inventedsarawak/ledgera/internal/middleware"
	"github.com/inventedsarawak/ledgera/internal/repository"
	"github.com/inventedsarawak/ledgera/internal/server"

	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/inventedsarawak/ledgera/internal/model/user"
	"github.com/labstack/echo/v4"
)

type AuthService struct {
	server   *server.Server
	userRepo *repository.UserRepository
}

func NewAuthService(s *server.Server, userRepo *repository.UserRepository) *AuthService {
	clerk.SetKey(s.Config.Auth.SecretKey)
	return &AuthService{
		server:   s,
		userRepo: userRepo,
	}
}

func (s *AuthService) SyncUser(ctx echo.Context, clerkID string, email string) (*user.User, error) {
	logger := middleware.GetLogger(ctx)

	// Upsert User in DB
	u, err := s.userRepo.UpsertUser(ctx.Request().Context(), clerkID, email)
	if err != nil {
		return nil, err
	}
	
	// Future-proofing: This is where you would add "Side Effects"
	// Example: s.emailService.SendWelcomeEmail(u.Email)
	
	logger.Info().
		Str("user_id", u.ID.String()).
		Str("role", string(u.Role)).
		Msg("user synced")

	return u, nil
}
