#!/bin/bash

echo "🚀 Starting Solana Options Escrow Test Suite"
echo "=============================================="
echo ""

# Kill any existing validators
echo "📌 Cleaning up existing processes..."
pkill -9 -f "solana-test-validator" 2>/dev/null
sleep 2

# Start local validator
echo "🔧 Starting local Solana validator..."
solana-test-validator --reset > /tmp/validator.log 2>&1 &
VALIDATOR_PID=$!

# Wait for validator to be ready
echo "⏳ Waiting for validator to initialize..."
sleep 8

# Check if validator is running
if ! pgrep -f "solana-test-validator" > /dev/null; then
    echo "❌ Failed to start validator"
    exit 1
fi

echo "✅ Validator running (PID: $VALIDATOR_PID)"
echo ""

# Set Solana config to localhost
solana config set --url http://localhost:8899 > /dev/null 2>&1

# Run the AAPL historical tests
echo "📊 Running AAPL Historical Options Tests..."
echo "==========================================="
echo ""

cd /home/userash124/Solana-Options-Escrow-dApp

# Build and deploy
echo "🔨 Building program..."
anchor build 2>&1 | tail -5

echo ""
echo "📦 Deploying program..."
anchor deploy 2>&1 | grep -E "(Program Id|Deploying)"

echo ""
echo "🧪 Executing AAPL historical tests..."
yarn test tests/aapl_historical.ts 2>&1

TEST_EXIT_CODE=$?

echo ""
echo "=============================================="
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ Tests completed successfully!"
else
    echo "⚠️  Tests completed with exit code: $TEST_EXIT_CODE"
fi

echo ""
echo "📝 Test wallet address:"
solana address

echo ""
echo "💰 Test wallet balance:"
solana balance

echo ""
echo "🔍 Recent transactions can be viewed at:"
echo "   Frontend: http://localhost:3000/transactions"
echo "   Explorer: https://explorer.solana.com/address/$(solana address)?cluster=custom&customUrl=http://localhost:8899"

echo ""
echo "⚠️  Validator is still running. To stop it, run:"
echo "   pkill -9 -f 'solana-test-validator'"

exit $TEST_EXIT_CODE
