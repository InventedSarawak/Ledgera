package service

import (
	"fmt"
	"mime/multipart"
	"net/http"
	"strings"

	"github.com/inventedsarawak/ledgera/internal/lib/upload"
	"github.com/inventedsarawak/ledgera/internal/middleware"
	"github.com/inventedsarawak/ledgera/internal/model/project"
	"github.com/inventedsarawak/ledgera/internal/model/user"
	"github.com/inventedsarawak/ledgera/internal/repository"
	"github.com/inventedsarawak/ledgera/internal/server"
	"github.com/labstack/echo/v4"
)

type ProjectService struct {
	repo     *repository.ProjectRepository
	userRepo *repository.UserRepository
	uploader *upload.Client
}

func NewProjectService(s *server.Server, repo *repository.ProjectRepository, userRepo *repository.UserRepository) *ProjectService {
	return &ProjectService{
		repo:     repo,
		userRepo: userRepo,
		uploader: s.Uploader,
	}
}

func (s *ProjectService) Create(ctx echo.Context, payload project.CreateProjectPayload, supplierID string, file *multipart.FileHeader) (*project.Project, error) {
	logger := middleware.GetLogger(ctx)
	logger.Info().Str("supplier_id", supplierID).Str("project_title", payload.Title).Msg("creating new project")

	if err := payload.Validate(); err != nil {
		return nil, err
	}

	// Upload image (skip external upload in tests when uploader is nil)
	var imageURL string
	if s.uploader == nil {
		// Fallback stub URL for tests
		imageURL = fmt.Sprintf("https://example.com/projects/%s", file.Filename)
	} else {
		fileContent, err := file.Open()
		if err != nil {
			return nil, fmt.Errorf("failed to open image file: %w", err)
		}
		defer fileContent.Close()

		imageURL, err = s.uploader.Upload(ctx.Request().Context(), upload.UploadParams{
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
	}

	p := project.Project{
		SupplierID:  supplierID,
		Title:       payload.Title,
		Description: payload.Description,
		ImageURL:    imageURL,
		LocationLat: payload.LocationLat,
		LocationLng: payload.LocationLng,
		Area:        payload.Area,
		Status:      project.ProjectStatusDraft,
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

func (s *ProjectService) ListBySupplier(ctx echo.Context, supplierID string, page int, limit int) ([]project.Project, int64, error) {
	return s.repo.ListBySupplierPaginated(ctx.Request().Context(), supplierID, page, limit)
}

func (s *ProjectService) Update(ctx echo.Context, id string, payload project.UpdateProjectPayload, userID string, file *multipart.FileHeader) (*project.Project, error) {
	logger := middleware.GetLogger(ctx)
	logger.Info().Str("project_id", id).Str("user_id", userID).Msg("updating project")

	if err := payload.Validate(); err != nil {
		return nil, err
	}

	existing, err := s.repo.FindByID(ctx.Request().Context(), id)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, echo.NewHTTPError(http.StatusNotFound, "Project not found")
	}
	if existing.SupplierID != userID {
		return nil, echo.NewHTTPError(http.StatusForbidden, "You do not own this project")
	}
	// Disallow edits when submitted/approved/deployed
	if existing.Status == project.ProjectStatusPending || existing.Status == project.ProjectStatusApproved || existing.Status == project.ProjectStatusDeployed {
		return nil, echo.NewHTTPError(http.StatusBadRequest, "Project cannot be edited after submission")
	}

	var newImageURL *string
	if file != nil {
		if s.uploader == nil {
			// Fallback stub URL for tests
			stub := fmt.Sprintf("https://example.com/projects/%s", file.Filename)
			newImageURL = &stub
		} else {
			fileContent, err := file.Open()
			if err != nil {
				return nil, fmt.Errorf("failed to open image file: %w", err)
			}
			defer fileContent.Close()

			imageURL, err := s.uploader.Upload(ctx.Request().Context(), upload.UploadParams{
				File:        fileContent,
				Folder:      "projects",
				Filename:    file.Filename,
				UserID:      userID,
				ContentType: file.Header.Get("Content-Type"),
				Size:        file.Size,
			})
			if err != nil {
				logger.Error().Err(err).Msg("failed to upload image")
				return nil, fmt.Errorf("failed to upload image: %w", err)
			}
			newImageURL = &imageURL
		}
	}

	updated, err := s.repo.Update(ctx.Request().Context(), id, payload, newImageURL)
	if err != nil {
		return nil, err
	}
	return updated, nil
}

func (s *ProjectService) Delete(ctx echo.Context, id string, userID string) error {
	logger := middleware.GetLogger(ctx)
	logger.Info().Str("project_id", id).Str("user_id", userID).Msg("deleting project")

	existing, err := s.repo.FindByID(ctx.Request().Context(), id)
	if err != nil {
		return err
	}
	if existing == nil {
		return echo.NewHTTPError(http.StatusNotFound, "Project not found")
	}
	if existing.SupplierID != userID {
		return echo.NewHTTPError(http.StatusForbidden, "You do not own this project")
	}
	// Allow delete only when editable (DRAFT or REJECTED)
	if !(existing.Status == project.ProjectStatusDraft || existing.Status == project.ProjectStatusRejected) {
		return echo.NewHTTPError(http.StatusBadRequest, "Project cannot be deleted after submission")
	}

	return s.repo.Delete(ctx.Request().Context(), id)
}

func (s *ProjectService) SendForApproval(ctx echo.Context, id string, userID string) error {
	logger := middleware.GetLogger(ctx)
	logger.Info().Str("project_id", id).Str("user_id", userID).Msg("sending project for approval")

	existing, err := s.repo.FindByID(ctx.Request().Context(), id)
	if err != nil {
		return err
	}
	if existing == nil {
		return echo.NewHTTPError(http.StatusNotFound, "Project not found")
	}
	if existing.SupplierID != userID {
		return echo.NewHTTPError(http.StatusForbidden, "You do not own this project")
	}
	if existing.Status == project.ProjectStatusPending {
		return echo.NewHTTPError(http.StatusBadRequest, "Project is already submitted")
	}
	if existing.Status == project.ProjectStatusApproved || existing.Status == project.ProjectStatusDeployed {
		return echo.NewHTTPError(http.StatusBadRequest, "Approved or deployed project cannot be re-submitted")
	}

	_, err = s.repo.UpdateStatus(ctx.Request().Context(), id, project.ProjectStatusPending)
	return err
}

func (s *ProjectService) ListPendingForReview(ctx echo.Context, adminID string, page int, limit int) ([]project.ProjectWithSupplier, int64, error) {
	logger := middleware.GetLogger(ctx)
	logger.Info().Str("admin_id", adminID).Msg("listing pending projects for review")

	if err := s.ensureAdmin(ctx, adminID); err != nil {
		return nil, 0, err
	}

	projectsList, total, err := s.repo.ListByStatusPaginated(ctx.Request().Context(), project.ProjectStatusPending, page, limit)
	if err != nil {
		logger.Error().Err(err).Msg("failed to list pending projects")
		return nil, 0, err
	}

	var results []project.ProjectWithSupplier
	for _, p := range projectsList {
		email := "unknown"
		supplier, err := s.userRepo.FindByClerkID(ctx.Request().Context(), p.SupplierID)
		if err == nil && supplier != nil {
			email = supplier.Email
		}

		results = append(results, project.ProjectWithSupplier{
			Project:       p,
			SupplierEmail: email,
		})
	}

	return results, total, nil
}

func (s *ProjectService) Approve(ctx echo.Context, id string, adminID string) (*project.Project, error) {
	logger := middleware.GetLogger(ctx)
	logger.Info().Str("project_id", id).Str("admin_id", adminID).Msg("approving project")

	if err := s.ensureAdmin(ctx, adminID); err != nil {
		return nil, err
	}

	existing, err := s.repo.FindByID(ctx.Request().Context(), id)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, echo.NewHTTPError(http.StatusNotFound, "Project not found")
	}
	if existing.Status != project.ProjectStatusPending {
		return nil, echo.NewHTTPError(http.StatusBadRequest, "Only pending projects can be approved")
	}

	updated, err := s.repo.UpdateStatus(ctx.Request().Context(), id, project.ProjectStatusApproved)
	if err != nil {
		logger.Error().Err(err).Msg("failed to approve project")
		return nil, err
	}

	return updated, nil
}

func (s *ProjectService) Reject(ctx echo.Context, id string, adminID string) (*project.Project, error) {
	logger := middleware.GetLogger(ctx)
	logger.Info().Str("project_id", id).Str("admin_id", adminID).Msg("rejecting project")

	if err := s.ensureAdmin(ctx, adminID); err != nil {
		return nil, err
	}

	existing, err := s.repo.FindByID(ctx.Request().Context(), id)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, echo.NewHTTPError(http.StatusNotFound, "Project not found")
	}
	if existing.Status != project.ProjectStatusPending {
		return nil, echo.NewHTTPError(http.StatusBadRequest, "Only pending projects can be rejected")
	}

	updated, err := s.repo.UpdateStatus(ctx.Request().Context(), id, project.ProjectStatusRejected)
	if err != nil {
		logger.Error().Err(err).Msg("failed to reject project")
		return nil, err
	}

	return updated, nil
}

func (s *ProjectService) ensureAdmin(ctx echo.Context, clerkID string) error {
	ctxRole := strings.ToUpper(strings.TrimSpace(middleware.GetUserRole(ctx)))
	logger := middleware.GetLogger(ctx)

	// DEBUG LOGGING
	logger.Info().
		Str("context_role", ctxRole).
		Str("clerk_id", clerkID).
		Msg("DEBUG: EnsureAdmin Check")

	if ctxRole == string(user.RoleAdmin) {
		return nil
	}

	if clerkID == "" {
		return echo.NewHTTPError(http.StatusUnauthorized, "Unauthorized")
	}

	logger.Debug().Str("clerk_id", clerkID).Msg("verifying admin access via repository")

	adminUser, err := s.userRepo.FindByClerkID(ctx.Request().Context(), clerkID)
	if err != nil {
		logger.Error().Err(err).Msg("failed to load user for admin verification")
		return err
	}
	if adminUser == nil {
		return echo.NewHTTPError(http.StatusForbidden, "User record missing")
	}

	// DEBUG LOGGING
	logger.Info().
		Str("db_role", string(adminUser.Role)).
		Str("db_user_id", adminUser.ID.String()).
		Msg("DEBUG: EnsureAdmin DB Result")

	if adminUser.Role != user.RoleAdmin {
		return echo.NewHTTPError(http.StatusForbidden, fmt.Sprintf("Admin access required. ContextRole=%s, DBRole=%s", ctxRole, adminUser.Role))
	}

	return nil
}
