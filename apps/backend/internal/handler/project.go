package handler

import (
	"fmt"
	"mime/multipart"
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
				Area:        req.Area,
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
			items, total, err := h.projectService.ListBySupplier(c, userID, req.Page, req.Limit)
			if err != nil {
				return nil, err
			}
			// Set pagination headers
			c.Response().Header().Set("X-Total-Count", fmt.Sprintf("%d", total))
			c.Response().Header().Set("X-Page", fmt.Sprintf("%d", req.Page))
			c.Response().Header().Set("X-Limit", fmt.Sprintf("%d", req.Limit))
			return items, nil
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

func (h *ProjectHandler) Delete(c echo.Context) error {
	return HandleNoContent(
		h.Handler,
		func(c echo.Context, req *validation.DeleteProjectRequest) error {
			userID := middleware.GetUserID(c)
			return h.projectService.Delete(c, req.ID, userID)
		},
		http.StatusNoContent,
		&validation.DeleteProjectRequest{},
	)(c)
}

func (h *ProjectHandler) Update(c echo.Context) error {
	return Handle(
		h.Handler,
		func(c echo.Context, req *validation.UpdateProjectRequest) (*project.Project, error) {
			userID := middleware.GetUserID(c)

			// Optional file extraction for image update
			var fileHeader *multipart.FileHeader
			file, err := c.FormFile("image")
			if err == nil && file != nil {
				fileHeader = file
			}

			// Map Request to Service Payload
			var statusPtr *project.ProjectStatus
			if req.Status != nil {
				s := project.ProjectStatus(*req.Status)
				statusPtr = &s
			}
			payload := project.UpdateProjectPayload{
				ID:              req.ID,
				Title:           req.Title,
				Description:     req.Description,
				LocationLat:     req.LocationLat,
				LocationLng:     req.LocationLng,
				Area:            req.Area,
				ContractAddress: req.ContractAddress,
				Status:          statusPtr,
			}

			return h.projectService.Update(c, req.ID.String(), payload, userID, fileHeader)
		},
		http.StatusOK,
		&validation.UpdateProjectRequest{},
	)(c)
}

func (h *ProjectHandler) SendForApproval(c echo.Context) error {
	return HandleNoContent(
		h.Handler,
		func(c echo.Context, req *validation.SendProjectForApprovalRequest) error {
			userID := middleware.GetUserID(c)
			return h.projectService.SendForApproval(c, req.ID, userID)
		},
		http.StatusAccepted,
		&validation.SendProjectForApprovalRequest{},
	)(c)
}
