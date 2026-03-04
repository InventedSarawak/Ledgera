package service

import (
	"math/big"
	"testing"

	"github.com/stretchr/testify/assert"
)

// FuzzEthToWei tests the ethToWei conversion logic
// to ensure no panics occur on unexpected float inputs or huge numbers,
// and validates behavior with precision gaps.
func FuzzEthToWei(f *testing.F) {
	// Add some seed corpus for the fuzz tester
	f.Add(1.0)
	f.Add(0.0)
	f.Add(10.5)
	f.Add(0.000000000000000001) // 1 Wei
	f.Add(100000.0)             // 100k ETH
	f.Add(-1.5)                 // Negative ETH (should convert, validation handles negatives elsewhere)

	f.Fuzz(func(t *testing.T, amount float64) {
		// ethToWei should ideally never panic
		weiResult := ethToWei(amount)
		assert.NotNil(t, weiResult)

		if amount == 0.0 {
			assert.Equal(t, int64(0), weiResult.Int64(), "0 ETH should be 0 Wei")
		} else if amount == 1.0 {
			// 1 ETH = 1e18 Wei
			expected, _ := new(big.Int).SetString("1000000000000000000", 10)
			assert.Equal(t, 0, weiResult.Cmp(expected), "1 ETH should equal 1e18 wei")
		}

		// Ensure it never returns a nil pointer or causes memory faults
		_ = weiResult.String()
	})
}
