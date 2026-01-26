package testing

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"testing"

	"github.com/inventedsarawak/ledgera/internal/handler"
	"github.com/inventedsarawak/ledgera/internal/repository"
	"github.com/inventedsarawak/ledgera/internal/router"
	"github.com/inventedsarawak/ledgera/internal/server"
	"github.com/inventedsarawak/ledgera/internal/service"
	"github.com/labstack/echo/v4"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/require"
)

// SetupTest prepares a test environment with a database and server
func SetupTest(t *testing.T) (*TestDB, *server.Server, *echo.Echo, func()) {
	t.Helper()

	// Colorful test logger: cyan timestamp, colored levels, readable message
	cw := zerolog.ConsoleWriter{Out: os.Stdout}
	cw.NoColor = false
	cw.FormatTimestamp = func(i interface{}) string {
		return fmt.Sprintf("\x1b[36m%v\x1b[0m", i) // cyan
	}
	cw.FormatLevel = func(i interface{}) string {
		switch fmt.Sprint(i) {
		case "info":
			return "\x1b[32mINF\x1b[0m" // green
		case "error":
			return "\x1b[31mERR\x1b[0m" // red
		case "warn":
			return "\x1b[33mWRN\x1b[0m" // yellow
		default:
			return fmt.Sprint(i)
		}
	}
	// Keep message plain; color applied via levels and timestamp
	logger := zerolog.New(cw).Level(zerolog.InfoLevel).With().Timestamp().Logger()

	testDB, dbCleanup := SetupTestDB(t)

	testServer := CreateTestServer(&logger, testDB)

	// Initialize the application stack
	repos := repository.NewRepositories(testServer)
	services, err := service.NewServices(testServer, repos)
	require.NoError(t, err)

	handlers := handler.NewHandlers(testServer, services)
	r := router.NewRouter(testServer, handlers, services)

	cleanup := func() {
		if testDB.Pool != nil {
			testDB.Pool.Close()
		}

		dbCleanup()
	}

	return testDB, testServer, r, cleanup
}

// MustMarshalJSON marshals an object to JSON or fails the test
func MustMarshalJSON(t *testing.T, v interface{}) []byte {
	t.Helper()

	jsonBytes, err := json.Marshal(v)
	require.NoError(t, err, "failed to marshal to JSON")

	return jsonBytes
}

// ProjectRoot returns the absolute path to the project root
func ProjectRoot(t *testing.T) string {
	t.Helper()

	dir, err := os.Getwd()
	require.NoError(t, err, "failed to get working directory")

	for {
		if _, err := os.Stat(filepath.Join(dir, "go.mod")); err == nil {
			return dir
		}

		parentDir := filepath.Dir(dir)
		if parentDir == dir {
			t.Fatal("could not find project root (go.mod)")
			return ""
		}

		dir = parentDir
	}
}

// Ptr returns a pointer to the given value
// Useful for creating pointers to values for optional fields
func Ptr[T any](v T) *T {
	return &v
}
