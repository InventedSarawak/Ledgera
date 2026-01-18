package user

import (
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
)

// ------------------------------------------------------------
// Create
// ------------------------------------------------------------

type CreateUserPayload struct {
	ClerkID       string  `json:"clerkId" validate:"required"`
	Email         string  `json:"email" validate:"required,email"`
	WalletAddress *string `json:"walletAddress" validate:"omitempty,eth_addr"` // 'eth_addr' checks for 0x...
	Role          UserRole  `json:"role" validate:"required,oneof=ADMIN SUPPLIER BUYER"`
}

func (p *CreateUserPayload) Validate() error {
	validate := validator.New()
	return validate.Struct(p)
}

// ------------------------------------------------------------
// Update
// ------------------------------------------------------------

type UpdateUserPayload struct {
	ID            uuid.UUID `param:"id" validate:"required,uuid"`
	WalletAddress *string   `json:"walletAddress" validate:"omitempty,eth_addr"`
	Role          *UserRole `json:"role" validate:"omitempty,oneof=ADMIN SUPPLIER BUYER"`
}

func (p *UpdateUserPayload) Validate() error {
	validate := validator.New()
	return validate.Struct(p)
}

// ------------------------------------------------------------
// Query (Get Many)
// ------------------------------------------------------------

type GetUsersQuery struct {
	Page   *int    `query:"page" validate:"omitempty,min=1"`
	Limit  *int    `query:"limit" validate:"omitempty,min=1,max=100"`
	Role   *UserRole `query:"role" validate:"omitempty,oneof=ADMIN SUPPLIER BUYER"`
	Search *string `query:"search" validate:"omitempty,min=1"`
}

func (q *GetUsersQuery) Validate() error {
	validate := validator.New()
	if err := validate.Struct(q); err != nil {
		return err
	}

	if q.Page == nil {
		defaultPage := 1
		q.Page = &defaultPage
	}
	if q.Limit == nil {
		defaultLimit := 50
		q.Limit = &defaultLimit
	}

	return nil
}

// ------------------------------------------------------------
// Auth Sync
// ------------------------------------------------------------

type SyncUserPayload struct {
	Email string `json:"email" validate:"required,email"`
    // We don't need ClerkID here because we extract it securely from the JWT Middleware
}

func (p *SyncUserPayload) Validate() error {
	validate := validator.New()
	return validate.Struct(p)
}