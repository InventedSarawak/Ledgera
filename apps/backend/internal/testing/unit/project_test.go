package unit

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/inventedsarawak/ledgera/internal/model/project"
	"github.com/inventedsarawak/ledgera/internal/model/user"
	itesting "github.com/inventedsarawak/ledgera/internal/testing"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func logResp(t *testing.T, label string, code int, body []byte) {
	var color string
	switch {
	case code >= 200 && code < 300:
		color = colorGreen
	case code >= 300 && code < 400:
		color = colorYellow
	default:
		color = colorRed
	}
	t.Logf("%s%s [%d]%s %s", color, label, code, colorReset, string(body))
}

func createMultipartBody(t *testing.T, fields map[string]string, fileField string, fileName string, fileContent []byte) (contentType string, body []byte) {
	t.Helper()
	buf := &bytes.Buffer{}
	writer := multipart.NewWriter(buf)

	for k, v := range fields {
		require.NoError(t, writer.WriteField(k, v))
	}

	if fileField != "" {
		fw, err := writer.CreateFormFile(fileField, fileName)
		require.NoError(t, err)
		_, err = io.Copy(fw, bytes.NewReader(fileContent))
		require.NoError(t, err)
	}

	require.NoError(t, writer.Close())
	return writer.FormDataContentType(), buf.Bytes()
}

func TestProjectCRUDAndSubmission(t *testing.T) {
	_, srv, e, cleanup := itesting.SetupTest(t)
	defer cleanup()

	// Ensure mock user exists (bypass auth sync)
	{
		payload := user.SyncUserPayload{Email: "test@example.com"}
		jsonBody := itesting.MustMarshalJSON(t, payload)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/sync-user", bytes.NewReader(jsonBody))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Test-Auth", "bypass")
		rec := httptest.NewRecorder()
		e.ServeHTTP(rec, req)
		t.Logf("Pre-sync user response %d: %s", rec.Code, rec.Body.String())
		require.Equal(t, http.StatusOK, rec.Code)
	}

	// CREATE (multipart)
	fields := map[string]string{
		"title":       "Mangrove Restoration",
		"description": "Restoring mangrove ecosystems for carbon sequestration.",
		"locationLat": "1.2345",
		"locationLng": "101.5678",
		"area":        "123.45",
	}
	ct, body := createMultipartBody(t, fields, "image", "cover.jpg", []byte("fake-image"))

	req := httptest.NewRequest(http.MethodPost, "/api/v1/projects", bytes.NewReader(body))
	req.Header.Set("Content-Type", ct)
	req.Header.Set("X-Test-Auth", "bypass")
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)
	logResp(t, "Create", rec.Code, rec.Body.Bytes())
	assert.Equal(t, http.StatusCreated, rec.Code)

	var created project.Project
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &created))
	assert.Equal(t, project.ProjectStatusDraft, created.Status)
	assert.Equal(t, "Mangrove Restoration", created.Title)
	assert.NotEmpty(t, created.ImageURL)

	// LIST MINE
	req = httptest.NewRequest(http.MethodGet, "/api/v1/projects/mine?page=1&limit=1", nil)
	req.Header.Set("X-Test-Auth", "bypass")
	rec = httptest.NewRecorder()
	e.ServeHTTP(rec, req)
	logResp(t, "List page1", rec.Code, rec.Body.Bytes())
	assert.Equal(t, http.StatusOK, rec.Code)
	assert.Equal(t, "1", rec.Header().Get("X-Page"))
	assert.Equal(t, "1", rec.Header().Get("X-Limit"))

	var listPage1 []project.Project
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &listPage1))
	assert.Equal(t, 1, len(listPage1))

	// CREATE second project to test pagination across pages
	ct2, body2 := createMultipartBody(t, map[string]string{
		"title":       "Forest Conservation",
		"description": "Protecting forests.",
		"locationLat": "2.0000",
		"locationLng": "100.0000",
		"area":        "50",
	}, "image", "cover2.jpg", []byte("fake-image-2"))

	req = httptest.NewRequest(http.MethodPost, "/api/v1/projects", bytes.NewReader(body2))
	req.Header.Set("Content-Type", ct2)
	req.Header.Set("X-Test-Auth", "bypass")
	rec = httptest.NewRecorder()
	e.ServeHTTP(rec, req)
	logResp(t, "Create 2", rec.Code, rec.Body.Bytes())
	assert.Equal(t, http.StatusCreated, rec.Code)

	// LIST page 2
	req = httptest.NewRequest(http.MethodGet, "/api/v1/projects/mine?page=2&limit=1", nil)
	req.Header.Set("X-Test-Auth", "bypass")
	rec = httptest.NewRecorder()
	e.ServeHTTP(rec, req)
	logResp(t, "List page2", rec.Code, rec.Body.Bytes())
	assert.Equal(t, http.StatusOK, rec.Code)
	assert.Equal(t, "2", rec.Header().Get("X-Page"))
	assert.Equal(t, "1", rec.Header().Get("X-Limit"))
	var listPage2 []project.Project
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &listPage2))
	assert.Equal(t, 1, len(listPage2))

	// GET BY ID
	req = httptest.NewRequest(http.MethodGet, "/api/v1/projects/"+created.ID.String(), nil)
	req.Header.Set("X-Test-Auth", "bypass")
	rec = httptest.NewRecorder()
	e.ServeHTTP(rec, req)
	logResp(t, "Get by ID", rec.Code, rec.Body.Bytes())
	assert.Equal(t, http.StatusOK, rec.Code)

	var fetched project.Project
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &fetched))
	assert.Equal(t, created.ID, fetched.ID)

	// UPDATE (allowed in DRAFT)
	updateFields := map[string]string{
		"title": "Mangrove + Coastal",
	}
	ct, body = createMultipartBody(t, updateFields, "", "", nil)
	req = httptest.NewRequest(http.MethodPatch, "/api/v1/projects/"+created.ID.String(), bytes.NewReader(body))
	req.Header.Set("Content-Type", ct)
	req.Header.Set("X-Test-Auth", "bypass")
	rec = httptest.NewRecorder()
	e.ServeHTTP(rec, req)
	logResp(t, "Update", rec.Code, rec.Body.Bytes())
	assert.Equal(t, http.StatusOK, rec.Code)

	var updated project.Project
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &updated))
	assert.Equal(t, "Mangrove + Coastal", updated.Title)

	// SUBMIT FOR APPROVAL (transitions to PENDING)
	req = httptest.NewRequest(http.MethodPost, "/api/v1/projects/"+created.ID.String()+"/submit", nil)
	req.Header.Set("X-Test-Auth", "bypass")
	rec = httptest.NewRecorder()
	e.ServeHTTP(rec, req)
	logResp(t, "Submit", rec.Code, rec.Body.Bytes())
	assert.Equal(t, http.StatusAccepted, rec.Code)

	// UPDATE should now be blocked
	ct, body = createMultipartBody(t, map[string]string{"title": "Blocked Edit"}, "", "", nil)
	req = httptest.NewRequest(http.MethodPatch, "/api/v1/projects/"+created.ID.String(), bytes.NewReader(body))
	req.Header.Set("Content-Type", ct)
	req.Header.Set("X-Test-Auth", "bypass")
	rec = httptest.NewRecorder()
	e.ServeHTTP(rec, req)
	logResp(t, "Blocked update", rec.Code, rec.Body.Bytes())
	assert.Equal(t, http.StatusBadRequest, rec.Code)

	// DELETE should now be blocked
	req = httptest.NewRequest(http.MethodDelete, "/api/v1/projects/"+created.ID.String(), nil)
	req.Header.Set("X-Test-Auth", "bypass")
	rec = httptest.NewRecorder()
	e.ServeHTTP(rec, req)
	logResp(t, "Blocked delete", rec.Code, rec.Body.Bytes())
	assert.Equal(t, http.StatusBadRequest, rec.Code)

	// Force REJECTED in DB, then allow edit/delete
	// Access DB via server config/Pool
	// We can query directly since tests are integration style
	testID := created.ID.String()
	cmd, err := srv.DB.Pool.Exec(context.Background(), "UPDATE projects SET status = 'REJECTED' WHERE id = $1", testID)
	require.NoError(t, err)
	assert.Equal(t, int64(1), cmd.RowsAffected())

	// Update allowed again
	ct, body = createMultipartBody(t, map[string]string{"title": "After Reject Edit"}, "", "", nil)
	req = httptest.NewRequest(http.MethodPatch, "/api/v1/projects/"+testID, bytes.NewReader(body))
	req.Header.Set("Content-Type", ct)
	req.Header.Set("X-Test-Auth", "bypass")
	rec = httptest.NewRecorder()
	e.ServeHTTP(rec, req)
	logResp(t, "Update after reject", rec.Code, rec.Body.Bytes())
	assert.Equal(t, http.StatusOK, rec.Code)

	// Delete allowed in REJECTED
	req = httptest.NewRequest(http.MethodDelete, "/api/v1/projects/"+testID, nil)
	req.Header.Set("X-Test-Auth", "bypass")
	rec = httptest.NewRecorder()
	e.ServeHTTP(rec, req)
	logResp(t, "Delete after reject", rec.Code, rec.Body.Bytes())

	// Either 204 No Content on success or 200/204 depending on framework; our handler returns 204
	assert.Equal(t, http.StatusNoContent, rec.Code)
}

func TestAdminProjectWorkflow(t *testing.T) {
	_, _, e, cleanup := itesting.SetupTest(t)
	defer cleanup()

	// Ensure mock user exists (bypass auth sync)
	{
		payload := user.SyncUserPayload{Email: "admin@example.com"}
		jsonBody := itesting.MustMarshalJSON(t, payload)
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/sync-user", bytes.NewReader(jsonBody))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Test-Auth", "bypass")
		rec := httptest.NewRecorder()
		e.ServeHTTP(rec, req)
		require.Equal(t, http.StatusOK, rec.Code)
	}

	// 1. Create a project (acts as Supplier)
	fields := map[string]string{
		"title":       "Carbon Project Alpha",
		"description": "A new project for review.",
		"locationLat": "10.0000",
		"locationLng": "20.0000",
		"area":        "100.50",
	}
	ct, body := createMultipartBody(t, fields, "image", "alpha.jpg", []byte("image-data"))

	req := httptest.NewRequest(http.MethodPost, "/api/v1/projects", bytes.NewReader(body))
	req.Header.Set("Content-Type", ct)
	req.Header.Set("X-Test-Auth", "bypass")
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)
	require.Equal(t, http.StatusCreated, rec.Code)

	var created project.Project
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &created))

	// 2. Submit for Approval (Draft -> Pending)
	req = httptest.NewRequest(http.MethodPost, "/api/v1/projects/"+created.ID.String()+"/submit", nil)
	req.Header.Set("X-Test-Auth", "bypass")
	rec = httptest.NewRecorder()
	e.ServeHTTP(rec, req)
	require.Equal(t, http.StatusAccepted, rec.Code)

	// 3. List Pending Review (acts as Admin)
	req = httptest.NewRequest(http.MethodGet, "/api/v1/projects/review?page=1&limit=10", nil)

	req.Header.Set("X-Test-Auth", "bypass")
	rec = httptest.NewRecorder()
	e.ServeHTTP(rec, req)
	require.Equal(t, http.StatusOK, rec.Code)

	var pendingList []project.ProjectWithSupplier
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &pendingList))

	// Check if our project is in the list
	found := false
	for _, p := range pendingList {
		if p.ID == created.ID {
			found = true
			break
		}
	}
	assert.True(t, found, "Submitted project should be in pending list")

	// 4. Approve the project (acts as Admin)
	req = httptest.NewRequest(http.MethodPost, "/api/v1/projects/"+created.ID.String()+"/approve", nil)
	req.Header.Set("X-Test-Auth", "bypass")
	rec = httptest.NewRecorder()
	e.ServeHTTP(rec, req)
	require.Equal(t, http.StatusOK, rec.Code)

	var approved project.Project
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &approved))
	assert.Equal(t, project.ProjectStatusApproved, approved.Status)

	// 5. Test Reject workflow with a fresh project
	// Create another project
	ct2, body2 := createMultipartBody(t, map[string]string{
		"title":       "Carbon Project Beta",
		"description": "Another project for reject test.",
		"locationLat": "15.0000",
		"locationLng": "25.0000",
		"area":        "50.00",
	}, "image", "beta.jpg", []byte("image-data-2"))

	req = httptest.NewRequest(http.MethodPost, "/api/v1/projects", bytes.NewReader(body2))
	req.Header.Set("Content-Type", ct2)
	req.Header.Set("X-Test-Auth", "bypass")
	rec = httptest.NewRecorder()
	e.ServeHTTP(rec, req)
	require.Equal(t, http.StatusCreated, rec.Code)

	var created2 project.Project
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &created2))

	// Submit it
	req = httptest.NewRequest(http.MethodPost, "/api/v1/projects/"+created2.ID.String()+"/submit", nil)
	req.Header.Set("X-Test-Auth", "bypass")
	rec = httptest.NewRecorder()
	e.ServeHTTP(rec, req)
	require.Equal(t, http.StatusAccepted, rec.Code)

	// Reject it
	req = httptest.NewRequest(http.MethodPost, "/api/v1/projects/"+created2.ID.String()+"/reject", nil)
	req.Header.Set("X-Test-Auth", "bypass")
	rec = httptest.NewRecorder()
	e.ServeHTTP(rec, req)
	require.Equal(t, http.StatusOK, rec.Code)

	var rejected project.Project
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &rejected))
	assert.Equal(t, project.ProjectStatusRejected, rejected.Status)
}
