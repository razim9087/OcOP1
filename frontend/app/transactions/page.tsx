'use client';

import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { PublicKey } from '@solana/web3.js';

interface Transaction {
  signature: string;
  timestamp: number;
  type: string;
  amount?: number;
  status: 'confirmed' | 'finalized' | 'failed';
  fee: number;
  blockTime: number;
}

export default function TransactionHistoryPage() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (connected && publicKey) {
      fetchTransactions();
      fetchBalance();
    }
  }, [connected, publicKey]);

  const fetchBalance = async () => {
    if (!publicKey) return;
    try {
      const bal = await connection.getBalance(publicKey);
      setBalance(bal / 1e9); // Convert lamports to SOL
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const fetchTransactions = async () => {
    if (!publicKey) return;
    
    setLoading(true);
    try {
      const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 50 });
      
      const txDetails = await Promise.all(
        signatures.map(async (sig) => {
          const tx = await connection.getParsedTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
          });
          
          if (!tx) return null;
          
          // Parse transaction type from instructions
          let type = 'Unknown';
          let amount = 0;
          
          if (tx.meta?.logMessages) {
            if (tx.meta.logMessages.some(log => log.includes('initialize_option'))) {
              type = 'Initialize Contract';
            } else if (tx.meta.logMessages.some(log => log.includes('purchase_option'))) {
              type = 'Purchase Option';
            } else if (tx.meta.logMessages.some(log => log.includes('settlement_daily'))) {
              type = 'Daily Settlement';
            } else if (tx.meta.logMessages.some(log => log.includes('resell_option'))) {
              type = 'Resell Option';
            } else if (tx.meta.logMessages.some(log => log.includes('exercise_option'))) {
              type = 'Exercise Option';
            } else if (tx.meta.logMessages.some(log => log.includes('delist_option'))) {
              type = 'Delist Option';
            } else if (tx.transaction.message.instructions.length > 0) {
              type = 'Transfer';
            }
          }
          
          // Calculate amount from balance changes
          if (tx.meta?.preBalances && tx.meta?.postBalances) {
            const accountIndex = tx.transaction.message.accountKeys.findIndex(
              key => key.pubkey.equals(publicKey)
            );
            if (accountIndex >= 0) {
              const preBalance = tx.meta.preBalances[accountIndex];
              const postBalance = tx.meta.postBalances[accountIndex];
              amount = (postBalance - preBalance) / 1e9;
            }
          }
          
          return {
            signature: sig.signature,
            timestamp: sig.blockTime || Date.now() / 1000,
            type,
            amount,
            status: sig.confirmationStatus || 'confirmed',
            fee: (tx.meta?.fee || 0) / 1e9,
            blockTime: sig.blockTime || 0,
          };
        })
      );
      
      const filtered = txDetails.filter((tx): tx is Transaction => tx !== null);
      setTransactions(filtered);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!connected) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-yellow-200 mb-4">Wallet Not Connected</h2>
          <p className="text-yellow-200">Please connect your wallet to view transaction history</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Transaction History
          </h1>
          <p className="text-gray-400 mt-2 font-mono text-sm">
            {publicKey?.toBase58()}
          </p>
        </div>
        <button
          onClick={() => {
            fetchTransactions();
            fetchBalance();
          }}
          className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition-all"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6">
        <div className="text-sm text-gray-300 mb-2">Current Balance</div>
        <div className="text-4xl font-bold text-white">
          {balance !== null ? `${balance.toFixed(4)} SOL` : 'Loading...'}
        </div>
        <div className="text-sm text-gray-400 mt-2">
          ≈ ${balance !== null ? (balance * 150).toFixed(2) : '0.00'} USD
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-black/30 backdrop-blur-sm border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800">
          <h2 className="text-xl font-semibold text-white">Recent Transactions</h2>
          <p className="text-sm text-gray-400">Last 50 transactions</p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            Loading transactions...
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-xl mb-2">No transactions found</p>
            <p className="text-sm">Your transaction history will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Time</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Type</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Amount</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Fee</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Signature</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {transactions.map((tx) => (
                  <tr key={tx.signature} className="hover:bg-gray-800/30">
                    <td className="px-6 py-4 text-gray-300 text-sm">
                      {new Date(tx.timestamp * 1000).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-sm bg-purple-500/20 text-purple-300">
                        {tx.type}
                      </span>
                    </td>
                    <td className={`px-6 py-4 font-semibold ${
                      tx.amount && tx.amount > 0 ? 'text-green-400' : tx.amount && tx.amount < 0 ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {tx.amount ? `${tx.amount > 0 ? '+' : ''}${tx.amount.toFixed(6)} SOL` : '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-sm">
                      {tx.fee.toFixed(6)} SOL
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        tx.status === 'finalized' ? 'bg-green-500/20 text-green-400' :
                        tx.status === 'confirmed' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <a
                        href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 font-mono text-xs"
                      >
                        {tx.signature.slice(0, 8)}...{tx.signature.slice(-8)}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <StatCard 
          label="Total Transactions" 
          value={transactions.length.toString()} 
        />
        <StatCard 
          label="Total Fees Paid" 
          value={`${transactions.reduce((sum, tx) => sum + tx.fee, 0).toFixed(6)} SOL`} 
        />
        <StatCard 
          label="Net Change" 
          value={`${transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0).toFixed(6)} SOL`}
          colored
        />
      </div>
    </div>
  );
}

function StatCard({ label, value, colored }: { label: string; value: string; colored?: boolean }) {
  const isPositive = colored && parseFloat(value) > 0;
  const isNegative = colored && parseFloat(value) < 0;
  
  return (
    <div className="bg-black/30 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
      <div className="text-sm text-gray-400 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${
        colored ? (isPositive ? 'text-green-400' : isNegative ? 'text-red-400' : 'text-white') : 'text-white'
      }`}>
        {value}
      </div>
    </div>
  );
}
