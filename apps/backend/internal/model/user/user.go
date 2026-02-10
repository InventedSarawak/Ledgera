package user

import (
	"time"

	"github.com/inventedsarawak/ledgera/internal/model"
)

type UserRole string

const (
	RoleAdmin    UserRole = "ADMIN"
	RoleSupplier UserRole = "SUPPLIER"
	RoleBuyer    UserRole = "BUYER"
)

type User struct {
	model.Base

	ClerkID       string     `json:"clerkId" db:"clerk_id"`
	Email         string     `json:"email" db:"email"`
	WalletAddress *string    `json:"walletAddress" db:"wallet_address"`
	Role          UserRole   `json:"role" db:"role"`
	DeletedAt     *time.Time `json:"deletedAt" db:"deleted_at"`
}
