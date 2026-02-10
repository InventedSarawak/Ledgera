package validation

import (
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
)

// ============================================================================
// Marketplace Listing Validation
// ============================================================================

type CreateListingRequest struct {
	ProjectID string  `json:"projectId" validate:"required,uuid"`
	Amount    float64 `json:"amount" validate:"required,gt=0"`
	PriceETH  float64 `json:"priceEth" validate:"required,gt=0"`
}

func (r *CreateListingRequest) Validate() error {
	validate := validator.New()
	return validate.Struct(r)
}

type BuyListingRequest struct {
	ListingID string `json:"listingId" param:"id" validate:"required,uuid"`
}

func (r *BuyListingRequest) Validate() error {
	validate := validator.New()
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
// Token Minting Validation
// ============================================================================

type MintTokenRequest struct {
	ProjectID uuid.UUID `json:"projectId" param:"id" validate:"required,uuid"`
	Amount    float64   `json:"amount" validate:"required,gt=0"`
	ToAddress string    `json:"toAddress" validate:"required,eth_addr"`
}

func (r *MintTokenRequest) Validate() error {
	validate := validator.New()
	return validate.Struct(r)
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
