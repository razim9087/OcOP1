'use client';

import { Suspense } from 'react';
import WalletLookup from '@/components/WalletLookup';

function LookupContent() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          Wallet Lookup
        </h1>
        <p className="text-gray-400 mt-2">
          Search any Solana wallet to view its transaction history and balance
        </p>
      </div>

      <Suspense fallback={
        <div className="bg-black/30 backdrop-blur-sm border border-gray-800 rounded-xl p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      }>
        <WalletLookup />
      </Suspense>

      <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-6">
        <h3 className="font-semibold text-blue-200 mb-3">💡 Tips:</h3>
        <ul className="text-sm text-blue-200 space-y-2">
          <li>• Enter any valid Solana public key (base58 encoded)</li>
          <li>• View transaction history for test wallets used in AAPL tests</li>
          <li>• Connected to local validator (http://localhost:8899)</li>
          <li>• Click on transaction signatures to view details in Solana Explorer</li>
          <li>• Press Enter to search after pasting an address</li>
        </ul>
      </div>

      <div className="bg-purple-500/10 border border-purple-500/50 rounded-lg p-6">
        <h3 className="font-semibold text-purple-200 mb-3">🧪 Test It:</h3>
        <div className="text-sm text-purple-200 space-y-2">
          <p>To get your test wallet address from AAPL tests, run:</p>
          <pre className="bg-black/50 p-3 rounded mt-2 overflow-x-auto">
            <code className="text-green-400">solana address</code>
          </pre>
          <p className="mt-2">Then paste it above to see all test transactions!</p>
        </div>
      </div>
    </div>
  );
}

export default function LookupPage() {
  return <LookupContent />;
}
