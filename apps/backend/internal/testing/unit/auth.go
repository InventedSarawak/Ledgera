package unit

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/inventedsarawak/ledgera/internal/model/user"
	itesting "github.com/inventedsarawak/ledgera/internal/testing"
	"github.com/stretchr/testify/assert"
)

func TestAuth(t *testing.T) {
	_, _, e, cleanup := itesting.SetupTest(t)
	defer cleanup()

	t.Run("SyncUser", func(t *testing.T) {
		payload := user.SyncUserPayload{
			Email: "test@example.com",
		}
		jsonBody := itesting.MustMarshalJSON(t, payload)

		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/sync-user", bytes.NewReader(jsonBody))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Test-Auth", "bypass")
		rec := httptest.NewRecorder()

		e.ServeHTTP(rec, req)

		assert.Equal(t, http.StatusOK, rec.Code)

		var responseUser user.User
		err := json.Unmarshal(rec.Body.Bytes(), &responseUser)
		assert.NoError(t, err)
		assert.Equal(t, "test@example.com", responseUser.Email)
		assert.Equal(t, "user_test_mock_123", responseUser.ClerkID) // Default mock ID
	})
}
