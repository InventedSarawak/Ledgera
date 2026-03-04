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
	"github.com/inventedsarawak/ledgera/internal/validation"
	"github.com/labstack/echo/v4"
)

type ProjectService struct {
	repo               *repository.ProjectRepository
	userRepo           *repository.UserRepository
	uploader           *upload.Client
	blockchainService  *BlockchainService
	marketplaceService *MarketplaceService
}

func NewProjectService(
	s *server.Server,
	repo *repository.ProjectRepository,
	userRepo *repository.UserRepository,
	blockchainService *BlockchainService,
	marketplaceService *MarketplaceService,
) *ProjectService {
	return &ProjectService{
		repo:               repo,
		userRepo:           userRepo,
		uploader:           s.Uploader,
		blockchainService:  blockchainService,
		marketplaceService: marketplaceService,
	}
}

// Create now accepts optional auditFile
func (s *ProjectService) Create(ctx echo.Context, payload project.CreateProjectPayload, supplierID string, imageFile *multipart.FileHeader, auditFile *multipart.FileHeader) (*project.Project, error) {
	logger := middleware.GetLogger(ctx)
	logger.Info().Str("supplier_id", supplierID).Str("project_title", payload.Title).Msg("creating new project")

	if err := payload.Validate(); err != nil {
		return nil, err
	}

	// 1. Upload Image (Required)
	imageURL, err := s.uploadFile(ctx, imageFile, "projects", supplierID)
	if err != nil {
		return nil, err
	}

	// 2. Upload Audit Report (Optional)
	var auditReportURL string
	if auditFile != nil {
		url, err := s.uploadFile(ctx, auditFile, "documents", supplierID)
		if err != nil {
			return nil, err
		}
		auditReportURL = url
	}

	// Define Base Price (Hardcoded for MVP)
	const INITIAL_MARKET_PRICE = 15.00

	// Auto-assign token symbol from project title so it's always available
	tokenSymbol := s.blockchainService.generateTokenSymbol(payload.Title)

	p := project.Project{
		SupplierID:  supplierID,
		Title:       payload.Title,
		Description: payload.Description,

		ImageURL:       imageURL,
		AuditReportURL: auditReportURL, // Save the URL

		LocationLat: payload.LocationLat,
		LocationLng: payload.LocationLng,
		Area:        payload.Area,

		CarbonAmount:  payload.CarbonAmount,
		PricePerTonne: INITIAL_MARKET_PRICE,

		TokenSymbol: &tokenSymbol,

		Status: project.ProjectStatusDraft,
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

// Update now accepts optional auditFile
func (s *ProjectService) Update(ctx echo.Context, id string, payload project.UpdateProjectPayload, userID string, imageFile *multipart.FileHeader, auditFile *multipart.FileHeader) (*project.Project, error) {
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
	if existing.Status == project.ProjectStatusPending || existing.Status == project.ProjectStatusApproved || existing.Status == project.ProjectStatusDeployed {
		return nil, echo.NewHTTPError(http.StatusBadRequest, "Project cannot be edited after submission")
	}

	// Handle Image Update
	var newImageURL *string
	if imageFile != nil {
		url, err := s.uploadFile(ctx, imageFile, "projects", userID)
		if err != nil {
			return nil, err
		}
		newImageURL = &url
	}

	// Handle Audit Report Update
	var newAuditURL *string
	if auditFile != nil {
		url, err := s.uploadFile(ctx, auditFile, "documents", userID)
		if err != nil {
			return nil, err
		}
		newAuditURL = &url
	}

	// Pass both URLs to the Repo
	updated, err := s.repo.Update(ctx.Request().Context(), id, payload, newImageURL, newAuditURL)
	if err != nil {
		return nil, err
	}
	return updated, nil
}

// Helper to reduce duplication
func (s *ProjectService) uploadFile(ctx echo.Context, file *multipart.FileHeader, folder string, userID string) (string, error) {
	if s.uploader == nil {
		return fmt.Sprintf("https://example.com/%s/%s", folder, file.Filename), nil
	}

	fileContent, err := file.Open()
	if err != nil {
		return "", fmt.Errorf("failed to open file: %w", err)
	}
	defer fileContent.Close()

	return s.uploader.Upload(ctx.Request().Context(), upload.UploadParams{
		File:        fileContent,
		Folder:      folder,
		Filename:    file.Filename,
		UserID:      userID,
		ContentType: file.Header.Get("Content-Type"),
		Size:        file.Size,
	})
}

// ... (Rest of the service methods: Delete, SendForApproval, ListPendingForReview, Approve, Reject, ensureAdmin remain unchanged) ...
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

	// Trigger blockchain deployment
	if s.blockchainService != nil {
		go func() {
			// Deploy in background to avoid blocking the HTTP response
			if err := s.blockchainService.DeployProject(ctx, id); err != nil {
				logger.Error().
					Err(err).
					Str("project_id", id).
					Msg("failed to deploy project token in background")
				// Note: In production, you might want to implement a retry mechanism
				// or update the project status to indicate deployment failure
			}
		}()
	} else {
		logger.Warn().Msg("blockchain service not available, skipping token deployment")
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

func (s *ProjectService) MintTokens(ctx echo.Context, projectID string, userID string) error {
	p, err := s.repo.FindByID(ctx.Request().Context(), projectID)
	if err != nil {
		return err
	}
	if p == nil {
		return echo.NewHTTPError(http.StatusNotFound, "project not found")
	}

	if p.SupplierID != userID {
		return echo.NewHTTPError(http.StatusForbidden, "you are not the owner of this project")
	}

	if p.Status != project.ProjectStatusApproved {
		return echo.NewHTTPError(http.StatusBadRequest, fmt.Sprintf("project status is %s, must be APPROVED to mint", p.Status))
	}

	// Ensure contract is deployed (in case background job failed or hasn't run)
	if p.ContractAddress == nil || *p.ContractAddress == "" {
		// Deploy now synchronously
		if err := s.blockchainService.DeployProject(ctx, projectID); err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "failed to deploy project contract").SetInternal(err)
		}
	}

	// Call Blockchain Service passing the unscaled CarbonAmount (it will create Token ID 0 and scale it by 1000)
	if err := s.blockchainService.MintProjectTokens(ctx.Request().Context(), projectID, p.CarbonAmount); err != nil {
		return err
	}

	// Update Status to DEPLOYED
	if _, err := s.repo.UpdateStatus(ctx.Request().Context(), projectID, project.ProjectStatusDeployed); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to update project status").SetInternal(err)
	}

	// We list the entire minted amount at 0.1 ETH per tonne of CO2
	// This is a temporary hardcoded price as per user request
	// Pass TokenID 0 for the initial supply listing.
	req := validation.CreateListingRequest{
		ProjectID: projectID,
		TokenID:   0,
		Amount:    p.CarbonAmount,
		PriceETH:  0.1,
	}
	if _, err := s.marketplaceService.CreateListing(ctx, req, userID); err != nil {
		// Log the error but don't fail the request completely since tokens are already minted
		// Ideally, we should have a way to retry this or alert the user
		return echo.NewHTTPError(http.StatusPartialContent, "tokens minted successfully, but failed to create marketplace listing").SetInternal(err)
	}

	return nil
}
