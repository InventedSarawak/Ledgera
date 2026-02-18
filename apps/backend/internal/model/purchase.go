package model

import "time"

// Purchase represents a completed carbon credit purchase
type Purchase struct {
	ID        string    `json:"id" db:"id"`
	BuyerID   string    `json:"buyerId" db:"buyer_id"`
	ListingID string    `json:"listingId" db:"listing_id"`
	ProjectID string    `json:"projectId" db:"project_id"`
	SellerID  string    `json:"sellerId" db:"seller_id"`
	Amount    float64   `json:"amount" db:"amount"`
	PriceETH  float64   `json:"priceEth" db:"price_eth"`
	TotalETH  float64   `json:"totalEth" db:"total_eth"`
	TxHash    string    `json:"txHash" db:"tx_hash"`
	CreatedAt time.Time `json:"createdAt" db:"created_at"`
}

// PurchaseWithDetails includes project info for display
type PurchaseWithDetails struct {
	Purchase
	ProjectTitle string  `json:"projectTitle" db:"project_title"`
	TokenSymbol  *string `json:"tokenSymbol" db:"token_symbol"`
	TokenAddress *string `json:"tokenAddress" db:"token_address"`
}
