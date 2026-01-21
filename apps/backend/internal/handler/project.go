package handler

import (
	"net/http"

	"github.com/inventedsarawak/ledgera/internal/middleware"
	"github.com/inventedsarawak/ledgera/internal/model/project"
	"github.com/inventedsarawak/ledgera/internal/server"
	"github.com/inventedsarawak/ledgera/internal/service"
	"github.com/inventedsarawak/ledgera/internal/validation"
	"github.com/labstack/echo/v4"
)

type ProjectHandler struct {
	Handler
	projectService *service.ProjectService
}

func NewProjectHandler(s *server.Server, projectService *service.ProjectService) *ProjectHandler {
	return &ProjectHandler{
		Handler:        NewHandler(s),
		projectService: projectService,
	}
}

func (h *ProjectHandler) Create(c echo.Context) error {
	return Handle(	
		h.Handler,
		func(c echo.Context, req *validation.CreateProjectRequest) (*project.Project, error) {
			userID := middleware.GetUserID(c)

			// Handle file extraction manually as Bind doesn't support generic multipart well for validation without custom handling
			file, err := c.FormFile("image")
			if err != nil {
				return nil, echo.NewHTTPError(http.StatusBadRequest, "Image file is required")
			}

			// Map Request to Service Payload
			payload := project.CreateProjectPayload{
				Title:       req.Title,
				Description: req.Description,
				LocationLat: req.LocationLat,
				LocationLng: req.LocationLng,
				ImageURL:    "https://pending.upload", // Placeholder
			}

			return h.projectService.Create(c, payload, userID, file)
		},
		http.StatusCreated,
		&validation.CreateProjectRequest{},
	)(c)
}

func (h *ProjectHandler) ListMine(c echo.Context) error {
	return Handle(
		h.Handler,
		func(c echo.Context, req *validation.ListProjectsRequest) ([]project.Project, error) {
			userID := middleware.GetUserID(c)
			return h.projectService.ListBySupplier(c, userID)
		},
		http.StatusOK,
		&validation.ListProjectsRequest{},
	)(c)
}

func (h *ProjectHandler) GetByID(c echo.Context) error {
	return Handle(
		h.Handler,
		func(c echo.Context, req *validation.GetProjectRequest) (*project.Project, error) {
			return h.projectService.GetByID(c, req.ID)
		},
		http.StatusOK,
		&validation.GetProjectRequest{},
	)(c)
}
