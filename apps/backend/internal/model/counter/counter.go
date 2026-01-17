package counter

import (
	"time"

	"github.com/google/uuid"
)

type Counter struct {
	ID        uuid.UUID `json:"id" db:"id"`
	UserID    string    `json:"user_id" db:"user_id"`
	Count     int64     `json:"count" db:"count"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

type GetCounterPayload struct{}

func (p *GetCounterPayload) Validate() error {
	return nil
}

type IncrementPayload struct{}

func (p *IncrementPayload) Validate() error {
	return nil
}

type DecrementPayload struct{}

func (p *DecrementPayload) Validate() error {
	return nil
}

type ResetPayload struct{}

func (p *ResetPayload) Validate() error {
	return nil
}

type GetCounterStatsPayload struct{}

func (p *GetCounterStatsPayload) Validate() error {
	return nil
}

type CounterStats struct {
	TotalIncrements int64 `json:"total_increments"`
	TotalDecrements int64 `json:"total_decrements"`
	CurrentCount    int64 `json:"current_count"`
	HighestCount    int64 `json:"highest_count"`
	LowestCount     int64 `json:"lowest_count"`
}
