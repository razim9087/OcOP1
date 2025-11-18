'use client';

import { Connection, PublicKey } from '@solana/web3.js';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

interface Transaction {
  signature: string;
  timestamp: number | null;
  type: string;
  details?: string;
  status: string;
  fee: number;
  slot: number;
}

export default function WalletLookup() {
  const searchParams = useSearchParams();
  const [walletAddress, setWalletAddress] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rpcEndpoint, setRpcEndpoint] = useState('http://localhost:8899');

  useEffect(() => {
    try {
      const addressParam = searchParams.get('address');
      if (addressParam) {
        setWalletAddress(addressParam);
        // Auto-fetch if address is provided in URL
        const timer = setTimeout(() => {
          fetchWalletDataForAddress(addressParam);
        }, 100);
        return () => clearTimeout(timer);
      }
    } catch (error) {
      console.error('Error reading search params:', error);
    }
  }, [searchParams]);

  const fetchWalletDataForAddress = async (address: string) => {
    if (!address) {
      setError('Please enter a wallet address');
      return;
    }

    setLoading(true);
    setError('');
    setTransactions([]);
    setBalance(null);

    try {
      const publicKey = new PublicKey(address);
      const connection = new Connection(rpcEndpoint, 'confirmed');

      // Fetch balance
      const bal = await connection.getBalance(publicKey);
      setBalance(bal / 1e9);

      // Fetch transaction signatures
      const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 50 });

      // Parse transaction details
      const txDetails = await Promise.all(
        signatures.map(async (sig) => {
          const tx = await connection.getParsedTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
          });

          let type = 'Unknown';
          let details = '';
          
          if (tx?.meta?.logMessages) {
            const logs = tx.meta.logMessages;
            
            // Check for margin call in logs
            const hasMarginCall = logs.some(log => 
              log.toLowerCase().includes('margin') && log.toLowerCase().includes('call')
            );
            
            if (logs.some(log => log.includes('initialize_option'))) {
              type = 'Initialize Contract';
              // Extract underlying if possible
              const underlyingMatch = logs.find(log => log.includes('AAPL') || log.includes('SOL'));
              if (underlyingMatch) {
                details = 'AAPL/SOL Call Option';
              }
            } else if (logs.some(log => log.includes('purchase_option'))) {
              type = 'Purchase Option';
              details = 'With Margin Deposit';
            } else if (logs.some(log => log.includes('settlement_daily'))) {
              if (hasMarginCall) {
                type = 'Margin Call Settlement';
                details = 'Critical margin level';
              } else {
                type = 'Daily Settlement';
                details = 'Mark-to-Market';
              }
            } else if (logs.some(log => log.includes('resell_option'))) {
              type = 'Resell Option';
              details = 'Secondary Market';
            } else if (logs.some(log => log.includes('exercise_option'))) {
              type = 'Exercise Option';
              const expiryMatch = logs.find(log => log.toLowerCase().includes('expir'));
              details = expiryMatch ? 'At Expiration' : 'Early Exercise';
            } else if (logs.some(log => log.includes('delist_option'))) {
              type = 'Delist Option';
              details = 'Contract Removed';
            } else if (tx.transaction.message.instructions.length > 0) {
              type = 'Transfer';
              details = 'SOL Transfer';
            }
          }

          return {
            signature: sig.signature,
            timestamp: sig.blockTime || null,
            type,
            details,
            status: sig.err ? 'Failed' : 'Success',
            fee: (tx?.meta?.fee || 0) / 1e9,
            slot: sig.slot,
          };
        })
      );

      setTransactions(txDetails);
    } catch (err) {
      console.error('Error fetching wallet data:', err);
      if (err instanceof Error && err.message.includes('Failed to fetch')) {
        setError(`Cannot connect to RPC endpoint: ${rpcEndpoint}. Make sure the Solana validator is running.`);
      } else {
        setError('Invalid wallet address or connection error');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchWalletData = () => {
    fetchWalletDataForAddress(walletAddress);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      fetchWalletData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-black/30 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-white mb-4">🔍 Wallet Lookup</h2>
        <p className="text-gray-400 mb-4">Enter any Solana wallet address to view its transaction history</p>
        
        {/* RPC Endpoint Selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">RPC Endpoint</label>
          <select
            value={rpcEndpoint}
            onChange={(e) => setRpcEndpoint(e.target.value)}
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white"
          >
            <option value="http://localhost:8899">Local Validator (localhost:8899)</option>
            <option value="https://api.devnet.solana.com">Devnet</option>
            <option value="https://api.mainnet-beta.solana.com">Mainnet Beta</option>
          </select>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter wallet public key (e.g., 7xKXtg2CW87d9...)"
            className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-500"
          />
          <button
            onClick={fetchWalletData}
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : 'Search'}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
            <div className="font-semibold mb-1">❌ Error</div>
            <div className="text-sm">{error}</div>
            {error.includes('Cannot connect') && (
              <div className="mt-2 text-xs">
                💡 Tip: Start local validator with: <code className="bg-black/50 px-2 py-1 rounded">solana-test-validator</code>
              </div>
            )}
          </div>
        )}
      </div>

      {balance !== null && (
        <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6">
          <div className="text-sm text-gray-300 mb-2">Wallet Balance</div>
          <div className="text-4xl font-bold text-white">{balance.toFixed(4)} SOL</div>
          <div className="text-sm text-gray-400 mt-2">≈ ${(balance * 150).toFixed(2)} USD</div>
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="text-xs text-gray-400 break-all font-mono">{walletAddress}</div>
          </div>
        </div>
      )}

      {transactions.length > 0 && (
        <div className="bg-black/30 backdrop-blur-sm border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800">
            <h3 className="text-xl font-semibold text-white">Transaction History</h3>
            <p className="text-sm text-gray-400">Found {transactions.length} transactions</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Time</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Type</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Details</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Fee</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Signature</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {transactions.map((tx) => (
                  <tr key={tx.signature} className="hover:bg-gray-800/30">
                    <td className="px-6 py-4 text-gray-300 text-sm">
                      {tx.timestamp ? new Date(tx.timestamp * 1000).toLocaleString() : 'Pending'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        tx.type.includes('Initialize') ? 'bg-blue-500/20 text-blue-300' :
                        tx.type.includes('Purchase') ? 'bg-green-500/20 text-green-300' :
                        tx.type.includes('Daily Settlement') ? 'bg-yellow-500/20 text-yellow-300' :
                        tx.type.includes('Margin Call') ? 'bg-red-500/20 text-red-300' :
                        tx.type.includes('Resell') ? 'bg-orange-500/20 text-orange-300' :
                        tx.type.includes('Exercise') ? 'bg-pink-500/20 text-pink-300' :
                        tx.type.includes('Delist') ? 'bg-gray-500/20 text-gray-300' :
                        'bg-purple-500/20 text-purple-300'
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-sm">
                      {tx.details || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        tx.status === 'Success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-sm">
                      {tx.fee.toFixed(6)} SOL
                    </td>
                    <td className="px-6 py-4">
                      <a
                        href={
                          rpcEndpoint.includes('localhost')
                            ? `https://explorer.solana.com/tx/${tx.signature}?cluster=custom&customUrl=${rpcEndpoint}`
                            : rpcEndpoint.includes('devnet')
                            ? `https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`
                            : `https://explorer.solana.com/tx/${tx.signature}`
                        }
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
        </div>
      )}
    </div>
  );
}
