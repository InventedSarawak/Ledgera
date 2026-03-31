# Generate Go Bindings for Smart Contracts

This document provides instructions on how to generate Go bindings for the Ledgera smart contracts using `abigen`.

## Prerequisites

1. **Install `abigen`** (part of go-ethereum):

    ```bash
    go install github.com/ethereum/go-ethereum/cmd/abigen@latest
    ```

2. **Install Foundry** (if not already installed):
    ```bash
    curl -L https://foundry.paradigm.xyz | bash
    foundryup
    ```

## Step 1: Compile Smart Contracts

First, compile your Solidity contracts to generate the ABI and bytecode:

```bash
cd contracts
forge build
```

This will create the compiled artifacts in `contracts/out/`.

## Step 2: Create Bindings Directory

Create a directory to store the Go bindings:

```bash
mkdir -p apps/backend/internal/blockchain/contracts/registry
mkdir -p apps/backend/internal/blockchain/contracts/token
mkdir -p apps/backend/internal/blockchain/contracts/marketplace
```

## Step 3: Generate Go Bindings

### For AssetRegistry.sol

```bash
abigen \
  --abi contracts/out/AssetRegistry.sol/AssetRegistry.json \
  --pkg registry \
  --type Registry \
  --out apps/backend/internal/blockchain/contracts/registry/registry.go
```

**Alternative (if you need bytecode for deployment):**

```bash
abigen \
  --combined-json contracts/out/AssetRegistry.sol/AssetRegistry.json \
  --pkg registry \
  --type Registry \
  --out apps/backend/internal/blockchain/contracts/registry/registry.go
```

### For AssetToken.sol

```bash
abigen \
  --abi contracts/out/AssetToken.sol/AssetToken.json \
  --pkg token \
  --type Token \
  --out apps/backend/internal/blockchain/contracts/token/token.go
```

### For Marketplace.sol

```bash
abigen \
  --abi contracts/out/Marketplace.sol/Marketplace.json \
  --pkg marketplace \
  --type Marketplace \
  --out apps/backend/internal/blockchain/contracts/marketplace/marketplace.go
```

## Step 4: Extract ABI (Alternative Method)

If the above commands don't work due to JSON structure, you can extract the ABI manually:

```bash
# Extract ABI from Foundry output
cat contracts/out/AssetRegistry.sol/AssetRegistry.json | jq -r '.abi' > /tmp/AssetRegistry.abi

# Generate binding
abigen \
  --abi /tmp/AssetRegistry.abi \
  --pkg registry \
  --type Registry \
  --out apps/backend/internal/blockchain/contracts/registry/registry.go
```

Repeat for other contracts:

```bash
# AssetToken
cat contracts/out/AssetToken.sol/AssetToken.json | jq -r '.abi' > /tmp/AssetToken.abi
abigen \
  --abi /tmp/AssetToken.abi \
  --pkg token \
  --type Token \
  --out apps/backend/internal/blockchain/contracts/token/token.go

# Marketplace
cat contracts/out/Marketplace.sol/Marketplace.json | jq -r '.abi' > /tmp/Marketplace.abi
abigen \
  --abi /tmp/Marketplace.abi \
  --pkg marketplace \
  --type Marketplace \
  --out apps/backend/internal/blockchain/contracts/marketplace/marketplace.go
```

## Step 5: Verify Generated Bindings

Check that the bindings were generated successfully:

```bash
ls -la apps/backend/internal/blockchain/contracts/*/
```

You should see:

- `apps/backend/internal/blockchain/contracts/registry/registry.go`
- `apps/backend/internal/blockchain/contracts/token/token.go`
- `apps/backend/internal/blockchain/contracts/marketplace/marketplace.go`

## Step 6: Update Go Module

Make sure your Go module is up to date:

```bash
cd apps/backend
go mod tidy
```

## Common Issues

### Issue: "No such file or directory"

**Solution:** Make sure you're running commands from the project root and that the `contracts/out/` directory exists after running `forge build`.

### Issue: "Invalid JSON"

**Solution:** Use the `jq` method to extract the ABI manually as shown in Step 4.

### Issue: "Package not found"

**Solution:** Ensure the output directory exists before running `abigen`:

```bash
mkdir -p apps/backend/internal/blockchain/contracts/registry
```

## Automation Script

You can create a script to automate this process:

```bash
#!/bin/bash
# scripts/generate-bindings.sh

set -e

echo "Compiling contracts..."
cd contracts
forge build
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

echo "Bindings generated successfully!"
```

Make it executable:

```bash
chmod +x scripts/generate-bindings.sh
```

Run it:

```bash
./scripts/generate-bindings.sh
```

## Next Steps

After generating the bindings:

1. **Deploy Contracts**: Deploy your contracts to a local or test network
2. **Update Configuration**: Set the deployed contract addresses in your `.env` file:
    ```
    LEDGERA_BLOCKCHAIN_FACTORY_ADDRESS=0x...
    LEDGERA_BLOCKCHAIN_COUNTER_ADDRESS=0x...
    ```
3. **Test Integration**: Test the backend integration with the blockchain

## Resources

- [Abigen Documentation](https://geth.ethereum.org/docs/tools/abigen)
- [Foundry Book](https://book.getfoundry.sh/)
- [Go Ethereum](https://github.com/ethereum/go-ethereum)
