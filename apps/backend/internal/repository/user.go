package repository

import (
	"context"
	"errors"

	"github.com/inventedsarawak/ledgera/internal/model/user"
	"github.com/inventedsarawak/ledgera/internal/server"
	"github.com/jackc/pgx/v5"
)

type UserRepository struct {
	server *server.Server
}

func NewUserRepository(server *server.Server) *UserRepository {
	return &UserRepository{server: server}
}

func (r *UserRepository) UpsertUser(ctx context.Context, clerkID string, email string, role user.UserRole) (*user.User, error) {
	// The Logic:
	// 1. Insert the user with the provided role (defaults to BUYER when empty).
	// 2. On conflict, update Email and Role to reflect the latest Clerk metadata.
	// 3. Return the full User object (so we know their ID and Role).

	if role == "" {
		role = user.RoleBuyer
	}

	query := `
		INSERT INTO users (clerk_id, email, role, created_at, updated_at)
		VALUES (@clerk_id, @email, @role, NOW(), NOW())
		ON CONFLICT (clerk_id) DO UPDATE
		SET 
			email = EXCLUDED.email,
			role = EXCLUDED.role,
			updated_at = NOW()
		RETURNING id, clerk_id, email, wallet_address, role, deleted_at, created_at, updated_at
	`

	args := pgx.NamedArgs{
		"clerk_id": clerkID,
		"email":    email,
		"role":     role,
	}

	var u user.User
	// Persist user with resolved role from Clerk metadata
	err := r.server.DB.Pool.QueryRow(ctx, query, args).Scan(
		&u.ID,
		&u.ClerkID,
		&u.Email,
		&u.WalletAddress,
		&u.Role,
		&u.DeletedAt,
		&u.CreatedAt,
		&u.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &u, nil
}

func (r *UserRepository) FindByClerkID(ctx context.Context, clerkID string) (*user.User, error) {
	query := `
		SELECT id, clerk_id, email, wallet_address, role, deleted_at, created_at, updated_at
		FROM users
		WHERE clerk_id = @clerk_id
	`

	args := pgx.NamedArgs{
		"clerk_id": clerkID,
	}

	var u user.User
	err := r.server.DB.Pool.QueryRow(ctx, query, args).Scan(
		&u.ID,
		&u.ClerkID,
		&u.Email,
		&u.WalletAddress,
		&u.Role,
		&u.DeletedAt,
		&u.CreatedAt,
		&u.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	return &u, nil
}
