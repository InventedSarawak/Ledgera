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
	"github.com/inventedsarawak/ledgera/internal/config"
	"github.com/inventedsarawak/ledgera/internal/blockchain/contracts/registry"
	"github.com/inventedsarawak/ledgera/internal/blockchain/contracts/token"
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
	auth.GasLimit = uint64(300000)
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
	for _, log := range receipt.Logs {
		event, err := c.registryContract.ParseAssetCreated(*log)
		if err == nil {
			return event.AssetAddress.Hex(), nil
		}
	}

	return "", fmt.Errorf("failed to parse asset created event")
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

