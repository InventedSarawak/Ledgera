package model

import "time"

// Marketplace represents a marketplace listing
type Listing struct {
	ID        string    `json:"id" db:"id"`
	ProjectID string    `json:"projectId" db:"project_id"`
	SellerID  string    `json:"sellerId" db:"seller_id"`
	Amount    float64   `json:"amount" db:"amount"`
	PriceETH  float64   `json:"priceEth" db:"price_eth"`
	Active    bool      `json:"active" db:"active"`
	CreatedAt time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt time.Time `json:"updatedAt" db:"updated_at"`
}

// ListingWithDetails includes project and seller information
type ListingWithDetails struct {
	Listing
	ProjectTitle        string  `json:"projectTitle" db:"project_title"`
	ProjectDescription  string  `json:"projectDescription" db:"project_description"`
	ProjectImageURL     string  `json:"projectImageUrl" db:"project_image_url"`
	SellerEmail         string  `json:"sellerEmail" db:"seller_email"`
	TokenAddress        *string `json:"tokenAddress" db:"token_address"`
	TokenSymbol         *string `json:"tokenSymbol" db:"token_symbol"`
	SellerWalletAddress *string `json:"sellerWalletAddress" db:"seller_wallet_address"`
}
