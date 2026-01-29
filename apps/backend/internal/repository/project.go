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
	query := `
		INSERT INTO projects (
			title, description, image_url, location_lat, location_lng, area,
			supplier_id, status, created_at, updated_at
		) VALUES (
			@title, @description, @image_url, @location_lat, @location_lng, @area,
			@supplier_id, @status, NOW(), NOW()
		) RETURNING id, created_at, updated_at
	`

	args := pgx.NamedArgs{
		"title":        p.Title,
		"description":  p.Description,
		"image_url":    p.ImageURL,
		"location_lat": p.LocationLat,
		"location_lng": p.LocationLng,
		"area":         p.Area,
		"supplier_id":  p.SupplierID,
		"status":       p.Status,
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
			id, supplier_id, title, description, image_url, 
			location_lat, location_lng, area, contract_address, token_symbol, 
			status, created_at, updated_at
		FROM projects
		WHERE id = $1
	`

	var p project.Project
	err := r.s.DB.Pool.QueryRow(ctx, query, id).Scan(
		&p.ID, &p.SupplierID, &p.Title, &p.Description, &p.ImageURL,
		&p.LocationLat, &p.LocationLng, &p.Area, &p.ContractAddress, &p.TokenSymbol,
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
			id, supplier_id, title, description, image_url, 
			location_lat, location_lng, area, contract_address, token_symbol, 
			status, created_at, updated_at
		FROM projects
		WHERE supplier_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.s.DB.Pool.Query(ctx, listQuery, supplierID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var projects []project.Project
	for rows.Next() {
		var p project.Project
		if err := rows.Scan(
			&p.ID, &p.SupplierID, &p.Title, &p.Description, &p.ImageURL,
			&p.LocationLat, &p.LocationLng, &p.Area, &p.ContractAddress, &p.TokenSymbol,
			&p.Status, &p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		projects = append(projects, p)
	}

	var total int64
	err = r.s.DB.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM projects WHERE supplier_id = $1`, supplierID).Scan(&total)
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
			id, supplier_id, title, description, image_url,
			location_lat, location_lng, area, contract_address, token_symbol,
			status, created_at, updated_at
		FROM projects
		WHERE status = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.s.DB.Pool.Query(ctx, listQuery, status, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var projects []project.Project
	for rows.Next() {
		var p project.Project
		if err := rows.Scan(
			&p.ID, &p.SupplierID, &p.Title, &p.Description, &p.ImageURL,
			&p.LocationLat, &p.LocationLng, &p.Area, &p.ContractAddress, &p.TokenSymbol,
			&p.Status, &p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		projects = append(projects, p)
	}

	var total int64
	err = r.s.DB.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM projects WHERE status = $1`, status).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	return projects, total, nil
}

func (r *ProjectRepository) ListBySupplier(ctx context.Context, supplierID string) ([]project.Project, error) {
	query := `
		SELECT 
			id, supplier_id, title, description, image_url, 
			location_lat, location_lng, area, contract_address, token_symbol, 
			status, created_at, updated_at
		FROM projects
		WHERE supplier_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.s.DB.Pool.Query(ctx, query, supplierID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var projects []project.Project = []project.Project{}
	for rows.Next() {
		var p project.Project
		err := rows.Scan(
			&p.ID, &p.SupplierID, &p.Title, &p.Description, &p.ImageURL,
			&p.LocationLat, &p.LocationLng, &p.Area, &p.ContractAddress, &p.TokenSymbol,
			&p.Status, &p.CreatedAt, &p.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		projects = append(projects, p)
	}

	return projects, nil
}

func (r *ProjectRepository) Update(ctx context.Context, id string, payload project.UpdateProjectPayload, imageURL *string) (*project.Project, error) {
	query := `
		UPDATE projects
		SET 
			title = COALESCE(@title, title),
			description = COALESCE(@description, description),
			image_url = COALESCE(@image_url, image_url),
			location_lat = COALESCE(@location_lat, location_lat),
			location_lng = COALESCE(@location_lng, location_lng),
			area = COALESCE(@area, area),
			contract_address = COALESCE(@contract_address, contract_address),
			status = COALESCE(@status, status),
			updated_at = NOW()
		WHERE id = @id
		RETURNING 
			id, supplier_id, title, description, image_url,
			location_lat, location_lng, area, contract_address, token_symbol,
			status, created_at, updated_at
	`

	args := pgx.NamedArgs{
		"id":               id,
		"title":            payload.Title,
		"description":      payload.Description,
		"image_url":        imageURL,
		"location_lat":     payload.LocationLat,
		"location_lng":     payload.LocationLng,
		"area":             payload.Area,
		"contract_address": payload.ContractAddress,
		"status":           payload.Status,
	}

	var p project.Project
	err := r.s.DB.Pool.QueryRow(ctx, query, args).Scan(
		&p.ID, &p.SupplierID, &p.Title, &p.Description, &p.ImageURL,
		&p.LocationLat, &p.LocationLng, &p.Area, &p.ContractAddress, &p.TokenSymbol,
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

func (r *ProjectRepository) UpdateStatus(ctx context.Context, id string, status project.ProjectStatus) (*project.Project, error) {
	query := `
		UPDATE projects
		SET status = $2, updated_at = NOW()
		WHERE id = $1
		RETURNING 
			id, supplier_id, title, description, image_url,
			location_lat, location_lng, area, contract_address, token_symbol,
			status, created_at, updated_at
	`

	var p project.Project
	err := r.s.DB.Pool.QueryRow(ctx, query, id, status).Scan(
		&p.ID, &p.SupplierID, &p.Title, &p.Description, &p.ImageURL,
		&p.LocationLat, &p.LocationLng, &p.Area, &p.ContractAddress, &p.TokenSymbol,
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
	cmd, err := r.s.DB.Pool.Exec(ctx, "DELETE FROM projects WHERE id = $1", id)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return nil
	}
	return nil
}
