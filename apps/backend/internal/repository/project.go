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
			title, description, image_url, location_lat, location_lng, 
			supplier_id, status, created_at, updated_at
		) VALUES (
			@title, @description, @image_url, @location_lat, @location_lng,
			@supplier_id, @status, NOW(), NOW()
		) RETURNING id, created_at, updated_at
	`

	args := pgx.NamedArgs{
		"title":        p.Title,
		"description":  p.Description,
		"image_url":    p.ImageURL,
		"location_lat": p.LocationLat,
		"location_lng": p.LocationLng,
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
			location_lat, location_lng, contract_address, token_symbol, 
			status, created_at, updated_at
		FROM projects
		WHERE id = $1
	`

	var p project.Project
	err := r.s.DB.Pool.QueryRow(ctx, query, id).Scan(
		&p.ID, &p.SupplierID, &p.Title, &p.Description, &p.ImageURL,
		&p.LocationLat, &p.LocationLng, &p.ContractAddress, &p.TokenSymbol,
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

func (r *ProjectRepository) ListBySupplier(ctx context.Context, supplierID string) ([]project.Project, error) {
	query := `
		SELECT 
			id, supplier_id, title, description, image_url, 
			location_lat, location_lng, contract_address, token_symbol, 
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
			&p.LocationLat, &p.LocationLng, &p.ContractAddress, &p.TokenSymbol,
			&p.Status, &p.CreatedAt, &p.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		projects = append(projects, p)
	}

	return projects, nil
}
