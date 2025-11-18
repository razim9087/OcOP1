# Solana Options Escrow - Frontend Integration Guide

## 🎯 Overview

This frontend is a fully integrated Next.js application that interacts with the Solana Options Escrow smart contract. It provides a complete interface for creating, trading, managing, and settling European-style options on the Solana blockchain.

## 🏗️ Architecture

### Core Libraries
- **Next.js 16** with App Router and Turbopack
- **React 19** with TypeScript
- **@coral-xyz/anchor** for program interaction
- **@solana/wallet-adapter** for wallet connectivity
- **@solana/web3.js** for blockchain operations

### File Structure
```
frontend/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── layout.tsx                  # Root layout with wallet provider
│   ├── create/page.tsx             # Create new options contracts
│   ├── markets/page.tsx            # Browse and purchase options
│   ├── portfolio/page.tsx          # Manage positions & settlements
│   ├── lookup/page.tsx             # Search contracts by wallet/PDA
│   └── transactions/page.tsx       # Transaction history
├── components/
│   ├── Navbar.tsx                  # Navigation with wallet button
│   ├── WalletButton.tsx            # Wallet connection UI
│   └── WalletProvider.tsx          # Solana wallet context
└── lib/
    ├── anchor-client.ts            # Anchor program setup & utilities
    ├── contract-operations.ts      # Contract interaction functions
    └── idl/
        └── escrow.json             # Program IDL

```

## 🔧 Contract Operations

### 1. Initialize Option (`/create`)
Create a new option contract with the following parameters:
- **Option Type**: Call (0) or Put (1)
- **Underlying Symbol**: Asset identifier (max 32 chars)
- **Strike Price**: Asset/SOL price ratio in SOL
- **Premium**: Option price in SOL
- **Initial Margin**: Required margin per party in SOL
- **Initiation Date**: Start date (optional, defaults to now)
- **Test Mode**: Allows flexible dates for testing

```typescript
await initializeOption(connection, wallet, {
  optionType: 0, // Call
  underlying: 'AAPL',
  initiationDate: Math.floor(Date.now() / 1000),
  price: 0.2, // 0.2 SOL premium
  strike: 1.5, // Strike price ratio
  initialMargin: 0.5, // 0.5 SOL margin
  isTest: false
});
```

**Key Features:**
- Derives PDA from seller address + underlying symbol
- Validates all inputs (non-zero, length limits)
- Automatically sets expiry to 30 days from initiation
- Production mode prevents past dates

### 2. Purchase Option (`/markets`)
Buy a listed option contract:
- Transfers premium from buyer to seller
- Deposits buyer margin to escrow
- Deposits seller margin to escrow
- Changes status from Listed to Owned
- Sets last settlement date

```typescript
await purchaseOption(connection, wallet, optionPDA, sellerPubkey);
```

**Requirements:**
- Option must be Listed
- Not expired (production mode)
- Buyer must have: premium + margin + transaction fees
- Seller must sign transaction

### 3. Daily Settlement (`/portfolio`)
Calculate and adjust margins based on price movements:

```typescript
await dailySettlement(connection, wallet, optionPDA, 
  150.00,  // Asset price in USD (6 decimals)
  100.00   // SOL price in USD (6 decimals)
);
```

**How it works:**
1. Calculates asset/SOL ratio from USD prices
2. Compares to last settlement price (or strike for first settlement)
3. Determines P&L based on option type:
   - **Call**: Buyer gains when price increases
   - **Put**: Buyer gains when price decreases
4. Transfers margin between parties
5. Triggers margin call if either party falls below 20% threshold

**Margin Call Protection:**
- Automatically triggered at 20% of initial margin
- Caps transfer to prevent negative margins
- Changes status to MarginCalled
- Protects both parties from excessive losses

### 4. Exercise Option (`/portfolio`)
Execute the option at expiration:

```typescript
await exerciseOption(connection, wallet, optionPDA,
  155.00,  // Final asset price
  100.00   // Final SOL price
);
```

**Requirements:**
- Must be owner of option
- Must be at expiration date (European style)
- Status must be Owned
- Test mode bypasses date check

**Settlement:**
- **Call**: max(final_price - strike, 0)
- **Put**: max(strike - final_price, 0)
- Marks option as Expired
- Records final settlement price

### 5. Resell Option
Transfer ownership to a new buyer before expiration:

```typescript
await resellOption(connection, wallet, optionPDA, 
  newBuyerPubkey,
  0.25  // Resell price in SOL
);
```

**Process:**
1. New buyer pays resell price to current owner
2. New buyer deposits margin
3. Current owner receives margin back + resell price
4. Ownership transfers to new buyer
5. Margins remain in escrow

### 6. Delist Option
Cancel a listed option (before purchase):

```typescript
await delistOption(connection, wallet, optionPDA);
```

**Requirements:**
- Must be seller
- Status must be Listed (not Owned)
- No margin refund needed (never deposited)

## 📊 Frontend Pages

### Home Page (`/`)
- Hero section with platform overview
- Feature grid highlighting key capabilities
- Statistics display
- How it works guide
- Contract features breakdown

### Markets Page (`/markets`)
- Real-time contract listings from blockchain
- Filter by status (Listed/Owned) and type (Call/Put)
- Purchase functionality with seller protection
- Live refresh capability
- Shows: strike, premium, expiry, margin, status

### Portfolio Page (`/portfolio`)
- View all positions (as buyer or seller)
- Portfolio summary with total margin and P&L
- Daily settlement interface with price inputs
- Exercise option functionality
- Delist unsold contracts
- Detailed margin tracking

### Lookup Page (`/lookup`)
- Search by wallet address (finds all seller/owner contracts)
- Search by PDA (direct contract lookup)
- Search by seller + symbol (derives PDA)
- Full contract details display
- Current margin balances for owned contracts

### Transactions Page (`/transactions`)
- Complete transaction history
- Current balance display
- Transaction type parsing from logs
- Links to Solana Explorer
- Fee tracking and net change calculations

## 🔐 Security Features

### Wallet Integration
- Phantom and Solflare wallet support
- Auto-connect on page load
- Secure transaction signing
- No private key exposure

### Contract Protection
- All inputs validated before submission
- Margin requirements enforced
- Expiry date checks (production mode)
- Status verification for operations
- PDA derivation ensures unique contracts

### Error Handling
- Comprehensive try-catch blocks
- User-friendly error messages
- Transaction signature display
- Network error recovery
- Loading states during operations

## 🎨 UI/UX Features

### Design System
- Solana brand colors (purple/pink gradients)
- Glassmorphism effects
- Responsive grid layouts
- Dark theme optimized for readability
- Smooth transitions and hover states

### User Experience
- Real-time status updates
- Loading indicators for async operations
- Success/error notifications
- Disabled states during processing
- Refresh buttons for live data

### Accessibility
- Semantic HTML structure
- ARIA labels where needed
- Keyboard navigation support
- Clear visual hierarchy
- Readable font sizes

## 🚀 Getting Started

### Prerequisites
```bash
# Node.js 18+ and npm
node --version
npm --version

# Solana CLI (for local testing)
solana --version

# Anchor (if deploying contract)
anchor --version
```

### Installation
```bash
cd frontend
npm install
```

### Configuration
The frontend automatically uses the program ID from the IDL:
```typescript
// lib/anchor-client.ts
const PROGRAM_ID = new PublicKey(idl.address);
```

Current program ID: `FX3EgWWVrVCzgtntijpgfCT22C7HXpq6Py9DrYmDjR3E`

### Development
```bash
npm run dev
# Starts on http://localhost:3000
```

### Production Build
```bash
npm run build
npm run start
```

## 🧪 Testing Guide

### 1. Create a Test Contract
1. Navigate to `/create`
2. Enable "Test Mode"
3. Fill in contract details:
   - Underlying: `AAPL`
   - Type: Call
   - Strike: `1.5`
   - Premium: `0.2`
   - Margin: `0.5`
4. Click "Create Contract"
5. Approve transaction in wallet

### 2. Purchase the Option
1. Navigate to `/markets`
2. Find your listed contract
3. Use a different wallet to purchase
4. Approve premium + margin payment

### 3. Perform Daily Settlement
1. Navigate to `/portfolio`
2. Find the owned contract
3. Click "Daily Settlement"
4. Enter current prices:
   - Asset Price: `150.00` USD
   - SOL Price: `100.00` USD
5. Click "Execute Settlement"

### 4. Exercise at Expiry
1. Wait until expiration date (or use test mode)
2. Navigate to `/portfolio`
3. Click "Exercise Option"
4. Enter final prices
5. Confirm transaction

## 📡 API Reference

### Utility Functions

#### `deriveOptionPDA(seller: PublicKey, underlying: string)`
Derives the PDA for an option contract.

#### `solToLamports(sol: number)`
Converts SOL to lamports (1 SOL = 1,000,000,000 lamports).

#### `lamportsToSol(lamports: number | BN)`
Converts lamports to SOL.

#### `formatDate(timestamp: number)`
Formats Unix timestamp to readable date.

#### `getStatusString(status: any)`
Returns human-readable status string.

#### `getOptionTypeString(optionType: number)`
Returns "Call" or "Put" based on type.

### Contract Operations

All operations return transaction signatures:
- `initializeOption()` - Returns `{ signature, optionPDA }`
- `purchaseOption()` - Returns signature string
- `dailySettlement()` - Returns signature string
- `exerciseOption()` - Returns signature string
- `resellOption()` - Returns signature string
- `delistOption()` - Returns signature string

### Data Fetching

```typescript
// Fetch single contract
const option = await fetchOption(connection, wallet, optionPDA);

// Fetch all contracts
const allOptions = await fetchAllOptions(connection, wallet);

// Fetch by seller
const sellerOptions = await fetchOptionsBySeller(connection, wallet, sellerPubkey);

// Fetch by owner
const ownerOptions = await fetchOptionsByOwner(connection, wallet, ownerPubkey);
```

## 🐛 Troubleshooting

### Common Issues

**"Wallet not connected"**
- Ensure Phantom or Solflare is installed
- Click wallet button in navbar
- Approve connection in wallet popup

**"Failed to create contract"**
- Check wallet has sufficient SOL for rent
- Verify contract doesn't already exist (same seller + symbol)
- Ensure all fields are filled correctly

**"Settlement failed"**
- Must wait 24 hours between settlements (production mode)
- Contract must be Owned status
- Prices must be > 0

**"Cannot exercise"**
- Must be at expiration date (European style)
- Must be owner of contract
- Enable test mode for flexible testing

### Network Issues
```typescript
// Switch to devnet in WalletProvider.tsx
const network = WalletAdapterNetwork.Devnet;

// Or use custom RPC
const endpoint = 'https://api.devnet.solana.com';
```

## 📚 Additional Resources

- [Solana Docs](https://docs.solana.com/)
- [Anchor Book](https://book.anchor-lang.com/)
- [Wallet Adapter Docs](https://github.com/solana-labs/wallet-adapter)
- [Next.js Docs](https://nextjs.org/docs)

## 🔄 Future Enhancements

Potential improvements:
- [ ] Price oracle integration (Pyth, Chainlink)
- [ ] Advanced charting with price history
- [ ] Notification system for settlements
- [ ] Mobile-responsive improvements
- [ ] Multi-language support
- [ ] Analytics dashboard
- [ ] Social features (sharing, leaderboard)
- [ ] Advanced filtering and search
- [ ] Batch operations
- [ ] Automated settlement bots

## 📄 License

Same as the main project (check root LICENSE file).

---

Built with ❤️ using Solana, Anchor, and Next.js
