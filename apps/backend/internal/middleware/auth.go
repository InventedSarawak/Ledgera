package middleware

import (
	"encoding/base64"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/clerk/clerk-sdk-go/v2"
	clerkhttp "github.com/clerk/clerk-sdk-go/v2/http"
	"github.com/inventedsarawak/ledgera/internal/errs"
	"github.com/inventedsarawak/ledgera/internal/server"
	"github.com/labstack/echo/v4"
)

type AuthMiddleware struct {
	server *server.Server
}

func NewAuthMiddleware(s *server.Server) *AuthMiddleware {
	return &AuthMiddleware{
		server: s,
	}
}

func (auth *AuthMiddleware) RequireAuth(next echo.HandlerFunc) echo.HandlerFunc {
	clerkMiddleware := echo.WrapMiddleware(
		clerkhttp.WithHeaderAuthorization(
			clerkhttp.AuthorizationFailureHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				start := time.Now()

				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)

				response := map[string]string{
					"code":     "UNAUTHORIZED",
					"message":  "Unauthorized",
					"override": "false",
					"status":   "401",
				}

				if err := json.NewEncoder(w).Encode(response); err != nil {
					auth.server.Logger.Error().Err(err).Str("function", "RequireAuth").Dur(
						"duration", time.Since(start)).Msg("failed to write JSON response")
				} else {
					auth.server.Logger.Error().
						Str("function", "RequireAuth").
						Dur("duration", time.Since(start)).
						Msg("could not get session claims from context")
				}
			}))))(func(c echo.Context) error {
		start := time.Now()
		claims, ok := clerk.SessionClaimsFromContext(c.Request().Context())

		if !ok {
			auth.server.Logger.Error().
				Str("function", "RequireAuth").
				Str("request_id", GetRequestID(c)).
				Dur("duration", time.Since(start)).
				Msg("could not get session claims from context")
			return errs.NewUnauthorizedError("Unauthorized", false)
		}

		c.Set("user_id", claims.Subject)

		// Check both standard metadata locations and root level
		// First try efficient direct access if possible, or fallback to map inspection
		role := extractRoleFromClaims(claims)

		if role == "" {
			// Fallback: Parse raw token to bypass struct limitations
			role = extractRoleFromRawToken(c.Request().Header.Get("Authorization"))
		}

		auth.server.Logger.Info().
			Str("extracted_role", role).
			Interface("claims_raw", claims).
			Msg("DEBUG: Authenticating User")

		if role == "" {
			role = claims.ActiveOrganizationRole
		}
		role = strings.TrimSpace(role)
		if role != "" {
			role = strings.ToUpper(role)
			c.Set("user_role", role)
		}

		c.Set("permissions", claims.Claims.ActiveOrganizationPermissions)

		auth.server.Logger.Info().
			Str("function", "RequireAuth").
			Str("user_id", claims.Subject).
			Str("request_id", GetRequestID(c)).
			Dur("duration", time.Since(start)).
			Msg("user authenticated successfully")

		return next(c)
	})

	return func(c echo.Context) error {
		start := time.Now()

		// CHECK: Are we in Development Mode?
		// We access the config via the server struct
		isDev := auth.server.Config.Primary.Env == "local" || auth.server.Config.Primary.Env == "test"

		// CHECK: Is the bypass header present?

		bypassHeader := c.Request().Header.Get("X-Test-Auth")

		if isDev && bypassHeader == "bypass" {
			// --- BYPASS PATH ---
			mockUserID := auth.server.Config.Auth.MockUserID
			if mockUserID == "" {
				mockUserID = "user_test_mock_123"
			}

			// Inject Mock Data (Simulating what Clerk would provide)
			c.Set("user_id", mockUserID)
			c.Set("user_role", "ADMIN")
			// Add any specific permissions you need for testing
			c.Set("permissions", []string{"org:admin:permission"})

			auth.server.Logger.Info().
				Str("function", "RequireAuth").
				Str("user_id", mockUserID).
				Str("request_id", GetRequestID(c)).
				Dur("duration", time.Since(start)).
				Msg("BYPASSING AUTH: Using Mock User")

			// Skip Clerk and go directly to your handler
			return next(c)
		}

		return clerkMiddleware(c)
	}
}

func extractRoleFromClaims(claims *clerk.SessionClaims) string {
	if claims == nil {
		return ""
	}
	raw, err := json.Marshal(claims)
	if err != nil {
		return ""
	}

	var claimsValue map[string]interface{}
	if err := json.Unmarshal(raw, &claimsValue); err != nil {
		return ""
	}

	// 1. Check root level "role"
	if roleRaw, ok := claimsValue["role"]; ok {
		if roleStr, ok := roleRaw.(string); ok && roleStr != "" {
			return roleStr
		}
	}

	// 2. Check metadata at root level
	if role := extractRoleFromMetadataMap(claimsValue, "public_metadata"); role != "" {
		return role
	}
	if role := extractRoleFromMetadataMap(claimsValue, "private_metadata"); role != "" {
		return role
	}
	if role := extractRoleFromMetadataMap(claimsValue, "unsafe_metadata"); role != "" {
		return role
	}
	if role := extractRoleFromMetadataMap(claimsValue, "metadata"); role != "" {
		return role
	}

	// 3. Check inside "claims" if it exists (handling potentially nested structure)
	if nestedRaw, ok := claimsValue["claims"]; ok {
		if nestedClaims, ok := nestedRaw.(map[string]interface{}); ok {
			if roleRaw, ok := nestedClaims["role"]; ok {
				if roleStr, ok := roleRaw.(string); ok && roleStr != "" {
					return roleStr
				}
			}
			if role := extractRoleFromMetadataMap(nestedClaims, "public_metadata"); role != "" {
				return role
			}
		}
	}

	return ""
}

func extractRoleFromMetadataMap(claimsMap map[string]interface{}, key string) string {
	metaRaw, ok := claimsMap[key]
	if !ok {
		return ""
	}
	metaMap, ok := metaRaw.(map[string]interface{})
	if !ok {
		return ""
	}
	roleRaw, ok := metaMap["role"]
	if !ok {
		return ""
	}
	if roleStr, ok := roleRaw.(string); ok {
		return roleStr
	}
	return ""
}

func extractRoleFromRawToken(authHeader string) string {
	if authHeader == "" {
		return ""
	}
	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 {
		return ""
	}
	token := parts[1]

	tokenParts := strings.Split(token, ".")
	if len(tokenParts) < 2 {
		return ""
	}

	payloadBytes, err := base64.RawURLEncoding.DecodeString(tokenParts[1])
	if err != nil {
		return ""
	}

	var claims map[string]interface{}
	if err := json.Unmarshal(payloadBytes, &claims); err != nil {
		return ""
	}

	if roleRaw, ok := claims["role"]; ok {
		if roleStr, ok := roleRaw.(string); ok && roleStr != "" {
			return roleStr
		}
	}
	if role := extractRoleFromMetadataMap(claims, "public_metadata"); role != "" {
		return role
	}
	if role := extractRoleFromMetadataMap(claims, "private_metadata"); role != "" {
		return role
	}
	if role := extractRoleFromMetadataMap(claims, "unsafe_metadata"); role != "" {
		return role
	}
	if role := extractRoleFromMetadataMap(claims, "metadata"); role != "" {
		return role
	}

	return ""
}
