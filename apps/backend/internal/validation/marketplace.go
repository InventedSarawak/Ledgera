package validation

import (
	"github.com/go-playground/validator/v10"
)

// ============================================================================
// Marketplace Listing Validation
// ============================================================================

// SupportedPaymentTokens lists the accepted SPL token symbols for payment
var SupportedPaymentTokens = []string{"USDC", "EON", "SELENE", "GERON"}

type CreateListingRequest struct {
	ProjectID    string  `json:"projectId" validate:"required,uuid"`
	TokenID      *string `json:"tokenId" validate:"omitempty"` // Solana mint address (Base58) or "0" for initial supply
	Amount       float64 `json:"amount" validate:"required,gt=0"`
	Price        float64 `json:"price" validate:"required,gt=0"`
	PaymentToken string  `json:"paymentToken" validate:"required,oneof=USDC EON SELENE GERON"`
}

func (r *CreateListingRequest) Validate() error {
	validate := validator.New()
	RegisterSolanaValidators(validate)
	return validate.Struct(r)
}

type BuyListingRequest struct {
	ListingID   string  `json:"listingId" param:"id" validate:"required,uuid"`
	TxHash      string  `json:"txHash" validate:"required,solana_sig"`
	BuyerWallet string  `json:"buyerWallet" validate:"required,solana_pubkey"`
	Amount      float64 `json:"amount" validate:"required,gt=0"`
	SourceLotID *string `json:"sourceLotId" validate:"omitempty"`
}

func (r *BuyListingRequest) Validate() error {
	validate := validator.New()
	RegisterSolanaValidators(validate)
	return validate.Struct(r)
}

type CancelListingRequest struct {
	ListingID string `json:"listingId" param:"id" validate:"required,uuid"`
}

func (r *CancelListingRequest) Validate() error {
	validate := validator.New()
	return validate.Struct(r)
}

type GetListingRequest struct {
	ListingID string `param:"id" validate:"required,uuid"`
}

func (r *GetListingRequest) Validate() error {
	validate := validator.New()
	return validate.Struct(r)
}

type ListMarketplaceRequest struct {
	Page      int     `query:"page" validate:"omitempty,min=1"`
	Limit     int     `query:"limit" validate:"omitempty,min=1,max=100"`
	ProjectID *string `query:"projectId" validate:"omitempty,uuid"`
	Active    *bool   `query:"active"`
}

func (r *ListMarketplaceRequest) Validate() error {
	validate := validator.New()
	if err := validate.Struct(r); err != nil {
		return err
	}

	if r.Page == 0 {
		r.Page = 1
	}
	if r.Limit == 0 {
		r.Limit = 20
	}

	return nil
}

// ============================================================================
// Deployment Validation
// ============================================================================

type DeployProjectTokenRequest struct {
	ProjectID string `param:"id" validate:"required,uuid"`
}

func (r *DeployProjectTokenRequest) Validate() error {
	validate := validator.New()
	return validate.Struct(r)
}

// ============================================================================
// Retire Credits Validation
// ============================================================================

type RetireCreditsRequest struct {
	ProjectID string  `json:"projectId" validate:"required,uuid"`
	TokenID   string  `json:"tokenId"` // Solana mint address (Base58)
	Amount    float64 `json:"amount" validate:"required,gt=0"`
	Reason    string  `json:"reason" validate:"omitempty,max=500"`
}

func (r *RetireCreditsRequest) Validate() error {
	validate := validator.New()
	return validate.Struct(r)
}
