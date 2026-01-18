package middleware

import (
	"strings"

	"github.com/labstack/echo/v4"
)

// SanitizeCookies removes or sanitizes cookie headers with invalid characters
func SanitizeCookies() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			req := c.Request()

			// Get the cookie header
			cookieHeader := req.Header.Get("Cookie")

			if cookieHeader != "" {
				sanitized := sanitizeCookieHeader(cookieHeader)
				if sanitized == "" {
					req.Header.Del("Cookie")
				} else {
					req.Header.Set("Cookie", sanitized)
				}
			}
			return next(c)
		}
	}
}

// containsInvalidChars checks if the cookie header contains invalid characters
func containsInvalidChars(cookie string) bool {
	// Check for common invalid characters that cause "Invalid character in header content" errors
	invalidChars := []string{"\n", "\r", "\x00"}
	for _, char := range invalidChars {
		if strings.Contains(cookie, char) {
			return true
		}
	}
	return false
}

// sanitizeCookieHeader attempts to sanitize a cookie header by removing invalid parts
func sanitizeCookieHeader(cookie string) string {
	// Split cookies by semicolon
	cookies := strings.Split(cookie, ";")
	var validCookies []string

	for _, c := range cookies {
		c = strings.TrimSpace(c)
		if c == "" {
			continue
		}

		// Check if this individual cookie is valid
		if !containsInvalidChars(c) {
			validCookies = append(validCookies, c)
		}
	}

	if len(validCookies) == 0 {
		return ""
	}

	return strings.Join(validCookies, "; ")
}

// StripCookiesForBearerAuth removes cookie headers when Authorization header is present
// This is useful when you're using Bearer token auth and don't need cookies
func StripCookiesForBearerAuth() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			req := c.Request()

			// If Authorization header is present (Bearer token), remove cookies
			authHeader := req.Header.Get("Authorization")
			if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
				req.Header.Del("Cookie")
			}

			return next(c)
		}
	}
}
