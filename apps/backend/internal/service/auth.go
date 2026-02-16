package service

import (
	"strings"

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

func (s *AuthService) SyncUser(ctx echo.Context, clerkID string, email string, walletAddress *string) (*user.User, error) {
	logger := middleware.GetLogger(ctx)

	// Determine role from context metadata/claims
	role := normalizeRole(middleware.GetUserRole(ctx))

	// Upsert User in DB
	u, err := s.userRepo.UpsertUser(ctx.Request().Context(), clerkID, email, role, walletAddress)
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

func (s *AuthService) UpdateProfile(ctx echo.Context, clerkID string, req *user.UpdateProfileRequest) (*user.User, error) {
	// 1. Find User by Clerk ID
	u, err := s.userRepo.FindByClerkID(ctx.Request().Context(), clerkID)
	if err != nil {
		return nil, err
	}
	if u == nil {
		return nil, echo.NewHTTPError(404, "User not found")
	}

	// 2. Update Fields
	if req.WalletAddress != nil {
		u.WalletAddress = req.WalletAddress
	}

	// 3. Save
	err = s.userRepo.UpdateUser(ctx.Request().Context(), u)
	if err != nil {
		return nil, err
	}

	return u, nil
}

func normalizeRole(raw string) user.UserRole {
	raw = strings.ToUpper(strings.TrimSpace(raw))
	switch raw {
	case string(user.RoleAdmin), "ORG:ADMIN":
		return user.RoleAdmin
	case string(user.RoleSupplier), "ORG:SUPPLIER":
		return user.RoleSupplier
	case string(user.RoleBuyer), "ORG:BUYER":
		return user.RoleBuyer
	default:
		return user.RoleBuyer
	}
}
