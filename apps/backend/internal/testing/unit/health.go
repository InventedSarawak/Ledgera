package unit

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	tests "github.com/inventedsarawak/ledgera/internal/testing"
)

func TestHealth(t *testing.T) {
	_, _, e, cleanup := tests.SetupTest(t)
	defer cleanup()

	t.Run("CheckHealth", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/status", nil)
		rec := httptest.NewRecorder()

		e.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusOK, rec.Code)

		var response map[string]interface{}
		err := json.Unmarshal(rec.Body.Bytes(), &response)
		assert.NoError(t, err)
		assert.Equal(t, "ok", response["status"])
		assert.Equal(t, "ledgera-backend", response["service"])
	})
}
