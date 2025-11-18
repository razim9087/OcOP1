'use client';

import { useEffect, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { usePhantomWallet } from '@/lib/usePhantomWallet';

// Copyable address component
function CopyableAddress({ address, label }: { address: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <span className="inline-flex items-center gap-1">
      {label && <span>{label}</span>}
      <span className="font-mono text-gray-300">{address.slice(0, 8)}...</span>
      <button
        onClick={handleCopy}
        className="text-xs px-1.5 py-0.5 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
        title={`Copy full address: ${address}`}
      >
        {copied ? '✓' : '📋'}
      </button>
    </span>
  );
}

interface Transaction {
  signature: string;
  timestamp: number;
  type: string;
  amount?: number;
  status: 'confirmed' | 'finalized' | 'failed';
  fee: number;
  blockTime: number;
}

// Example transaction data from contract history testing
const EXAMPLE_TRANSACTIONS: Transaction[] = [
  {
    signature: 'init_sig_302_example_data_contract_initialization',
    timestamp: new Date('2025-08-01T00:00:00.000Z').getTime() / 1000,
    type: 'Initialize Contract',
    amount: -1.005,
    status: 'finalized',
    fee: 0.000005,
    blockTime: new Date('2025-08-01T00:00:00.000Z').getTime() / 1000,
  },
  {
    signature: 'purchase_sig_303_buyer1_purchases_option',
    timestamp: new Date('2025-08-01T01:00:00.000Z').getTime() / 1000,
    type: 'Purchase Option',
    amount: 2.0,
    status: 'finalized',
    fee: 0.000005,
    blockTime: new Date('2025-08-01T01:00:00.000Z').getTime() / 1000,
  },
  {
    signature: 'settlement_sig_304_day4_margin_adjustment',
    timestamp: new Date('2025-08-05T00:00:00.000Z').getTime() / 1000,
    type: 'Daily Settlement',
    amount: 0,
    status: 'finalized',
    fee: 0.000005,
    blockTime: new Date('2025-08-05T00:00:00.000Z').getTime() / 1000,
  },
  {
    signature: 'settlement_sig_305_day9_buyer_gains',
    timestamp: new Date('2025-08-10T00:00:00.000Z').getTime() / 1000,
    type: 'Daily Settlement',
    amount: 0.008445945,
    status: 'finalized',
    fee: 0.000005,
    blockTime: new Date('2025-08-10T00:00:00.000Z').getTime() / 1000,
  },
  {
    signature: 'settlement_sig_306_day14_seller_gains',
    timestamp: new Date('2025-08-15T00:00:00.000Z').getTime() / 1000,
    type: 'Daily Settlement',
    amount: -0.021349171,
    status: 'finalized',
    fee: 0.000005,
    blockTime: new Date('2025-08-15T00:00:00.000Z').getTime() / 1000,
  },
  {
    signature: 'resell_sig_307_buyer2_profit_0_5sol',
    timestamp: new Date('2025-08-18T00:00:00.000Z').getTime() / 1000,
    type: 'Resell Option',
    amount: -2.5,
    status: 'finalized',
    fee: 0.000005,
    blockTime: new Date('2025-08-18T00:00:00.000Z').getTime() / 1000,
  },
  {
    signature: 'settlement_sig_310_day19_minor_adjustment',
    timestamp: new Date('2025-08-20T00:00:00.000Z').getTime() / 1000,
    type: 'Daily Settlement',
    amount: 0.009677419,
    status: 'finalized',
    fee: 0.000005,
    blockTime: new Date('2025-08-20T00:00:00.000Z').getTime() / 1000,
  },
  {
    signature: 'resell_sig_311_buyer3_profit_0_5sol',
    timestamp: new Date('2025-08-22T00:00:00.000Z').getTime() / 1000,
    type: 'Resell Option',
    amount: -3.0,
    status: 'finalized',
    fee: 0.000005,
    blockTime: new Date('2025-08-22T00:00:00.000Z').getTime() / 1000,
  },
  {
    signature: 'settlement_sig_314_day23_price_drop',
    timestamp: new Date('2025-08-24T00:00:00.000Z').getTime() / 1000,
    type: 'Daily Settlement',
    amount: -0.006267864,
    status: 'finalized',
    fee: 0.000005,
    blockTime: new Date('2025-08-24T00:00:00.000Z').getTime() / 1000,
  },
  {
    signature: 'resell_sig_315_buyer4_loss_0_2sol',
    timestamp: new Date('2025-08-26T00:00:00.000Z').getTime() / 1000,
    type: 'Resell Option',
    amount: -2.8,
    status: 'finalized',
    fee: 0.000005,
    blockTime: new Date('2025-08-26T00:00:00.000Z').getTime() / 1000,
  },
  {
    signature: 'settlement_sig_318_day27_continued_adjustment',
    timestamp: new Date('2025-08-28T00:00:00.000Z').getTime() / 1000,
    type: 'Daily Settlement',
    amount: -0.003006329,
    status: 'finalized',
    fee: 0.000005,
    blockTime: new Date('2025-08-28T00:00:00.000Z').getTime() / 1000,
  },
  {
    signature: 'resell_sig_319_buyer5_profit_0_7sol',
    timestamp: new Date('2025-08-29T00:00:00.000Z').getTime() / 1000,
    type: 'Resell Option',
    amount: -3.5,
    status: 'finalized',
    fee: 0.000005,
    blockTime: new Date('2025-08-29T00:00:00.000Z').getTime() / 1000,
  },
  {
    signature: 'settlement_sig_322_day30_final_settlement',
    timestamp: new Date('2025-08-31T00:00:00.000Z').getTime() / 1000,
    type: 'Daily Settlement',
    amount: -0.032954546,
    status: 'finalized',
    fee: 0.000005,
    blockTime: new Date('2025-08-31T00:00:00.000Z').getTime() / 1000,
  },
  {
    signature: 'exercise_sig_323_final_exercise_in_money',
    timestamp: new Date('2025-08-31T23:59:59.000Z').getTime() / 1000,
    type: 'Exercise Option',
    amount: 0.954545454,
    status: 'finalized',
    fee: 0.000005,
    blockTime: new Date('2025-08-31T23:59:59.000Z').getTime() / 1000,
  },
];

export default function TransactionHistoryPage() {
  const { publicKey, connected, connection } = usePhantomWallet();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showingExample, setShowingExample] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && connected && publicKey) {
      fetchTransactions();
      fetchBalance();
      setShowingExample(false);
    }
  }, [mounted, connected, publicKey]);

  const loadExampleData = () => {
    setTransactions(EXAMPLE_TRANSACTIONS);
    setBalance(5.8234); // Example balance
    setShowingExample(true);
    setLoading(false);
  };

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
            const logs = tx.meta.logMessages.join(' ');
            if (logs.includes('InitializeOption') || logs.includes('initialize_option')) {
              type = 'Initialize Contract';
            } else if (logs.includes('PurchaseOption') || logs.includes('purchase_option')) {
              type = 'Purchase Option';
            } else if (logs.includes('DailySettlement') || logs.includes('daily_settlement')) {
              type = 'Daily Settlement';
            } else if (logs.includes('ResellOption') || logs.includes('resell_option')) {
              type = 'Resell Option';
            } else if (logs.includes('ExerciseOption') || logs.includes('exercise_option')) {
              type = 'Exercise Option';
            } else if (logs.includes('DelistOption') || logs.includes('delist_option')) {
              type = 'Delist Option';
            } else if (logs.includes('ExpireOption') || logs.includes('expire_option')) {
              type = 'Expire Option';
            } else if (tx.transaction.message.instructions.length > 0) {
              type = 'Transaction';
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

  if (!mounted) {
    return (
      <>
        <div className="transactions-page-bg"></div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading...</p>
        </div>
      </>
    );
  }

  if (!connected && !showingExample) {
    return (
      <>
        <div className="transactions-page-bg"></div>
        <div className="max-w-6xl mx-auto">
          <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-yellow-200 mb-4">Wallet Not Connected</h2>
            <p className="text-yellow-200 mb-6">Please connect your wallet to view transaction history</p>
            <button
              onClick={loadExampleData}
              className="px-6 py-3 rounded-lg font-semibold transition-all text-black"
              style={{ backgroundColor: '#20B2AA' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a9a93'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#20B2AA'}
          >
            📋 View Example Data
          </button>
        </div>
      </div>
      </>
    );
  }

  // Show example data when not connected instead of blocking
  const displayTransactions = showingExample ? transactions : transactions;
  const displayBalance = showingExample ? balance : balance;

  return (
    <>
      <div className="transactions-page-bg"></div>
      <div className="space-y-8">
      {showingExample && (
        <div className="p-4 bg-blue-500/10 border border-blue-500/50 rounded-lg">
          <p className="text-blue-200 text-sm">
            <strong>📋 Showing Example Transaction History</strong><br />
            This is demonstration data showing a complete AAPL/SOL Call Option contract lifecycle. Connect your wallet to view your real transactions.
          </p>
        </div>
      )}

      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Transaction History
          </h1>
          <p className="text-gray-400 mt-2 text-sm">
            {showingExample ? (
              <span>Example Wallet: <CopyableAddress address="DK1kvyYgjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj" /></span>
            ) : (
              publicKey && <span>Wallet: <CopyableAddress address={publicKey.toBase58()} /></span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {connected && (
            <button
              onClick={() => {
                fetchTransactions();
                fetchBalance();
              }}
              className="px-4 py-2 rounded-lg transition-all text-black"
              style={{ backgroundColor: '#20B2AA' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a9a93'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#20B2AA'}
            >
              🔄 Refresh
            </button>
          )}
          <button
            onClick={loadExampleData}
            className="px-4 py-2 rounded-lg transition-all text-black"
            style={{ backgroundColor: '#20B2AA' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a9a93'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#20B2AA'}
          >
            📋 Example
          </button>
        </div>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6">
        <div className="text-sm text-gray-300 mb-2">
          {showingExample ? 'Example Balance' : 'Current Balance'}
        </div>
        <div className="text-4xl font-bold text-white">
          {displayBalance !== null ? `${displayBalance.toFixed(4)} SOL` : 'Loading...'}
        </div>
        <div className="text-sm text-gray-400 mt-2">
          ≈ ${displayBalance !== null ? (displayBalance * 150).toFixed(2) : '0.00'} USD
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
        ) : displayTransactions.length === 0 ? (
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
                {displayTransactions.map((tx) => (
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
                      {showingExample ? (
                        <span className="text-purple-400 font-mono text-xs">
                          {tx.signature.slice(0, 8)}...
                        </span>
                      ) : (
                        <a
                          href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-400 hover:text-purple-300 font-mono text-xs"
                        >
                          {tx.signature.slice(0, 8)}...{tx.signature.slice(-8)}
                        </a>
                      )}
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
          value={displayTransactions.length.toString()} 
        />
        <StatCard 
          label="Total Fees Paid" 
          value={`${displayTransactions.reduce((sum, tx) => sum + tx.fee, 0).toFixed(6)} SOL`} 
        />
        <StatCard 
          label="Net Change" 
          value={`${displayTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0).toFixed(6)} SOL`}
          colored
        />
      </div>

      {showingExample && (
        <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-3">📊 Example Data Summary</h3>
          <div className="space-y-2 text-sm text-gray-300">
            <p>• <strong>Contract:</strong> AAPL/SOL Call Option (Strike: 1.5 SOL)</p>
            <p>• <strong>Lifecycle:</strong> 30 days (Aug 1-31, 2025)</p>
            <p>• <strong>Ownership Chain:</strong> 5 transfers with varying profits/losses</p>
            <p>• <strong>Settlements:</strong> 6 daily margin adjustments based on price movements</p>
            <p>• <strong>Final Status:</strong> Exercised "IN THE MONEY" by final owner</p>
            <p className="text-xs text-gray-400 mt-3 italic">
              This example demonstrates the complete flow of an option contract including creation, 
              multiple resales, daily settlements, and exercise at expiration.
            </p>
          </div>
        </div>
      )}
      </div>
    </>
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
