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
			p.title, u.email, p.contract_address, p.token_symbol, u.wallet_address
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
			&listing.SellerWalletAddress,
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

// ReduceListingAmount reduces the available amount on a listing after a partial purchase
func (r *MarketplaceRepository) ReduceListingAmount(ctx context.Context, id string, reduceBy float64) error {
	query := `
		UPDATE marketplace_listings
		SET amount = amount - $2, updated_at = NOW()
		WHERE id = $1 AND amount >= $2
	`

	cmd, err := r.db.Pool.Exec(ctx, query, id, reduceBy)
	if err != nil {
		return fmt.Errorf("failed to reduce listing amount: %w", err)
	}
	if cmd.RowsAffected() == 0 {
		return fmt.Errorf("insufficient listing amount")
	}

	return nil
}

// CompleteListing marks a listing as sold (inactive)
func (r *MarketplaceRepository) CompleteListing(ctx context.Context, id string) error {
	return r.CancelListing(ctx, id)
}

// RecordPurchase inserts a purchase record
func (r *MarketplaceRepository) RecordPurchase(ctx context.Context, purchase model.Purchase) (*model.Purchase, error) {
	query := `
		INSERT INTO purchases (buyer_id, listing_id, project_id, seller_id, amount, price_eth, total_eth, tx_hash)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at
	`

	err := r.db.Pool.QueryRow(ctx, query,
		purchase.BuyerID,
		purchase.ListingID,
		purchase.ProjectID,
		purchase.SellerID,
		purchase.Amount,
		purchase.PriceETH,
		purchase.TotalETH,
		purchase.TxHash,
	).Scan(&purchase.ID, &purchase.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to record purchase: %w", err)
	}

	return &purchase, nil
}

// ListPurchasesByBuyer gets all purchases for a buyer with project details
func (r *MarketplaceRepository) ListPurchasesByBuyer(ctx context.Context, buyerID string, page, limit int) ([]model.PurchaseWithDetails, int, error) {
	offset := (page - 1) * limit

	// Count query
	var total int
	err := r.db.Pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM purchases WHERE buyer_id = $1`, buyerID,
	).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count purchases: %w", err)
	}

	// Data query with project details
	query := `
		SELECT 
			pu.id, pu.buyer_id, pu.listing_id, pu.project_id, pu.seller_id,
			pu.amount, pu.price_eth, pu.total_eth, pu.tx_hash, pu.created_at,
			p.title, p.token_symbol, p.contract_address
		FROM purchases pu
		INNER JOIN projects p ON pu.project_id = p.id
		WHERE pu.buyer_id = $1
		ORDER BY pu.created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.Pool.Query(ctx, query, buyerID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list purchases: %w", err)
	}
	defer rows.Close()

	purchases := []model.PurchaseWithDetails{}
	for rows.Next() {
		var p model.PurchaseWithDetails
		err := rows.Scan(
			&p.ID, &p.BuyerID, &p.ListingID, &p.ProjectID, &p.SellerID,
			&p.Amount, &p.PriceETH, &p.TotalETH, &p.TxHash, &p.CreatedAt,
			&p.ProjectTitle, &p.TokenSymbol, &p.TokenAddress,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan purchase: %w", err)
		}
		purchases = append(purchases, p)
	}

	return purchases, total, nil
}
