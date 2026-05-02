package repository

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/inventedsarawak/ledgera/internal/model/project"
	"github.com/inventedsarawak/ledgera/internal/server"
	"github.com/jackc/pgx/v5"
)

type geojsonPolygon struct {
	Type        string         `json:"type"`
	Coordinates [][][2]float64 `json:"coordinates"`
}

func encodePolygon(coords [][2]float64) string {
	if len(coords) == 0 {
		return `{"type":"Polygon","coordinates":[]}`
	}
	geo := geojsonPolygon{
		Type:        "Polygon",
		Coordinates: [][][2]float64{coords},
	}
	b, _ := json.Marshal(geo)
	return string(b)
}

func decodePolygon(data []byte) [][2]float64 {
	if len(data) == 0 {
		return nil
	}
	var geo geojsonPolygon
	if err := json.Unmarshal(data, &geo); err == nil && len(geo.Coordinates) > 0 {
		return geo.Coordinates[0]
	}
	return nil
}

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
            location_polygon, area,
            carbon_amount_total, price_per_tonne,
            supplier_id, token_symbol, status, created_at, updated_at
        ) VALUES (
            @title, @description, @image_url, @audit_report_url,
            ST_GeomFromGeoJSON(@location_polygon), @area,
            @carbon_amount_total, @price_per_tonne,
            @supplier_id, @token_symbol, @status, NOW(), NOW()
        ) RETURNING id, location_lat, location_lng, created_at, updated_at
    `

	args := pgx.NamedArgs{
		"title":               p.Title,
		"description":         p.Description,
		"image_url":           p.ImageURL,
		"audit_report_url":    p.AuditReportURL, // New Field
		"location_polygon":    encodePolygon(p.LocationPolygon),
		"area":                p.Area,
		"carbon_amount_total": p.CarbonAmount,
		"price_per_tonne":     p.PricePerTonne,
		"supplier_id":         p.SupplierID,
		"token_symbol":        p.TokenSymbol,
		"status":              p.Status,
	}

	err := r.s.DB.Pool.QueryRow(ctx, query, args).Scan(&p.ID, &p.Latitude, &p.Longitude, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}

	// We can refetch or just return what we have. It will be queried later to get lat/long
	return &p, nil
}

func (r *ProjectRepository) FindByID(ctx context.Context, id string) (*project.Project, error) {
	query := `
        SELECT 
            id, supplier_id, title, description, image_url, audit_report_url,
            ST_AsGeoJSON(location_polygon), location_lat, location_lng, area, 
            carbon_amount_total, price_per_tonne,
            mint_address, token_symbol, 
            status, created_at, updated_at
        FROM projects
        WHERE id = @id
    `

	args := pgx.NamedArgs{
		"id": id,
	}

	var p project.Project
	var locBytes []byte
	err := r.s.DB.Pool.QueryRow(ctx, query, args).Scan(
		&p.ID, &p.SupplierID, &p.Title, &p.Description, &p.ImageURL, &p.AuditReportURL,
		&locBytes, &p.Latitude, &p.Longitude, &p.Area,
		&p.CarbonAmount, &p.PricePerTonne,
		&p.MintAddress, &p.TokenSymbol,
		&p.Status, &p.CreatedAt, &p.UpdatedAt,
	)
	if locBytes != nil {
		p.LocationPolygon = decodePolygon(locBytes)
	}

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
            ST_AsGeoJSON(location_polygon), location_lat, location_lng, area, 
            carbon_amount_total, price_per_tonne,
            mint_address, token_symbol, 
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
		var locBytes []byte
		if err := rows.Scan(
			&p.ID, &p.SupplierID, &p.Title, &p.Description, &p.ImageURL, &p.AuditReportURL,
			&locBytes, &p.Latitude, &p.Longitude, &p.Area,
			&p.CarbonAmount, &p.PricePerTonne,
			&p.MintAddress, &p.TokenSymbol,
			&p.Status, &p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		if locBytes != nil {
			p.LocationPolygon = decodePolygon(locBytes)
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
            ST_AsGeoJSON(location_polygon), location_lat, location_lng, area, 
            carbon_amount_total, price_per_tonne,
            mint_address, token_symbol,
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
		var locBytes []byte
		if err := rows.Scan(
			&p.ID, &p.SupplierID, &p.Title, &p.Description, &p.ImageURL, &p.AuditReportURL,
			&locBytes, &p.Latitude, &p.Longitude, &p.Area,
			&p.CarbonAmount, &p.PricePerTonne,
			&p.MintAddress, &p.TokenSymbol,
			&p.Status, &p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		if locBytes != nil {
			p.LocationPolygon = decodePolygon(locBytes)
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
            ST_AsGeoJSON(location_polygon), location_lat, location_lng, area, 
            carbon_amount_total, price_per_tonne,
            mint_address, token_symbol, 
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
		var locBytes []byte
		err := rows.Scan(
			&p.ID, &p.SupplierID, &p.Title, &p.Description, &p.ImageURL, &p.AuditReportURL,
			&locBytes, &p.Latitude, &p.Longitude, &p.Area,
			&p.CarbonAmount, &p.PricePerTonne,
			&p.MintAddress, &p.TokenSymbol,
			&p.Status, &p.CreatedAt, &p.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		if locBytes != nil {
			p.LocationPolygon = decodePolygon(locBytes)
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
            location_polygon = COALESCE(ST_GeomFromGeoJSON(@location_polygon), location_polygon),
            area = COALESCE(@area, area),
            carbon_amount_total = COALESCE(@carbon_amount_total, carbon_amount_total),
            mint_address = COALESCE(@mint_address, mint_address),
            token_symbol = COALESCE(@token_symbol, token_symbol),
            status = COALESCE(@status, status),
            updated_at = NOW()
        WHERE id = @id
        RETURNING 
            id, supplier_id, title, description, image_url, audit_report_url,
            ST_AsGeoJSON(location_polygon), location_lat, location_lng, area, 
            carbon_amount_total, price_per_tonne,
            mint_address, token_symbol,
            status, created_at, updated_at
    `

	var locPol *string
	if payload.LocationPolygon != nil {
		encoded := encodePolygon(*payload.LocationPolygon)
		locPol = &encoded
	}

	args := pgx.NamedArgs{
		"id":                  id,
		"title":               payload.Title,
		"description":         payload.Description,
		"image_url":           imageURL,
		"audit_report_url":    auditReportURL, // New Arg
		"location_polygon":    locPol,
		"area":                payload.Area,
		"carbon_amount_total": payload.CarbonAmount,
		"mint_address":        payload.MintAddress,
		"token_symbol":        payload.TokenSymbol,
		"status":              payload.Status,
	}

	var p project.Project
	var locBytes []byte
	err := r.s.DB.Pool.QueryRow(ctx, query, args).Scan(
		&p.ID, &p.SupplierID, &p.Title, &p.Description, &p.ImageURL, &p.AuditReportURL,
		&locBytes, &p.Latitude, &p.Longitude, &p.Area,
		&p.CarbonAmount, &p.PricePerTonne,
		&p.MintAddress, &p.TokenSymbol,
		&p.Status, &p.CreatedAt, &p.UpdatedAt,
	)
	if locBytes != nil {
		p.LocationPolygon = decodePolygon(locBytes)
	}
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
            ST_AsGeoJSON(location_polygon), location_lat, location_lng, area, 
            carbon_amount_total, price_per_tonne,
            mint_address, token_symbol,
            status, created_at, updated_at
    `

	args := pgx.NamedArgs{
		"id":     id,
		"status": status,
	}

	var p project.Project
	var locBytes []byte
	err := r.s.DB.Pool.QueryRow(ctx, query, args).Scan(
		&p.ID, &p.SupplierID, &p.Title, &p.Description, &p.ImageURL, &p.AuditReportURL,
		&locBytes, &p.Latitude, &p.Longitude, &p.Area,
		&p.CarbonAmount, &p.PricePerTonne,
		&p.MintAddress, &p.TokenSymbol,
		&p.Status, &p.CreatedAt, &p.UpdatedAt,
	)

	if locBytes != nil {
		p.LocationPolygon = decodePolygon(locBytes)
	}
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &p, nil
}

// CheckOverlap returns true if the provided polygon overlaps with any existing project that is APPROVED or DEPLOYED.
// We exclude the current project ID (if provided) to allow updates to a project's own shape without it conflicting with itself.
func (r *ProjectRepository) CheckOverlap(ctx context.Context, polygon [][2]float64, excludeProjectID *string) (bool, error) {
	if len(polygon) == 0 {
		return false, nil
	}

	query := `
		SELECT EXISTS (
			SELECT 1 
			FROM projects
			WHERE status IN ('APPROVED', 'DEPLOYED')
			AND ST_Intersects(location_polygon, ST_GeomFromGeoJSON(@location_polygon))
			`

	args := pgx.NamedArgs{
		"location_polygon": encodePolygon(polygon),
	}

	if excludeProjectID != nil && *excludeProjectID != "" {
		query += ` AND id != @exclude_id`
		args["exclude_id"] = *excludeProjectID
	}
	query += `)`

	var exists bool
	err := r.s.DB.Pool.QueryRow(ctx, query, args).Scan(&exists)
	if err != nil {
		return false, err
	}

	return exists, nil
}

// ProjectRegion is a lightweight struct for returning just the polygon data of approved/deployed projects.
type ProjectRegion struct {
	ID              string       `json:"id"`
	Title           string       `json:"title"`
	LocationPolygon [][2]float64 `json:"locationPolygon"`
}

// ListApprovedRegions returns the polygons of all APPROVED or DEPLOYED projects for map overlay display.
func (r *ProjectRepository) ListApprovedRegions(ctx context.Context, excludeProjectID *string) ([]ProjectRegion, error) {
	query := `
		SELECT id, title, ST_AsGeoJSON(location_polygon)
		FROM projects
		WHERE status IN ('APPROVED', 'DEPLOYED')
	`
	args := pgx.NamedArgs{}

	if excludeProjectID != nil && *excludeProjectID != "" {
		query += ` AND id != @exclude_id`
		args["exclude_id"] = *excludeProjectID
	}

	rows, err := r.s.DB.Pool.Query(ctx, query, args)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var regions []ProjectRegion = []ProjectRegion{}
	for rows.Next() {
		var r ProjectRegion
		var locBytes []byte
		if err := rows.Scan(&r.ID, &r.Title, &locBytes); err != nil {
			return nil, err
		}
		if locBytes != nil {
			r.LocationPolygon = decodePolygon(locBytes)
		}
		regions = append(regions, r)
	}

	return regions, nil
}
