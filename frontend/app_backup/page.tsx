'use client';

import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import WalletBalance from '@/components/WalletBalance';

export default function Home() {
  const { connected } = useWallet();

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-6 py-20">
        <h1 className="text-6xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-green-400 bg-clip-text text-transparent">
          Solana Options Escrow
        </h1>
        <p className="text-xl text-gray-300 max-w-2xl mx-auto">
          Trade decentralized options contracts on Solana with automated margin management and daily settlements
        </p>
        <div className="flex gap-4 justify-center pt-4">
          <Link
            href="/markets"
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all"
          >
            Explore Markets
          </Link>
          <Link
            href="/create"
            className="px-8 py-3 border border-purple-500 rounded-lg font-semibold hover:bg-purple-500/10 transition-all"
          >
            Create Contract
          </Link>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        <FeatureCard
          icon="📊"
          title="Real-Time Settlements"
          description="Daily automatic settlements based on oracle price feeds"
        />
        <FeatureCard
          icon="🔒"
          title="Secure Escrow"
          description="Smart contract managed collateral and margin requirements"
        />
        <FeatureCard
          icon="💱"
          title="Secondary Market"
          description="Resell your options positions to other traders"
        />
      </div>

      {/* Stats Section */}
      <div className="grid md:grid-cols-4 gap-4 bg-black/30 rounded-xl p-8 backdrop-blur-sm border border-gray-800">
        <StatCard label="Total Volume" value="$1.2M" />
        <StatCard label="Active Contracts" value="156" />
        <StatCard label="Total Users" value="1,234" />
        <StatCard label="Avg. Premium" value="0.5 SOL" />
      </div>

      {/* How It Works */}
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-center bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          How It Works
        </h2>
        <div className="grid md:grid-cols-4 gap-4">
          <StepCard number="1" title="Connect Wallet" description="Link your Solana wallet" />
          <StepCard number="2" title="Browse Markets" description="Find options contracts" />
          <StepCard number="3" title="Buy or Sell" description="Trade with collateral" />
          <StepCard number="4" title="Manage Position" description="Track & settle daily" />
        </div>
      </div>

      {/* Wallet Info (Only shown when connected) */}
      {connected && (
        <div className="max-w-2xl mx-auto">
          <WalletBalance />
        </div>
      )}
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-black/30 rounded-xl p-6 backdrop-blur-sm border border-gray-800 hover:border-purple-500 transition-all">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2 text-white">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
        {value}
      </div>
      <div className="text-gray-400 text-sm mt-1">{label}</div>
    </div>
  );
}

function StepCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="text-center space-y-2">
      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center mx-auto text-xl font-bold">
        {number}
      </div>
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  );
}
