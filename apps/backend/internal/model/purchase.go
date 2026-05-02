package model

import "time"

// Purchase represents a completed carbon credit lot purchase (SPL token)
type Purchase struct {
	ID           string    `json:"id" db:"id"`
	BuyerID      string    `json:"buyerId" db:"buyer_id"`
	ListingID    string    `json:"listingId" db:"listing_id"`
	ProjectID    string    `json:"projectId" db:"project_id"`
	SellerID     string    `json:"sellerId" db:"seller_id"`
	TokenID      string    `json:"tokenId" db:"token_id"`
	ScaledAmount int64     `json:"scaledAmount" db:"scaled_amount"`
	Price        float64   `json:"price" db:"price"`
	TotalPrice   float64   `json:"totalPrice" db:"total_price"`
	PaymentToken string    `json:"paymentToken" db:"payment_token"`
	TxHash       string    `json:"txHash" db:"tx_hash"`
	CreatedAt    time.Time `json:"createdAt" db:"created_at"`
}

// DisplayAmount returns the human-readable credit amount (scaledAmount / 1000)
func (p Purchase) DisplayAmount() float64 {
	return float64(p.ScaledAmount) / 1000.0
}

// PurchaseWithDetails includes project info for display
type PurchaseWithDetails struct {
	Purchase
	ProjectTitle string  `json:"projectTitle" db:"project_title"`
	TokenSymbol  *string `json:"tokenSymbol" db:"token_symbol"`
	MintAddress  *string `json:"mintAddress" db:"mint_address"`
}
