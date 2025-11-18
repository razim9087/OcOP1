#!/bin/bash

echo "🔄 Multiple Ownership Transfer Test"
echo "===================================="
echo ""

# Check if validator is running
if ! pgrep -f solana-test-validator > /dev/null; then
    echo "⚠️  Starting Solana validator..."
    pkill -9 -f solana-test-validator 2>/dev/null
    sleep 2
    solana-test-validator --reset > /tmp/validator.log 2>&1 &
    sleep 8
    echo "✅ Validator started"
else
    echo "✅ Validator already running"
fi

echo ""
echo "🔨 Building and deploying program..."
cd /home/userash124/Solana-Options-Escrow-dApp
anchor build 2>&1 | tail -3
anchor deploy 2>&1 | grep -E "Program Id|Deploy success"

echo ""
echo "🧪 Running ownership transfer test (5 transfers)..."
echo "===================================="
echo ""

anchor test tests/ownership_transfer.ts --skip-local-validator 2>&1 | tee /tmp/ownership_test.log

echo ""
echo "===================================="
echo ""

# Extract contract PDA from test output
CONTRACT_PDA=$(grep "Contract PDA:" /tmp/ownership_test.log | awk '{print $3}' | head -1)

if [ -n "$CONTRACT_PDA" ]; then
    echo "✅ Test completed successfully!"
    echo ""
    echo "📋 Contract Details:"
    echo "   Address: $CONTRACT_PDA"
    echo ""
    echo "👥 Ownership Transfers: 5"
    echo "   1. Seller → Buyer 1 (Purchase: 2.0 SOL)"
    echo "   2. Buyer 1 → Buyer 2 (Resell: 2.5 SOL)"
    echo "   3. Buyer 2 → Buyer 3 (Resell: 3.0 SOL)"
    echo "   4. Buyer 3 → Buyer 4 (Resell: 2.8 SOL)"
    echo "   5. Buyer 4 → Buyer 5 (Resell: 3.5 SOL)"
    echo ""
    echo "📊 Settlements: 5"
    echo ""
    echo "🌐 View complete contract history in frontend:"
    echo "   http://localhost:3000/contract?address=${CONTRACT_PDA}"
    echo ""
    echo "Copy this address to view in Contract History page:"
    echo "┌─────────────────────────────────────────────┐"
    echo "│ $CONTRACT_PDA │"
    echo "└─────────────────────────────────────────────┘"
else
    echo "❌ Test failed or contract PDA not found"
    echo "Check /tmp/ownership_test.log for details"
fi

echo ""
echo "===================================="
