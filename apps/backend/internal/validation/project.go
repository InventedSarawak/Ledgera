package validation

import (
	"github.com/go-playground/validator/v10"
)

type CreateProjectRequest struct {
	Title       string  `form:"title" validate:"required,min=3,max=150"`
	Description string  `form:"description" validate:"required,min=10"`
	LocationLat float64 `form:"locationLat" validate:"required,latitude"`
	LocationLng float64 `form:"locationLng" validate:"required,longitude"`
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

// Empty request for ListMine
type ListProjectsRequest struct{}

func (r *ListProjectsRequest) Validate() error {
	return nil
}
