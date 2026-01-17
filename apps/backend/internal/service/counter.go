package service

import (
	"fmt"

	"github.com/inventedsarawak/ledgera/internal/middleware"
	"github.com/inventedsarawak/ledgera/internal/model/counter"
	"github.com/inventedsarawak/ledgera/internal/repository"
	"github.com/inventedsarawak/ledgera/internal/server"
	"github.com/labstack/echo/v4"
)

type CounterService struct {
	server      *server.Server
	counterRepo *repository.CounterRepository
}

func NewCounterService(server *server.Server, counterRepo *repository.CounterRepository) *CounterService {
	return &CounterService{
		server:      server,
		counterRepo: counterRepo,
	}
}

func (s *CounterService) GetOrCreateCounter(ctx echo.Context, userID string) (*counter.Counter, error) {
	logger := middleware.GetLogger(ctx)

	c, err := s.counterRepo.GetOrCreateCounter(ctx.Request().Context(), userID)
	if err != nil {
		logger.Error().Err(err).Msg("failed to get or create counter")
		return nil, err
	}

	logger.Info().
		Int64("count", c.Count).
		Str("counter_id", c.ID.String()).
		Msg("counter retrieved")

	return c, nil
}

func (s *CounterService) GetCounter(ctx echo.Context, userID string) (*counter.Counter, error) {
	logger := middleware.GetLogger(ctx)

	// Get DB counter
	c, err := s.counterRepo.GetCounter(ctx.Request().Context(), userID)
	if err != nil {
		logger.Error().Err(err).Msg("failed to get counter from DB")
		return nil, err
	}

	// Get blockchain counter if available
	var blockchainCount int64
	if s.server.Blockchain != nil {
		count, err := s.server.Blockchain.CounterContract.GetCount(s.server.Blockchain.GetCallOpts(ctx.Request().Context()))
		if err != nil {
			logger.Warn().Err(err).Msg("failed to get blockchain counter, using DB only")
		} else {
			blockchainCount = count.Int64()
			logger.Info().
				Int64("blockchain_count", blockchainCount).
				Msg("blockchain counter retrieved")
		}
	}

	logger.Info().
		Int64("db_count", c.Count).
		Int64("blockchain_count", blockchainCount).
		Str("counter_id", c.ID.String()).
		Msg("counter retrieved")

	return c, nil
}

func (s *CounterService) IncrementCounter(ctx echo.Context, userID string) (*counter.Counter, error) {
	logger := middleware.GetLogger(ctx)

	// Ensure counter exists in DB
	_, err := s.counterRepo.GetOrCreateCounter(ctx.Request().Context(), userID)
	if err != nil {
		logger.Error().Err(err).Msg("failed to ensure counter exists")
		return nil, err
	}

	// Increment on blockchain if available
	if s.server.Blockchain != nil {
		auth, err := s.server.Blockchain.GetTransactOpts(ctx.Request().Context())
		if err != nil {
			logger.Error().Err(err).Msg("failed to get transaction opts")
			return nil, fmt.Errorf("failed to get transaction opts: %w", err)
		}

		tx, err := s.server.Blockchain.CounterContract.Increment(auth)
		if err != nil {
			logger.Error().Err(err).Msg("failed to increment counter on blockchain")
			return nil, fmt.Errorf("failed to increment counter on blockchain: %w", err)
		}

		logger.Info().
			Str("tx_hash", tx.Hash().Hex()).
			Msg("counter incremented on blockchain")

		// Get new blockchain count
		count, err := s.server.Blockchain.CounterContract.GetCount(s.server.Blockchain.GetCallOpts(ctx.Request().Context()))
		if err != nil {
			logger.Error().Err(err).Msg("failed to get blockchain count after increment")
		} else {
			logger.Info().
				Int64("blockchain_count", count.Int64()).
				Msg("new blockchain counter value")
		}
	} else {
		logger.Warn().Msg("blockchain not available, skipping blockchain increment")
	}

	// Also increment in DB
	c, err := s.counterRepo.IncrementCounter(ctx.Request().Context(), userID)
	if err != nil {
		logger.Error().Err(err).Msg("failed to increment counter in DB")
		return nil, err
	}

	logger.Info().
		Int64("db_count", c.Count).
		Str("counter_id", c.ID.String()).
		Msg("counter incremented in DB")

	return c, nil
}

func (s *CounterService) DecrementCounter(ctx echo.Context, userID string) (*counter.Counter, error) {
	logger := middleware.GetLogger(ctx)

	c, err := s.counterRepo.DecrementCounter(ctx.Request().Context(), userID)
	if err != nil {
		logger.Error().Err(err).Msg("failed to decrement counter")
		return nil, err
	}

	logger.Info().
		Int64("new_count", c.Count).
		Str("counter_id", c.ID.String()).
		Msg("counter decremented")

	return c, nil
}

func (s *CounterService) ResetCounter(ctx echo.Context, userID string) (*counter.Counter, error) {
	logger := middleware.GetLogger(ctx)

	// Reset on blockchain if available
	if s.server.Blockchain != nil {
		auth, err := s.server.Blockchain.GetTransactOpts(ctx.Request().Context())
		if err != nil {
			logger.Error().Err(err).Msg("failed to get transaction opts for reset")
		} else {
			tx, err := s.server.Blockchain.CounterContract.Reset(auth)
			if err != nil {
				logger.Error().Err(err).Msg("failed to reset counter on blockchain")
			} else {
				logger.Info().
					Str("tx_hash", tx.Hash().Hex()).
					Msg("counter reset on blockchain")
			}
		}
	}

	// Reset in DB
	c, err := s.counterRepo.ResetCounter(ctx.Request().Context(), userID)
	if err != nil {
		logger.Error().Err(err).Msg("failed to reset counter in DB")
		return nil, err
	}

	logger.Info().
		Str("counter_id", c.ID.String()).
		Msg("counter reset to 0")

	return c, nil
}
