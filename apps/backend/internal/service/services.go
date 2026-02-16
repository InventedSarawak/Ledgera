package service

import (
	"github.com/inventedsarawak/ledgera/internal/lib/job"
	"github.com/inventedsarawak/ledgera/internal/repository"
	"github.com/inventedsarawak/ledgera/internal/server"
)

type Services struct {
	Auth        *AuthService
	Job         *job.JobService
	Project     *ProjectService
	Blockchain  *BlockchainService
	Marketplace *MarketplaceService
}

func NewServices(s *server.Server, repos *repository.Repositories) (*Services, error) {
	authService := NewAuthService(s, repos.User)
	blockchainService := NewBlockchainService(s, repos.Project, repos.User)
	marketplaceService := NewMarketplaceService(s, repos.Marketplace, repos.Project, blockchainService)
	projectService := NewProjectService(s, repos.Project, repos.User, blockchainService, marketplaceService)

	return &Services{
		Job:         s.Job,
		Auth:        authService,
		Project:     projectService,
		Blockchain:  blockchainService,
		Marketplace: marketplaceService,
	}, nil
}
