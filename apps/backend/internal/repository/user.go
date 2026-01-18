package repository

import (
	"context"

	"github.com/inventedsarawak/ledgera/internal/model/user"
	"github.com/inventedsarawak/ledgera/internal/server"
)

type UserRepository struct {
	server *server.Server
}

func NewUserRepository(server *server.Server) *UserRepository {
	return &UserRepository{server: server}
}

func (r *UserRepository) UpsertUser(ctx context.Context, clerkID string, email string) (*user.User, error) {
	// The Logic:
	// 1. Try to Insert the user with default Role = BUYER.
	// 2. If ClerkID exists (Conflict), just update the Email (in case they changed it).
	// 3. DO NOT overwrite the Role (Admin might have promoted them).
	// 4. Return the full User object (so we know their ID and Role).

	query := `
		INSERT INTO users (clerk_id, email, role, created_at, updated_at)
		VALUES ($1, $2, $3, NOW(), NOW())
		ON CONFLICT (clerk_id) DO UPDATE
		SET 
			email = EXCLUDED.email,
			updated_at = NOW()
		RETURNING id, clerk_id, email, wallet_address, role, created_at, updated_at
	`

	var u user.User
	// Default role is BUYER for new users
	err := r.server.DB.Pool.QueryRow(ctx, query, clerkID, email, user.RoleBuyer).Scan(
		&u.ID,
		&u.ClerkID,
		&u.Email,
		&u.WalletAddress,
		&u.Role,
		&u.CreatedAt,
		&u.UpdatedAt,
	)
	
	if err != nil {
		return nil, err
	}

	return &u, nil
}