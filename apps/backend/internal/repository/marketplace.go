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

// CreateListing creates a new marketplace listing (lot-based)
func (r *MarketplaceRepository) CreateListing(ctx context.Context, projectID, sellerID string, tokenID int, scaledAmount int64, priceETH float64) (*model.Listing, error) {
	query := `
		INSERT INTO marketplace_listings (id, project_id, seller_id, token_id, scaled_amount, price_eth, active)
		VALUES ($1, $2, $3, $4, $5, $6, true)
		RETURNING id, project_id, seller_id, token_id, scaled_amount, price_eth, active, created_at, updated_at
	`

	id := uuid.New().String()
	var listing model.Listing
	err := r.db.Pool.QueryRow(ctx, query, id, projectID, sellerID, tokenID, scaledAmount, priceETH).Scan(
		&listing.ID,
		&listing.ProjectID,
		&listing.SellerID,
		&listing.TokenID,
		&listing.ScaledAmount,
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
		SELECT id, project_id, seller_id, token_id, scaled_amount, price_eth, active, created_at, updated_at
		FROM marketplace_listings
		WHERE id = $1
	`

	var listing model.Listing
	err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&listing.ID,
		&listing.ProjectID,
		&listing.SellerID,
		&listing.TokenID,
		&listing.ScaledAmount,
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
			ml.id, ml.project_id, ml.seller_id, ml.token_id, ml.scaled_amount, ml.price_eth, ml.active, ml.created_at, ml.updated_at,
			p.title, p.description, p.image_url, u.email, p.contract_address, p.token_symbol, u.wallet_address
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
			&listing.TokenID,
			&listing.ScaledAmount,
			&listing.PriceETH,
			&listing.Active,
			&listing.CreatedAt,
			&listing.UpdatedAt,
			&listing.ProjectTitle,
			&listing.ProjectDescription,
			&listing.ProjectImageURL,
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

// ReduceListingAmount reduces the available scaled_amount on a listing after a partial purchase
func (r *MarketplaceRepository) ReduceListingAmount(ctx context.Context, id string, reduceByScaled int64) error {
	query := `
		UPDATE marketplace_listings
		SET scaled_amount = scaled_amount - $2, updated_at = NOW()
		WHERE id = $1 AND scaled_amount >= $2
	`

	cmd, err := r.db.Pool.Exec(ctx, query, id, reduceByScaled)
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

// GetActiveListedAmountScaled (Scaled) returns the total scaled amount currently listed by a seller for a specific project (all tokens)
func (r *MarketplaceRepository) GetActiveListedAmountScaled(ctx context.Context, sellerID, projectID string) (int64, error) {
	query := `
		SELECT COALESCE(SUM(scaled_amount), 0)
		FROM marketplace_listings
		WHERE seller_id = $1 AND project_id = $2 AND active = true
	`

	var total int64
	err := r.db.Pool.QueryRow(ctx, query, sellerID, projectID).Scan(&total)
	if err != nil {
		return 0, fmt.Errorf("failed to get active listed amount: %w", err)
	}

	return total, nil
}

// GetActiveListedAmountScaledForToken (Scaled) returns the total scaled amount currently listed by a seller for a specific token
func (r *MarketplaceRepository) GetActiveListedAmountScaledForToken(ctx context.Context, sellerID, projectID string, tokenID int) (int64, error) {
	query := `
		SELECT COALESCE(SUM(scaled_amount), 0)
		FROM marketplace_listings
		WHERE seller_id = $1 AND project_id = $2 AND token_id = $3 AND active = true
	`

	var total int64
	err := r.db.Pool.QueryRow(ctx, query, sellerID, projectID, tokenID).Scan(&total)
	if err != nil {
		return 0, fmt.Errorf("failed to get active listed amount for token: %w", err)
	}

	return total, nil
}

// GetTotalPurchasedAmountScaled returns the total scaled amount a buyer has purchased for a specific project
func (r *MarketplaceRepository) GetTotalPurchasedAmountScaled(ctx context.Context, buyerID, projectID string) (int64, error) {
	query := `
		SELECT COALESCE(SUM(scaled_amount), 0)
		FROM purchases
		WHERE buyer_id = $1 AND project_id = $2
	`

	var total int64
	err := r.db.Pool.QueryRow(ctx, query, buyerID, projectID).Scan(&total)
	if err != nil {
		return 0, fmt.Errorf("failed to get total purchased amount: %w", err)
	}

	return total, nil
}

// RecordPurchase inserts a purchase record
func (r *MarketplaceRepository) RecordPurchase(ctx context.Context, purchase model.Purchase) (*model.Purchase, error) {
	query := `
		INSERT INTO purchases (buyer_id, listing_id, project_id, seller_id, token_id, scaled_amount, price_eth, total_eth, tx_hash)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at
	`

	err := r.db.Pool.QueryRow(ctx, query,
		purchase.BuyerID,
		purchase.ListingID,
		purchase.ProjectID,
		purchase.SellerID,
		purchase.TokenID,
		purchase.ScaledAmount,
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
			pu.token_id, pu.scaled_amount, pu.price_eth, pu.total_eth, pu.tx_hash, pu.created_at,
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
			&p.TokenID, &p.ScaledAmount, &p.PriceETH, &p.TotalETH, &p.TxHash, &p.CreatedAt,
			&p.ProjectTitle, &p.TokenSymbol, &p.TokenAddress,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan purchase: %w", err)
		}
		purchases = append(purchases, p)
	}

	return purchases, total, nil
}

// CreateCertificate creates a new retirement certificate record
func (r *MarketplaceRepository) CreateCertificate(ctx context.Context, ownerID, projectID string, tokenID int, txHash string, amountRetired float64, reason *string) (*model.Certificate, error) {
	query := `
		INSERT INTO certificates (id, owner_id, project_id, token_id, tx_hash, amount_retired, retirement_reason)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, owner_id, project_id, token_id, tx_hash, amount_retired, retirement_reason, created_at
	`
	id := uuid.New().String()
	cert := model.Certificate{}
	err := r.db.Pool.QueryRow(ctx, query, id, ownerID, projectID, tokenID, txHash, amountRetired, reason).Scan(
		&cert.ID, &cert.OwnerID, &cert.ProjectID, &cert.TokenID, &cert.TxHash, &cert.AmountRetired, &cert.RetirementReason, &cert.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create certificate: %w", err)
	}
	return &cert, nil
}

// ListCertificatesByOwner returns all retirement certificates for a given user
func (r *MarketplaceRepository) ListCertificatesByOwner(ctx context.Context, ownerID string, page, limit int) ([]model.CertificateWithDetails, int, error) {
	offset := (page - 1) * limit

	countQuery := `SELECT COUNT(*) FROM certificates WHERE owner_id = $1`
	var total int
	err := r.db.Pool.QueryRow(ctx, countQuery, ownerID).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count certificates: %w", err)
	}

	query := `
		SELECT c.id, c.owner_id, c.project_id, c.token_id, c.tx_hash, c.amount_retired, c.retirement_reason, c.created_at,
		       p.title AS project_title, p.token_symbol, p.contract_address AS token_address
		FROM certificates c
		JOIN projects p ON p.id = c.project_id
		WHERE c.owner_id = $1
		ORDER BY c.created_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.db.Pool.Query(ctx, query, ownerID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query certificates: %w", err)
	}
	defer rows.Close()

	certs := []model.CertificateWithDetails{}
	for rows.Next() {
		var c model.CertificateWithDetails
		err := rows.Scan(
			&c.ID, &c.OwnerID, &c.ProjectID, &c.TokenID, &c.TxHash, &c.AmountRetired, &c.RetirementReason, &c.CreatedAt,
			&c.ProjectTitle, &c.TokenSymbol, &c.TokenAddress,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan certificate: %w", err)
		}
		certs = append(certs, c)
	}

	return certs, total, nil
}

// GetRetiredAmountForLot returns the total amount already retired by a user for a specific project+tokenId
func (r *MarketplaceRepository) GetRetiredAmountForLot(ctx context.Context, ownerID string, projectID string, tokenID int) (float64, error) {
	query := `SELECT COALESCE(SUM(amount_retired), 0) FROM certificates WHERE owner_id = $1 AND project_id = $2 AND token_id = $3`
	var total float64
	err := r.db.Pool.QueryRow(ctx, query, ownerID, projectID, tokenID).Scan(&total)
	if err != nil {
		return 0, fmt.Errorf("failed to get retired amount: %w", err)
	}
	return total, nil
}
