package project

import "github.com/inventedsarawak/ledgera/internal/model"

type ProjectStatus string

const (
	ProjectStatusDraft    ProjectStatus = "DRAFT"
	ProjectStatusPending  ProjectStatus = "PENDING"
	ProjectStatusApproved ProjectStatus = "APPROVED"
	ProjectStatusDeployed ProjectStatus = "DEPLOYED"
	ProjectStatusRejected ProjectStatus = "REJECTED"
)

type Project struct {
	model.Base

	SupplierID string `json:"supplierId" db:"supplier_id"`

	Title           string       `json:"title" db:"title"`
	Description     string       `json:"description" db:"description"`
	ImageURL        string       `json:"imageUrl" db:"image_url"`
	AuditReportURL  string       `json:"auditReportUrl" db:"audit_report_url"`
	LocationPolygon [][2]float64 `json:"locationPolygon" db:"-"` // We will handle this manually via ST_AsGeoJSON
	Area            float64      `json:"area" db:"area"`
	CarbonAmount    float64      `json:"carbonAmount" db:"carbon_amount_total"`
	PricePerTonne   float64      `json:"pricePerTonne" db:"price_per_tonne"`

	MintAddress *string `json:"mintAddress" db:"mint_address"` // Solana SPL token mint address (Base58)
	TokenSymbol *string `json:"tokenSymbol" db:"token_symbol"`

	// Computed by DB (PostGIS centroid) and stored via GENERATED column
	Latitude  float64 `json:"latitude" db:"location_lat"`
	Longitude float64 `json:"longitude" db:"location_lng"`

	Status ProjectStatus `json:"status" db:"status"`
}
