'use client';

import { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';

export default function MarketsPage() {
  const { connected } = useWallet();
  const [filter, setFilter] = useState<'all' | 'call' | 'put'>('all');

  // Mock data - replace with actual contract data from blockchain
  const contracts = [
    {
      id: '1',
      underlying: 'AAPL',
      type: 'Call',
      strike: '1.5 SOL',
      premium: '0.2 SOL',
      expiry: '2025-12-01',
      seller: '7xKXtg2CW87d9...',
      status: 'Available',
      margin: '0.5 SOL',
    },
    {
      id: '2',
      underlying: 'TSLA',
      type: 'Put',
      strike: '2.0 SOL',
      premium: '0.3 SOL',
      expiry: '2025-11-25',
      seller: '9yHZgh3FX92k1...',
      status: 'Available',
      margin: '0.6 SOL',
    },
    {
      id: '3',
      underlying: 'BTC',
      type: 'Call',
      strike: '500 SOL',
      premium: '5 SOL',
      expiry: '2025-12-15',
      seller: '4aKMpo5DY78q2...',
      status: 'Sold',
      margin: '50 SOL',
    },
  ];

  const filteredContracts = contracts.filter(
    (c) => filter === 'all' || c.type.toLowerCase() === filter
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          Options Markets
        </h1>
        <div className="flex gap-2">
          <FilterButton
            label="All"
            active={filter === 'all'}
            onClick={() => setFilter('all')}
          />
          <FilterButton
            label="Calls"
            active={filter === 'call'}
            onClick={() => setFilter('call')}
          />
          <FilterButton
            label="Puts"
            active={filter === 'put'}
            onClick={() => setFilter('put')}
          />
        </div>
      </div>

      {!connected ? (
        <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-6 text-center">
          <p className="text-yellow-200">Please connect your wallet to view and trade options</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredContracts.map((contract) => (
            <ContractCard key={contract.id} contract={contract} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition-all ${
        active
          ? 'bg-gradient-to-r from-purple-600 to-pink-600'
          : 'bg-gray-800 hover:bg-gray-700'
      }`}
    >
      {label}
    </button>
  );
}

function ContractCard({ contract }: { contract: any }) {
  const isCall = contract.type === 'Call';
  const isAvailable = contract.status === 'Available';

  return (
    <div className="bg-black/30 backdrop-blur-sm border border-gray-800 rounded-xl p-6 hover:border-purple-500 transition-all">
      <div className="flex justify-between items-start">
        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-3">
            <h3 className="text-2xl font-bold text-white">{contract.underlying}</h3>
            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold ${
                isCall ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}
            >
              {contract.type}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-sm ${
                isAvailable ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'
              }`}
            >
              {contract.status}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-400">Strike Price</div>
              <div className="text-white font-semibold">{contract.strike}</div>
            </div>
            <div>
              <div className="text-gray-400">Premium</div>
              <div className="text-white font-semibold">{contract.premium}</div>
            </div>
            <div>
              <div className="text-gray-400">Expiry</div>
              <div className="text-white font-semibold">{contract.expiry}</div>
            </div>
            <div>
              <div className="text-gray-400">Margin Required</div>
              <div className="text-white font-semibold">{contract.margin}</div>
            </div>
          </div>

          <div className="text-sm text-gray-400">
            Seller: <span className="text-gray-300 font-mono">{contract.seller}</span>
          </div>
        </div>

        <div className="ml-6">
          {isAvailable ? (
            <button className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all">
              Buy Option
            </button>
          ) : (
            <button className="px-6 py-2 bg-gray-700 rounded-lg font-semibold cursor-not-allowed" disabled>
              Sold Out
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
