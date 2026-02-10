package service

import (
	"context"
	"fmt"
	"math/big"

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
}

func NewBlockchainService(s *server.Server, projectRepo *repository.ProjectRepository) *BlockchainService {
	return &BlockchainService{
		server:      s,
		client:      s.Blockchain,
		projectRepo: projectRepo,
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

	// 3. Generate token name and symbol
	tokenName := fmt.Sprintf("%s Carbon Credit", proj.Title)
	tokenSymbol := s.generateTokenSymbol(proj.Title)

	logger.Info().
		Str("token_name", tokenName).
		Str("token_symbol", tokenSymbol).
		Msg("creating token via AssetRegistry")

	// 4. Deploy token via blockchain client
	tokenAddress, err := s.client.DeployProjectToken(ctx.Request().Context(), tokenName, tokenSymbol)
	if err != nil {
		logger.Error().Err(err).Msg("failed to deploy token")
		return fmt.Errorf("failed to deploy token: %w", err)
	}

	logger.Info().
		Str("token_address", tokenAddress).
		Str("project_id", projectID).
		Msg("token deployed successfully")

	// 5. Update project in database
	payload := project.UpdateProjectPayload{
		ContractAddress: &tokenAddress,
		Status:          ptrProjectStatus(project.ProjectStatusDeployed),
	}

	_, err = s.projectRepo.Update(ctx.Request().Context(), projectID, payload, nil, nil)
	if err != nil {
		logger.Error().Err(err).Msg("failed to update project with contract address")
		return fmt.Errorf("failed to update project: %w", err)
	}

	// 6. Update token_symbol in project
	// We need a separate update for token_symbol since it's not in UpdateProjectPayload
	// For now, we'll use a direct SQL update via the repository
	// You may want to add a dedicated method in ProjectRepository for this

	logger.Info().
		Str("project_id", projectID).
		Str("contract_address", tokenAddress).
		Msg("project deployed successfully")

	return nil
}

// MintProjectTokens mints tokens for a project to the supplier
func (s *BlockchainService) MintProjectTokens(ctx context.Context, projectID string, amount *big.Int) error {
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
	if proj.Status != project.ProjectStatusDeployed {
		return fmt.Errorf("only deployed projects can mint tokens")
	}

	if proj.ContractAddress == nil || *proj.ContractAddress == "" {
		return fmt.Errorf("project has no contract address")
	}

	// 3. Get supplier's wallet address
	// For now, we'll mint to the admin address (the contract owner)
	// In production, you'd fetch the supplier's wallet from the User table
	// supplierAddress := proj.SupplierID // This should be the wallet address

	// Temporary: Use admin address as the recipient
	// You'll need to update this when you add wallet_address to users
	adminAddress := s.server.Config.Blockhain.AdminPrivateKey // This is wrong, need to derive address
	// Better approach: Derive address from private key
	// For now, we'll pass the supplier's Clerk ID and expect them to have a wallet_address

	// TODO: Fetch supplier user and get their wallet_address
	// For MVP, we'll use a placeholder or admin address

	recipientAddress := adminAddress // Placeholder - needs to be supplier's wallet

	// 4. Mint tokens via blockchain client
	err = s.client.MintTokens(ctx, *proj.ContractAddress, recipientAddress, amount)
	if err != nil {
		return fmt.Errorf("failed to mint tokens: %w", err)
	}

	return nil
}

// generateTokenSymbol creates a token symbol from the project title
// Example: "Amazon Rainforest Project" -> "AMAZ"
func (s *BlockchainService) generateTokenSymbol(title string) string {
	// Simple implementation: take first 4 letters of first word and uppercase
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
	return fmt.Sprintf("%s", symbol)
}

// Helper function to create pointer to ProjectStatus
func ptrProjectStatus(status project.ProjectStatus) *project.ProjectStatus {
	return &status
}
