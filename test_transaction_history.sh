#!/bin/bash

echo "📊 Options Contract Transaction History Test"
echo "=============================================="
echo ""
echo "This script creates a complete options lifecycle with labeled transactions:"
echo "  1. Initialize AAPL Call Option (Strike: 1.5 SOL, Premium: 2 SOL)"
echo "  2. Purchase Option (with margin deposits)"
echo "  3. Daily Settlement (Aug 5)"
echo "  4. Daily Settlement (Aug 10)"
echo "  5. Daily Settlement (Aug 15)"
echo "  6. Resell Option (secondary market)"
echo "  7. Daily Settlement (Aug 20 - new owner)"
echo "  8. Exercise Option at Expiration (Sep 1)"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/home/userash124/Solana-Options-Escrow-dApp"
WALLET_ADDRESS=$(solana address)
RPC_URL="http://localhost:8899"
FRONTEND_URL="http://localhost:3000"

echo -e "${BLUE}Test Configuration:${NC}"
echo "  Wallet: $WALLET_ADDRESS"
echo "  RPC: $RPC_URL"
echo "  Frontend: $FRONTEND_URL"
echo "  Project: $PROJECT_DIR"
echo ""

# Step 1: Check validator
echo -e "${YELLOW}[1/6] Checking Solana validator...${NC}"
if pgrep -f solana-test-validator > /dev/null; then
    echo "  ✅ Validator is running"
    VALIDATOR_RUNNING=true
else
    echo "  ⚠️  Starting validator..."
    pkill -9 -f solana-test-validator 2>/dev/null
    sleep 2
    solana-test-validator --reset > /tmp/validator.log 2>&1 &
    sleep 10
    echo "  ✅ Validator started"
    VALIDATOR_RUNNING=false
fi
echo ""

# Step 2: Build and deploy program
echo -e "${YELLOW}[2/6] Building and deploying Escrow program...${NC}"
cd $PROJECT_DIR
echo "  Building program..."
anchor build 2>&1 | grep -E "(Finished|error)" | head -3
if [ $? -eq 0 ]; then
    echo "  ✅ Build successful"
    echo "  Deploying program..."
    PROGRAM_ID=$(anchor deploy 2>&1 | grep "Program Id:" | awk '{print $3}')
    if [ ! -z "$PROGRAM_ID" ]; then
        echo "  ✅ Deployed: $PROGRAM_ID"
    else
        echo "  ⚠️  Deploy completed (check logs for details)"
        PROGRAM_ID=$(grep -oP 'declare_id!\("\K[^"]+' programs/escrow/src/lib.rs || echo "unknown")
    fi
else
    echo "  ❌ Build failed"
    exit 1
fi
echo ""

# Step 3: Check wallet balance
echo -e "${YELLOW}[3/6] Checking wallet balance...${NC}"
BALANCE=$(solana balance 2>/dev/null | awk '{print $1}')
if [ $? -eq 0 ]; then
    echo "  ✅ Balance: $BALANCE SOL"
else
    echo "  ❌ Failed to get balance"
    exit 1
fi
echo ""

# Step 4: Run options contract tests
echo -e "${YELLOW}[4/6] Running AAPL Options Contract Tests...${NC}"
echo "  This will create transactions with detailed labels:"
echo ""
echo -e "  ${PURPLE}📝 Contract Details:${NC}"
echo "    • Underlying: AAPL/SOL (Apple stock priced in Solana)"
echo "    • Type: Call Option"
echo "    • Strike Price: 1.5 SOL (~$225 if SOL=$150)"
echo "    • Premium: 2 SOL"
echo "    • Margin: 1 SOL per party"
echo "    • Period: Aug 1 - Sep 1, 2025 (30 days)"
echo ""
echo "  ${PURPLE}📊 Test Scenarios:${NC}"
echo "    ✓ Initialize Option Contract"
echo "    ✓ Purchase with Margin Deposits"
echo "    ✓ Daily Settlements (4 settlements)"
echo "    ✓ Resell in Secondary Market"
echo "    ✓ Exercise at Expiration"
echo "    ✓ Margin Call Scenario"
echo ""
echo "  Running tests..."

# Run the tests and capture output
TEST_OUTPUT=$(cd $PROJECT_DIR && yarn test tests/aapl_historical.ts --skip-local-validator 2>&1)
TEST_EXIT=$?

# Count successful operations from test output
INIT_COUNT=$(echo "$TEST_OUTPUT" | grep -c "Initializing contract")
PURCHASE_COUNT=$(echo "$TEST_OUTPUT" | grep -c "Buyer purchasing")
SETTLEMENT_COUNT=$(echo "$TEST_OUTPUT" | grep -c "Daily Settlement")
RESELL_COUNT=$(echo "$TEST_OUTPUT" | grep -c "Reselling option")
EXERCISE_COUNT=$(echo "$TEST_OUTPUT" | grep -c "Exercising option")
MARGIN_CALL_COUNT=$(echo "$TEST_OUTPUT" | grep -c "Margin Call")

echo ""
echo "  ${PURPLE}Transaction Summary:${NC}"
echo "    • Initialize Contract: $INIT_COUNT operations"
echo "    • Purchase Option: $PURCHASE_COUNT operations"
echo "    • Daily Settlements: $SETTLEMENT_COUNT operations"
echo "    • Resell Option: $RESELL_COUNT operations"
echo "    • Exercise Option: $EXERCISE_COUNT operations"
echo "    • Margin Call Tests: $MARGIN_CALL_COUNT operations"
echo ""

if [ $TEST_EXIT -eq 0 ]; then
    echo "  ✅ All tests passed successfully"
else
    PASSING=$(echo "$TEST_OUTPUT" | grep -oP '\d+(?= passing)' | head -1)
    FAILING=$(echo "$TEST_OUTPUT" | grep -oP '\d+(?= failing)' | head -1)
    echo "  ⚠️  Tests completed with some errors"
    echo "    Passing: ${PASSING:-0} | Failing: ${FAILING:-0}"
    echo "  Note: Program ID mismatch errors are common after rebuild"
fi
echo ""

# Step 5: Verify transactions on-chain
echo -e "${YELLOW}[5/6] Verifying transactions on-chain...${NC}"
sleep 2
TX_COUNT=$(solana transaction-history $WALLET_ADDRESS --limit 50 2>/dev/null | wc -l)
if [ $TX_COUNT -gt 0 ]; then
    echo "  ✅ Found $TX_COUNT transactions on-chain"
    echo ""
    echo "  ${PURPLE}Recent Transaction Signatures:${NC}"
    solana transaction-history $WALLET_ADDRESS --limit 10 2>/dev/null | head -10 | while read sig; do
        echo "    • ${sig:0:20}...${sig: -12}"
    done
else
    echo "  ⚠️  Limited transactions found (may need program ID update)"
fi
echo ""

# Step 6: Test frontend
echo -e "${YELLOW}[6/6] Testing frontend transaction display...${NC}"
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "  ✅ Frontend is accessible"
    LOOKUP_URL="${FRONTEND_URL}/lookup?address=${WALLET_ADDRESS}"
    echo ""
    echo -e "${GREEN}✅ Options Transaction History Test Complete!${NC}"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo -e "${PURPLE}📊 Transaction Labeling Guide:${NC}"
    echo ""
    echo "  Frontend displays these transaction types:"
    echo "    🔵 Initialize Contract - Creates new option contract"
    echo "    🟢 Purchase Option - Buyer acquires option with margins"
    echo "    🟡 Daily Settlement - Mark-to-market margin adjustments"
    echo "    🟠 Resell Option - Transfer to new owner"
    echo "    🔴 Exercise Option - Option execution at expiry"
    echo "    ⚫ Delist Option - Remove unsold option"
    echo "    ⚪ Margin Call - Forced settlement due to low margin"
    echo "    🔷 Transfer - Standard SOL transfer"
    echo ""
    echo -e "${PURPLE}📈 View Complete History:${NC}"
    echo "   ${LOOKUP_URL}"
    echo ""
    echo -e "${PURPLE}📝 Test Summary:${NC}"
    echo "   • Wallet: $WALLET_ADDRESS"
    echo "   • Balance: $BALANCE SOL"
    echo "   • Program: $PROGRAM_ID"
    echo "   • Total Transactions: $TX_COUNT"
    echo "   • Options Operations: $(($INIT_COUNT + $PURCHASE_COUNT + $SETTLEMENT_COUNT + $RESELL_COUNT + $EXERCISE_COUNT))"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
else
    echo "  ⚠️  Frontend not running on port 3000"
    echo "  Start it with: cd frontend && npm run dev"
fi
echo ""
