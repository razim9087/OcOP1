This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Solana Options Escrow Frontend

A decentralized options trading platform built on Solana with automated margin management and daily settlements.

## Features

### 🏠 Home Page
- Platform overview and statistics
- Quick access to all features

### 📊 Markets (`/markets`)
- Browse available options contracts
- Filter by underlying asset, type, and expiration

### ✨ Create (`/create`)
- Initialize new options contracts
- Set strike price, premium, and margin requirements

### 💼 Portfolio (`/portfolio`)
- View your active positions
- Track profit/loss

### 📜 Transactions (`/transactions`)
- Complete transaction history for connected wallet
- Real-time balance display
- Transaction categorization (Purchase, Settlement, Exercise, etc.)

### 🔍 Wallet Lookup (`/lookup`)
- Search any wallet address
- View transaction history without connecting wallet
- Support for local validator, devnet, and mainnet

### 📖 **Contract History (`/contract`)** ⭐ NEW
**Comprehensive contract lifecycle explorer:**
- **Contract Characteristics:**
  - Contract address and type (Call/Put)
  - Underlying asset
  - Creation date and expiration
  - Strike price (conversion factor)
  - Premium amount
  - Current status (Listed, Owned, Expired, Margin Called)
  
- **Ownership History:**
  - Complete chain of ownership
  - Purchase and resell transactions
  - Transaction prices and dates
  - Slot numbers for verification
  
- **Settlement History:**
  - All daily settlements
  - Mark-to-market conversion factors
  - Buyer and seller margin levels
  - Settlement timestamps and validators

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
