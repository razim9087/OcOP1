'use client';

import { useWallet } from '@solana/wallet-adapter-react';

export default function PortfolioPage() {
  const { connected, publicKey } = useWallet();

  // Mock data - replace with actual positions from blockchain
  const positions = [
    {
      id: '1',
      underlying: 'AAPL',
      type: 'Call',
      strike: '1.5 SOL',
      premium: '0.2 SOL',
      expiry: '2025-12-01',
      role: 'Buyer',
      currentMargin: '0.52 SOL',
      initialMargin: '0.5 SOL',
      pnl: '+0.02 SOL',
      status: 'Active',
    },
    {
      id: '2',
      underlying: 'TSLA',
      type: 'Put',
      strike: '2.0 SOL',
      premium: '0.3 SOL',
      expiry: '2025-11-25',
      role: 'Seller',
      currentMargin: '0.58 SOL',
      initialMargin: '0.6 SOL',
      pnl: '-0.02 SOL',
      status: 'Active',
    },
  ];

  if (!connected) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-yellow-200 mb-4">Wallet Not Connected</h2>
          <p className="text-yellow-200">Please connect your wallet to view your portfolio</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            My Portfolio
          </h1>
          <p className="text-gray-400 mt-2">
            Wallet: <span className="font-mono text-gray-300">{publicKey?.toBase58()}</span>
          </p>
        </div>
        <a
          href="/transactions"
          className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition-all flex items-center gap-2"
        >
          📜 View Transactions
        </a>
      </div>

      {/* Portfolio Summary */}
      <div className="grid md:grid-cols-4 gap-4">
        <SummaryCard label="Total Positions" value="2" trend="+1" />
        <SummaryCard label="Total Margin" value="1.10 SOL" trend="+5%" />
        <SummaryCard label="Unrealized P&L" value="+0.02 SOL" trend="+2%" positive />
        <SummaryCard label="Active Contracts" value="2" trend="0" />
      </div>

      {/* Positions Table */}
      <div className="bg-black/30 backdrop-blur-sm border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Asset</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Type</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Role</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Strike</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Premium</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Margin</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">P&L</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Expiry</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {positions.map((position) => (
                <tr key={position.id} className="hover:bg-gray-800/30">
                  <td className="px-6 py-4 text-white font-semibold">{position.underlying}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded text-sm ${
                        position.type === 'Call'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {position.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded text-sm ${
                        position.role === 'Buyer'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-purple-500/20 text-purple-400'
                      }`}
                    >
                      {position.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-300">{position.strike}</td>
                  <td className="px-6 py-4 text-gray-300">{position.premium}</td>
                  <td className="px-6 py-4">
                    <div className="text-gray-300">{position.currentMargin}</div>
                    <div className="text-xs text-gray-500">
                      Initial: {position.initialMargin}
                    </div>
                  </td>
                  <td
                    className={`px-6 py-4 font-semibold ${
                      position.pnl.startsWith('+') ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {position.pnl}
                  </td>
                  <td className="px-6 py-4 text-gray-300">{position.expiry}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button className="px-3 py-1 bg-purple-600 rounded hover:bg-purple-700 text-sm">
                        Settle
                      </button>
                      <button className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 text-sm">
                        Resell
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {positions.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-xl mb-2">No active positions</p>
          <p className="text-sm">Start trading options to see your portfolio here</p>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  trend,
  positive,
}: {
  label: string;
  value: string;
  trend: string;
  positive?: boolean;
}) {
  return (
    <div className="bg-black/30 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
      <div className="text-sm text-gray-400 mb-1">{label}</div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div
        className={`text-sm ${
          positive ? 'text-green-400' : trend.startsWith('+') ? 'text-green-400' : 'text-gray-400'
        }`}
      >
        {trend}
      </div>
    </div>
  );
}
