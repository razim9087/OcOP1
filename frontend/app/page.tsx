'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePhantomWallet } from '@/lib/usePhantomWallet';

export default function HomePage() {
  const { connected } = usePhantomWallet();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
        <p className="text-gray-400 mt-4">Loading...</p>
      </div>
    );
  }

  return (
    <>
      {/* Background Image */}
      <div 
        className="fixed inset-0 z-[-1] bg-cover bg-center bg-no-repeat opacity-30"
        style={{
          backgroundImage: "url('/trading-chart-bg.jpg')",
          filter: "blur(3px)"
        }}
      />
      
      <div className="space-y-16">
        {/* Hero Section */}
        <div className="text-center space-y-6 py-12">
        <h1 className="text-6xl md:text-7xl font-bold">
          <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
            On-chain Options
          </span>
        </h1>
        <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
          Trade European-style options with daily settlements, margin management, and secure escrow on Solana
        </p>
        <div className="flex gap-4 justify-center flex-wrap pt-4">
          <Link
            href="/markets"
            className="px-8 py-4 rounded-lg font-semibold text-lg transition-all"
            style={{ backgroundColor: '#20B2AA' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a9a93'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#20B2AA'}
          >
            Browse Markets
          </Link>
          <Link
            href="/create"
            className="px-8 py-4 bg-gray-800 rounded-lg font-semibold text-lg hover:bg-gray-700 transition-all"
          >
            Create Contract
          </Link>
        </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          <FeatureCard
            icon="⚡"
            title="Daily Settlements"
            description="Automatic P&L calculations and margin adjustments based on daily price movements"
          />
          <FeatureCard
            icon="🔒"
            title="Secure Escrow"
            description="Margins locked in on-chain escrow with 20% margin call threshold protection"
          />
          <FeatureCard
            icon="🔄"
            title="Secondary Market"
            description="Resell your options to other traders before expiration"
          />
          <FeatureCard
            icon="📊"
            title="European Style"
            description="Exercise options only at expiration with predictable settlement"
          />
          <FeatureCard
            icon="💎"
            title="On-Chain Transparency"
            description="All contracts and settlements recorded on Solana blockchain"
          />
          <FeatureCard
            icon="🚀"
            title="Fast & Cheap"
            description="Leveraging Solana's speed and low transaction costs"
          />
        </div>

        {/* Stats Section */}
        <div className="bg-gradient-to-r from-purple-600/10 to-pink-600/10 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-8">
          <h2 className="text-3xl font-bold text-center mb-8 text-white">Platform Statistics</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <StatCard label="Network" value="Devnet" />
            <StatCard label="Margin Threshold" value="20%" />
            <StatCard label="Option Duration" value="30 Days" />
          </div>
        </div>

        {/* Contract Features */}
        <div className="bg-black/30 backdrop-blur-sm border border-gray-800 rounded-xl p-8 space-y-6">
          <h2 className="text-3xl font-bold text-white">Contract Features</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <FeatureItem
              title="Call & Put Options"
              description="Trade both call and put options on any underlying asset"
            />
            <FeatureItem
              title="Flexible Assets"
              description="Support for stocks, crypto, commodities - any asset with a USD price"
            />
            <FeatureItem
              title="Fair Price Discovery"
              description="Asset prices in SOL terms calculated using USD/SOL ratio"
            />
            <FeatureItem
              title="Automatic Expiry"
              description="Contracts automatically expire 30 days after initiation"
            />
            <FeatureItem
              title="Test Mode"
              description="Create test contracts with flexible dates for development"
            />
            <FeatureItem
              title="Transparent Fees"
              description="Only network fees - no hidden platform charges"
            />
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-12 text-center space-y-6">
          <h2 className="text-4xl font-bold text-white">Ready to Start Trading?</h2>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            {connected
              ? "Your wallet is connected. Start creating or trading options now!"
              : "Connect your Solana wallet to start trading European-style options"}
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/markets"
              className="px-8 py-4 rounded-lg font-semibold text-lg transition-all text-black"
              style={{ backgroundColor: '#20B2AA' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a9a93'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#20B2AA'}
            >
              View Markets
            </Link>
            <Link
              href="/portfolio"
              className="px-8 py-4 rounded-lg font-semibold text-lg transition-all text-black"
              style={{ backgroundColor: '#20B2AA' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a9a93'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#20B2AA'}
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-black/30 backdrop-blur-sm border border-gray-800 rounded-xl p-6 hover:border-purple-500 transition-all">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-bold text-white mb-2">{value}</div>
      <div className="text-gray-400">{label}</div>
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-black/30 backdrop-blur-sm border border-gray-800 rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-2xl font-bold">
          {number}
        </div>
        <h3 className="text-xl font-bold text-white">{title}</h3>
      </div>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}

function FeatureItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex gap-3">
      <div className="text-purple-400 mt-1">✓</div>
      <div>
        <h4 className="text-white font-semibold">{title}</h4>
        <p className="text-gray-400 text-sm">{description}</p>
      </div>
    </div>
  );
}
