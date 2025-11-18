import { Program, BN, AnchorProvider } from '@coral-xyz/anchor';
import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { getProgram, deriveOptionPDA, solToLamports } from './anchor-client';

// Custom wallet type for Phantom
interface PhantomWallet {
  publicKey: PublicKey;
  signTransaction(tx: Transaction): Promise<Transaction>;
  signAllTransactions(txs: Transaction[]): Promise<Transaction[]>;
}

export interface OptionData {
  optionType: number;
  underlying: string;
  seller: PublicKey;
  initiationDate: BN;
  expiryDate: BN;
  status: any;
  price: BN;
  strike: BN;
  owner: PublicKey;
  bump: number;
  isTest: boolean;
  initialMargin: BN;
  sellerMargin: BN;
  buyerMargin: BN;
  lastSettlementDate: BN;
  lastSettlementPrice: BN;
}

// Initialize a new option contract
export async function initializeOption(
  connection: Connection,
  wallet: PhantomWallet,
  params: {
    optionType: number; // 0 = Call, 1 = Put
    underlying: string;
    initiationDate: number; // Unix timestamp
    price: number; // in SOL
    strike: number; // in SOL (asset/SOL ratio)
    initialMargin: number; // in SOL
    isTest: boolean;
    allowZeroMargin: boolean;
  }
) {
  const program = getProgram(connection, wallet);
  const [optionPDA] = deriveOptionPDA(wallet.publicKey, params.underlying);

  const tx = await program.methods
    .initializeOption(
      params.optionType,
      params.underlying,
      new BN(params.initiationDate),
      solToLamports(params.price),
      solToLamports(params.strike),
      solToLamports(params.initialMargin),
      params.isTest,
      params.allowZeroMargin
    )
    .accounts({
      option: optionPDA,
      seller: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return { signature: tx, optionPDA };
}

// Purchase an option contract
export async function purchaseOption(
  connection: Connection,
  wallet: PhantomWallet,
  optionPDA: PublicKey,
  sellerPubkey: PublicKey
) {
  const program = getProgram(connection, wallet);

  const tx = await program.methods
    .purchaseOption()
    .accounts({
      option: optionPDA,
      buyer: wallet.publicKey,
      seller: sellerPubkey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

// Perform daily settlement
export async function dailySettlement(
  connection: Connection,
  wallet: PhantomWallet,
  optionPDA: PublicKey,
  assetPriceUsd: number,
  solPriceUsd: number
) {
  const program = getProgram(connection, wallet);

  // Convert to 6 decimal format (e.g., $150.00 -> 150000000)
  const assetPrice = new BN(Math.floor(assetPriceUsd * 1_000_000));
  const solPrice = new BN(Math.floor(solPriceUsd * 1_000_000));

  const tx = await program.methods
    .dailySettlement(assetPrice, solPrice)
    .accounts({
      option: optionPDA,
      settler: wallet.publicKey,
    })
    .rpc();

  return tx;
}

// Exercise an option
export async function exerciseOption(
  connection: Connection,
  wallet: PhantomWallet,
  optionPDA: PublicKey,
  assetPriceUsd: number,
  solPriceUsd: number
) {
  const program = getProgram(connection, wallet);

  const assetPrice = new BN(Math.floor(assetPriceUsd * 1_000_000));
  const solPrice = new BN(Math.floor(solPriceUsd * 1_000_000));

  const tx = await program.methods
    .exerciseOption(assetPrice, solPrice)
    .accounts({
      option: optionPDA,
      owner: wallet.publicKey,
    })
    .rpc();

  return tx;
}

// Resell an option to a new buyer
export async function resellOption(
  connection: Connection,
  wallet: PhantomWallet,
  optionPDA: PublicKey,
  newBuyerPubkey: PublicKey,
  resellPrice: number // in SOL
) {
  const program = getProgram(connection, wallet);

  const tx = await program.methods
    .resellOption(solToLamports(resellPrice))
    .accounts({
      option: optionPDA,
      currentOwner: wallet.publicKey,
      newBuyer: newBuyerPubkey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

// Delist an option (seller only, before purchase)
export async function delistOption(
  connection: Connection,
  wallet: PhantomWallet,
  optionPDA: PublicKey
) {
  const program = getProgram(connection, wallet);

  const tx = await program.methods
    .delistOption()
    .accounts({
      option: optionPDA,
      seller: wallet.publicKey,
    })
    .rpc();

  return tx;
}

// Mark an option as expired
export async function expireOption(
  connection: Connection,
  wallet: PhantomWallet,
  optionPDA: PublicKey
) {
  const program = getProgram(connection, wallet);

  const tx = await program.methods
    .expireOption()
    .accounts({
      option: optionPDA,
    })
    .rpc();

  return tx;
}

// Fetch a single option contract
export async function fetchOption(
  connection: Connection,
  wallet: PhantomWallet,
  optionPDA: PublicKey
): Promise<OptionData | null> {
  try {
    const program = getProgram(connection, wallet) as any;
    const option = await program.account.optionContract.fetch(optionPDA);
    return option as OptionData;
  } catch (error) {
    console.error('Error fetching option:', error);
    return null;
  }
}

// Fetch all option contracts
export async function fetchAllOptions(
  connection: Connection,
  wallet: PhantomWallet
): Promise<{ pubkey: PublicKey; account: OptionData }[]> {
  try {
    const program = getProgram(connection, wallet) as any;
    const options = await program.account.optionContract.all();
    return options as { pubkey: PublicKey; account: OptionData }[];
  } catch (error) {
    console.error('Error fetching all options:', error);
    return [];
  }
}

// Fetch options by seller
export async function fetchOptionsBySeller(
  connection: Connection,
  wallet: PhantomWallet,
  sellerPubkey: PublicKey
): Promise<{ pubkey: PublicKey; account: OptionData }[]> {
  try {
    const program = getProgram(connection, wallet) as any;
    const options = await program.account.optionContract.all([
      {
        memcmp: {
          offset: 8 + 1 + 4 + 32, // discriminator + option_type + string length + string
          bytes: sellerPubkey.toBase58(),
        },
      },
    ]);
    return options as { pubkey: PublicKey; account: OptionData }[];
  } catch (error) {
    console.error('Error fetching options by seller:', error);
    return [];
  }
}

// Fetch options owned by wallet
export async function fetchOptionsByOwner(
  connection: Connection,
  wallet: PhantomWallet,
  ownerPubkey: PublicKey
): Promise<{ pubkey: PublicKey; account: OptionData }[]> {
  try {
    const program = getProgram(connection, wallet) as any;
    const options = await program.account.optionContract.all([
      {
        memcmp: {
          offset: 8 + 1 + 4 + 32 + 32 + 8 + 8 + 1 + 8 + 8, // to owner field
          bytes: ownerPubkey.toBase58(),
        },
      },
    ]);
    return options as { pubkey: PublicKey; account: OptionData }[];
  } catch (error) {
    console.error('Error fetching options by owner:', error);
    return [];
  }
}
