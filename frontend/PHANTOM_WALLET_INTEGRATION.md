# Phantom Wallet Integration Guide

This document describes the complete Phantom wallet integration implemented for the Solana Options Escrow frontend.

## Overview

The frontend has been updated to use **direct Phantom wallet integration** via the `window.solana` API, eliminating the need for the `@solana/wallet-adapter-react` library and resolving all wallet initialization errors.

## Key Changes

### 1. Custom Phantom Wallet Hook

**File:** `/frontend/lib/usePhantomWallet.ts`

A custom React hook that provides direct access to Phantom wallet functionality:

```typescript
export function usePhantomWallet() {
  // Returns: { publicKey, connected, connection, connect, disconnect, signTransaction, wallet }
}
```

**Features:**
- Automatic detection of Phantom wallet installation
- Event listeners for connect/disconnect/account changes
- Direct access to `window.solana` API
- Returns `null` for `wallet` if Phantom not installed

**Usage in components:**
```typescript
const { publicKey, connected, connection, connect, disconnect, wallet } = usePhantomWallet();
```

### 2. Updated WalletButton Component

**File:** `/frontend/components/WalletButton.tsx`

Completely rewritten to use direct Phantom wallet API:

**Key changes:**
- Removed `@solana/wallet-adapter-react-ui` dependency
- Uses `window.solana.connect()` and `disconnect()` directly
- Manages connection state locally
- Shows wallet address with truncation
- Includes "Install Phantom" prompt if not detected

### 3. Simplified WalletProvider

**File:** `/frontend/components/WalletProvider.tsx`

Stripped down to only provide Solana connection:

**Removed:**
- `WalletProvider` from `@solana/wallet-adapter-react`
- `WalletModalProvider`
- Wallet adapter configurations
- Error handling for adapter issues

**Kept:**
- `ConnectionProvider` for Solana RPC connection

### 4. Contract Operations Compatibility

**File:** `/frontend/lib/contract-operations.ts`

Updated to work with Phantom wallet:
- Changed type from `AnchorWallet` to `PhantomWallet`
- All 7 contract operations now accept Phantom wallet

**File:** `/frontend/lib/anchor-client.ts`

Added compatibility layer:
- Created `PhantomWalletAdapter` class to bridge Phantom wallet to Anchor's expected interface
- `getProgram()` function now accepts simplified wallet interface
- Handles both `Transaction` and `VersionedTransaction` types

### 5. All Pages Updated

Every page now uses the custom hook:

**Changed import:**
```typescript
// Before:
import { useWallet, useConnection } from '@solana/wallet-adapter-react';

// After:
import { usePhantomWallet } from '@/lib/usePhantomWallet';
```

**Changed hook usage:**
```typescript
// Before:
const { publicKey, signTransaction } = useWallet();
const { connection } = useConnection();

// After:
const { publicKey, connected, connection, wallet } = usePhantomWallet();
```

**Updated pages:**
- `/frontend/app/page.tsx` (Home)
- `/frontend/app/create/page.tsx` (Create Contract)
- `/frontend/app/markets/page.tsx` (Browse Markets)
- `/frontend/app/portfolio/page.tsx` (Portfolio Management)
- `/frontend/app/lookup/page.tsx` (Contract Search)
- `/frontend/app/transactions/page.tsx` (Transaction History)

## Benefits of This Approach

### 1. **Eliminates Wallet Initialization Errors**
- No more `WalletNotReadyError` from adapter timing issues
- Direct browser API access is always ready when Phantom is installed

### 2. **Simpler Architecture**
- Fewer dependencies (removed wallet-adapter-react and wallet-adapter-react-ui)
- Less abstraction layers between app and wallet
- Easier to debug and maintain

### 3. **Better Performance**
- No adapter initialization overhead
- Direct communication with Phantom
- Reduced bundle size

### 4. **Phantom-First Experience**
- Optimized specifically for Phantom wallet
- Can detect installation status easily
- Direct access to Phantom-specific features if needed

## How It Works

### Connection Flow

1. **On Page Load:**
   - `usePhantomWallet` hook checks if `window.solana` exists
   - If Phantom installed, attaches event listeners
   - Returns current connection state

2. **When User Clicks "Connect Wallet":**
   - Calls `window.solana.connect()`
   - Phantom popup appears requesting permission
   - On approval, `publicKey` is returned
   - Component re-renders with connected state

3. **During Transaction:**
   - Contract operation receives `wallet` object from hook
   - `PhantomWalletAdapter` wraps it for Anchor compatibility
   - Transaction is signed via `window.solana.signTransaction()`
   - Submitted to Solana network

4. **On Disconnect:**
   - Calls `window.solana.disconnect()`
   - Clears local state
   - Removes event listeners
   - Component re-renders as disconnected

### Type Compatibility

The `PhantomWalletAdapter` class in `anchor-client.ts` ensures Phantom's wallet interface is compatible with Anchor's expectations:

```typescript
class PhantomWalletAdapter {
  constructor(public publicKey: PublicKey, private phantomWallet: any) {}
  
  async signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T> {
    const signed = await this.phantomWallet.signTransaction(transaction);
    return signed as T;
  }
  
  async signAllTransactions<T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]> {
    const signed = await this.phantomWallet.signAllTransactions(transactions);
    return signed as T[];
  }
}
```

## Testing the Integration

### 1. Install Phantom Wallet
- Visit https://phantom.app/
- Install browser extension
- Create or import wallet

### 2. Start Development Server
```bash
cd frontend
npm run dev
```

### 3. Connect Wallet
- Navigate to http://localhost:3000
- Click "Connect Wallet" button
- Approve connection in Phantom popup
- Verify wallet address displays

### 4. Test Contract Operations
- **Create Contract:** Go to `/create` and fill form
- **Browse Markets:** Go to `/markets` to see all options
- **View Portfolio:** Go to `/portfolio` for owned contracts
- **Search Contract:** Go to `/lookup` to find specific option
- **Transaction History:** Go to `/transactions` for activity log

## Troubleshooting

### Issue: "Phantom wallet not detected"
**Solution:** Install Phantom browser extension and refresh page

### Issue: Connection button not working
**Solution:** 
- Check browser console for errors
- Ensure Phantom extension is enabled
- Try refreshing the page

### Issue: Transaction fails to sign
**Solution:**
- Verify Phantom is unlocked
- Check you have sufficient SOL for transaction fees
- Confirm you're on Devnet in Phantom settings

### Issue: Contract operations not working
**Solution:**
- Ensure wallet is connected first
- Verify you're on Solana Devnet
- Check program is deployed at: `FX3EgWWVrVCzgtntijpgfCT22C7HXpq6Py9DrYmDjR3E`

## Development Notes

### Server-Side Rendering (SSR) Considerations

All components using `window.solana` include mounted state checks:

```typescript
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);

if (!mounted) return null; // or loading state
```

This prevents hydration errors caused by SSR/client mismatches.

### Type Safety

TypeScript types are properly defined for Phantom wallet:

```typescript
interface PhantomWallet {
  publicKey: PublicKey;
  signTransaction(tx: Transaction): Promise<Transaction>;
  signAllTransactions(txs: Transaction[]): Promise<Transaction[]>;
}
```

### Event Handling

The hook properly manages Phantom events:
- `connect` - Fired when wallet connects
- `disconnect` - Fired when wallet disconnects
- `accountChanged` - Fired when active account changes

## Future Enhancements

Possible improvements to consider:

1. **Multi-Wallet Support:** Add adapters for Solflare, Backpack, etc.
2. **Wallet Auto-Connect:** Remember previous connection and auto-reconnect
3. **Network Switching:** Allow switching between Devnet/Mainnet in UI
4. **Transaction History:** Store and display past transactions
5. **Error Recovery:** Better error messages and retry logic

## Conclusion

The Phantom wallet integration is now fully functional and optimized for direct browser API access. All pages use the unified `usePhantomWallet` hook, providing a consistent and reliable wallet connection experience throughout the application.

**Status:** ✅ Production Ready
**Server:** Running at http://localhost:3000
**Network:** Solana Devnet
**Required:** Phantom browser extension
