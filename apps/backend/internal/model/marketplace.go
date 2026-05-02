package model

import "time"

// Listing represents a marketplace listing (lot-based, SPL token)
type Listing struct {
	ID           string    `json:"id" db:"id"`
	ProjectID    string    `json:"projectId" db:"project_id"`
	SellerID     string    `json:"sellerId" db:"seller_id"`
	TokenID      string    `json:"tokenId" db:"token_id"`
	ScaledAmount int64     `json:"scaledAmount" db:"scaled_amount"`
	Price        float64   `json:"price" db:"price"`
	PaymentToken string    `json:"paymentToken" db:"payment_token"`
	Active       bool      `json:"active" db:"active"`
	CreatedAt    time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt    time.Time `json:"updatedAt" db:"updated_at"`
}

// DisplayAmount returns the human-readable credit amount (scaledAmount / 1000)
func (l Listing) DisplayAmount() float64 {
	return float64(l.ScaledAmount) / 1000.0
}

// ListingWithDetails includes project and seller information
type ListingWithDetails struct {
	Listing
	ProjectTitle        string  `json:"projectTitle" db:"project_title"`
	ProjectDescription  string  `json:"projectDescription" db:"project_description"`
	ProjectImageURL     string  `json:"projectImageUrl" db:"project_image_url"`
	SellerEmail         string  `json:"sellerEmail" db:"seller_email"`
	MintAddress         *string `json:"mintAddress" db:"mint_address"`
	TokenSymbol         *string `json:"tokenSymbol" db:"token_symbol"`
	SellerWalletAddress *string `json:"sellerWalletAddress" db:"seller_wallet_address"`
}
