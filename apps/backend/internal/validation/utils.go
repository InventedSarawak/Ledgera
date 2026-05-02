package validation

import (
	"fmt"
	"reflect"
	"regexp"
	"strings"

	"github.com/go-playground/validator/v10"
	"github.com/inventedsarawak/ledgera/internal/errs"
	"github.com/labstack/echo/v4"
)

type Validatable interface {
	Validate() error
}

type CustomValidationError struct {
	Field   string
	Message string
}

type CustomValidationErrors []CustomValidationError

func (c CustomValidationErrors) Error() string {
	return "Validation failed"
}

func BindAndValidate(c echo.Context, payload Validatable) error {
	if err := c.Bind(payload); err != nil {
		// Be defensive when extracting bind errors to avoid panics on unexpected formats
		msg := "Invalid request payload"
		if httpErr, ok := err.(*echo.HTTPError); ok {
			if s, ok := httpErr.Message.(string); ok && s != "" {
				msg = s
			}
		} else if idx := strings.Index(err.Error(), "message="); idx != -1 {
			// Try to extract the message part if present
			msgPart := err.Error()[idx+len("message="):]
			if comma := strings.Index(msgPart, ","); comma != -1 {
				msgPart = strings.TrimSpace(msgPart[:comma])
			}
			if msgPart != "" {
				msg = msgPart
			}
		} else if err.Error() != "" {
			msg = err.Error()
		}

		return errs.NewBadRequestError(msg, false, nil, nil, nil)
	}

	if msg, fieldErrors := validateStruct(payload); fieldErrors != nil {
		return errs.NewBadRequestError(msg, true, nil, fieldErrors, nil)
	}

	return nil
}

func validateStruct(v Validatable) (string, []errs.FieldError) {
	if err := v.Validate(); err != nil {
		return extractValidationErrors(err)
	}
	return "", nil
}

func extractValidationErrors(err error) (string, []errs.FieldError) {
	var fieldErrors []errs.FieldError
	validationErrors, ok := err.(validator.ValidationErrors)
	if !ok {
		// Try custom wrapped errors first
		if customValidationErrors, ok2 := err.(CustomValidationErrors); ok2 {
			for _, err := range customValidationErrors {
				fieldErrors = append(fieldErrors, errs.FieldError{
					Field: err.Field,
					Error: err.Message,
				})
			}
			return "Validation failed", fieldErrors
		}
		// Unknown error type: return a single generic error to avoid panics
		return "Validation failed", []errs.FieldError{{
			Field: "",
			Error: err.Error(),
		}}
	}

	for _, err := range validationErrors {
		field := strings.ToLower(err.Field())
		var msg string

		switch err.Tag() {
		case "required":
			msg = "is required"
		case "min":
			if err.Type().Kind() == reflect.String {
				msg = fmt.Sprintf("must be at least %s characters", err.Param())
			} else {
				msg = fmt.Sprintf("must be at least %s", err.Param())
			}
		case "max":
			if err.Type().Kind() == reflect.String {
				msg = fmt.Sprintf("must not exceed %s characters", err.Param())
			} else {
				msg = fmt.Sprintf("must not exceed %s", err.Param())
			}
		case "oneof":
			msg = fmt.Sprintf("must be one of: %s", err.Param())
		case "email":
			msg = "must be a valid email address"
		case "url":
			msg = "must be a valid URL"
		case "e164":
			msg = "must be a valid phone number with country code"
		case "uuid":
			msg = "must be a valid UUID"
		case "uuidList":
			msg = "must be a comma-separated list of valid UUIDs"
		case "latitude":
			msg = "must be a valid latitude between -90 and 90"
		case "longitude":
			msg = "must be a valid longitude between -180 and 180"
		case "solana_pubkey":
			msg = "must be a valid Solana public key (Base58, 32-44 characters)"
		case "solana_sig":
			msg = "must be a valid Solana transaction signature (Base58, 64-88 characters)"
		case "dive":
			msg = "some items are invalid"
		default:
			if err.Param() != "" {
				msg = fmt.Sprintf("failed %s:%s", err.Tag(), err.Param())
			} else {
				msg = fmt.Sprintf("failed %s validation", err.Tag())
			}
		}

		fieldErrors = append(fieldErrors, errs.FieldError{
			Field: field,
			Error: msg,
		})
	}

	return "Validation failed", fieldErrors
}

var uuidRegex = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

func IsValidUUID(uuid string) bool {
	return uuidRegex.MatchString(uuid)
}

// ---- Solana-specific validators ----

const base58Chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

// IsBase58 checks if a string consists only of Base58 characters (Bitcoin alphabet).
func IsBase58(s string) bool {
	for _, c := range s {
		found := false
		for _, b := range base58Chars {
			if c == b {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}
	return true
}

// IsValidSolanaPubkey validates a Solana Base58-encoded public key (32-44 characters).
func IsValidSolanaPubkey(addr string) bool {
	return len(addr) >= 32 && len(addr) <= 44 && IsBase58(addr)
}

// IsValidSolanaSignature validates a Solana Base58-encoded transaction signature (64-88 characters).
func IsValidSolanaSignature(sig string) bool {
	return len(sig) >= 64 && len(sig) <= 88 && IsBase58(sig)
}

// ValidateSolanaPubkey is a go-playground/validator custom func for Solana public keys.
func ValidateSolanaPubkey(fl validator.FieldLevel) bool {
	return IsValidSolanaPubkey(fl.Field().String())
}

// ValidateSolanaSig is a go-playground/validator custom func for Solana transaction signatures.
func ValidateSolanaSig(fl validator.FieldLevel) bool {
	return IsValidSolanaSignature(fl.Field().String())
}

// RegisterSolanaValidators registers all Solana-specific custom validators on a validator instance.
func RegisterSolanaValidators(v *validator.Validate) {
	v.RegisterValidation("solana_pubkey", ValidateSolanaPubkey)
	v.RegisterValidation("solana_sig", ValidateSolanaSig)
}
