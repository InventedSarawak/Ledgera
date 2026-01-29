package service

import (
	"github.com/inventedsarawak/ledgera/internal/lib/job"
	"github.com/inventedsarawak/ledgera/internal/repository"
	"github.com/inventedsarawak/ledgera/internal/server"
)

type Services struct {
	Auth    *AuthService
	Job     *job.JobService
	Project *ProjectService
}

func NewServices(s *server.Server, repos *repository.Repositories) (*Services, error) {
	authService := NewAuthService(s, repos.User)
	projectService := NewProjectService(s, repos.Project, repos.User)

	return &Services{
		Job:     s.Job,
		Auth:    authService,
		Project: projectService,
	}, nil
}
