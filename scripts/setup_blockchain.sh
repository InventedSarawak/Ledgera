#!/bin/bash
set -e

# Configuration
env_file="apps/backend/.env"
contracts_dir="contracts"
anvil_port=8545
rpc_url="http://127.0.0.1:$anvil_port"
private_key="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

echo "Deploying AssetRegistry..."
cd $contracts_dir
forge script script/AssetRegistry.s.sol --rpc-url $rpc_url --broadcast --private-key $private_key --json > /dev/null

# Get Registry Address from broadcast artifact
registry_address=$(jq -r '.transactions[0].contractAddress' broadcast/AssetRegistry.s.sol/31337/run-latest.json)
echo "AssetRegistry deployed at: $registry_address"



cd ..

# Update .env file
echo "Updating .env file..."

# Use python to update .env safely orsed
# Using sed for Linux
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS requires standard extension for -i
    sed -i '' "s/LEDGERA_BLOCKCHAIN\.REGISTRY_ADDRESS=\".*\"/LEDGERA_BLOCKCHAIN.REGISTRY_ADDRESS=\"$registry_address\"/" $env_file
else
    sed -i "s/LEDGERA_BLOCKCHAIN\.REGISTRY_ADDRESS=\".*\"/LEDGERA_BLOCKCHAIN.REGISTRY_ADDRESS=\"$registry_address\"/" $env_file
fi

echo "Environment updated with new contract addresses."
echo "Registry: $registry_address"


