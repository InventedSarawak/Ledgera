#!/bin/bash
# Generate Go bindings for Solana programs

set -e

echo "Building AMM program in Solana..."
cd amm
anchor build
cd ..

echo "Creating backend config if needed..."
# Normally, Solana provides a client generation (like Anchor Go client Gen), 
# but for now we'll just parse the IDL if needed.

mkdir -p apps/backend/internal/blockchain/contracts/amm

echo "Extracting IDL..."
cp amm/target/idl/amm.json apps/backend/internal/blockchain/contracts/amm/amm.json

echo "Generating Go bindings using raw RPC calls or anchor-go if supported..."
# Placeholder for Solana Go bindings generation.
# Currently, most teams interact with Anchor IDL directly via standard instructions,
# Or via github.com/gagliardetto/solana-go

echo "Tidying Go modules..."
cd apps/backend
go mod tidy
cd ../..

echo "Bindings extraction successfully!"
