#!/bin/bash
# Generate Go bindings for Solidity contracts

set -e

echo "Compiling contracts..."
cd contracts
forge build --force 2>&1 | grep -E "(Error|Compiler run failed)" || echo "✓ Compilation successful"
cd ..

echo "Creating directories..."
mkdir -p apps/backend/internal/blockchain/contracts/{registry,token,marketplace}

echo "Extracting ABIs..."
cat contracts/out/AssetRegistry.sol/AssetRegistry.json | jq -r '.abi' > /tmp/AssetRegistry.abi
cat contracts/out/AssetToken.sol/AssetToken.json | jq -r '.abi' > /tmp/AssetToken.abi
cat contracts/out/Marketplace.sol/Marketplace.json | jq -r '.abi' > /tmp/Marketplace.abi

echo "Generating Go bindings..."
abigen --abi /tmp/AssetRegistry.abi --pkg registry --type Registry --out apps/backend/internal/blockchain/contracts/registry/registry.go
abigen --abi /tmp/AssetToken.abi --pkg token --type Token --out apps/backend/internal/blockchain/contracts/token/token.go
abigen --abi /tmp/Marketplace.abi --pkg marketplace --type Marketplace --out apps/backend/internal/blockchain/contracts/marketplace/marketplace.go

echo "Cleaning up..."
rm /tmp/AssetRegistry.abi /tmp/AssetToken.abi /tmp/Marketplace.abi

echo "Tidying Go modules..."
cd apps/backend
go mod tidy
cd ../..

echo "Bindings generated successfully!"
