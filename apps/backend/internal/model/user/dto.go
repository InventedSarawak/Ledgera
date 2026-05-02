package user

import (
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
)

// ------------------------------------------------------------
// Create
// ------------------------------------------------------------

type CreateUserPayload struct {
	ClerkID       string   `json:"clerkId" validate:"required"`
	Email         string   `json:"email" validate:"required,email"`
	WalletAddress *string  `json:"walletAddress" validate:"omitempty,solana_pubkey"` // Solana Base58 public key
	Role          UserRole `json:"role" validate:"required,oneof=ADMIN SUPPLIER BUYER"`
}

func (p *CreateUserPayload) Validate() error {
	validate := validator.New()
	RegisterSolanaValidators(validate)
	return validate.Struct(p)
}

// ------------------------------------------------------------
// Update
// ------------------------------------------------------------

type UpdateUserPayload struct {
	ID            uuid.UUID `param:"id" validate:"required,uuid"`
	WalletAddress *string   `json:"walletAddress" validate:"omitempty,solana_pubkey"`
	Role          *UserRole `json:"role" validate:"omitempty,oneof=ADMIN SUPPLIER BUYER"`
}

func (p *UpdateUserPayload) Validate() error {
	validate := validator.New()
	RegisterSolanaValidators(validate)
	return validate.Struct(p)
}

// ------------------------------------------------------------
// Query (Get Many)
// ------------------------------------------------------------

type GetUsersQuery struct {
	Page   *int      `query:"page" validate:"omitempty,min=1"`
	Limit  *int      `query:"limit" validate:"omitempty,min=1,max=100"`
	Role   *UserRole `query:"role" validate:"omitempty,oneof=ADMIN SUPPLIER BUYER"`
	Search *string   `query:"search" validate:"omitempty,min=1"`
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
	Email         string  `json:"email" validate:"required,email"`
	WalletAddress *string `json:"walletAddress" validate:"omitempty,solana_pubkey"`
	// We don't need ClerkID here because we extract it securely from the JWT Middleware
}

func (p *SyncUserPayload) Validate() error {
	validate := validator.New()
	RegisterSolanaValidators(validate)
	return validate.Struct(p)
}

type UpdateProfileRequest struct {
	WalletAddress *string `json:"walletAddress" validate:"omitempty,solana_pubkey"`
}

func (p *UpdateProfileRequest) Validate() error {
	validate := validator.New()
	RegisterSolanaValidators(validate)
	return validate.Struct(p)
}

// RegisterSolanaValidators registers the custom solana_pubkey validator on a validator instance.
// This is called by each DTO's Validate method to ensure the validator is available.
func RegisterSolanaValidators(v *validator.Validate) {
	v.RegisterValidation("solana_pubkey", validateSolanaPubkey)
}

// validateSolanaPubkey checks that a string is a valid Solana Base58-encoded public key (32-44 chars, Base58 alphabet).
func validateSolanaPubkey(fl validator.FieldLevel) bool {
	val := fl.Field().String()
	if len(val) < 32 || len(val) > 44 {
		return false
	}
	return isBase58(val)
}

// isBase58 checks if a string consists only of Base58 characters (Bitcoin alphabet).
func isBase58(s string) bool {
	const base58Chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
	for _, c := range s {
		found := false
		for _, b := range base58Chars {
			if c == b {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}
	return true
}
