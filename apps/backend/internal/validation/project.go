package validation

import (
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
)

type CreateProjectRequest struct {
	Title           string  `json:"title" form:"title" validate:"required,min=3,max=150"`
	Description     string  `json:"description" form:"description" validate:"required,min=10"`
	LocationPolygon string  `json:"locationPolygon" form:"locationPolygon" validate:"required"`
	Area            float64 `json:"area" form:"area" validate:"required,gt=0"`
	CarbonAmount    float64 `json:"carbonAmount" form:"carbonAmount" validate:"required,gt=0"`
}

func (r *CreateProjectRequest) Validate() error {
	validate := validator.New()
	return validate.Struct(r)
}

type GetProjectRequest struct {
	ID string `param:"id" validate:"required,uuid"`
}

func (r *GetProjectRequest) Validate() error {
	validate := validator.New()
	return validate.Struct(r)
}

type MintProjectTokensRequest struct {
	ID string `param:"id" validate:"required,uuid"`
}

func (r *MintProjectTokensRequest) Validate() error {
	validate := validator.New()
	return validate.Struct(r)
}

// Empty request for ListMine
type ListProjectsRequest struct {
	Page  int `query:"page" validate:"omitempty,min=1"`
	Limit int `query:"limit" validate:"omitempty,min=1,max=100"`
}

func (r *ListProjectsRequest) Validate() error {
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

type UpdateProjectRequest struct {
	ID              uuid.UUID `param:"id" validate:"required,uuid"`
	Title           *string   `json:"title" form:"title" validate:"omitempty,min=3,max=150"`
	Description     *string   `json:"description" form:"description" validate:"omitempty,min=10"`
	LocationPolygon *string   `json:"locationPolygon" form:"locationPolygon" validate:"omitempty"`
	MintAddress     *string   `json:"mintAddress" form:"mintAddress" validate:"omitempty,solana_pubkey"` // Solana Base58 public key
	Area            *float64  `json:"area" form:"area" validate:"omitempty,gt=0"`
	Status          *string   `json:"status" form:"status" validate:"omitempty,oneof=DRAFT PENDING APPROVED DEPLOYED REJECTED"`
	CarbonAmount    *float64  `json:"carbonAmount" form:"carbonAmount" validate:"omitempty,gt=0"`
}

func (r *UpdateProjectRequest) Validate() error {
	validate := validator.New()
	RegisterSolanaValidators(validate)
	return validate.Struct(r)
}

type DeleteProjectRequest struct {
	ID string `param:"id" validate:"required,uuid"`
}

func (r *DeleteProjectRequest) Validate() error {
	validate := validator.New()
	return validate.Struct(r)
}

type SendProjectForApprovalRequest struct {
	ID string `param:"id" validate:"required,uuid"`
}

func (r *SendProjectForApprovalRequest) Validate() error {
	validate := validator.New()
	return validate.Struct(r)
}

type ReviewProjectRequest struct {
	ID string `param:"id" validate:"required,uuid"`
}

func (r *ReviewProjectRequest) Validate() error {
	validate := validator.New()
	return validate.Struct(r)
}
