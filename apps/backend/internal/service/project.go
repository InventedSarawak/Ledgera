package service

import (
	"fmt"
	"mime/multipart"

	"github.com/inventedsarawak/ledgera/internal/lib/upload"
	"github.com/inventedsarawak/ledgera/internal/middleware"
	"github.com/inventedsarawak/ledgera/internal/model/project"
	"github.com/inventedsarawak/ledgera/internal/repository"
	"github.com/inventedsarawak/ledgera/internal/server"
	"github.com/labstack/echo/v4"
)

type ProjectService struct {
	repo     *repository.ProjectRepository
	uploader *upload.Client
}

func NewProjectService(s *server.Server, repo *repository.ProjectRepository) *ProjectService {
	return &ProjectService{
		repo:     repo,
		uploader: s.Uploader,
	}
}

func (s *ProjectService) Create(ctx echo.Context, payload project.CreateProjectPayload, supplierID string, file *multipart.FileHeader) (*project.Project, error) {
	logger := middleware.GetLogger(ctx)
	logger.Info().Str("supplier_id", supplierID).Str("project_title", payload.Title).Msg("creating new project")

	if err := payload.Validate(); err != nil {
		return nil, err
	}

	// Upload image
	fileContent, err := file.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open image file: %w", err)
	}
	defer fileContent.Close()

	imageURL, err := s.uploader.Upload(ctx.Request().Context(), upload.UploadParams{
		File:        fileContent,
		Folder:      "projects",
		Filename:    file.Filename,
		UserID:      supplierID,
		ContentType: file.Header.Get("Content-Type"),
		Size:        file.Size,
	})
	if err != nil {
		logger.Error().Err(err).Msg("failed to upload image")
		return nil, fmt.Errorf("failed to upload image: %w", err)
	}

	p := project.Project{
		SupplierID:  supplierID,
		Title:       payload.Title,
		Description: payload.Description,
		ImageURL:    imageURL,
		LocationLat: payload.LocationLat,
		LocationLng: payload.LocationLng,
		Status:      project.ProjectStatusPending,
	}

	createdProject, err := s.repo.Create(ctx.Request().Context(), p)
	if err != nil {
		logger.Error().Err(err).Msg("failed to create project in db")
		return nil, err
	}

	logger.Info().Str("project_id", createdProject.ID.String()).Msg("project created successfully")
	return createdProject, nil
}

func (s *ProjectService) GetByID(ctx echo.Context, id string) (*project.Project, error) {
	return s.repo.FindByID(ctx.Request().Context(), id)
}

func (s *ProjectService) ListBySupplier(ctx echo.Context, supplierID string) ([]project.Project, error) {
	return s.repo.ListBySupplier(ctx.Request().Context(), supplierID)
}
