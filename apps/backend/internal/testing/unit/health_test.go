package unit

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	tests "github.com/inventedsarawak/ledgera/internal/testing"
	"github.com/stretchr/testify/assert"
)

func TestHealth(t *testing.T) {
	_, _, e, cleanup := tests.SetupTest(t)
	defer cleanup()

	t.Run("CheckHealth", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/status", nil)
		rec := httptest.NewRecorder()

		e.ServeHTTP(rec, req)
		if rec.Code >= 400 {
			t.Logf("%sStatus [%d]%s %s", colorRed, rec.Code, colorReset, rec.Body.String())
		} else {
			t.Logf("%sStatus [%d]%s %s", colorGreen, rec.Code, colorReset, rec.Body.String())
		}
		assert.Equal(t, http.StatusOK, rec.Code)

		var response map[string]interface{}
		err := json.Unmarshal(rec.Body.Bytes(), &response)
		assert.NoError(t, err)
		// Accept current health status string
		if s, ok := response["status"].(string); ok {
			assert.Contains(t, []string{"healthy", "ok"}, s)
		} else {
			t.Fatalf("invalid health response: %v", response)
		}
		// Service may be omitted depending on environment; assert if present
		if svc, ok := response["service"].(string); ok {
			assert.NotEmpty(t, svc)
		}
	})
}
