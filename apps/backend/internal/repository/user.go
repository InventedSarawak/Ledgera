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

func (r *UserRepository) UpsertUser(ctx context.Context, clerkID string, email string, role user.UserRole, walletAddress *string) (*user.User, error) {
	// The Logic:
	// 1. Insert the user with the provided role (defaults to BUYER when empty).
	// 2. On conflict, update Email and Role to reflect the latest Clerk metadata.
	// 3. Preserve existing wallet_address, or set new one if provided.
	// 4. Return the full User object (so we know their ID and Role).

	if role == "" {
		role = user.RoleBuyer
	}

	query := `
		INSERT INTO users (clerk_id, email, role, wallet_address, created_at, updated_at)
		VALUES (@clerk_id, @email, @role, @wallet_address, NOW(), NOW())
		ON CONFLICT (clerk_id) DO UPDATE
		SET 
			email = EXCLUDED.email,
			role = EXCLUDED.role,
			wallet_address = COALESCE(EXCLUDED.wallet_address, users.wallet_address),
			updated_at = NOW()
		RETURNING id, clerk_id, email, wallet_address, role, deleted_at, created_at, updated_at
	`

	args := pgx.NamedArgs{
		"clerk_id":       clerkID,
		"email":          email,
		"role":           role,
		"wallet_address": walletAddress,
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

func (r *UserRepository) UpdateUser(ctx context.Context, u *user.User) error {
	query := `
		UPDATE users
		SET 
			email = @email,
			wallet_address = @wallet_address,
			role = @role,
			updated_at = NOW()
		WHERE id = @id
	`
	args := pgx.NamedArgs{
		"id":             u.ID,
		"email":          u.Email,
		"wallet_address": u.WalletAddress,
		"role":           u.Role,
	}

	_, err := r.server.DB.Pool.Exec(ctx, query, args)
	return err
}
