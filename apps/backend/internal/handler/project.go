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

			// 1. Get Image (Required)
			imageFile, err := c.FormFile("image")
			if err != nil {
				return nil, echo.NewHTTPError(http.StatusBadRequest, "Image file is required")
			}

			// 2. Get Audit Report (Required)
			auditFile, err := c.FormFile("auditReport")
			if err != nil {
				return nil, echo.NewHTTPError(http.StatusBadRequest, "Audit report file is required")
			}

			payload := project.CreateProjectPayload{
				Title:        req.Title,
				Description:  req.Description,
				LocationLat:  req.LocationLat,
				LocationLng:  req.LocationLng,
				Area:         req.Area,
				CarbonAmount: req.CarbonAmount,
				ImageURL:     "https://pending.upload",
			}

			// Pass both files to the service
			return h.projectService.Create(c, payload, userID, imageFile, auditFile)
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
			c.Response().Header().Set("X-Total-Count", fmt.Sprintf("%d", total))
			c.Response().Header().Set("X-Page", fmt.Sprintf("%d", req.Page))
			c.Response().Header().Set("X-Limit", fmt.Sprintf("%d", req.Limit))
			return items, nil
		},
		http.StatusOK,
		&validation.ListProjectsRequest{},
	)(c)
}

func (h *ProjectHandler) ListPendingReview(c echo.Context) error {
	return Handle(
		h.Handler,
		func(c echo.Context, req *validation.ListProjectsRequest) ([]project.ProjectWithSupplier, error) {
			adminID := middleware.GetUserID(c)
			items, total, err := h.projectService.ListPendingForReview(c, adminID, req.Page, req.Limit)
			if err != nil {
				return nil, err
			}
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

			// Check for files (Image and/or AuditReport)
			var imageHeader *multipart.FileHeader
			if img, err := c.FormFile("image"); err == nil && img != nil {
				imageHeader = img
			}

			var auditHeader *multipart.FileHeader
			if doc, err := c.FormFile("auditReport"); err == nil && doc != nil {
				auditHeader = doc
			}

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
				CarbonAmount:    req.CarbonAmount,
				ContractAddress: req.ContractAddress,
				Status:          statusPtr,
			}

			return h.projectService.Update(c, req.ID.String(), payload, userID, imageHeader, auditHeader)
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

func (h *ProjectHandler) Approve(c echo.Context) error {
	return Handle(
		h.Handler,
		func(c echo.Context, req *validation.ReviewProjectRequest) (*project.Project, error) {
			adminID := middleware.GetUserID(c)
			return h.projectService.Approve(c, req.ID, adminID)
		},
		http.StatusOK,
		&validation.ReviewProjectRequest{},
	)(c)
}

func (h *ProjectHandler) Reject(c echo.Context) error {
	return Handle(
		h.Handler,
		func(c echo.Context, req *validation.ReviewProjectRequest) (*project.Project, error) {
			adminID := middleware.GetUserID(c)
			return h.projectService.Reject(c, req.ID, adminID)
		},
		http.StatusOK,
		&validation.ReviewProjectRequest{},
	)(c)
}