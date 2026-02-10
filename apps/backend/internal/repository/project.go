package repository

import (
	"context"
	"errors"

	"github.com/inventedsarawak/ledgera/internal/model/project"
	"github.com/inventedsarawak/ledgera/internal/server"
	"github.com/jackc/pgx/v5"
)

type ProjectRepository struct {
	s *server.Server
}

func NewProjectRepository(s *server.Server) *ProjectRepository {
	return &ProjectRepository{s: s}
}

func (r *ProjectRepository) Create(ctx context.Context, p project.Project) (*project.Project, error) {
	// Added: audit_report_url
	query := `
        INSERT INTO projects (
            title, description, image_url, audit_report_url,
            location_lat, location_lng, area,
            carbon_amount_total, price_per_tonne,
            supplier_id, status, created_at, updated_at
        ) VALUES (
            @title, @description, @image_url, @audit_report_url,
            @location_lat, @location_lng, @area,
            @carbon_amount_total, @price_per_tonne,
            @supplier_id, @status, NOW(), NOW()
        ) RETURNING id, created_at, updated_at
    `

	args := pgx.NamedArgs{
		"title":               p.Title,
		"description":         p.Description,
		"image_url":           p.ImageURL,
		"audit_report_url":    p.AuditReportURL, // New Field
		"location_lat":        p.LocationLat,
		"location_lng":        p.LocationLng,
		"area":                p.Area,
		"carbon_amount_total": p.CarbonAmount,
		"price_per_tonne":     p.PricePerTonne,
		"supplier_id":         p.SupplierID,
		"status":              p.Status,
	}

	err := r.s.DB.Pool.QueryRow(ctx, query, args).Scan(&p.ID, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}

	return &p, nil
}

func (r *ProjectRepository) FindByID(ctx context.Context, id string) (*project.Project, error) {
	query := `
        SELECT 
            id, supplier_id, title, description, image_url, audit_report_url,
            location_lat, location_lng, area, 
            carbon_amount_total, price_per_tonne,
            contract_address, token_symbol, 
            status, created_at, updated_at
        FROM projects
        WHERE id = @id
    `

	args := pgx.NamedArgs{
		"id": id,
	}

	var p project.Project
	err := r.s.DB.Pool.QueryRow(ctx, query, args).Scan(
		&p.ID, &p.SupplierID, &p.Title, &p.Description, &p.ImageURL, &p.AuditReportURL,
		&p.LocationLat, &p.LocationLng, &p.Area,
		&p.CarbonAmount, &p.PricePerTonne,
		&p.ContractAddress, &p.TokenSymbol,
		&p.Status, &p.CreatedAt, &p.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	return &p, nil
}

func (r *ProjectRepository) ListBySupplierPaginated(ctx context.Context, supplierID string, page int, limit int) ([]project.Project, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	offset := (page - 1) * limit

	listQuery := `
        SELECT 
            id, supplier_id, title, description, image_url, audit_report_url,
            location_lat, location_lng, area, 
            carbon_amount_total, price_per_tonne,
            contract_address, token_symbol, 
            status, created_at, updated_at
        FROM projects
        WHERE supplier_id = @supplier_id
        ORDER BY created_at DESC
        LIMIT @limit OFFSET @offset
    `

	listArgs := pgx.NamedArgs{
		"supplier_id": supplierID,
		"limit":       limit,
		"offset":      offset,
	}

	rows, err := r.s.DB.Pool.Query(ctx, listQuery, listArgs)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var projects []project.Project
	for rows.Next() {
		var p project.Project
		if err := rows.Scan(
			&p.ID, &p.SupplierID, &p.Title, &p.Description, &p.ImageURL, &p.AuditReportURL,
			&p.LocationLat, &p.LocationLng, &p.Area,
			&p.CarbonAmount, &p.PricePerTonne,
			&p.ContractAddress, &p.TokenSymbol,
			&p.Status, &p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		projects = append(projects, p)
	}

	var total int64
	countArgs := pgx.NamedArgs{"supplier_id": supplierID}
	err = r.s.DB.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM projects WHERE supplier_id = @supplier_id`, countArgs).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	return projects, total, nil
}

func (r *ProjectRepository) ListByStatusPaginated(ctx context.Context, status project.ProjectStatus, page int, limit int) ([]project.Project, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	offset := (page - 1) * limit

	listQuery := `
        SELECT
            id, supplier_id, title, description, image_url, audit_report_url,
            location_lat, location_lng, area, 
            carbon_amount_total, price_per_tonne,
            contract_address, token_symbol,
            status, created_at, updated_at
        FROM projects
        WHERE status = @status
        ORDER BY created_at DESC
        LIMIT @limit OFFSET @offset
    `

	listArgs := pgx.NamedArgs{
		"status": status,
		"limit":  limit,
		"offset": offset,
	}

	rows, err := r.s.DB.Pool.Query(ctx, listQuery, listArgs)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var projects []project.Project
	for rows.Next() {
		var p project.Project
		if err := rows.Scan(
			&p.ID, &p.SupplierID, &p.Title, &p.Description, &p.ImageURL, &p.AuditReportURL,
			&p.LocationLat, &p.LocationLng, &p.Area,
			&p.CarbonAmount, &p.PricePerTonne,
			&p.ContractAddress, &p.TokenSymbol,
			&p.Status, &p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		projects = append(projects, p)
	}

	var total int64
	countArgs := pgx.NamedArgs{"status": status}
	err = r.s.DB.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM projects WHERE status = @status`, countArgs).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	return projects, total, nil
}

func (r *ProjectRepository) ListBySupplier(ctx context.Context, supplierID string) ([]project.Project, error) {
	// Not paginated version
	query := `
        SELECT 
            id, supplier_id, title, description, image_url, audit_report_url,
            location_lat, location_lng, area, 
            carbon_amount_total, price_per_tonne,
            contract_address, token_symbol, 
            status, created_at, updated_at
        FROM projects
        WHERE supplier_id = @supplier_id
        ORDER BY created_at DESC
    `
	// ... (Implementation same as paginated but without LIMIT)
	// For brevity, assuming this is used less or can follow the pattern above
	// But to be safe, here is the implementation:
	args := pgx.NamedArgs{
		"supplier_id": supplierID,
	}

	rows, err := r.s.DB.Pool.Query(ctx, query, args)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var projects []project.Project = []project.Project{}
	for rows.Next() {
		var p project.Project
		err := rows.Scan(
			&p.ID, &p.SupplierID, &p.Title, &p.Description, &p.ImageURL, &p.AuditReportURL,
			&p.LocationLat, &p.LocationLng, &p.Area,
			&p.CarbonAmount, &p.PricePerTonne,
			&p.ContractAddress, &p.TokenSymbol,
			&p.Status, &p.CreatedAt, &p.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		projects = append(projects, p)
	}
	return projects, nil
}

func (r *ProjectRepository) Update(ctx context.Context, id string, payload project.UpdateProjectPayload, imageURL *string, auditReportURL *string) (*project.Project, error) {
	// Added: audit_report_url update support
	query := `
        UPDATE projects
        SET 
            title = COALESCE(@title, title),
            description = COALESCE(@description, description),
            image_url = COALESCE(@image_url, image_url),
            audit_report_url = COALESCE(@audit_report_url, audit_report_url),
            location_lat = COALESCE(@location_lat, location_lat),
            location_lng = COALESCE(@location_lng, location_lng),
            area = COALESCE(@area, area),
            carbon_amount_total = COALESCE(@carbon_amount_total, carbon_amount_total),
            contract_address = COALESCE(@contract_address, contract_address),
            status = COALESCE(@status, status),
            updated_at = NOW()
        WHERE id = @id
        RETURNING 
            id, supplier_id, title, description, image_url, audit_report_url,
            location_lat, location_lng, area, 
            carbon_amount_total, price_per_tonne,
            contract_address, token_symbol,
            status, created_at, updated_at
    `

	args := pgx.NamedArgs{
		"id":                  id,
		"title":               payload.Title,
		"description":         payload.Description,
		"image_url":           imageURL,
		"audit_report_url":    auditReportURL, // New Arg
		"location_lat":        payload.LocationLat,
		"location_lng":        payload.LocationLng,
		"area":                payload.Area,
		"carbon_amount_total": payload.CarbonAmount,
		"contract_address":    payload.ContractAddress,
		"status":              payload.Status,
	}

	var p project.Project
	err := r.s.DB.Pool.QueryRow(ctx, query, args).Scan(
		&p.ID, &p.SupplierID, &p.Title, &p.Description, &p.ImageURL, &p.AuditReportURL,
		&p.LocationLat, &p.LocationLng, &p.Area,
		&p.CarbonAmount, &p.PricePerTonne,
		&p.ContractAddress, &p.TokenSymbol,
		&p.Status, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &p, nil
}

func (r *ProjectRepository) Delete(ctx context.Context, id string) error {
	args := pgx.NamedArgs{"id": id}
	cmd, err := r.s.DB.Pool.Exec(ctx, "DELETE FROM projects WHERE id = @id", args)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return nil
	}
	return nil
}

// UpdateStatus remains same but scan must include all fields
func (r *ProjectRepository) UpdateStatus(ctx context.Context, id string, status project.ProjectStatus) (*project.Project, error) {
	query := `
        UPDATE projects
        SET status = @status, updated_at = NOW()
        WHERE id = @id
        RETURNING 
            id, supplier_id, title, description, image_url, audit_report_url,
            location_lat, location_lng, area, 
            carbon_amount_total, price_per_tonne,
            contract_address, token_symbol,
            status, created_at, updated_at
    `

	args := pgx.NamedArgs{
		"id":     id,
		"status": status,
	}

	var p project.Project
	err := r.s.DB.Pool.QueryRow(ctx, query, args).Scan(
		&p.ID, &p.SupplierID, &p.Title, &p.Description, &p.ImageURL, &p.AuditReportURL,
		&p.LocationLat, &p.LocationLng, &p.Area,
		&p.CarbonAmount, &p.PricePerTonne,
		&p.ContractAddress, &p.TokenSymbol,
		&p.Status, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &p, nil
}