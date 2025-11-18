#!/bin/bash

echo "🧪 Testing Wallet Lookup Functionality"
echo "======================================="
echo ""

# Get the test wallet address
TEST_WALLET=$(solana address)
echo "📝 Test Wallet Address: $TEST_WALLET"
echo ""

# Check if local validator is running
if ! pgrep -f "solana-test-validator" > /dev/null; then
    echo "⚠️  Warning: Local validator is not running"
    echo "   Start it with: solana-test-validator --reset"
    echo ""
else
    echo "✅ Local validator is running"
    echo ""
fi

# Check wallet balance
echo "💰 Checking wallet balance..."
BALANCE=$(solana balance $TEST_WALLET 2>/dev/null)
echo "   Balance: $BALANCE"
echo ""

# Get transaction history
echo "📜 Fetching transaction history..."
solana transaction-history $TEST_WALLET --limit 10 2>/dev/null | head -20
echo ""

echo "🌐 Frontend Testing:"
echo "==================="
echo ""
echo "1. Open the frontend: http://localhost:3000/lookup"
echo ""
echo "2. Paste this test wallet address:"
echo "   $TEST_WALLET"
echo ""
echo "3. Click 'Search' or press Enter"
echo ""
echo "4. You should see:"
echo "   ✓ Wallet balance"
echo "   ✓ Transaction history"
echo "   ✓ Transaction types (Initialize, Purchase, Settlement, etc.)"
echo "   ✓ Transaction status and fees"
echo "   ✓ Clickable signatures linking to Solana Explorer"
echo ""
echo "📊 Expected Transaction Types:"
echo "   • Initialize Contract"
echo "   • Purchase Option"
echo "   • Daily Settlement"
echo "   • Resell Option"
echo "   • Exercise Option"
echo "   • Transfer"
echo ""
echo "🔗 Quick Link:"
echo "   http://localhost:3000/lookup?address=$TEST_WALLET"
echo ""
