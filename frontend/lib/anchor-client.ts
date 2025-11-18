import { AnchorProvider, Program, Idl, BN } from '@coral-xyz/anchor';
import { Connection, PublicKey, SystemProgram, Transaction, VersionedTransaction } from '@solana/web3.js';
import idl from './idl/escrow.json';

const PROGRAM_ID = new PublicKey(idl.address);

// Custom wallet adapter for Phantom
class PhantomWalletAdapter {
  constructor(public publicKey: PublicKey, private phantomWallet: any) {}
  
  async signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T> {
    if (!this.phantomWallet || !this.phantomWallet.signTransaction) {
      throw new Error('Wallet not connected or does not support signing');
    }
    const signed = await this.phantomWallet.signTransaction(transaction);
    return signed as T;
  }
  
  async signAllTransactions<T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]> {
    if (!this.phantomWallet || !this.phantomWallet.signAllTransactions) {
      throw new Error('Wallet not connected or does not support signing');
    }
    const signed = await this.phantomWallet.signAllTransactions(transactions);
    return signed as T[];
  }
}

export function getProgram(connection: Connection, wallet: { publicKey: PublicKey; signTransaction: any; signAllTransactions?: any }) {
  const walletAdapter = new PhantomWalletAdapter(wallet.publicKey, wallet);
  const provider = new AnchorProvider(connection, walletAdapter as any, {
    commitment: 'confirmed',
  });

  return new Program(idl as Idl, provider);
}

export function getProgramId(): PublicKey {
  return PROGRAM_ID;
}

// Derive option PDA
export function deriveOptionPDA(seller: PublicKey, underlying: string): [PublicKey, number] {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('option'), seller.toBuffer(), Buffer.from(underlying)],
    PROGRAM_ID
  );
  return [pda, bump];
}

// Convert SOL to lamports
export function solToLamports(sol: number): BN {
  return new BN(sol * 1_000_000_000);
}

// Convert lamports to SOL
export function lamportsToSol(lamports: number | BN): number {
  const value = typeof lamports === 'number' ? lamports : lamports.toNumber();
  return value / 1_000_000_000;
}

// Format date for display
export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString();
}

// Get option status string
export function getStatusString(status: any): string {
  if (status.listed) return 'Listed';
  if (status.owned) return 'Owned';
  if (status.expired) return 'Expired';
  if (status.delisted) return 'Delisted';
  if (status.marginCalled) return 'Margin Called';
  return 'Unknown';
}

// Get option type string
export function getOptionTypeString(optionType: number): string {
  return optionType === 0 ? 'Call' : 'Put';
}

export { PROGRAM_ID };
