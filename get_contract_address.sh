#!/bin/bash

echo "🔍 Finding Contract Addresses"
echo "============================="
echo ""

# Get the wallet address
WALLET=$(solana address)
echo "Wallet: $WALLET"
echo ""

# Get recent transactions and look for contract addresses
echo "Searching recent transactions for contract addresses..."
echo ""

# Run a simple program ID lookup
PROGRAM_ID="FX3EgWWVrVCzgtntijpgfCT22C7HXpq6Py9DrYmDjR3E"

echo "Program ID: $PROGRAM_ID"
echo ""

# Calculate PDA for AAPL/SOL contract
echo "Example Contract PDAs:"
echo "---------------------"
echo ""
echo "For AAPL/SOL contracts with seller $WALLET:"
echo ""

# You can derive PDA programmatically or list from transaction logs
echo "To find contract addresses, check transaction logs from recent tests."
echo "Look for 'Program log: Contract created' messages."
echo ""

# Get recent program accounts
echo "Recent program transactions:"
solana transaction-history $WALLET --limit 20 2>/dev/null | head -10

echo ""
echo "💡 To view contract history, visit:"
echo "   http://localhost:3000/contract"
echo ""
echo "Then paste a contract address from the transactions above."
