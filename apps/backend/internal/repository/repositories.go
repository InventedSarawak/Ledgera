package repository

import "github.com/inventedsarawak/ledgera/internal/server"

type Repositories struct{}

func NewRepositories(s *server.Server) *Repositories {
	return &Repositories{}
}
