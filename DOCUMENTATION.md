# Solana Options Escrow DApp - Complete Documentation

**Program ID:** `E5ijR9ex1qWRQGXBSQ7ZiRbP72xtqzxrNXvQRB9PaTYL`  
**Framework:** Anchor v0.31.1  
**Language:** Rust 2021 Edition  
**Date:** November 12, 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Core Functions](#core-functions)
3. [Contract Data Structure](#contract-data-structure)
4. [Status Types](#status-types)
5. [Margin Management](#margin-management)
6. [Use Cases](#use-cases)
7. [Error Handling](#error-handling)
8. [Testing](#testing)

---

## Overview

The Solana Options Escrow DApp is a decentralized options trading platform built on Solana blockchain. It enables users to create, trade, and settle European-style Call and Put options with automated margin management and risk controls.

### Key Features

- **European Options:** Call and Put options with 30-day fixed terms
- **Dual Margin System:** Both buyer and seller deposit margins for risk management
- **Automated Margin Calls:** Automatic settlement when margin drops below 20% threshold
- **Secondary Market:** Resell options before expiry
- **Daily Mark-to-Market:** Regular settlement based on real-time price feeds
- **Test Mode:** Enable historical backtesting and scenario testing
- **PDA-based:** Secure account management using Program Derived Addresses

---

## Core Functions

### 1. `initialize_option` - Create New Options Contract

**Purpose:** Seller creates a new options contract available for purchase.

**Parameters:**
- `option_type: u8` - Option type (0 = Call, 1 = Put)
- `underlying: String` - Asset symbol (e.g., "AAPL/SOL", max 32 characters)
- `initiation_date: i64` - Contract start timestamp (Unix time)
- `price: u64` - Premium in lamports (1 SOL = 1,000,000,000 lamports)
- `strike: u64` - Strike price ratio in lamports (asset price / SOL price)
- `initial_margin: u64` - Required margin deposit per party in lamports
- `is_test: bool` - Enable test mode (allows past dates for testing)

**Process:**
1. Validates all parameters (non-zero values, valid option type)
2. Checks date validity (production mode only)
3. Creates PDA account with seeds: `["option", seller_pubkey, underlying]`
4. Sets expiry date to initiation + 30 days
5. Initializes contract with `Listed` status

**Constraints:**
- Underlying symbol max 32 characters
- Production mode: initiation_date must be current or future
- All monetary values must be > 0

**Example:**
```typescript
await program.methods
    .initializeOption(
        0,                              // Call option
        "AAPL/SOL",                     // Underlying asset
        new anchor.BN(1725148800),      // Aug 1, 2025
        new anchor.BN(2e9),             // 2 SOL premium
        new anchor.BN(1.5e9),           // 1.5 strike ratio
        new anchor.BN(1e9),             // 1 SOL margin
        true                            // Test mode
    )
    .accountsPartial({ seller: seller.publicKey })
    .signers([seller])
    .rpc();
```

---

### 2. `purchase_option` - Buy Listed Option

**Purpose:** Buyer purchases a listed option contract, making it active.

**Parameters:**
- Context only (no additional parameters)

**Process:**
1. Validates contract status is `Listed`
2. Checks not expired (production mode)
3. **Buyer transfers premium** to seller
4. **Buyer deposits initial margin** to contract PDA
5. **Seller deposits initial margin** to contract PDA
6. Sets contract `owner` to buyer
7. Updates status to `Owned`
8. Records purchase timestamp as initial settlement date

**Key Features:**
- **Dual margin requirement:** Both parties contribute equal margins
- **Atomic transaction:** All transfers succeed or fail together
- **Premium payment:** Separate from margin (buyer pays seller directly)

**Example:**
```typescript
await program.methods
    .purchaseOption()
    .accountsPartial({
        option: optionPda,
        buyer: buyer.publicKey,
        seller: seller.publicKey,    // Required as Signer for margin
    })
    .signers([buyer, seller])
    .rpc();
```

**Account Balances After Purchase:**
- Seller: +premium, -initial_margin
- Buyer: -premium, -initial_margin
- Contract PDA: +2 × initial_margin

---

### 3. `daily_settlement` - Mark-to-Market Settlement

**Purpose:** Performs daily mark-to-market valuation and adjusts margins based on price movements.

**Parameters:**
- `asset_price_usd: u64` - Current asset price in USD (6 decimal precision)
- `sol_price_usd: u64` - Current SOL price in USD (6 decimal precision)

**Process:**
1. Validates contract is `Owned` and not expired
2. Checks minimum 24 hours since last settlement (production mode)
3. Calculates current price ratio: `(asset_price_usd × 10^9) / sol_price_usd`
4. Determines reference price:
   - First settlement: Uses strike price
   - Subsequent: Uses last settlement price
5. Calculates P&L based on option type and price movement
6. **Adjusts margins with margin call protection:**
   - If transfer would breach 20% threshold → caps transfer and triggers margin call
   - Otherwise: Performs full margin adjustment
7. Updates settlement date and reference price
8. Sets status to `MarginCalled` if threshold breached

**P&L Calculation Logic:**

**For Call Options:**
- Price goes UP → Buyer gains (asset becomes more expensive in SOL terms)
- Price goes DOWN → Seller gains (asset becomes cheaper in SOL terms)

**For Put Options:**
- Price goes DOWN → Buyer gains (can sell asset at higher strike)
- Price goes UP → Seller gains (put becomes less valuable)

**Margin Call Protection:**
```rust
// Calculate 20% threshold
margin_threshold = initial_margin × 20 / 100

// Before subtracting loss, check if it would breach threshold
if loss >= current_margin || (current_margin - loss) <= threshold {
    // Cap the transfer to maintain minimum threshold
    max_transfer = current_margin - margin_threshold
    // Transfer only max_transfer
    // Set status to MarginCalled
}
```

**Example:**
```typescript
// Prices in USD with 6 decimal precision
const aaplPrice = new anchor.BN(228_750_000);  // $228.75
const solPrice = new anchor.BN(152_500_000);   // $152.50

await program.methods
    .dailySettlement(aaplPrice, solPrice)
    .accountsPartial({
        option: optionPda,
        settler: settler.publicKey,    // Can be anyone
    })
    .signers([settler])
    .rpc();
```

**Settlement Scenarios:**

| Scenario | Initial Ratio | New Ratio | Call Buyer | Call Seller | Put Buyer | Put Seller |
|----------|--------------|-----------|------------|-------------|-----------|------------|
| Price Up 10% | 1.500 | 1.650 | +Gain | -Loss | -Loss | +Gain |
| Price Down 10% | 1.500 | 1.350 | -Loss | +Gain | +Gain | -Loss |
| At Strike | 1.500 | 1.500 | No Change | No Change | No Change | No Change |

---

### 4. `exercise_option` - Execute Option at Expiry

**Purpose:** Owner exercises the option contract at or after expiration date.

**Parameters:**
- `asset_price_usd: u64` - Final settlement price for asset
- `sol_price_usd: u64` - Final settlement price for SOL

**Process:**
1. Validates caller is contract owner
2. Checks expiry date reached (production mode)
3. Calculates final settlement value:
   - **Call:** `max(0, current_ratio - strike)`
   - **Put:** `max(0, strike - current_ratio)`
4. Logs settlement details
5. Sets status to `Expired`
6. Records final settlement price

**Exercise Value Calculation:**

**Call Option (Right to buy at strike):**
- If current_ratio < strike → Out of the money → Value = 0
- If current_ratio > strike → In the money → Value = (current_ratio - strike)

**Put Option (Right to sell at strike):**
- If current_ratio > strike → Out of the money → Value = 0
- If current_ratio < strike → In the money → Value = (strike - current_ratio)

**Example:**
```typescript
// Exercise on Sep 1, 2025
const finalAaplPrice = new anchor.BN(240_000_000);  // $240.00
const finalSolPrice = new anchor.BN(165_000_000);   // $165.00

await program.methods
    .exerciseOption(finalAaplPrice, finalSolPrice)
    .accountsPartial({
        option: optionPda,
        owner: buyer.publicKey,
    })
    .signers([buyer])
    .rpc();
```

**Outcome Scenarios:**

| Option Type | Strike | Final Ratio | Result | Settlement Value |
|-------------|--------|-------------|--------|------------------|
| Call | 1.500 | 1.455 | In the money | 0.045 (buyer profits) |
| Call | 1.500 | 1.600 | Out of the money | 0 |
| Put | 1.500 | 1.600 | In the money | 0.100 (buyer profits) |
| Put | 1.500 | 1.455 | Out of the money | 0 |

---

### 5. `expire_option` - Mark Contract Expired

**Purpose:** Manually mark a contract as expired after expiry date passes.

**Parameters:**
- Context only (no additional parameters)

**Process:**
1. Validates current time >= expiry_date
2. Sets status to `Expired`

**Use Cases:**
- Clean up expired unexercised contracts
- Prepare for fund withdrawals
- Administrative contract management

**Example:**
```typescript
await program.methods
    .expireOption()
    .accountsPartial({ option: optionPda })
    .rpc();
```

---

### 6. `delist_option` - Cancel Unsold Option

**Purpose:** Seller cancels a listed option before it's purchased.

**Parameters:**
- Context only (no additional parameters)

**Process:**
1. Validates caller is original seller
2. Validates contract status is `Listed` (not yet owned)
3. Sets status to `Delisted`

**Use Cases:**
- Cancel listing if no buyers
- Remove stale listings
- Change contract terms (must delist and recreate)

**Example:**
```typescript
await program.methods
    .delistOption()
    .accountsPartial({
        option: optionPda,
        seller: seller.publicKey,
    })
    .signers([seller])
    .rpc();
```

---

### 7. `resell_option` - Secondary Market Trading

**Purpose:** Current owner resells the option to a new buyer before expiration.

**Parameters:**
- `resell_price: u64` - New premium in lamports for the resale

**Process:**
1. Validates caller is current owner
2. Validates contract is `Owned` and not expired
3. **New buyer pays resell_price** to current owner
4. **New buyer deposits initial_margin** to contract PDA
5. **Current owner's margin is returned** from contract PDA
6. Updates `owner` to new buyer
7. Maintains seller's original margin unchanged

**Key Features:**
- Enables price discovery in secondary markets
- Original seller remains unchanged
- Only buyer's margin gets swapped
- Allows profit-taking before expiry

**Example:**
```typescript
// Original buyer resells at higher price
const resellPrice = new anchor.BN(2.5e9);  // 2.5 SOL (profit of 0.5)

await program.methods
    .resellOption(resellPrice)
    .accountsPartial({
        option: optionPda,
        currentOwner: originalBuyer.publicKey,
        newBuyer: newBuyer.publicKey,
    })
    .signers([originalBuyer, newBuyer])
    .rpc();
```

**Financial Flow:**

| Party | Pays | Receives | Net |
|-------|------|----------|-----|
| Current Owner | - | resell_price + margin_return | Profit if resell_price > original_price |
| New Buyer | resell_price + initial_margin | - | -resell_price - initial_margin |
| Seller (Original) | - | - | No change |
| Contract PDA | old_buyer_margin | new_buyer_margin | Swap margins |

---

## Contract Data Structure

### OptionContract Account (165 bytes)

```rust
#[account]
pub struct OptionContract {
    // Option Specification (42 bytes)
    pub option_type: u8,              // 1 byte:  0=Call, 1=Put
    pub underlying: String,           // 36 bytes: Asset symbol (4 len + 32 data)
    pub strike: u64,                  // 8 bytes:  Strike price ratio (lamports)
    pub price: u64,                   // 8 bytes:  Premium (lamports)
    
    // Parties (65 bytes)
    pub seller: Pubkey,               // 32 bytes: Original seller address
    pub owner: Pubkey,                // 32 bytes: Current buyer/owner address
    pub bump: u8,                     // 1 byte:   PDA bump seed
    
    // Timeline (17 bytes)
    pub initiation_date: i64,         // 8 bytes:  Contract start timestamp
    pub expiry_date: i64,             // 8 bytes:  Contract end timestamp (initiation + 30 days)
    pub status: OptionStatus,         // 1 byte:   Current contract state (enum)
    
    // Margin Management (40 bytes)
    pub initial_margin: u64,          // 8 bytes:  Required margin per party
    pub seller_margin: u64,           // 8 bytes:  Seller's current margin balance
    pub buyer_margin: u64,            // 8 bytes:  Buyer's current margin balance
    pub last_settlement_date: i64,    // 8 bytes:  Last mark-to-market timestamp
    pub last_settlement_price: u64,   // 8 bytes:  Reference price for next settlement
    
    // Configuration (1 byte)
    pub is_test: bool,                // 1 byte:   Test mode flag
}

// Total: 8 (discriminator) + 165 (data) = 173 bytes
```

### Field Descriptions

| Field | Type | Description | Example Value |
|-------|------|-------------|---------------|
| `option_type` | u8 | 0 for Call, 1 for Put | `0` |
| `underlying` | String | Asset pair symbol | `"AAPL/SOL"` |
| `strike` | u64 | Strike ratio (asset/SOL) × 10^9 | `1500000000` (1.5) |
| `price` | u64 | Premium in lamports | `2000000000` (2 SOL) |
| `seller` | Pubkey | Original contract creator | `7xKXt...` |
| `owner` | Pubkey | Current holder (buyer) | `4zNPq...` |
| `bump` | u8 | PDA bump seed for verification | `255` |
| `initiation_date` | i64 | Unix timestamp of creation | `1722528000` |
| `expiry_date` | i64 | Unix timestamp 30 days later | `1725120000` |
| `status` | OptionStatus | Contract state enum | `Owned` |
| `initial_margin` | u64 | Base margin requirement | `1000000000` (1 SOL) |
| `seller_margin` | u64 | Seller's current margin | `1031250000` (1.03125 SOL) |
| `buyer_margin` | u64 | Buyer's current margin | `968750000` (0.96875 SOL) |
| `last_settlement_date` | i64 | Last mark-to-market time | `1724371200` |
| `last_settlement_price` | u64 | Last settlement ratio × 10^9 | `1469000000` (1.469) |
| `is_test` | bool | Test mode enabled | `true` |

---

## Status Types

### OptionStatus Enum (5 States)

```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum OptionStatus {
    Listed,       // Available for purchase
    Owned,        // Purchased and active
    Expired,      // Past expiry or exercised
    Delisted,     // Cancelled by seller
    MarginCalled, // Forcibly settled due to margin exhaustion
}
```

### Status Transition Diagram

```
[Created] → Listed
              │
              ├─→ Delisted (seller cancels)
              │
              └─→ Owned (buyer purchases)
                    │
                    ├─→ Expired (time expires or exercised)
                    │
                    ├─→ MarginCalled (margin < 20% threshold)
                    │
                    └─→ Owned (after resell to new buyer)
```

### Status Details

| Status | Description | Allowed Actions | Next States |
|--------|-------------|-----------------|-------------|
| **Listed** | Contract created, awaiting buyer | `purchase_option`, `delist_option` | Owned, Delisted |
| **Owned** | Active contract with buyer | `daily_settlement`, `exercise_option`, `resell_option` | Expired, MarginCalled, Owned (resell) |
| **Expired** | Completed lifecycle | None (terminal state) | - |
| **Delisted** | Cancelled before purchase | None (terminal state) | - |
| **MarginCalled** | Auto-settled due to low margin | None (terminal state) | - |

---

## Margin Management

### Dual Margin System

Both buyer and seller deposit margins to ensure both parties have skin in the game and can cover potential losses.

**Initial Setup:**
- Seller deposits: `initial_margin`
- Buyer deposits: `initial_margin`
- Total in PDA: `2 × initial_margin`

**During Settlements:**
- Margins adjust based on P&L
- Winner's margin increases
- Loser's margin decreases
- Total always equals `2 × initial_margin` (before margin call)

### Margin Call Mechanism

**Threshold:** 20% of initial margin

**Trigger Condition:**
```
if buyer_margin <= (initial_margin × 0.20) OR
   seller_margin <= (initial_margin × 0.20)
```

**Protection Logic:**

1. **Before Each Settlement:**
   - Calculate proposed margin adjustment
   - Check if adjustment would breach threshold
   
2. **If Breach Detected:**
   - Cap the transfer to: `losing_margin - threshold`
   - Set losing party's margin to exactly `threshold`
   - Give winning party: `losing_margin - threshold`
   - Set status to `MarginCalled`
   - Log margin call event

3. **Benefits:**
   - **Prevents negative margins:** Never allows margins to go below threshold
   - **Graceful degradation:** Partial settlement better than transaction failure
   - **Clear status:** `MarginCalled` distinct from normal `Expired`

### Example Margin Call Scenario

**Setup:**
- Initial margin: 0.1 SOL each
- Threshold: 0.02 SOL (20%)
- Strike: 1.5 ratio

**Timeline:**

| Day | AAPL | SOL | Ratio | Buyer Margin | Seller Margin | Status |
|-----|------|-----|-------|--------------|---------------|--------|
| 0 | $225.50 | $150 | 1.503 | 0.100 | 0.100 | Owned |
| 1 | $240.00 | $144 | 1.667 | 0.116 | 0.084 | Owned |
| 2 | $250.00 | $133 | 1.880 | 0.180 | **0.020** | **MarginCalled** |

**Day 2 Calculation:**
- Price change: 1.667 → 1.880 (up 0.213)
- Seller loss: 0.213 × 0.1 = 0.0213 SOL
- Would result in: 0.084 - 0.0213 = 0.0627 SOL
- BUT: 0.0627 < 0.020 threshold
- **Action:** Transfer only 0.064 SOL, leave seller at 0.020, mark MarginCalled

### Constants

```rust
const MARGIN_CALL_THRESHOLD: u64 = 20;  // 20% of initial margin
const SECONDS_PER_DAY: i64 = 86400;     // 24 * 60 * 60
```

---

## Use Cases

### 1. Hedging Portfolio Risk

**Scenario:** Investor holds 10 SOL and expects SOL price to drop.

**Strategy:** Buy Put option on SOL/USDC pair
- Strike: $150
- Expiry: 30 days
- Premium: 0.1 SOL per contract

**Outcome:**
- If SOL drops to $100: Put is in the money, offset losses
- If SOL rises to $200: Put expires worthless, but portfolio gains
- Maximum loss: Premium paid (0.1 SOL)

---

### 2. Speculation on Asset Prices

**Scenario:** Trader believes AAPL will outperform SOL over next month.

**Strategy:** Buy Call option on AAPL/SOL
- Strike: 1.5 (AAPL at $225, SOL at $150)
- Expiry: 30 days
- Premium: 2 SOL
- Margin: 1 SOL

**Outcomes:**

| AAPL Final | SOL Final | Ratio | Option Value | P&L |
|------------|-----------|-------|--------------|-----|
| $240 | $150 | 1.600 | 0.100 | +0.100 (10% gain) |
| $240 | $160 | 1.500 | 0 | -2.000 (loss premium) |
| $300 | $150 | 2.000 | 0.500 | +0.500 (50% gain) |

---

### 3. Secondary Market Trading

**Scenario:** Option buyer wants to take profits before expiry.

**Initial Purchase:**
- Bought Call at 2 SOL premium
- Strike: 1.5
- Days to expiry: 30

**After 15 Days:**
- Asset rallied, option now worth 3.5 SOL
- Resells to new buyer at 3.5 SOL
- Profit: 3.5 - 2.0 = 1.5 SOL (75% gain)
- Plus: Gets margin back immediately

**Benefits:**
- Liquidity before expiry
- Realize gains without waiting
- Reduce exposure to subsequent moves

---

### 4. Automated Risk Management

**Scenario:** Market maker wants automated position management.

**Setup:**
- Sells multiple options with margins
- Daily settlement monitors all positions
- Margin calls automatically trigger at 20% threshold

**Advantages:**
- No manual monitoring required
- Losses capped at margin amount
- Automatic settlement prevents disputes
- Clear audit trail via status changes

---

### 5. Backtesting Strategies

**Scenario:** Trader wants to test strategy with historical data.

**Using Test Mode:**
```typescript
// Create contract dated in the past
await initializeOption(
    0,                              // Call
    "AAPL/SOL",
    pastDate,                       // Aug 1, 2025
    premium,
    strike,
    margin,
    true                            // is_test = true (allows past dates)
);

// Run settlements with historical prices
await dailySettlement(historicalPrices[0]);
await dailySettlement(historicalPrices[1]);
// ... continue with entire history

// Analyze margin changes, calls, P&L
```

**Benefits:**
- Test strategies without risking funds
- Validate margin call logic
- Tune parameters (strike, margin requirements)
- Verify settlement calculations

---

### 6. Cross-Asset Correlation Trading

**Scenario:** Arbitrage between related assets.

**Strategy:** 
- Buy Call on AAPL/SOL
- Sell Put on MSFT/SOL
- Bet on tech sector correlation

**Implementation:**
```typescript
// Long call AAPL
await purchaseOption(aaplCallPda);

// Short put MSFT (sell to someone)
await initializeOption(..., "MSFT/SOL", ...);
```

**Result:** Profit if tech stocks move together relative to SOL

---

### 7. Income Generation (Option Writing)

**Scenario:** Seller wants to earn premium income.

**Strategy:** Sell out-of-the-money options
- Collect premiums upfront
- Keep premiums if options expire worthless
- Margin ensures performance

**Risk Management:**
- Daily settlements limit exposure
- Margin calls prevent unlimited losses
- Can buy back (resell market) if position adverse

---

### 8. Price Discovery

**Scenario:** Determine fair value of illiquid assets.

**Process:**
1. Create options at various strikes
2. Market participants bid/ask via resell market
3. Option prices imply expected asset distribution
4. Extract implied volatility and correlation

**DeFi Application:**
- Bootstrap liquidity for new token pairs
- Hedge staking positions
- Manage impermanent loss

---

## Error Handling

### Error Codes (17 Total)

```rust
#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized to perform this action")]
    Unauthorized,                          // 6000
    
    #[msg("Invalid option type (must be 0 for Call or 1 for Put)")]
    InvalidOptionType,                     // 6001
    
    #[msg("Price must be greater than zero")]
    PriceMustBeNonZero,                    // 6002
    
    #[msg("Strike must be greater than zero")]
    StrikeMustBeNonZero,                   // 6003
    
    #[msg("Margin must be greater than zero")]
    MarginMustBeNonZero,                   // 6004
    
    #[msg("Option is not available for purchase")]
    OptionNotAvailable,                    // 6005
    
    #[msg("Option has expired")]
    OptionExpired,                         // 6006
    
    #[msg("Option is not owned")]
    OptionNotOwned,                        // 6007
    
    #[msg("Option is not yet expired")]
    OptionNotExpired,                      // 6008
    
    #[msg("Cannot delist an owned option")]
    CannotDelistOwnedOption,               // 6009
    
    #[msg("Cannot exercise option before expiry date")]
    CannotExerciseBeforeExpiry,            // 6010
    
    #[msg("Insufficient margin for settlement")]
    InsufficientMargin,                    // 6015
    
    #[msg("Settlement requires at least 24 hours since last settlement")]
    SettlementTooSoon,                     // 6011
    
    #[msg("Already settled today")]
    AlreadySettledToday,                   // 6012
    
    #[msg("Invalid price (must be greater than zero)")]
    InvalidPrice,                          // 6013
    
    #[msg("Calculation overflow")]
    CalculationOverflow,                   // 6014
    
    #[msg("Underlying asset symbol too long (max 32 characters)")]
    UnderlyingTooLong,                     // 6016
    
    #[msg("Invalid initiation date (cannot be in the past for production contracts)")]
    InvalidInitiationDate,                 // 6017
}
```

### Error Handling Best Practices

**Transaction Failure Scenarios:**

1. **Authorization Errors:**
   - Always verify caller is expected party
   - Use `require!` with clear error messages
   - Log unauthorized attempts

2. **State Validation:**
   - Check contract status before operations
   - Validate not expired when required
   - Ensure ownership for protected actions

3. **Calculation Safety:**
   - Use `checked_mul`, `checked_div`, `checked_add`, `checked_sub`
   - Catch overflow errors explicitly
   - Return `CalculationOverflow` on overflow

4. **Margin Protection:**
   - Pre-check margin sufficiency before subtraction
   - Use `saturating_sub` for margin calculations
   - Trigger margin call instead of throwing `InsufficientMargin`

**Example Error Handling:**

```rust
// Good: Pre-check prevents error
if buyer_gain >= option.seller_margin {
    // Trigger margin call
    option.status = OptionStatus::MarginCalled;
} else {
    // Safe to subtract
    option.seller_margin = option.seller_margin
        .checked_sub(buyer_gain)
        .ok_or(ErrorCode::InsufficientMargin)?;
}

// Bad: Can fail unexpectedly
option.seller_margin = option.seller_margin
    .checked_sub(buyer_gain)  // May throw error
    .ok_or(ErrorCode::InsufficientMargin)?;
```

---

## Testing

### Test Suites

#### 1. Standard Test Suite (`tests/escrow.ts`)

**Coverage:**
- ✅ Initialize Call option
- ✅ Purchase option (dual margins)
- ✅ Prevent early exercise (European)
- ✅ Verify margin deposits
- ✅ Delist unsold option
- ✅ Resell to new buyer
- ✅ Prevent unauthorized resell
- ✅ Allow past dates (test mode)
- ✅ Prevent past dates (production)
- ⏸ Daily settlement (requires 24hr wait)
- ⏸ Margin call trigger (requires 24hr wait)
- ⏸ Prevent same-day settlement (requires 24hr wait)

**Results:** 9 passing, 3 pending

#### 2. AAPL Historical Test Suite (`tests/aapl_historical.ts`)

**Scenario:**
- Contract: AAPL/SOL Call option
- Period: August 1 - September 1, 2025
- Strike: 1.5 SOL
- Premium: 2 SOL
- Margins: 1 SOL each
- Mode: Test (allows historical dates)

**Test Coverage:**
1. ✅ **Initialize** - Create contract dated Aug 1
2. ✅ **Purchase** - Buyer and seller deposit margins
3. ✅ **Settlement Aug 5** - First mark-to-market
4. ✅ **Settlement Aug 10** - Price movement adjustment
5. ✅ **Settlement Aug 15** - Continued tracking
6. ✅ **Resell Aug 18** - Secondary market transfer
7. ✅ **Settlement Aug 20** - New owner settlement
8. ✅ **Exercise Sep 1** - Final settlement at expiry
9. ✅ **Margin Call** - Extreme volatility test

**Mock Price Data:**

| Date | AAPL | SOL | Ratio | Notes |
|------|------|-----|-------|-------|
| Aug 1 | $225.50 | $150.00 | 1.503 | Initial |
| Aug 5 | $228.75 | $152.50 | 1.500 | At strike |
| Aug 10 | $223.25 | $148.00 | 1.509 | Slight gain for seller |
| Aug 15 | $230.50 | $155.00 | 1.487 | Gain for buyer |
| Aug 20 | $235.00 | $160.00 | 1.469 | More buyer gain |
| Sep 1 | $240.00 | $165.00 | 1.455 | Expiry: In the money |

**Margin Evolution:**

```
Initial:  Buyer=1.000, Seller=1.000
Aug 5:    Buyer=1.000, Seller=1.000 (no change at strike)
Aug 10:   Buyer=1.008, Seller=0.992 (small shift)
Aug 15:   Buyer=0.987, Seller=1.013 (reversal)
Aug 20:   Buyer=0.969, Seller=1.031 (trend continues)
Sep 1:    Option exercised in the money
```

**Results:** 8 passing tests

#### 3. Margin Call Test

**Setup:**
- Small margins: 0.1 SOL each
- Strike: 1.5
- Extreme price volatility

**Sequence:**
1. Initial: AAPL=$225.50, SOL=$150 (ratio 1.503)
2. Settlement 1: AAPL=$240, SOL=$144 (ratio 1.667)
   - Seller margin drops from 0.100 → 0.084
3. Settlement 2: AAPL=$250, SOL=$133 (ratio 1.880)
   - Would drop seller to negative
   - **Margin call triggered**
   - Seller capped at 0.020 (20% threshold)
   - Status: `MarginCalled`

**Result:** ✅ Pass - Margin call correctly prevents negative margins

### Running Tests

```bash
# Build program
anchor build

# Run all tests (requires local validator)
anchor test

# Run without rebuilding
anchor test --skip-build

# Run with existing validator
anchor test --skip-local-validator

# Run specific test file
ts-mocha -p ./tsconfig.json tests/aapl_historical.ts
```

### Test Mode vs Production Mode

| Feature | Test Mode | Production Mode |
|---------|-----------|-----------------|
| Past initiation dates | ✅ Allowed | ❌ Blocked |
| 24hr settlement gap | ⏭️ Skipped | ✅ Enforced |
| Expiry checks | ⏭️ Skipped | ✅ Enforced |
| European exercise | ⏭️ Skipped | ✅ Enforced |
| Use case | Testing, backtesting | Live trading |

---

## Price Oracle Integration

### Mock Price Functions

Located in `utils/price_oracle/src/lib.rs`:

```rust
pub fn mock_aapl_price(date: &str) -> Result<u64, Box<dyn Error>> {
    let prices = match date {
        "2025-08-01" => 225.50,
        "2025-08-05" => 228.75,
        // ... more dates
        _ => 225.50,
    };
    Ok((prices * 1_000_000.0) as u64)
}

pub fn mock_sol_price(date: &str) -> Result<u64, Box<dyn Error>> {
    let prices = match date {
        "2025-08-01" => 150.00,
        // ... more dates
        _ => 150.00,
    };
    Ok((prices * 1_000_000.0) as u64)
}
```

### Live Price Feeds (API Integration)

**CoinGecko (SOL Price):**
```rust
pub fn fetch_sol_price() -> Result<u64, Box<dyn Error>> {
    let url = "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd";
    let response = reqwest::blocking::get(url)?;
    let json: Value = response.json()?;
    let price = json["solana"]["usd"].as_f64().unwrap();
    Ok((price * 1_000_000.0) as u64)
}
```

**Alpha Vantage (Stock Prices):**
```rust
pub fn fetch_stock_price(symbol: &str) -> Result<u64, Box<dyn Error>> {
    let api_key = std::env::var("ALPHA_VANTAGE_API_KEY").unwrap();
    let url = format!(
        "https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol={}&apikey={}",
        symbol, api_key
    );
    // ... fetch and parse
}
```

**Dependencies Required:**
```toml
[dependencies]
reqwest = { version = "0.11", features = ["json", "blocking"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tokio = { version = "1.0", features = ["full"] }
chrono = "0.4"
```

---

## Security Considerations

### 1. PDA Security
- All option accounts use PDAs with seeds: `["option", seller, underlying]`
- Bump seed stored in contract
- Prevents unauthorized account manipulation

### 2. Authorization Checks
- Seller verification for `delist_option`
- Owner verification for `exercise_option`, `resell_option`
- Dual signatures required for `purchase_option` (buyer + seller)

### 3. Numerical Safety
- All arithmetic uses checked operations
- Overflow errors caught and returned
- Margin calculations use `saturating_sub` to prevent underflow

### 4. State Machine Integrity
- Strict status transitions enforced
- Can't purchase non-Listed contracts
- Can't delist Owned contracts
- Can't exercise before expiry (production)

### 5. Margin Protection
- Pre-flight checks before margin adjustments
- Automatic margin calls prevent negative balances
- 20% threshold ensures minimum collateral

### 6. Time-Based Controls
- 24-hour minimum between settlements (production)
- Expiry date validation
- European exercise restriction (production)

### 7. Test Mode Isolation
- Clear `is_test` flag distinguishes test/production
- Production contracts enforce all safeguards
- Test contracts skip time-based validations only

---

## Deployment Guide

### Prerequisites
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.18.0/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install 0.31.1
avm use 0.31.1

# Install Node.js dependencies
npm install
```

### Build and Deploy

```bash
# Build program
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Deploy to mainnet-beta (use with caution!)
anchor deploy --provider.cluster mainnet-beta
```

### Configuration

**Anchor.toml:**
```toml
[programs.localnet]
escrow = "E5ijR9ex1qWRQGXBSQ7ZiRbP72xtqzxrNXvQRB9PaTYL"

[programs.devnet]
escrow = "E5ijR9ex1qWRQGXBSQ7ZiRbP72xtqzxrNXvQRB9PaTYL"

[provider]
cluster = "devnet"  # or "mainnet-beta"
wallet = "~/.config/solana/id.json"
```

### Post-Deployment Verification

```bash
# Verify program deployed
solana program show <PROGRAM_ID> --url devnet

# Check program size
ls -lh target/deploy/escrow.so

# Run tests against deployed program
anchor test --skip-build --skip-deploy
```

---

## Frontend Integration

### Connecting to Program

```typescript
import * as anchor from '@coral-xyz/anchor';
import { Escrow } from './target/types/escrow';

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

const programId = new anchor.web3.PublicKey(
    "E5ijR9ex1qWRQGXBSQ7ZiRbP72xtqzxrNXvQRB9PaTYL"
);

const program = new anchor.Program<Escrow>(
    IDL,
    programId,
    provider
);
```

### Creating Option (Seller UI)

```typescript
async function createOption(params) {
    const [optionPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
            Buffer.from("option"),
            seller.publicKey.toBuffer(),
            Buffer.from(params.underlying)
        ],
        program.programId
    );

    await program.methods
        .initializeOption(
            params.optionType,
            params.underlying,
            new anchor.BN(params.initiationDate),
            new anchor.BN(params.price),
            new anchor.BN(params.strike),
            new anchor.BN(params.initialMargin),
            false  // production mode
        )
        .accountsPartial({ seller: seller.publicKey })
        .signers([seller])
        .rpc();

    return optionPda;
}
```

### Buying Option (Buyer UI)

```typescript
async function buyOption(optionPda, buyer, seller) {
    await program.methods
        .purchaseOption()
        .accountsPartial({
            option: optionPda,
            buyer: buyer.publicKey,
            seller: seller.publicKey,
        })
        .signers([buyer, seller])
        .rpc();
}
```

### Fetching Option Data

```typescript
async function getOptionData(optionPda) {
    const option = await program.account.optionContract.fetch(optionPda);
    
    return {
        type: option.optionType === 0 ? 'Call' : 'Put',
        underlying: option.underlying,
        strike: option.strike.toNumber() / 1e9,
        premium: option.price.toNumber() / 1e9,
        expiry: new Date(option.expiryDate.toNumber() * 1000),
        status: Object.keys(option.status)[0],
        buyerMargin: option.buyerMargin.toNumber() / 1e9,
        sellerMargin: option.sellerMargin.toNumber() / 1e9,
    };
}
```

### Wallet Integration (Phantom, Solflare)

```typescript
import { useWallet } from '@solana/wallet-adapter-react';

function OptionTrader() {
    const { publicKey, signTransaction } = useWallet();
    
    const createOption = async () => {
        if (!publicKey) {
            alert('Connect wallet first');
            return;
        }
        
        // Create option with connected wallet as seller
        await program.methods
            .initializeOption(...)
            .accountsPartial({ seller: publicKey })
            .rpc();
    };
}
```

---

## API Reference

### RPC Methods

| Method | Accounts | Parameters | Returns |
|--------|----------|------------|---------|
| `initialize_option` | seller, option PDA | option_type, underlying, initiation_date, price, strike, initial_margin, is_test | Transaction signature |
| `purchase_option` | buyer, seller, option PDA | - | Transaction signature |
| `daily_settlement` | settler, option PDA | asset_price_usd, sol_price_usd | Transaction signature |
| `exercise_option` | owner, option PDA | asset_price_usd, sol_price_usd | Transaction signature |
| `expire_option` | option PDA | - | Transaction signature |
| `delist_option` | seller, option PDA | - | Transaction signature |
| `resell_option` | current_owner, new_buyer, option PDA | resell_price | Transaction signature |

### Event Logs

The program emits messages via `msg!()` for key events:

```rust
msg!("Margin call triggered - seller margin exhausted at {}%", percentage);
msg!("Exercise settlement - Asset/SOL ratio: {}, Strike: {}, Settlement: {}", ratio, strike, value);
```

Monitor transaction logs for debugging and audit trails.

---

## Roadmap

### Future Enhancements

1. **Multi-Asset Support**
   - Support more underlying assets
   - Cross-chain price feeds (Ethereum, BSC)
   - NFT-collateralized options

2. **Advanced Option Types**
   - American options (early exercise)
   - Exotic options (barriers, binary)
   - Spreads and combinations

3. **Automated Settlement**
   - Keeper network integration
   - Scheduled settlements via clock
   - Oracle price feed integration

4. **Liquidity Pools**
   - AMM for option pricing
   - Liquidity provider rewards
   - Automated market making

5. **Portfolio Management**
   - Multi-option positions
   - Delta hedging automation
   - Risk analytics dashboard

6. **Governance**
   - DAO for parameter adjustment
   - Fee distribution
   - Protocol upgrades

---

## Support & Resources

### Documentation
- **GitHub:** [solana-escrow-dapp](https://github.com/yourusername/solana-escrow-dapp)
- **Anchor Docs:** https://www.anchor-lang.com/
- **Solana Docs:** https://docs.solana.com/

### Community
- **Discord:** [Join community]
- **Twitter:** [@SolanaOptions]
- **Forum:** [Discuss on forum]

### Developer Resources
- **Example Apps:** `/examples` directory
- **Test Suite:** `/tests` directory
- **Price Oracle:** `/utils/price_oracle`

---

## License

MIT License - See LICENSE file for details

---

## Disclaimer

**IMPORTANT:** This software is provided for educational and research purposes. Trading options involves substantial risk of loss. Never risk funds you cannot afford to lose. Conduct thorough testing on devnet before deploying to mainnet. No warranty or guarantee of fitness is provided.

**Use at your own risk.**

---

## Appendix A: Mathematical Formulas

### Price Ratio Calculation

```
ratio = (asset_price_usd × 10^9) / sol_price_usd

Example:
asset_price_usd = 228.75 × 10^6 = 228,750,000
sol_price_usd = 152.50 × 10^6 = 152,500,000
ratio = (228,750,000 × 10^9) / 152,500,000
     = 1,500,000,000 (represents 1.500)
```

### Settlement P&L

**For Call Options:**
```
If current_ratio > reference_ratio:
    buyer_gain = (current_ratio - reference_ratio) × initial_margin / strike
Else:
    seller_gain = (reference_ratio - current_ratio) × initial_margin / strike
```

**For Put Options:**
```
If current_ratio < reference_ratio:
    buyer_gain = (reference_ratio - current_ratio) × initial_margin / strike
Else:
    seller_gain = (current_ratio - reference_ratio) × initial_margin / strike
```

### Exercise Value

**Call Option:**
```
exercise_value = max(0, current_ratio - strike)
```

**Put Option:**
```
exercise_value = max(0, strike - current_ratio)
```

### Margin Threshold

```
threshold = initial_margin × 20 / 100
         = initial_margin × 0.20

Example:
initial_margin = 1,000,000,000 lamports (1 SOL)
threshold = 200,000,000 lamports (0.2 SOL)
```

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **Call Option** | Right to buy asset at strike price |
| **Put Option** | Right to sell asset at strike price |
| **Strike Price** | Agreed-upon ratio for exercise |
| **Premium** | Upfront payment from buyer to seller |
| **Margin** | Collateral deposited by both parties |
| **Mark-to-Market** | Daily valuation and settlement |
| **Margin Call** | Forced settlement when collateral low |
| **PDA** | Program Derived Address (Solana account) |
| **Lamports** | Smallest unit of SOL (10^-9 SOL) |
| **European Option** | Exercisable only at expiry |
| **In the Money** | Option has positive intrinsic value |
| **Out of the Money** | Option has zero intrinsic value |
| **Underlying** | Asset the option derives value from |
| **Expiry Date** | Contract end date (30 days) |
| **Settlement** | Exchange of funds based on P&L |

---

**Document Version:** 1.0  
**Last Updated:** November 12, 2025  
**Program Version:** 0.1.0  
**Anchor Version:** 0.31.1

---

*End of Documentation*
