# Blockchain Configuration Guide

This guide explains how to configure the Ledgera backend to work with the blockchain (Anvil local node for development).

## 📋 Required Environment Variables

The backend requires the following blockchain-related environment variables:

### Core Blockchain Configuration

| Variable                                 | Description                                          | Example Value           |
| ---------------------------------------- | ---------------------------------------------------- | ----------------------- |
| `LEDGERA_BLOCKCHAIN.RPC_URL`             | The RPC endpoint for the blockchain node             | `http://127.0.0.1:8545` |
| `LEDGERA_BLOCKCHAIN.CHAIN_ID`            | The chain ID for the network                         | `31337` (Anvil default) |
| `LEDGERA_BLOCKCHAIN.REGISTRY_ADDRESS`    | Address of the deployed AssetRegistry contract       | `0x5FbDB...`            |
| `LEDGERA_BLOCKCHAIN.MARKETPLACE_ADDRESS` | Address of the deployed Marketplace contract         | `0xe7f17...`            |
| `LEDGERA_BLOCKCHAIN.ADMIN_PRIVATE_KEY`   | Private key of the admin wallet (signs transactions) | `0xac097...`            |

### Variable Details

#### 1. RPC_URL

- **Purpose**: Backend uses this to connect to the blockchain node
- **Local Development**: `http://127.0.0.1:8545` (Anvil default)
- **Testnet**: `https://sepolia.infura.io/v3/YOUR_KEY`
- **Mainnet**: `https://mainnet.infura.io/v3/YOUR_KEY`

#### 2. CHAIN_ID

- **Purpose**: Identifies which blockchain network to use
- **Anvil Local**: `31337`
- **Sepolia Testnet**: `11155111`
- **Ethereum Mainnet**: `1`

#### 3. REGISTRY_ADDRESS & MARKETPLACE_ADDRESS

- **Purpose**: Contract addresses that the backend interacts with
- **Registry**: AssetRegistry contract for creating and managing carbon credit tokens
- **Marketplace**: Marketplace contract for trading carbon credits
- **Setup**: Deploy your contracts first, then paste the addresses here
- **See**: `apps/backend/docs/GENERATE_BINDINGS.md` for deployment instructions

#### 4. ADMIN_PRIVATE_KEY

- **Purpose**: Private key used to sign blockchain transactions
- **⚠️ SECURITY**:
    - For local development, use Anvil test accounts (see below)
    - **NEVER** commit real private keys to git
    - **NEVER** use test keys in production
    - For production, use a hardware wallet or secure key management service

## 🔧 Setting Up Anvil Local Node

### 1. Start Anvil

```bash
anvil
```

This will start a local Ethereum node at `http://127.0.0.1:8545` with Chain ID `31337`.

### 2. Anvil Test Accounts

Anvil provides 10 pre-funded test accounts. Here are the first three:

#### Account #0 (Recommended for Admin)

- **Address**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- **Private Key**: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
- **Balance**: 10,000 ETH

#### Account #1

- **Address**: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
- **Private Key**: `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`
- **Balance**: 10,000 ETH

#### Account #2

- **Address**: `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`
- **Private Key**: `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a`
- **Balance**: 10,000 ETH

**Note**: All Anvil accounts use the same mnemonic:

```
test test test test test test test test test test test junk
```

### 3. Configure Environment Variables

Update your `.env` file:

```bash
LEDGERA_BLOCKCHAIN.RPC_URL="http://127.0.0.1:8545"
LEDGERA_BLOCKCHAIN.CHAIN_ID=31337
LEDGERA_BLOCKCHAIN.REGISTRY_ADDRESS="0x5FbDB2315678afecb367f032d93F642f64180aa3"
LEDGERA_BLOCKCHAIN.MARKETPLACE_ADDRESS="0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
LEDGERA_BLOCKCHAIN.ADMIN_PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
```

## 🦊 Adding Anvil to MetaMask

To interact with your local Anvil node using MetaMask:

### Step 1: Open MetaMask Settings

1. Click the MetaMask extension
2. Click on the network dropdown (top center)
3. Click "Add Network"
4. Click "Add a network manually"

### Step 2: Enter Network Details

Fill in the following information:

| Field                  | Value                   |
| ---------------------- | ----------------------- |
| **Network Name**       | Anvil Local             |
| **New RPC URL**        | `http://127.0.0.1:8545` |
| **Chain ID**           | `31337`                 |
| **Currency Symbol**    | `ETH`                   |
| **Block Explorer URL** | _(leave empty)_         |

### Step 3: Save Network

Click "Save" to add the network.

### Step 4: Import Test Account

1. Click the account icon (top right)
2. Select "Import Account"
3. Select "Private Key" as import type
4. Paste the private key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
5. Click "Import"

You should now see Account #0 with 10,000 ETH!

### Step 5: Switch to Anvil Network

Make sure MetaMask is connected to "Anvil Local" network (check the network dropdown).

## 🚀 Deploying Contracts

Before the backend can interact with the blockchain, you need to deploy the contracts:

### 1. Navigate to contracts directory

```bash
cd contracts
```

### 2. Deploy AssetRegistry

```bash
forge script script/AssetRegistry.s.sol:AssetRegistryScript --rpc-url http://127.0.0.1:8545 --broadcast
```

You'll see output like:

```
AssetRegistry deployed at: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

### 3. Deploy Marketplace

```bash
forge script script/Marketplace.s.sol:MarketplaceScript --rpc-url http://127.0.0.1:8545 --broadcast
```

You'll see output like:

```
Marketplace deployed at: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

### 4. Update .env

Copy both contract addresses and update your `.env`:

```bash
LEDGERA_BLOCKCHAIN.REGISTRY_ADDRESS="0x5FbDB2315678afecb367f032d93F642f64180aa3"
LEDGERA_BLOCKCHAIN.MARKETPLACE_ADDRESS="0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
```

## ✅ Verification Checklist

Before running the backend, verify:

- [ ] Anvil is running (`anvil` command)
- [ ] Contracts are deployed
- [ ] `.env` has correct RPC_URL
- [ ] `.env` has correct CHAIN_ID
- [ ] `.env` has contract addresses
- [ ] `.env` has admin private key
- [ ] MetaMask is configured with Anvil network (optional)
- [ ] MetaMask has imported test account (optional)

## 🔍 Troubleshooting

### "Failed to connect to blockchain"

**Solution**: Make sure Anvil is running:

```bash
anvil
```

### "Invalid chain ID"

**Solution**: Check that `CHAIN_ID` matches your network (31337 for Anvil).

### "Transaction reverted"

**Possible Causes**:

- Insufficient gas
- Contract not deployed
- Invalid contract address
- Wrong private key

### "Cannot find contract at address"

**Solution**: Redeploy your contracts and update the addresses in `.env`.

## 📚 Additional Resources

- [Foundry Documentation](https://book.getfoundry.sh/)
- [Anvil Local Node](https://book.getfoundry.sh/anvil/)
- [MetaMask Documentation](https://docs.metamask.io/)
- [Contract Deployment Guide](./GENERATE_BINDINGS.md)

## ⚠️ Security Warnings

1. **Never use Anvil test keys in production**
2. **Never commit private keys to version control**
3. **Always use environment variables for sensitive data**
4. **For production, use hardware wallets or HSM**
5. **Rotate keys regularly in production**

---

**Need Help?** Check the project README or open an issue on GitHub.
