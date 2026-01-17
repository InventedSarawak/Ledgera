package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/inventedsarawak/ledgera/internal/errs"
	"github.com/inventedsarawak/ledgera/internal/model/counter"
	"github.com/inventedsarawak/ledgera/internal/server"
)

type CounterRepository struct {
	server *server.Server
}

func NewCounterRepository(server *server.Server) *CounterRepository {
	return &CounterRepository{server: server}
}

func (r *CounterRepository) GetOrCreateCounter(ctx context.Context, userID string) (*counter.Counter, error) {
	query := `
		INSERT INTO counters (id, user_id, count, created_at, updated_at)
		VALUES ($1, $2, 0, NOW(), NOW())
		ON CONFLICT (user_id)
		DO UPDATE SET updated_at = NOW()
		RETURNING id, user_id, count, created_at, updated_at
	`

	var c counter.Counter
	err := r.server.DB.Pool.QueryRow(ctx, query, uuid.New(), userID).Scan(
		&c.ID,
		&c.UserID,
		&c.Count,
		&c.CreatedAt,
		&c.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get or create counter: %w", err)
	}

	return &c, nil
}

func (r *CounterRepository) GetCounter(ctx context.Context, userID string) (*counter.Counter, error) {
	query := `
		SELECT id, user_id, count, created_at, updated_at
		FROM counters
		WHERE user_id = $1
	`

	var c counter.Counter
	err := r.server.DB.Pool.QueryRow(ctx, query, userID).Scan(
		&c.ID,
		&c.UserID,
		&c.Count,
		&c.CreatedAt,
		&c.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errs.NewNotFoundError("Counter not found", false, nil)
		}
		return nil, fmt.Errorf("failed to get counter: %w", err)
	}

	return &c, nil
}

func (r *CounterRepository) IncrementCounter(ctx context.Context, userID string) (*counter.Counter, error) {
	query := `
		UPDATE counters
		SET count = count + 1, updated_at = NOW()
		WHERE user_id = $1
		RETURNING id, user_id, count, created_at, updated_at
	`

	var c counter.Counter
	err := r.server.DB.Pool.QueryRow(ctx, query, userID).Scan(
		&c.ID,
		&c.UserID,
		&c.Count,
		&c.CreatedAt,
		&c.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errs.NewNotFoundError("Counter not found", false, nil)
		}
		return nil, fmt.Errorf("failed to increment counter: %w", err)
	}

	return &c, nil
}

func (r *CounterRepository) DecrementCounter(ctx context.Context, userID string) (*counter.Counter, error) {
	query := `
		UPDATE counters
		SET count = GREATEST(count - 1, 0), updated_at = NOW()
		WHERE user_id = $1
		RETURNING id, user_id, count, created_at, updated_at
	`

	var c counter.Counter
	err := r.server.DB.Pool.QueryRow(ctx, query, userID).Scan(
		&c.ID,
		&c.UserID,
		&c.Count,
		&c.CreatedAt,
		&c.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errs.NewNotFoundError("Counter not found", false, nil)
		}
		return nil, fmt.Errorf("failed to decrement counter: %w", err)
	}

	return &c, nil
}

func (r *CounterRepository) ResetCounter(ctx context.Context, userID string) (*counter.Counter, error) {
	query := `
		UPDATE counters
		SET count = 0, updated_at = NOW()
		WHERE user_id = $1
		RETURNING id, user_id, count, created_at, updated_at
	`

	var c counter.Counter
	err := r.server.DB.Pool.QueryRow(ctx, query, userID).Scan(
		&c.ID,
		&c.UserID,
		&c.Count,
		&c.CreatedAt,
		&c.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errs.NewNotFoundError("Counter not found", false, nil)
		}
		return nil, fmt.Errorf("failed to reset counter: %w", err)
	}

	return &c, nil
}
