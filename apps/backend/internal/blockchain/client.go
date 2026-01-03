package blockchain

import (
    "github.com/ethereum/go-ethereum/ethclient"
    "github.com/inventedsarawak/ledgera/internal/config"
)

type Client struct {
    Eth *ethclient.Client
    Cfg config.BlockchainConfig
}

func NewClient(cfg config.BlockchainConfig) (*Client, error) {
    client, err := ethclient.Dial(cfg.RpcUrl)
    if err != nil {
        return nil, err
    }
    return &Client{Eth: client, Cfg: cfg}, nil
}