package repository

import "github.com/inventedsarawak/ledgera/internal/server"

type Repositories struct{
	Counter *CounterRepository
	User    *UserRepository
}

func NewRepositories(s *server.Server) *Repositories {
	return &Repositories{
		Counter: NewCounterRepository(s),
		User:    NewUserRepository(s),
	}
}
