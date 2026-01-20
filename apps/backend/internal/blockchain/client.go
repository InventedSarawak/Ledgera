package blockchain

import (
	"context"
	"crypto/ecdsa"
	"math/big"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	// "github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/inventedsarawak/ledgera/internal/config"
)

type Client struct {
	Eth             *ethclient.Client
	Cfg             config.BlockchainConfig
	privateKey      *ecdsa.PrivateKey
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

	// Load Contract Here
	

	return &Client{
		Eth:             client,
		Cfg:             cfg,
		privateKey:      privateKey,
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
