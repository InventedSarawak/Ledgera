package service

import (
	"context"
	"fmt"
	"math"
	"strings"

	"github.com/inventedsarawak/ledgera/internal/blockchain"
	"github.com/inventedsarawak/ledgera/internal/middleware"
	"github.com/inventedsarawak/ledgera/internal/model/project"
	"github.com/inventedsarawak/ledgera/internal/repository"
	"github.com/inventedsarawak/ledgera/internal/server"
	"github.com/labstack/echo/v4"
)

type BlockchainService struct {
	server      *server.Server
	client      *blockchain.Client
	projectRepo *repository.ProjectRepository
	userRepo    *repository.UserRepository
}

func NewBlockchainService(s *server.Server, projectRepo *repository.ProjectRepository, userRepo *repository.UserRepository) *BlockchainService {
	return &BlockchainService{
		server:      s,
		client:      s.Blockchain,
		projectRepo: projectRepo,
		userRepo:    userRepo,
	}
}

// DeployProject deploys a new token for the approved project
func (s *BlockchainService) DeployProject(ctx echo.Context, projectID string) error {
	logger := middleware.GetLogger(ctx)
	logger.Info().Str("project_id", projectID).Msg("deploying project token")

	if s.client == nil {
		return fmt.Errorf("blockchain client not initialized")
	}

	// 1. Fetch project from repository
	proj, err := s.projectRepo.FindByID(ctx.Request().Context(), projectID)
	if err != nil {
		logger.Error().Err(err).Msg("failed to fetch project")
		return fmt.Errorf("failed to fetch project: %w", err)
	}
	if proj == nil {
		return fmt.Errorf("project not found")
	}

	// 2. Validate project status
	if proj.Status != project.ProjectStatusApproved {
		return fmt.Errorf("only approved projects can be deployed")
	}

	if proj.ContractAddress != nil && *proj.ContractAddress != "" {
		return fmt.Errorf("project already deployed")
	}

	// 3. The Solana migration uses one unified EON mint for all projects.
	tokenAddress := s.client.EonMint.String()
	tokenSymbol := "EON"

	logger.Info().
		Str("token_address", tokenAddress).
		Str("project_id", projectID).
		Msg("project linked to unified EON mint")

	// 5. Update project in database
	payload := project.UpdateProjectPayload{
		ContractAddress: &tokenAddress,
		TokenSymbol:     &tokenSymbol,
	}

	_, err = s.projectRepo.Update(ctx.Request().Context(), projectID, payload, nil, nil)
	if err != nil {
		logger.Error().Err(err).Msg("failed to update project with contract address and symbol")
		return fmt.Errorf("failed to update project: %w", err)
	}

	logger.Info().
		Str("project_id", projectID).
		Str("contract_address", tokenAddress).
		Str("token_symbol", tokenSymbol).
		Msg("project deployment record updated successfully")

	return nil
}

// MintProjectTokens mints initial supply to the supplier (Token ID 0)
func (s *BlockchainService) MintProjectTokens(ctx context.Context, projectID string, unscaledAmount float64) error {
	if s.client == nil {
		return fmt.Errorf("blockchain client not initialized")
	}

	// 1. Fetch project from repository
	proj, err := s.projectRepo.FindByID(ctx, projectID)
	if err != nil {
		return fmt.Errorf("failed to fetch project: %w", err)
	}
	if proj == nil {
		return fmt.Errorf("project not found")
	}

	// 2. Validate project status
	if proj.Status != project.ProjectStatusDeployed && proj.Status != project.ProjectStatusApproved {
		return fmt.Errorf("project must be approved or deployed to mint tokens")
	}

	if proj.ContractAddress == nil || *proj.ContractAddress == "" {
		return fmt.Errorf("project has no contract address")
	}

	// 3. Get supplier's wallet address
	supplier, err := s.userRepo.FindByClerkID(ctx, proj.SupplierID)
	if err != nil {
		return fmt.Errorf("failed to fetch supplier: %w", err)
	}
	if supplier == nil {
		return fmt.Errorf("supplier not found")
	}
	if supplier.WalletAddress == nil || *supplier.WalletAddress == "" {
		return fmt.Errorf("supplier has no wallet address configured")
	}

	recipientAddress := *supplier.WalletAddress

	// 4. Mint the unified EON supply to the supplier wallet.
	scaledAmount := uint64(math.Round(unscaledAmount * 1000))
	err = s.client.MintEONTokens(ctx, recipientAddress, scaledAmount)
	if err != nil {
		return fmt.Errorf("failed to mint EON tokens: %w", err)
	}

	return nil
}

// GenerateTokenSymbol creates a token symbol from the project title
// Example: "Amazon Rainforest Project" -> "AMAZ"
func (s *BlockchainService) generateTokenSymbol(title string) string {
	if len(title) < 4 {
		return "CARB"
	}

	symbol := ""
	for _, char := range title {
		if char >= 'A' && char <= 'Z' || char >= 'a' && char <= 'z' {
			symbol += string(char)
			if len(symbol) == 4 {
				break
			}
		}
	}

	if len(symbol) < 3 {
		symbol = "CARB"
	}

	// Ensure uppercase
	return strings.ToUpper(symbol)
}
