package repository

import "github.com/inventedsarawak/ledgera/internal/server"

type Repositories struct {
	User        *UserRepository
	Project     *ProjectRepository
	Marketplace *MarketplaceRepository
}

func NewRepositories(s *server.Server) *Repositories {
	return &Repositories{
		User:        NewUserRepository(s),
		Project:     NewProjectRepository(s),
		Marketplace: NewMarketplaceRepository(s.DB),
	}
}
