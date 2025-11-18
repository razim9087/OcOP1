'use client';

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

export default function WalletBalance() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (publicKey) {
      fetchBalance();
      // Refresh balance every 10 seconds
      const interval = setInterval(fetchBalance, 10000);
      return () => clearInterval(interval);
    }
  }, [publicKey]);

  const fetchBalance = async () => {
    if (!publicKey) return;

    setLoading(true);
    try {
      const bal = await connection.getBalance(publicKey);
      setBalance(bal / LAMPORTS_PER_SOL);
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!publicKey) return null;

  return (
    <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-sm text-gray-300 mb-2">Wallet Balance</div>
          <div className="text-4xl font-bold text-white">
            {loading ? (
              <span className="text-2xl">Loading...</span>
            ) : balance !== null ? (
              <>{balance.toFixed(4)} SOL</>
            ) : (
              <span className="text-2xl">-</span>
            )}
          </div>
          <div className="text-sm text-gray-400 mt-2">
            ≈ ${balance !== null ? (balance * 150).toFixed(2) : '0.00'} USD
          </div>
        </div>
        <button
          onClick={fetchBalance}
          className="p-2 bg-purple-600/50 rounded-lg hover:bg-purple-600 transition-all"
          disabled={loading}
        >
          🔄
        </button>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="text-xs text-gray-400 break-all font-mono">
          {publicKey.toBase58()}
        </div>
      </div>
    </div>
  );
}
