package project

import (
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
)

type ProjectWithSupplier struct {
	Project
	SupplierEmail string `json:"supplierEmail"`
}

// ------------------------------------------------------------
// Create
// ------------------------------------------------------------

type CreateProjectPayload struct {
	// SupplierID is usually inferred from the Auth Token, so we might not need it in the JSON body.
	Title       string  `json:"title" validate:"required,min=3,max=150"`
	Description string  `json:"description" validate:"required,min=10"`
	ImageURL    string  `json:"imageUrl" validate:"required,url"`
	LocationLat float64 `json:"locationLat" validate:"required,latitude"`
	LocationLng float64 `json:"locationLng" validate:"required,longitude"`
	Area        float64 `json:"area" validate:"required,gt=0"`
}

func (p *CreateProjectPayload) Validate() error {
	validate := validator.New()
	return validate.Struct(p)
}

// ------------------------------------------------------------
// Update
// ------------------------------------------------------------

type UpdateProjectPayload struct {
	ID              uuid.UUID      `param:"id" validate:"required,uuid"`
	Title           *string        `json:"title" validate:"omitempty,min=3,max=150"`
	Description     *string        `json:"description" validate:"omitempty,min=10"`
	ContractAddress *string        `json:"contractAddress" validate:"omitempty,eth_addr"`
	LocationLat     *float64       `json:"locationLat" validate:"omitempty,latitude"`
	LocationLng     *float64       `json:"locationLng" validate:"omitempty,longitude"`
	Area            *float64       `json:"area" validate:"omitempty,gt=0"`
	Status          *ProjectStatus `json:"status" validate:"omitempty,oneof=DRAFT PENDING APPROVED DEPLOYED REJECTED"`
}

func (p *UpdateProjectPayload) Validate() error {
	validate := validator.New()
	return validate.Struct(p)
}

// ------------------------------------------------------------
// Query (Get Many)
// ------------------------------------------------------------

type GetProjectsQuery struct {
	Page       *int           `query:"page" validate:"omitempty,min=1"`
	Limit      *int           `query:"limit" validate:"omitempty,min=1,max=100"`
	Sort       *string        `query:"sort" validate:"omitempty,oneof=created_at title"`
	Order      *string        `query:"order" validate:"omitempty,oneof=asc desc"`
	Status     *ProjectStatus `query:"status" validate:"omitempty,oneof=DRAFT PENDING APPROVED DEPLOYED REJECTED"`
	SupplierID *string        `query:"supplierId" validate:"omitempty"`
}

func (q *GetProjectsQuery) Validate() error {
	validate := validator.New()
	if err := validate.Struct(q); err != nil {
		return err
	}

	if q.Page == nil {
		defaultPage := 1
		q.Page = &defaultPage
	}
	if q.Limit == nil {
		defaultLimit := 20
		q.Limit = &defaultLimit
	}
	if q.Sort == nil {
		defaultSort := "created_at"
		q.Sort = &defaultSort
	}
	if q.Order == nil {
		defaultOrder := "desc"
		q.Order = &defaultOrder
	}

	return nil
}

// ------------------------------------------------------------
// Delete
// ------------------------------------------------------------

type DeleteProjectPayload struct {
	ID uuid.UUID `param:"id" validate:"required,uuid"`
}

func (p *DeleteProjectPayload) Validate() error {
	validate := validator.New()
	return validate.Struct(p)
}

// ------------------------------------------------------------
// Create Project Request
// ------------------------------------------------------------

type CreateProjectRequestPayload struct {
	Title       string  `json:"title" validate:"required"`
	Description string  `json:"description" validate:"required"`
	ImageURL    string  `json:"imageUrl" validate:"required,url"`
	LocationLat float64 `json:"locationLat" validate:"required"`
	LocationLng float64 `json:"locationLng" validate:"required"`
	Area        float64 `json:"area" validate:"required"`
}

func (p *CreateProjectRequestPayload) Validate() error {
	validate := validator.New()
	return validate.Struct(p)
}

// ------------------------------------------------------------
