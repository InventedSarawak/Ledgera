package blockchain

import (
	"context"
	"fmt"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/programs/token"
	"github.com/gagliardetto/solana-go/rpc"
	confirm "github.com/gagliardetto/solana-go/rpc/sendAndConfirmTransaction"
	"github.com/inventedsarawak/ledgera/internal/config"
)

type Client struct {
	RpcClient  *rpc.Client
	Cfg        config.BlockchainConfig
	AdminKey   solana.PrivateKey
	EonMint    solana.PublicKey
	SeleneMint solana.PublicKey
	GeronMint  solana.PublicKey
	UsdcMint   solana.PublicKey
}

func NewClient(cfg config.BlockchainConfig) (*Client, error) {
	rpcClient := rpc.New(cfg.RpcUrl)
	adminKey, err := solana.PrivateKeyFromBase58(cfg.AdminPrivateKey)
	if err != nil {
		return nil, fmt.Errorf("failed to parse admin private key: %w", err)
	}

	eonMint, err := solana.PublicKeyFromBase58(cfg.EonMintAddress)
	if err != nil {
		return nil, fmt.Errorf("failed to parse EON mint address: %w", err)
	}

	seleneMint, err := solana.PublicKeyFromBase58(cfg.SeleneMintAddress)
	if err != nil {
		return nil, fmt.Errorf("failed to parse SELENE mint address: %w", err)
	}

	geronMint, err := solana.PublicKeyFromBase58(cfg.GeronMintAddress)
	if err != nil {
		return nil, fmt.Errorf("failed to parse GERON mint address: %w", err)
	}

	usdcMint, err := solana.PublicKeyFromBase58(cfg.UsdcMintAddress)
	if err != nil {
		return nil, fmt.Errorf("failed to parse USDC mint address: %w", err)
	}

	return &Client{
		RpcClient:  rpcClient,
		Cfg:        cfg,
		AdminKey:   adminKey,
		EonMint:    eonMint,
		SeleneMint: seleneMint,
		GeronMint:  geronMint,
		UsdcMint:   usdcMint,
	}, nil
}

func (c *Client) MintEONTokens(ctx context.Context, to string, amount uint64) error {
	toPubKey, err := solana.PublicKeyFromBase58(to)
	if err != nil {
		return fmt.Errorf("invalid recipient public key: %w", err)
	}

	// 1. Get/Find the Associated Token Account for the recipient
	// Using standard ATA derivation
	ata, _, err := solana.FindAssociatedTokenAddress(toPubKey, c.EonMint)
	if err != nil {
		return fmt.Errorf("failed to derive ATA: %w", err)
	}

	// In a real implementation, we would check if the ATA exists and if not, create it.
	// For now, we assume the frontend or the backend created it.
	
	// 2. Build the MintTo instruction
	inst := token.NewMintToInstruction(
		amount,
		c.EonMint,
		ata,
		c.AdminKey.PublicKey(),
		[]solana.PublicKey{},
	).Build()

	// 3. Send transaction
	recent, err := c.RpcClient.GetLatestBlockhash(ctx, rpc.CommitmentFinalized)
	if err != nil {
		return fmt.Errorf("failed to get blockhash: %w", err)
	}

	tx, err := solana.NewTransaction(
		[]solana.Instruction{inst},
		recent.Value.Blockhash,
		solana.TransactionPayer(c.AdminKey.PublicKey()),
	)
	if err != nil {
		return fmt.Errorf("failed to create tx: %w", err)
	}

	_, err = tx.Sign(
		func(key solana.PublicKey) *solana.PrivateKey {
			if c.AdminKey.PublicKey().Equals(key) {
				return &c.AdminKey
			}
			return nil
		},
	)
	if err != nil {
		return fmt.Errorf("failed to sign tx: %w", err)
	}

	_, err = confirm.SendAndConfirmTransaction(ctx, c.RpcClient, nil, tx)
	if err != nil {
		return fmt.Errorf("failed to send and confirm tx: %w", err)
	}

	return nil
}

func (c *Client) VerifySolanaTransaction(ctx context.Context, signature string, expectedTo string, expectedAmount uint64) error {
	sig, err := solana.SignatureFromBase58(signature)
	if err != nil {
		return fmt.Errorf("invalid transaction signature base58: %w", err)
	}

	txDetails, err := c.RpcClient.GetTransaction(
		ctx,
		sig,
		&rpc.GetTransactionOpts{
			Commitment: rpc.CommitmentConfirmed,
		},
	)
	if err != nil {
		return fmt.Errorf("failed to retrieve transaction details: %w", err)
	}

	if txDetails == nil || txDetails.Meta == nil {
		return fmt.Errorf("transaction not found or has no metadata")
	}

	if txDetails.Meta.Err != nil {
		return fmt.Errorf("transaction failed natively on solana cluster")
	}

	// In a real implementation this would iterate through inner instructions / token balances
	// checking pre/post balances of the expectedTo associated token account.
	// For demonstration, we simply verify the transaction was successful.
	
	return nil
}
