# Contract History Testing

This directory contains test scripts and data for demonstrating contract transaction history.

## Files

- **`test_contract_history_cached.js`** - Display contract history from cached data (fast, no validator needed)
- **`test_contract_history_frontend.js`** - Fetch live contract history from blockchain (requires validator)
- **`test_data/contract_history.json`** - Cached transaction history data

## Quick Start

### View Cached History (No Setup Required)

```bash
node test_contract_history_cached.js
```

This displays the complete transaction history from the cached JSON file, including:
- Contract initialization
- Initial purchase
- 4 resells (ownership transfers)
- 6 daily settlements
- Final exercise

### Test Live Contract History

```bash
# 1. Start local validator
solana-test-validator --ledger test-ledger --reset &

# 2. Deploy and create test contract with history
./run_ownership_test.sh

# 3. Test fetching history from blockchain
node test_contract_history_frontend.js
```

## Contract History Structure

The `test_data/contract_history.json` file contains:

```json
{
  "contract": {
    "address": "...",
    "programId": "...",
    "type": "Call Option",
    "underlying": "AAPL/SOL",
    "strike": 1.5,
    "premium": 2.0,
    "margin": 1.0
  },
  "participants": {
    "seller": "...",
    "buyer1": "...",
    "buyer2": "...",
    ...
  },
  "transactions": [
    {
      "slot": 302,
      "type": "initialization",
      "signature": "...",
      "timestamp": "...",
      "instruction": "InitializeOption",
      "details": { ... }
    },
    ...
  ],
  "summary": {
    "totalTransactions": 14,
    "initializations": 1,
    "purchases": 1,
    "resells": 4,
    "settlements": 6,
    "exercises": 1,
    "totalOwnershipTransfers": 5,
    "finalStatus": "expired",
    "ownershipChain": [ ... ]
  }
}
```

## Transaction Types

1. **Initialization** - Contract creation with strike, premium, and terms
2. **Purchase** - Initial buyer purchases from seller
3. **Resell** - Ownership transfer on secondary market
4. **Settlement** - Daily margin adjustments based on price movements
5. **Exercise** - Final exercise of option at expiration

## Ownership Transfer Chain

The test demonstrates a contract with 5 ownership transfers:

1. Seller creates contract
2. Buyer 1 purchases for 2 SOL
3. Buyer 2 buys for 2.5 SOL (Buyer 1 profit: +0.5 SOL)
4. Buyer 3 buys for 3 SOL (Buyer 2 profit: +0.5 SOL)
5. Buyer 4 buys for 2.8 SOL (Buyer 3 loss: -0.2 SOL)
6. Buyer 5 buys for 3.5 SOL (Buyer 4 profit: +0.7 SOL)
7. Buyer 5 exercises at expiration

## View in Frontend

After starting the frontend (`cd frontend && npm run dev`), visit:

```
http://localhost:3000/contract?address=53NKEBZLkFpB7dBRtHi54FQkAdMKT8uLGCumEPseffTQ
```

## Integration Testing

To test the full workflow:

```bash
# 1. Generate fresh contract history
./run_ownership_test.sh

# 2. Extract contract address
CONTRACT_ADDRESS=$(grep "Contract PDA:" /tmp/ownership_test.log | awk '{print $3}' | head -1)

# 3. Update test scripts with new address
# (or use the cached address for demo purposes)

# 4. View cached history
node test_contract_history_cached.js

# 5. Test live fetching
node test_contract_history_frontend.js

# 6. View in frontend
# http://localhost:3000/contract?address=$CONTRACT_ADDRESS
```

## Benefits of Cached History

1. **Fast demonstrations** - No need to run tests or start validator
2. **Consistent data** - Same history shown every time
3. **Offline capability** - Works without blockchain connection
4. **Documentation** - Clear example of expected transaction structure
5. **Frontend testing** - Can test UI without live blockchain

## Updating Cached History

The live test script automatically updates the cached history file when run:

```bash
node test_contract_history_frontend.js
```

This syncs the summary statistics with the actual blockchain data while preserving the detailed transaction information.
