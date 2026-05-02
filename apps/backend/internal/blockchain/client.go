package blockchain

import (
	"context"
	"fmt"
	"strconv"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc/ws"
	"github.com/gagliardetto/solana-go/programs/associated-token-account"
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
	var insts []solana.Instruction

	_, err = c.RpcClient.GetAccountInfo(ctx, ata)
	if err != nil {
		// Most likely rpc.ErrNotFound, meaning the ATA doesn't exist
		createAtaInst := associatedtokenaccount.NewCreateInstruction(
			c.AdminKey.PublicKey(),
			toPubKey,
			c.EonMint,
		).Build()
		insts = append(insts, createAtaInst)
	}

	// 2. Build the MintTo instruction
	mintInst := token.NewMintToInstruction(
		amount,
		c.EonMint,
		ata,
		c.AdminKey.PublicKey(),
		[]solana.PublicKey{},
	).Build()
	
	insts = append(insts, mintInst)

	// 3. Send transaction
	recent, err := c.RpcClient.GetLatestBlockhash(ctx, rpc.CommitmentFinalized)
	if err != nil {
		return fmt.Errorf("failed to get blockhash: %w", err)
	}

	tx, err := solana.NewTransaction(
		insts,
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

	wsClient, err := ws.Connect(ctx, "ws://127.0.0.1:8900")
    if err != nil {
        return fmt.Errorf("failed to connect to websocket: %w", err)
	}
	defer wsClient.Close()

	_, err = confirm.SendAndConfirmTransaction(ctx, c.RpcClient, wsClient, tx)
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

	// Verify pre/post balances
	expectedToPubkey, err := solana.PublicKeyFromBase58(expectedTo)
	if err != nil {
		return fmt.Errorf("invalid expectedTo public key: %w", err)
	}

	// Find the matching account index for expectedTo (or their ATA)
	// For simplicity, we just look for any token balance change that matches expectedAmount
	// and belongs to expectedTo.
	var preAmount, postAmount uint64
	foundPre := false
	foundPost := false

	for _, pre := range txDetails.Meta.PreTokenBalances {
		if pre.Owner != nil && pre.Owner.Equals(expectedToPubkey) {
			if parsed, err := strconv.ParseUint(pre.UiTokenAmount.Amount, 10, 64); err == nil {
				preAmount = parsed
				foundPre = true
			}
		}
	}

	for _, post := range txDetails.Meta.PostTokenBalances {
		if post.Owner != nil && post.Owner.Equals(expectedToPubkey) {
			if parsed, err := strconv.ParseUint(post.UiTokenAmount.Amount, 10, 64); err == nil {
				postAmount = parsed
				foundPost = true
			}
		}
	}

	// If no pre balance was found, it might have been 0 (account created in tx)
	if !foundPre {
		preAmount = 0
	}

	if foundPost && postAmount >= preAmount+expectedAmount {
		return nil
	}

	return fmt.Errorf("expected amount transfer not found in transaction balances (pre: %d, post: %d, expected: %d)", preAmount, postAmount, expectedAmount)
}

func (c *Client) ReadTokenBalance(ctx context.Context, walletAddress string, mintAddress string) (uint64, error) {
	walletPubKey, err := solana.PublicKeyFromBase58(walletAddress)
	if err != nil {
		return 0, fmt.Errorf("invalid wallet address: %w", err)
	}
	mintPubKey, err := solana.PublicKeyFromBase58(mintAddress)
	if err != nil {
		return 0, fmt.Errorf("invalid mint address: %w", err)
	}

	ata, _, err := solana.FindAssociatedTokenAddress(walletPubKey, mintPubKey)
	if err != nil {
		return 0, fmt.Errorf("failed to derive ATA: %w", err)
	}

	balance, err := c.RpcClient.GetTokenAccountBalance(ctx, ata, rpc.CommitmentConfirmed)
	if err != nil {
		return 0, fmt.Errorf("failed to get token balance: %w", err)
	}

	amount, err := strconv.ParseUint(balance.Value.Amount, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("failed to parse balance amount: %w", err)
	}
	return amount, nil
}
