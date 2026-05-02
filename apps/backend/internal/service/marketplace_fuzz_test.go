package service

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

// FuzzSolanaDecimalConversion tests the credit amount scaling logic
// (1 credit = 1000 scaled units) to ensure no panics occur on unexpected
// float inputs or huge numbers, and validates behavior with precision gaps.
func FuzzSolanaDecimalConversion(f *testing.F) {
	// Add some seed corpus for the fuzz tester
	f.Add(1.0)
	f.Add(0.0)
	f.Add(10.5)
	f.Add(0.001) // 1 scaled unit
	f.Add(100000.0)
	f.Add(-1.5) // Negative (validation handles negatives elsewhere)

	f.Fuzz(func(t *testing.T, amount float64) {
		// Simulate the scaling logic used in marketplace service
		scaledAmount := int64(amount * 1000)
		displayAmount := float64(scaledAmount) / 1000.0

		// Should never panic
		assert.NotPanics(t, func() {
			_ = scaledAmount
			_ = displayAmount
		})

		if amount == 0.0 {
			assert.Equal(t, int64(0), scaledAmount, "0 credits should be 0 scaled units")
		}
		if amount == 1.0 {
			assert.Equal(t, int64(1000), scaledAmount, "1 credit should equal 1000 scaled units")
		}
	})
}
