package unit

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/inventedsarawak/ledgera/internal/model/project"
	"github.com/inventedsarawak/ledgera/internal/model/user"
	"github.com/inventedsarawak/ledgera/internal/server"
	itesting "github.com/inventedsarawak/ledgera/internal/testing"
	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMarketplace_CreateListing(t *testing.T) {
	_, srv, e, cleanup := itesting.SetupTest(t)
	defer cleanup()

	// Sync mock user
	syncUser(t, e, "supplier@example.com")

	// Create and deploy a project
	projectID := createAndDeployProject(t, srv, e)

	// Create listing payload
	payload := map[string]interface{}{
		"projectId": projectID,
		"amount":    100.5,
		"priceEth":  0.01,
	}
	jsonBody := itesting.MustMarshalJSON(t, payload)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/marketplace/listings", bytes.NewReader(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Test-Auth", "bypass")
	rec := httptest.NewRecorder()

	e.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusCreated, rec.Code)
	assert.Contains(t, rec.Body.String(), "projectId")
	assert.Contains(t, rec.Body.String(), "100.5")
}

func TestMarketplace_ListActiveListings(t *testing.T) {
	_, srv, e, cleanup := itesting.SetupTest(t)
	defer cleanup()

	// Sync mock user
	syncUser(t, e, "supplier@example.com")

	// Create and deploy a project with a listing
	projectID := createAndDeployProject(t, srv, e)
	createListing(t, e, projectID, 100.0, 0.01)

	// List listings (public endpoint)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/marketplace?page=1&limit=20", nil)
	rec := httptest.NewRecorder()

	e.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
	assert.Contains(t, rec.Body.String(), "projectId")
	assert.NotEmpty(t, rec.Header().Get("X-Total-Count"))
}

func TestMarketplace_GetListing(t *testing.T) {
	_, srv, e, cleanup := itesting.SetupTest(t)
	defer cleanup()

	// Sync mock user
	syncUser(t, e, "supplier@example.com")

	// Create and deploy a project with a listing
	projectID := createAndDeployProject(t, srv, e)
	listingID := createListing(t, e, projectID, 100.0, 0.01)

	// Get listing (public endpoint)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/marketplace/"+listingID, nil)
	rec := httptest.NewRecorder()

	e.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
	assert.Contains(t, rec.Body.String(), listingID)
}

func TestMarketplace_CancelListing(t *testing.T) {
	_, srv, e, cleanup := itesting.SetupTest(t)
	defer cleanup()

	// Sync mock user
	syncUser(t, e, "supplier@example.com")

	// Create and deploy a project with a listing
	projectID := createAndDeployProject(t, srv, e)
	listingID := createListing(t, e, projectID, 100.0, 0.01)

	// Cancel listing as seller
	req := httptest.NewRequest(http.MethodDelete, "/api/v1/marketplace/listings/"+listingID, nil)
	req.Header.Set("X-Test-Auth", "bypass")
	rec := httptest.NewRecorder()

	e.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusNoContent, rec.Code)
}

func TestMarketplace_BuyListing(t *testing.T) {
	_, srv, e, cleanup := itesting.SetupTest(t)
	defer cleanup()

	// Sync mock user
	syncUser(t, e, "buyer@example.com")

	// Create and deploy a project with a listing
	projectID := createAndDeployProject(t, srv, e)
	listingID := createListing(t, e, projectID, 100.0, 0.01)

	// Buy listing
	req := httptest.NewRequest(http.MethodPost, "/api/v1/marketplace/listings/"+listingID+"/buy", nil)
	req.Header.Set("X-Test-Auth", "bypass")
	rec := httptest.NewRecorder()

	e.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
}

func TestMarketplace_CannotListUndeployedProject(t *testing.T) {
	_, _, e, cleanup := itesting.SetupTest(t)
	defer cleanup()

	// Sync mock user
	syncUser(t, e, "supplier@example.com")

	// Create a project (not deployed)
	projectID := createProject(t, e)

	// Try to create listing
	payload := map[string]interface{}{
		"projectId": projectID,
		"amount":    100.5,
		"priceEth":  0.01,
	}
	jsonBody := itesting.MustMarshalJSON(t, payload)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/marketplace/listings", bytes.NewReader(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Test-Auth", "bypass")
	rec := httptest.NewRecorder()

	e.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusBadRequest, rec.Code)
	assert.Contains(t, rec.Body.String(), "not deployed")
}

// Helper functions

func syncUser(t *testing.T, e *echo.Echo, email string) {
	t.Helper()
	payload := user.SyncUserPayload{Email: email}
	jsonBody := itesting.MustMarshalJSON(t, payload)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/sync-user", bytes.NewReader(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Test-Auth", "bypass")
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)
	require.Equal(t, http.StatusOK, rec.Code, "Failed to sync user: %s", rec.Body.String())
}

func createProject(t *testing.T, e *echo.Echo) string {
	t.Helper()

	// Create multipart form for project creation
	fields := map[string]string{
		"title":        "Carbon Project",
		"description":  "Test carbon project",
		"locationLat":  "1.2345",
		"locationLng":  "101.5678",
		"area":         "100.0",
		"carbonAmount": "1000",
	}
	ct, body := createMultipartBodyWithFiles(t, fields, map[string]struct {
		name    string
		content []byte
	}{
		"image":       {name: "cover.jpg", content: []byte("fake-image")},
		"auditReport": {name: "audit.pdf", content: []byte("fake-audit-report")},
	})

	req := httptest.NewRequest(http.MethodPost, "/api/v1/projects", bytes.NewReader(body))
	req.Header.Set("Content-Type", ct)
	req.Header.Set("X-Test-Auth", "bypass")
	rec := httptest.NewRecorder()

	e.ServeHTTP(rec, req)
	require.Equal(t, http.StatusCreated, rec.Code, "Failed to create project: %s", rec.Body.String())

	var proj project.Project
	err := json.Unmarshal(rec.Body.Bytes(), &proj)
	require.NoError(t, err)

	return proj.ID.String()
}

func createAndDeployProject(t *testing.T, srv *server.Server, e *echo.Echo) string {
	t.Helper()

	projectID := createProject(t, e)

	// Deploy the project (set contract address)
	contractAddr := "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0"
	_, err := srv.DB.Pool.Exec(context.Background(),
		"UPDATE projects SET status = $1, contract_address = $2 WHERE id = $3",
		project.ProjectStatusDeployed, contractAddr, projectID)
	require.NoError(t, err, "Failed to deploy project")

	return projectID
}

func createListing(t *testing.T, e *echo.Echo, projectID string, amount float64, priceEth float64) string {
	t.Helper()

	payload := map[string]interface{}{
		"projectId": projectID,
		"amount":    amount,
		"priceEth":  priceEth,
	}
	jsonBody := itesting.MustMarshalJSON(t, payload)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/marketplace/listings", bytes.NewReader(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Test-Auth", "bypass")
	rec := httptest.NewRecorder()

	e.ServeHTTP(rec, req)
	require.Equal(t, http.StatusCreated, rec.Code, "Failed to create listing: %s", rec.Body.String())

	var listing map[string]interface{}
	err := json.Unmarshal(rec.Body.Bytes(), &listing)
	require.NoError(t, err)

	return listing["id"].(string)
}
