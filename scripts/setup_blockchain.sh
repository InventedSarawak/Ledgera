#!/bin/bash
set -e

# --- CLEANUP TRAP ---
# This function runs automatically when the script exits or you press Ctrl+C
cleanup() {
    echo -e "\nShutting down Solana test validator and cleaning up..."
    pkill -f solana-test-validator || true
    pkill -f solana-faucet || true
    echo "Cleanup complete. Goodbye!"
}
trap cleanup EXIT INT TERM
# --------------------

export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

SOLANA_SBF_SDK="$HOME/.local/share/solana/install/active_release/sdk/sbf"
if ! cargo --list | grep -q 'build-sbf' || [ ! -d "$SOLANA_SBF_SDK" ]; then
    echo "Solana tools incomplete or missing! Installing the official Solana Tool Suite (v1.18.18)..."
    # sh -c "$(curl -sSfL https://release.solana.com/v1.18.18/install)"
    export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
fi

env_file="apps/backend/.env"

echo "Building AMM program..."
cd amm
anchor build
cd ..

# Ensure ports are clear before starting a new validator
pkill -f solana-test-validator || true
pkill -f solana-faucet || true
sleep 1

echo "Starting solana-test-validator in background..."
solana-test-validator --reset --quiet &
VALIDATOR_PID=$!

echo "Waiting for validator to boot..."
sleep 5

echo "Deploying AMM program..."
cd amm
anchor deploy
cd ..

program_id=$(solana address -k amm/target/deploy/amm-keypair.json)
echo "AMM deployed at: $program_id"

echo "Setting up Tokens..."
usdc_mint=$(spl-token create-token --decimals 6 | grep "Creating token" | awk '{print $3}')
eon_mint=$(spl-token create-token --decimals 9 | grep "Creating token" | awk '{print $3}')
selene_mint=$(spl-token create-token --decimals 9 | grep "Creating token" | awk '{print $3}')
geron_mint=$(spl-token create-token --decimals 9 | grep "Creating token" | awk '{print $3}')

echo "Updating .env file..."

for var in USDC_MINT EON_MINT SELENE_MINT GERON_MINT AMM_PROGRAM_ID; do
    if ! grep -q "LEDGERA_BLOCKCHAIN\.$var=" "$env_file"; then
        echo "LEDGERA_BLOCKCHAIN.$var=\"\"" >> "$env_file"
    fi
done

if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/LEDGERA_BLOCKCHAIN\.AMM_PROGRAM_ID=\".*\"/LEDGERA_BLOCKCHAIN.AMM_PROGRAM_ID=\"$program_id\"/" $env_file
    sed -i '' "s/LEDGERA_BLOCKCHAIN\.USDC_MINT=\".*\"/LEDGERA_BLOCKCHAIN.USDC_MINT=\"$usdc_mint\"/" $env_file
    sed -i '' "s/LEDGERA_BLOCKCHAIN\.EON_MINT=\".*\"/LEDGERA_BLOCKCHAIN.EON_MINT=\"$eon_mint\"/" $env_file
    sed -i '' "s/LEDGERA_BLOCKCHAIN\.SELENE_MINT=\".*\"/LEDGERA_BLOCKCHAIN.SELENE_MINT=\"$selene_mint\"/" $env_file
    sed -i '' "s/LEDGERA_BLOCKCHAIN\.GERON_MINT=\".*\"/LEDGERA_BLOCKCHAIN.GERON_MINT=\"$geron_mint\"/" $env_file
else
    sed -i "s/LEDGERA_BLOCKCHAIN\.AMM_PROGRAM_ID=\".*\"/LEDGERA_BLOCKCHAIN.AMM_PROGRAM_ID=\"$program_id\"/" $env_file
    sed -i "s/LEDGERA_BLOCKCHAIN\.USDC_MINT=\".*\"/LEDGERA_BLOCKCHAIN.USDC_MINT=\"$usdc_mint\"/" $env_file
    sed -i "s/LEDGERA_BLOCKCHAIN\.EON_MINT=\".*\"/LEDGERA_BLOCKCHAIN.EON_MINT=\"$eon_mint\"/" $env_file
    sed -i "s/LEDGERA_BLOCKCHAIN\.SELENE_MINT=\".*\"/LEDGERA_BLOCKCHAIN.SELENE_MINT=\"$selene_mint\"/" $env_file
    sed -i "s/LEDGERA_BLOCKCHAIN\.GERON_MINT=\".*\"/LEDGERA_BLOCKCHAIN.GERON_MINT=\"$geron_mint\"/" $env_file
fi

echo "Environment updated! (Press Ctrl+C to stop the validator and exit)"
wait $VALIDATOR_PID