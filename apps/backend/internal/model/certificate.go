package model

import "time"

// Certificate represents a carbon credit retirement certificate
type Certificate struct {
	ID               string    `json:"id" db:"id"`
	OwnerID          string    `json:"ownerId" db:"owner_id"`
	ProjectID        string    `json:"projectId" db:"project_id"`
	TokenID          string    `json:"tokenId" db:"token_id"`
	TxHash           string    `json:"txHash" db:"tx_hash"`
	AmountRetired    float64   `json:"amountRetired" db:"amount_retired"`
	RetirementReason *string   `json:"retirementReason" db:"retirement_reason"`
	CreatedAt        time.Time `json:"createdAt" db:"created_at"`
}

// CertificateWithDetails includes project info for display
type CertificateWithDetails struct {
	Certificate
	ProjectTitle string  `json:"projectTitle" db:"project_title"`
	TokenSymbol  *string `json:"tokenSymbol" db:"token_symbol"`
	MintAddress  *string `json:"mintAddress" db:"mint_address"`
}
