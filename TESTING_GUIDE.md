# Running AAPL Historical Tests & Viewing Transactions

This guide explains how to run the AAPL historical options tests and view the transaction history in the frontend.

## Prerequisites

- Solana CLI installed
- Anchor CLI installed  
- Node.js and Yarn/npm
- Local Solana validator

## Step 1: Start Local Validator

Open a terminal and start the local Solana test validator:

```bash
# Kill any existing validators
pkill -9 -f "solana-test-validator"

# Start fresh validator
solana-test-validator --reset
```

Leave this terminal running.

## Step 2: Build and Deploy (New Terminal)

In a new terminal:

```bash
cd /home/userash124/Solana-Options-Escrow-dApp

# Build the program
anchor build

# Deploy to local validator
anchor deploy
```

Note the deployed program ID and ensure it matches the one in `frontend/lib/anchor-client.ts`.

## Step 3: Run AAPL Historical Tests

```bash
# Run the comprehensive AAPL options test suite
anchor test --skip-local-validator

# Or run just the AAPL historical tests
yarn test tests/aapl_historical.ts
```

This will execute the following test scenarios:

### Test Scenarios Included:

1. **Contract Initialization** (Aug 1, 2025)
   - Strike: 1.5 SOL
   - Premium: 2 SOL
   - Margin: 1 SOL each party
   - Type: Call option on AAPL/SOL

2. **Option Purchase**
   - Buyer deposits margin
   - Premium payment to seller
   - Contract status changes to "Sold"

3. **Daily Settlements** (Multiple dates)
   - Aug 5: Price ratio 1.500
   - Aug 10: Price ratio 1.508  
   - Aug 15: Price ratio 1.487
   - Aug 20: Price ratio 1.469

4. **Secondary Market Resale**
   - Aug 18: Transfer to new buyer
   - Margin adjustments

5. **Option Exercise** (Sep 1, 2025)
   - Final settlement at expiry
   - In-the-money execution
   - Profit/loss distribution

6. **Margin Call Scenario**
   - Extreme price volatility test
   - Automatic settlement when margin <20%

## Step 4: Check Test Wallet Balance

After tests complete, check the test wallet:

```bash
# View your test wallet address
solana address

# Check balance
solana balance

# View recent transactions
solana transaction-history $(solana address) --limit 50
```

## Step 5: View Transactions in Frontend

### A. Start Frontend (if not already running)

```bash
cd frontend
npm run dev
```

Frontend will be available at http://localhost:3000

### B. Connect Your Wallet

1. Open http://localhost:3000
2. Click "Connect Wallet" in the top right
3. Select your Solana wallet (Phantom, Solflare, etc.)
4. Approve the connection

### C. View Transaction History

Navigate to the **Transactions** page in one of these ways:

1. Click "Transactions" in the navigation menu
2. Go directly to http://localhost:3000/transactions  
3. From Portfolio page, click "View Transactions" button

You will see:

- ✅ Current wallet balance in SOL and USD
- 📋 Complete transaction history with:
  - Transaction type (Initialize, Purchase, Settlement, etc.)
  - Amount (SOL changes)
  - Transaction fees
  - Status (confirmed/finalized)
  - Timestamp
  - Signature (clickable link to explorer)
- 📊 Transaction statistics:
  - Total transactions count
  - Total fees paid
  - Net balance change

### D. View on Solana Explorer

Each transaction signature is clickable and opens in Solana Explorer for detailed inspection.

For localhost testing, use:
```
https://explorer.solana.com/address/YOUR_ADDRESS?cluster=custom&customUrl=http://localhost:8899
```

## Transaction Types You'll See

After running AAPL tests, you should see these transaction types:

| Type | Description |
|------|-------------|
| **Initialize Contract** | Seller creates new option contract |
| **Purchase Option** | Buyer purchases the option |
| **Daily Settlement** | Automatic margin adjustments |
| **Resell Option** | Transfer to secondary buyer |
| **Exercise Option** | Option execution at expiry |
| **Delist Option** | Remove unsold contract |

## Frontend Features

### Home Page (`/`)
- Shows wallet balance when connected
- Displays recent transactions preview
- Quick access to all features

### Portfolio Page (`/portfolio`)
- View all active positions
- Track P&L for each contract
- Link to full transaction history

### Transactions Page (`/transactions`)
- Complete transaction history (last 50)
- Filterable and sortable
- Real-time balance updates
- Transaction stats dashboard

## Troubleshooting

### Transactions Not Showing

1. **Ensure wallet is connected** to the correct network (localhost:8899)
2. **Check network in wallet adapter**:
   ```typescript
   // In frontend/components/WalletProvider.tsx
   const network = WalletAdapterNetwork.Devnet; // Change to match your setup
   ```

3. **Verify RPC endpoint**:
   ```typescript
   const endpoint = 'http://localhost:8899'; // For local testing
   ```

### Balance Shows Zero

1. Fund your wallet:
   ```bash
   solana airdrop 10 YOUR_ADDRESS
   ```

2. Verify connection:
   ```bash
   solana balance YOUR_ADDRESS
   ```

### Tests Failing

1. **Ensure validator is running**:
   ```bash
   solana cluster-version
   ```

2. **Check program deployment**:
   ```bash
   solana program show PROGRAM_ID
   ```

3. **Clean and rebuild**:
   ```bash
   anchor clean
   anchor build
   anchor deploy
   ```

## Test Data

The AAPL historical tests use real historical price data:

```
Aug 1:  AAPL=$225.50, SOL=$150.00, ratio=1.503
Aug 5:  AAPL=$228.75, SOL=$152.50, ratio=1.500
Aug 10: AAPL=$223.25, SOL=$148.00, ratio=1.509
Aug 15: AAPL=$230.50, SOL=$155.00, ratio=1.487
Aug 20: AAPL=$235.00, SOL=$160.00, ratio=1.469
Sep 1:  AAPL=$240.00, SOL=$165.00, ratio=1.455
```

## Expected Results

After successful test execution:

- ✅ ~8-10 transactions in history
- ✅ Multiple daily settlements recorded
- ✅ Contract creation and purchase confirmed
- ✅ Option resale transaction visible
- ✅ Final exercise settlement recorded
- ✅ All transactions with "finalized" status
- ✅ Balance reflects all margin movements

## Next Steps

1. **Explore Contract Details**: Click on each transaction to see full details
2. **Test Creation**: Try creating your own contract via `/create` page
3. **Browse Markets**: View available contracts on `/markets` page
4. **Monitor Portfolio**: Track your positions on `/portfolio` page

## Support

If you encounter issues:

1. Check validator logs: `tail -f /tmp/validator.log`
2. Check test output: `cat /tmp/aapl_test_results.log`
3. Verify program deployment: `anchor test --skip-build`

---

**Happy Testing! 🚀**
