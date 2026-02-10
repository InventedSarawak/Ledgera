package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/inventedsarawak/ledgera/internal/database"
	"github.com/inventedsarawak/ledgera/internal/model"
)

type MarketplaceRepository struct {
	db *database.Database
}

func NewMarketplaceRepository(db *database.Database) *MarketplaceRepository {
	return &MarketplaceRepository{db: db}
}

// CreateListing creates a new marketplace listing
func (r *MarketplaceRepository) CreateListing(ctx context.Context, projectID, sellerID string, amount, priceETH float64) (*model.Listing, error) {
	query := `
		INSERT INTO marketplace_listings (id, project_id, seller_id, amount, price_eth, active)
		VALUES ($1, $2, $3, $4, $5, true)
		RETURNING id, project_id, seller_id, amount, price_eth, active, created_at, updated_at
	`

	id := uuid.New().String()
	var listing model.Listing
	err := r.db.Pool.QueryRow(ctx, query, id, projectID, sellerID, amount, priceETH).Scan(
		&listing.ID,
		&listing.ProjectID,
		&listing.SellerID,
		&listing.Amount,
		&listing.PriceETH,
		&listing.Active,
		&listing.CreatedAt,
		&listing.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create listing: %w", err)
	}

	return &listing, nil
}

// FindListingByID gets a listing by ID
func (r *MarketplaceRepository) FindListingByID(ctx context.Context, id string) (*model.Listing, error) {
	query := `
		SELECT id, project_id, seller_id, amount, price_eth, active, created_at, updated_at
		FROM marketplace_listings
		WHERE id = $1
	`

	var listing model.Listing
	err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&listing.ID,
		&listing.ProjectID,
		&listing.SellerID,
		&listing.Amount,
		&listing.PriceETH,
		&listing.Active,
		&listing.CreatedAt,
		&listing.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &listing, nil
}

// ListActiveListings gets all active marketplace listings
func (r *MarketplaceRepository) ListActiveListings(ctx context.Context, page, limit int, projectID *string) ([]model.ListingWithDetails, int, error) {
	offset := (page - 1) * limit

	// Base query with joins
	baseQuery := `
		FROM marketplace_listings ml
		INNER JOIN projects p ON ml.project_id = p.id
		INNER JOIN users u ON ml.seller_id = u.clerk_id
		WHERE ml.active = true
	`

	args := []interface{}{}
	argNum := 1

	if projectID != nil {
		baseQuery += fmt.Sprintf(" AND ml.project_id = $%d::uuid", argNum)
		args = append(args, *projectID)
		argNum++
	}

	// Count query
	countQuery := "SELECT COUNT(*) " + baseQuery
	var total int
	err := r.db.Pool.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count listings: %w", err)
	}

	// Data query
	dataQuery := `
		SELECT 
			ml.id, ml.project_id, ml.seller_id, ml.amount, ml.price_eth, ml.active, ml.created_at, ml.updated_at,
			p.title, u.email, p.contract_address, p.title
		` + baseQuery + `
		ORDER BY ml.created_at DESC
		LIMIT $` + fmt.Sprintf("%d", argNum) + ` OFFSET $` + fmt.Sprintf("%d", argNum+1)

	args = append(args, limit, offset)

	rows, err := r.db.Pool.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list listings: %w", err)
	}
	defer rows.Close()

	listings := []model.ListingWithDetails{}
	for rows.Next() {
		var listing model.ListingWithDetails
		err := rows.Scan(
			&listing.ID,
			&listing.ProjectID,
			&listing.SellerID,
			&listing.Amount,
			&listing.PriceETH,
			&listing.Active,
			&listing.CreatedAt,
			&listing.UpdatedAt,
			&listing.ProjectTitle,
			&listing.SellerEmail,
			&listing.TokenAddress,
			&listing.TokenSymbol,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan listing: %w", err)
		}
		listings = append(listings, listing)
	}

	return listings, total, nil
}

// CancelListing marks a listing as inactive
func (r *MarketplaceRepository) CancelListing(ctx context.Context, id string) error {
	query := `
		UPDATE marketplace_listings
		SET active = false, updated_at = NOW()
		WHERE id = $1
	`

	_, err := r.db.Pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to cancel listing: %w", err)
	}

	return nil
}

// CompleteListing marks a listing as sold (inactive)
func (r *MarketplaceRepository) CompleteListing(ctx context.Context, id string) error {
	return r.CancelListing(ctx, id)
}
