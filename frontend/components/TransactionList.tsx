'use client';

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';

interface TransactionInfo {
  signature: string;
  slot: number;
  timestamp: number | null;
  type: string;
  success: boolean;
}

export default function TransactionList() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [transactions, setTransactions] = useState<TransactionInfo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (publicKey) {
      loadTransactions();
    }
  }, [publicKey]);

  const loadTransactions = async () => {
    if (!publicKey) return;

    setLoading(true);
    try {
      const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 20 });
      
      const txInfos: TransactionInfo[] = signatures.map(sig => ({
        signature: sig.signature,
        slot: sig.slot,
        timestamp: sig.blockTime,
        type: determineTransactionType(sig.memo || ''),
        success: !sig.err,
      }));

      setTransactions(txInfos);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const determineTransactionType = (memo: string): string => {
    if (memo.includes('initialize')) return 'Initialize Contract';
    if (memo.includes('purchase')) return 'Purchase Option';
    if (memo.includes('settlement')) return 'Daily Settlement';
    if (memo.includes('resell')) return 'Resell Option';
    if (memo.includes('exercise')) return 'Exercise Option';
    return 'Transaction';
  };

  if (loading) {
    return <div className="text-gray-400">Loading transactions...</div>;
  }

  if (transactions.length === 0) {
    return <div className="text-gray-400">No transactions found</div>;
  }

  return (
    <div className="space-y-2">
      {transactions.map((tx) => (
        <div
          key={tx.signature}
          className="p-4 bg-gray-800/30 rounded-lg border border-gray-700 hover:border-purple-500 transition-all"
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="font-semibold text-white">{tx.type}</div>
              <div className="text-sm text-gray-400 font-mono">
                {tx.signature.slice(0, 8)}...{tx.signature.slice(-8)}
              </div>
            </div>
            <div className="text-right">
              <div className={`text-sm px-2 py-1 rounded ${
                tx.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {tx.success ? 'Success' : 'Failed'}
              </div>
              {tx.timestamp && (
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(tx.timestamp * 1000).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
