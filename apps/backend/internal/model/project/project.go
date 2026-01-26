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

	SupplierID string `json:"supplierId" db:"supplier_id"` // Clerk ID

	// Metadata
	Title       string  `json:"title" db:"title"`
	Description string  `json:"description" db:"description"`
	ImageURL    string  `json:"imageUrl" db:"image_url"`
	LocationLat float64 `json:"locationLat" db:"location_lat"`
	LocationLng float64 `json:"locationLng" db:"location_lng"`
	Area        float64 `json:"area" db:"area"`

	// Blockchain Data (Nullable)
	ContractAddress *string `json:"contractAddress" db:"contract_address"`
	TokenSymbol     *string `json:"tokenSymbol" db:"token_symbol"`

	Status ProjectStatus `json:"status" db:"status"`
}
