# Solana Options Escrow DApp# Solana Escrow DApp



A decentralized options trading platform built on Solana blockchain using the Anchor framework. This platform enables users to create, trade, and settle European-style Call and Put options with automated margin management and risk controls.This project is a decentralized application (dApp) built on the Solana blockchain using the Anchor framework. It allows two users to transact with each other through an escrow program that securely stores the initial value of the transaction.



[![Solana](https://img.shields.io/badge/Solana-Blockchain-blueviolet?logo=solana)](https://solana.com/)## Project Structure

[![Anchor](https://img.shields.io/badge/Anchor-v0.31.1-blue)](https://www.anchor-lang.com/)

[![Rust](https://img.shields.io/badge/Rust-2021-orange?logo=rust)](https://www.rust-lang.org/)```

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)solana-escrow-dapp

[![Tests](https://img.shields.io/badge/Tests-18%20Passing-success)](tests/)├── programs

│   └── escrow

## 🌟 Features│       ├── src

│       │   └── lib.rs          # Main logic of the escrow program

- **European Call & Put Options** - Fixed 30-day term contracts│       ├── Cargo.toml          # Rust program configuration

- **Dual Margin System** - Both buyer and seller post collateral for risk management│       └── Xargo.toml          # Xargo build configuration

- **Automated Margin Calls** - 20% threshold protection prevents negative balances├── tests

- **Daily Mark-to-Market** - Automated P&L settlements based on price movements│   └── escrow.ts               # Test cases for the escrow program

- **Secondary Market Trading** - Resell options before expiry for price discovery├── app

- **Multiple Underlying Assets** - Support for any asset pair (stocks/SOL, crypto/SOL)│   ├── src

- **Test Mode** - Enable historical backtesting without time constraints│   │   ├── App.tsx             # Main entry point for the React application

- **Production-Ready** - Comprehensive test coverage with 18 passing tests│   │   ├── components

│   │   │   ├── WalletConnect.tsx # Component for wallet connection

## 📋 Table of Contents│   │   │   └── Transaction.tsx    # Component for managing transactions

│   │   ├── utils

- [Quick Start](#quick-start)│   │   │   └── anchorClient.ts    # Functions for interacting with Anchor

- [Installation](#installation)│   │   └── index.tsx           # Renders the main App component

- [Usage](#usage)│   ├── package.json             # React application configuration

- [Program Functions](#program-functions)│   └── tsconfig.json            # TypeScript configuration for the React app

- [Testing](#testing)├── migrations

- [Deployment](#deployment)│   └── deploy.ts                # Deployment script for the escrow program

- [Documentation](#documentation)├── Anchor.toml                  # Anchor framework configuration

- [Architecture](#architecture)├── Cargo.toml                   # Overall project configuration

- [Security](#security)├── package.json                  # Overall project configuration

- [License](#license)├── tsconfig.json                # TypeScript configuration for the overall project

└── README.md                    # Project documentation

## 🚀 Quick Start```



```bash## Getting Started

# Clone the repository

git clone https://github.com/YOUR_USERNAME/Solana-Options-Escrow-dApp.git### Prerequisites

cd Solana-Options-Escrow-dApp

- Rust and Cargo

# Install dependencies- Node.js and npm

npm install- Solana CLI

- Anchor CLI

# Build the program

anchor build### Installation



# Run tests1. Clone the repository:

anchor test   ```

```   git clone <repository-url>

   cd solana-escrow-dapp

## 📦 Installation   ```



### Prerequisites2. Install Rust dependencies:

   ```

- **Rust** (latest stable)   cd programs/escrow

- **Solana CLI** v1.18.0+   cargo build

- **Anchor CLI** v0.31.1   ```

- **Node.js** v18+

- **Yarn** or **npm**3. Install frontend dependencies:

   ```

### Install Rust   cd app

   npm install

```bash   ```

curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

```### Running the Application



### Install Solana CLI1. Start the Solana local cluster:

   ```

```bash   solana-test-validator

sh -c "$(curl -sSfL https://release.solana.com/v1.18.0/install)"   ```

```

2. Deploy the escrow program:

### Install Anchor   ```

   anchor deploy

```bash   ```

cargo install --git https://github.com/coral-xyz/anchor avm --locked --force

avm install 0.31.13. Start the React application:

avm use 0.31.1   ```

```   npm start

   ```

### Install Node Dependencies

### Usage

```bash

npm install- Connect your Solana wallet using the WalletConnect component.

# or- Use the Transaction component to initiate transactions between two users.

yarn install

```## Contributing



## 💡 UsageContributions are welcome! Please open an issue or submit a pull request for any improvements or features.



### Creating an Option Contract## License



```typescriptThis project is licensed under the MIT License. See the LICENSE file for details.
import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { Escrow } from './target/types/escrow';

const program = anchor.workspace.Escrow as Program<Escrow>;

// Create AAPL/SOL Call option
await program.methods
    .initializeOption(
        0,                                      // 0 = Call, 1 = Put
        "AAPL/SOL",                            // Underlying asset
        new anchor.BN(Date.now() / 1000),      // Current timestamp
        new anchor.BN(2 * 1e9),                // 2 SOL premium
        new anchor.BN(1.5 * 1e9),              // Strike: 1.5 ratio
        new anchor.BN(1 * 1e9),                // 1 SOL margin per party
        false                                   // Production mode
    )
    .accountsPartial({ seller: seller.publicKey })
    .signers([seller])
    .rpc();
```

### Purchasing an Option

```typescript
await program.methods
    .purchaseOption()
    .accountsPartial({
        option: optionPda,
        buyer: buyer.publicKey,
        seller: seller.publicKey,
    })
    .signers([buyer, seller])
    .rpc();
```

### Daily Settlement

```typescript
const aaplPriceUSD = new anchor.BN(228_750_000);  // $228.75 (6 decimals)
const solPriceUSD = new anchor.BN(152_500_000);   // $152.50

await program.methods
    .dailySettlement(aaplPriceUSD, solPriceUSD)
    .accountsPartial({
        option: optionPda,
        settler: settler.publicKey,
    })
    .signers([settler])
    .rpc();
```

## 🔧 Program Functions

| Function | Description | Caller |
|----------|-------------|--------|
| `initialize_option` | Create new Call/Put option contract | Seller |
| `purchase_option` | Buy listed option with dual margins | Buyer + Seller |
| `daily_settlement` | Mark-to-market with margin adjustments | Anyone |
| `exercise_option` | Execute option at expiry | Owner |
| `resell_option` | Trade on secondary market | Owner + New Buyer |
| `delist_option` | Cancel unsold option | Seller |
| `expire_option` | Mark contract as expired | Anyone |

## 🧪 Testing

The project includes comprehensive test coverage:

### Standard Test Suite (`tests/escrow.ts`)
- 9 passing tests covering all core functionalities
- 3 pending tests (require 24-hour blockchain time)

### AAPL Historical Test Suite (`tests/aapl_historical.ts`)
- 8 passing tests simulating real-world trading scenario
- Tests AAPL/SOL Call option from Aug 1 - Sep 1, 2025
- Includes margin call scenario with extreme volatility

### Run Tests

```bash
# Run all tests
anchor test

# Run without rebuilding
anchor test --skip-build

# Run specific test file
ts-mocha -p ./tsconfig.json tests/aapl_historical.ts
```

### Test Results

```
✅ 18 Passing
⏸️  3 Pending (require 24hr blockchain time)
❌ 0 Failures
```

## 🚢 Deployment

### Deploy to Devnet

```bash
# Build the program
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Verify deployment
solana program show E5ijR9ex1qWRQGXBSQ7ZiRbP72xtqzxrNXvQRB9PaTYL --url devnet
```

### Deploy to Mainnet

```bash
# Use with caution - ensure thorough testing on devnet first!
anchor deploy --provider.cluster mainnet-beta
```

### Program ID

```
E5ijR9ex1qWRQGXBSQ7ZiRbP72xtqzxrNXvQRB9PaTYL
```

## 📚 Documentation

- **[Complete Documentation](DOCUMENTATION.md)** - Comprehensive guide with all functions, examples, and use cases
- **[Space Management Guide](SPACE_MANAGEMENT.md)** - Disk space optimization and cleanup
- **[Cleanup Script](cleanup.sh)** - Automated space cleanup after testing

## 🏗️ Architecture

### Contract Structure

```
OptionContract (165 bytes)
├── Option Specification (42 bytes)
│   ├── option_type: u8 (Call/Put)
│   ├── underlying: String (asset symbol)
│   ├── strike: u64 (strike ratio)
│   └── price: u64 (premium)
├── Parties (65 bytes)
│   ├── seller: Pubkey
│   ├── owner: Pubkey
│   └── bump: u8 (PDA seed)
├── Timeline (17 bytes)
│   ├── initiation_date: i64
│   ├── expiry_date: i64
│   └── status: OptionStatus
└── Margin Management (40 bytes)
    ├── initial_margin: u64
    ├── seller_margin: u64
    ├── buyer_margin: u64
    ├── last_settlement_date: i64
    └── last_settlement_price: u64
```

### Status Flow

```
Listed → Owned → Expired/MarginCalled
   ↓
Delisted
```

### Margin Call Mechanism

- **Threshold:** 20% of initial margin
- **Protection:** Pre-check prevents negative balances
- **Action:** Caps transfer and sets `MarginCalled` status

## 🔒 Security

### Built-in Protections

- ✅ **PDA-based accounts** - Secure program-derived addresses
- ✅ **Authorization checks** - Verify caller for protected actions
- ✅ **Checked arithmetic** - Prevent overflow/underflow
- ✅ **State machine validation** - Enforce valid transitions
- ✅ **Margin call protection** - Pre-flight checks before adjustments
- ✅ **Time-based controls** - European exercise, 24hr settlement gap

### Best Practices

1. Never commit private keys (`.gitignore` configured)
2. Test thoroughly on devnet before mainnet
3. Audit smart contracts before production use
4. Use environment variables for API keys
5. Monitor margin levels regularly

## 📊 Project Statistics

- **Program Size:** 260 KB
- **Total Lines of Code:** ~2,000
- **Test Coverage:** 18 tests (100% core functionality)
- **Dependencies:** Minimal (Anchor, Solana SDK)

## 🛠️ Utilities

### Cleanup Script

Free up disk space after testing:

```bash
./cleanup.sh
```

**Saves ~5.6 GB** by removing:
- test-ledger/ (regenerated on test runs)
- target/debug/ (rebuilt by cargo)
- Build caches

**Preserves:**
- Compiled program (escrow.so)
- IDL and TypeScript types
- All source code

## 🗺️ Roadmap

### Future Enhancements

- [ ] American options (early exercise)
- [ ] Automated keeper network for settlements
- [ ] AMM for option pricing
- [ ] Multi-asset portfolio management
- [ ] Cross-chain oracle integration
- [ ] Governance DAO for parameters
- [ ] Frontend UI (React/Next.js)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

**IMPORTANT:** This software is provided for educational and research purposes. Trading options involves substantial risk of loss. Never risk funds you cannot afford to lose. Conduct thorough testing on devnet before deploying to mainnet. No warranty or guarantee of fitness is provided.

**Use at your own risk.**

## 🔗 Resources

- **Anchor Documentation:** https://www.anchor-lang.com/
- **Solana Documentation:** https://docs.solana.com/
- **Solana Program Library:** https://spl.solana.com/

## 👤 Author

Built with ❤️ for the Solana ecosystem

## 🌟 Show Your Support

Give a ⭐️ if this project helped you!

---

**Program ID:** `E5ijR9ex1qWRQGXBSQ7ZiRbP72xtqzxrNXvQRB9PaTYL`  
**Framework:** Anchor v0.31.1  
**Last Updated:** November 15, 2025
