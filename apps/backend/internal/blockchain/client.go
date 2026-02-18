package blockchain

import (
	"context"
	"crypto/ecdsa"
	"fmt"
	"math/big"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/inventedsarawak/ledgera/internal/blockchain/contracts/registry"
	"github.com/inventedsarawak/ledgera/internal/blockchain/contracts/token"
	"github.com/inventedsarawak/ledgera/internal/config"
)

type Client struct {
	Eth              *ethclient.Client
	Cfg              config.BlockchainConfig
	privateKey       *ecdsa.PrivateKey
	registryContract *registry.Registry
}

func NewClient(cfg config.BlockchainConfig) (*Client, error) {
	client, err := ethclient.Dial(cfg.RpcUrl)
	if err != nil {
		return nil, err
	}

	// Parse private key
	privateKey, err := crypto.HexToECDSA(cfg.AdminPrivateKey[2:]) // Remove 0x prefix
	if err != nil {
		return nil, err
	}

	// Load AssetRegistry Contract
	registryAddress := common.HexToAddress(cfg.RegistryAddress)
	registryContract, err := registry.NewRegistry(registryAddress, client)
	if err != nil {
		return nil, fmt.Errorf("failed to load registry contract: %w", err)
	}

	return &Client{
		Eth:              client,
		Cfg:              cfg,
		privateKey:       privateKey,
		registryContract: registryContract,
	}, nil
}

func (c *Client) GetTransactOpts(ctx context.Context) (*bind.TransactOpts, error) {
	chainID := big.NewInt(int64(c.Cfg.ChainID))
	auth, err := bind.NewKeyedTransactorWithChainID(c.privateKey, chainID)
	if err != nil {
		return nil, err
	}

	// Get nonce
	publicKey := c.privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		return nil, err
	}
	fromAddress := crypto.PubkeyToAddress(*publicKeyECDSA)
	nonce, err := c.Eth.PendingNonceAt(ctx, fromAddress)
	if err != nil {
		return nil, err
	}

	auth.Nonce = big.NewInt(int64(nonce))
	auth.Value = big.NewInt(0)
	auth.GasLimit = uint64(5000000) // 5M gas to be safe for contract deployment
	auth.Context = ctx

	return auth, nil
}

func (c *Client) GetCallOpts(ctx context.Context) *bind.CallOpts {
	return &bind.CallOpts{
		Context: ctx,
	}
}

// DeployProjectToken creates a new AssetToken via the AssetRegistry contract
func (c *Client) DeployProjectToken(ctx context.Context, name string, symbol string) (string, error) {
	auth, err := c.GetTransactOpts(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to get transaction options: %w", err)
	}

	// Call AssetRegistry.createAsset
	tx, err := c.registryContract.CreateAsset(auth, name, symbol)
	if err != nil {
		return "", fmt.Errorf("failed to create asset: %w", err)
	}

	// Wait for transaction receipt
	receipt, err := bind.WaitMined(ctx, c.Eth, tx)
	if err != nil {
		return "", fmt.Errorf("failed to wait for transaction: %w", err)
	}

	if receipt.Status == 0 {
		return "", fmt.Errorf("transaction failed")
	}

	// Parse the AssetCreated event to get the token address
	found := false
	var parseErr error

	// AssetCreated event signature hash
	// 0xa87566419658c36d7bd865066c1afb99599c60288ef6a0e107d517ecf739a182
	eventSignature := common.HexToHash("0xa87566419658c36d7bd865066c1afb99599c60288ef6a0e107d517ecf739a182")

	for i, log := range receipt.Logs {
		// Skip logs that don't match our event signature
		if len(log.Topics) == 0 || log.Topics[0] != eventSignature {
			continue
		}

		event, err := c.registryContract.ParseAssetCreated(*log)
		if err == nil {
			return event.AssetAddress.Hex(), nil
		}

		// If we found a matching topic but failed to parse, capture the error
		found = true
		parseErr = err
		fmt.Printf("Failed to parse log %d: %v\n", i, err)
	}

	if found {
		return "", fmt.Errorf("found AssetCreated event log but failed to parse: %w", parseErr)
	}

	return "", fmt.Errorf("failed to find AssetCreated event in transaction logs (count: %d)", len(receipt.Logs))
}

// MintTokens mints tokens to a specific address
func (c *Client) MintTokens(ctx context.Context, tokenAddress string, to string, amount *big.Int) error {
	auth, err := c.GetTransactOpts(ctx)
	if err != nil {
		return fmt.Errorf("failed to get transaction options: %w", err)
	}

	// Load the AssetToken contract
	tokenContract, err := token.NewToken(common.HexToAddress(tokenAddress), c.Eth)
	if err != nil {
		return fmt.Errorf("failed to load token contract: %w", err)
	}

	// Call AssetToken.mint
	tx, err := tokenContract.Mint(auth, common.HexToAddress(to), amount)
	if err != nil {
		return fmt.Errorf("failed to mint tokens: %w", err)
	}

	// Wait for transaction receipt
	receipt, err := bind.WaitMined(ctx, c.Eth, tx)
	if err != nil {
		return fmt.Errorf("failed to wait for transaction: %w", err)
	}

	if receipt.Status == 0 {
		return fmt.Errorf("mint transaction failed")
	}

	return nil
}

// VerifyETHPayment verifies that a transaction sent the expected ETH amount to the expected recipient
func (c *Client) VerifyETHPayment(ctx context.Context, txHash string, expectedTo string, expectedAmountWei *big.Int) error {
	hash := common.HexToHash(txHash)

	// Get the transaction
	tx, isPending, err := c.Eth.TransactionByHash(ctx, hash)
	if err != nil {
		return fmt.Errorf("failed to fetch transaction: %w", err)
	}
	if isPending {
		return fmt.Errorf("transaction is still pending")
	}

	// Get the receipt to check status
	receipt, err := c.Eth.TransactionReceipt(ctx, hash)
	if err != nil {
		return fmt.Errorf("failed to fetch transaction receipt: %w", err)
	}
	if receipt.Status == 0 {
		return fmt.Errorf("transaction failed on-chain")
	}

	// Verify recipient
	if tx.To() == nil {
		return fmt.Errorf("transaction has no recipient (contract creation)")
	}
	actualTo := tx.To().Hex()
	expectedToAddr := common.HexToAddress(expectedTo).Hex()
	if actualTo != expectedToAddr {
		return fmt.Errorf("transaction recipient mismatch: expected %s, got %s", expectedToAddr, actualTo)
	}

	// Verify amount (allow >= expected to handle gas variations)
	if tx.Value().Cmp(expectedAmountWei) < 0 {
		return fmt.Errorf("insufficient ETH sent: expected %s wei, got %s wei", expectedAmountWei.String(), tx.Value().String())
	}

	return nil
}

// TransferTokensTobuyer mints tokens to the buyer's address (admin-initiated)
// This is used in the marketplace buy flow where the admin mints tokens to the buyer
// after verifying ETH payment to the seller
func (c *Client) TransferTokensToBuyer(ctx context.Context, tokenAddress string, buyerAddress string, amount *big.Int) error {
	return c.MintTokens(ctx, tokenAddress, buyerAddress, amount)
}
