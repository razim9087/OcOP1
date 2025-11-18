'use client';

import { useState, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
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
import {
  fetchAllOptions,
  fetchOptionsBySeller,
  fetchOptionsByOwner,
  dailySettlement,
  exerciseOption,
  delistOption,
  type OptionData
} from '@/lib/contract-operations';
import {
  lamportsToSol,
  formatDate,
  getStatusString,
  getOptionTypeString
} from '@/lib/anchor-client';

// Example portfolio data
const EXAMPLE_PORTFOLIO_DATA = [
  {
    pubkey: new PublicKey('53NKEBZLkFpB7dBRtHi54FQkAdMKT8uLGCumEPseffTQ'),
    role: 'owner' as const,
    account: {
      optionType: 0,
      underlying: 'AAPL/SOL',
      seller: new PublicKey('5MDTbGuRjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj'),
      initiationDate: new BN(1722470400),
      expiryDate: new BN(1725062399),
      status: { owned: {} },
      price: new BN(2000000000),
      strike: new BN(1500000000),
      owner: new PublicKey('DK1kvyYgjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj'),
      bump: 1,
      isTest: true,
      initialMargin: new BN(1000000000),
      sellerMargin: new BN(1045454546),
      buyerMargin: new BN(954545454),
      lastSettlementDate: new BN(1725148800),
      lastSettlementPrice: new BN(1455000000)
    }
  },
  {
    pubkey: new PublicKey('7xNKEBZLkFpB7dBRtHi54FQkAdMKT8uLGCumEPaeffYY'),
    role: 'seller' as const,
    account: {
      optionType: 1,
      underlying: 'TSLA/SOL',
      seller: new PublicKey('DK1kvyYgjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj'),
      initiationDate: new BN(1722384000),
      expiryDate: new BN(1724976000),
      status: { listed: {} },
      price: new BN(1500000000),
      strike: new BN(2000000000),
      owner: new PublicKey('11111111111111111111111111111111'),
      bump: 1,
      isTest: true,
      initialMargin: new BN(800000000),
      sellerMargin: new BN(850000000),
      buyerMargin: new BN(0),
      lastSettlementDate: new BN(0),
      lastSettlementPrice: new BN(0)
    }
  },
  {
    pubkey: new PublicKey('9zMKEBZLkFpB7dBRtHi54FQkAdMKT8uLGCumEPbeffZZ'),
    role: 'owner' as const,
    account: {
      optionType: 0,
      underlying: 'BTC/SOL',
      seller: new PublicKey('CnmedVctjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj'),
      initiationDate: new BN(1722211200),
      expiryDate: new BN(1724803200),
      status: { owned: {} },
      price: new BN(3000000000),
      strike: new BN(2500000000),
      owner: new PublicKey('DK1kvyYgjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj'),
      bump: 1,
      isTest: true,
      initialMargin: new BN(1500000000),
      sellerMargin: new BN(1620000000),
      buyerMargin: new BN(1380000000),
      lastSettlementDate: new BN(1723420800),
      lastSettlementPrice: new BN(2450000000)
    }
  }
];

export default function PortfolioPage() {
  const { connected, publicKey, connection, wallet } = usePhantomWallet();
  const [positions, setPositions] = useState<{
    pubkey: PublicKey;
    account: OptionData;
    role: 'seller' | 'owner';
  }[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [settlementPrices, setSettlementPrices] = useState<{
    [key: string]: { assetPrice: string; solPrice: string };
  }>({});
  const [mounted, setMounted] = useState(false);
  const [showingExample, setShowingExample] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && connected && wallet && publicKey) {
      loadPortfolio();
      setShowingExample(false);
    }
  }, [mounted, connected, wallet, publicKey]);

  const loadExampleData = () => {
    setPositions(EXAMPLE_PORTFOLIO_DATA);
    setShowingExample(true);
    setLoading(false);
    setStatus(null);
  };

  const loadPortfolio = async () => {
    if (!wallet || !publicKey) return;

    setLoading(true);
    setShowingExample(false);
    try {
      // Fetch options where user is seller
      const sellerOptions = await fetchOptionsBySeller(connection, wallet as any, publicKey);
      const ownerOptions = await fetchOptionsByOwner(connection, wallet as any, publicKey);

      // Combine and mark roles
      const allPositions = [
        ...sellerOptions.map(opt => ({ ...opt, role: 'seller' as const })),
        ...ownerOptions.map(opt => ({ ...opt, role: 'owner' as const }))
      ];

      setPositions(allPositions);
    } catch (error) {
      console.error('Error loading portfolio:', error);
      setStatus({ type: 'error', message: 'Failed to load portfolio' });
    } finally {
      setLoading(false);
    }
  };

  const handleSettlement = async (optionPDA: PublicKey) => {
    if (!wallet) return;

    const key = optionPDA.toString();
    const prices = settlementPrices[key];

    if (!prices || !prices.assetPrice || !prices.solPrice) {
      setStatus({ type: 'error', message: 'Please enter both asset and SOL prices' });
      return;
    }

    setProcessing(key);
    setStatus(null);

    try {
      const signature = await dailySettlement(
        connection,
        wallet as any,
        optionPDA,
        parseFloat(prices.assetPrice),
        parseFloat(prices.solPrice)
      );

      setStatus({
        type: 'success',
        message: `Settlement successful! Signature: ${signature.slice(0, 8)}...`
      });

      await loadPortfolio();
    } catch (error: any) {
      console.error('Error settling:', error);
      
      let errorMessage = 'Settlement failed';
      
      // Check if user rejected the transaction
      if (error.message?.includes('User rejected') || error.message?.includes('rejected the request')) {
        errorMessage = 'Transaction cancelled by user';
      }
      // Check for insufficient SOL balance
      else if (
        error.message?.includes('Attempt to debit an account') || 
        error.message?.includes('insufficient funds') ||
        error.message?.includes('insufficient lamports')
      ) {
        errorMessage = '⚠️ Not enough SOL for settlement. Please add more SOL to your wallet.';
        alert('❌ Insufficient SOL Balance\n\nYou do not have enough SOL for margin adjustment.\n\nPlease add more SOL to your wallet and try again.');
      } else {
        errorMessage = error.message || errorMessage;
      }
      
      setStatus({ type: 'error', message: errorMessage });
    } finally {
      // Always re-enable the button
      setProcessing(null);
    }
  };

  const handleExercise = async (optionPDA: PublicKey) => {
    if (!wallet) return;

    const key = optionPDA.toString();
    const prices = settlementPrices[key];

    if (!prices || !prices.assetPrice || !prices.solPrice) {
      setStatus({ type: 'error', message: 'Please enter both asset and SOL prices' });
      return;
    }

    setProcessing(key);
    setStatus(null);

    try {
      const signature = await exerciseOption(
        connection,
        wallet as any,
        optionPDA,
        parseFloat(prices.assetPrice),
        parseFloat(prices.solPrice)
      );

      setStatus({
        type: 'success',
        message: `Option exercised successfully! Signature: ${signature.slice(0, 8)}...`
      });

      await loadPortfolio();
    } catch (error: any) {
      console.error('Error exercising:', error);
      
      let errorMessage = 'Exercise failed';
      
      // Check if user rejected the transaction
      if (error.message?.includes('User rejected') || error.message?.includes('rejected the request')) {
        errorMessage = 'Transaction cancelled by user';
      }
      // Check for insufficient SOL balance
      else if (
        error.message?.includes('Attempt to debit an account') || 
        error.message?.includes('insufficient funds') ||
        error.message?.includes('insufficient lamports')
      ) {
        errorMessage = '⚠️ Not enough SOL to exercise option. Please add more SOL to your wallet.';
        alert('❌ Insufficient SOL Balance\n\nYou do not have enough SOL to exercise this option.\n\nPlease add more SOL to your wallet and try again.');
      } else {
        errorMessage = error.message || errorMessage;
      }
      
      setStatus({ type: 'error', message: errorMessage });
    } finally {
      // Always re-enable the button
      setProcessing(null);
    }
  };

  const handleDelist = async (optionPDA: PublicKey) => {
    if (!wallet) return;

    setProcessing(optionPDA.toString());
    setStatus(null);

    try {
      const signature = await delistOption(connection, wallet as any, optionPDA);
      setStatus({
        type: 'success',
        message: `Option delisted successfully! Signature: ${signature.slice(0, 8)}...`
      });

      await loadPortfolio();
    } catch (error: any) {
      console.error('Error delisting:', error);
      
      let errorMessage = 'Delist failed';
      
      // Check if user rejected the transaction
      if (error.message?.includes('User rejected') || error.message?.includes('rejected the request')) {
        errorMessage = 'Transaction cancelled by user';
      }
      // Check for insufficient SOL balance
      else if (
        error.message?.includes('Attempt to debit an account') || 
        error.message?.includes('insufficient funds') ||
        error.message?.includes('insufficient lamports')
      ) {
        errorMessage = '⚠️ Not enough SOL to delist option. Please add more SOL to your wallet.';
        alert('❌ Insufficient SOL Balance\n\nYou do not have enough SOL for transaction fees.\n\nPlease add more SOL to your wallet and try again.');
      } else {
        errorMessage = error.message || errorMessage;
      }
      
      setStatus({ type: 'error', message: errorMessage });
    } finally {
      // Always re-enable the button
      setProcessing(null);
    }
  };

  const updateSettlementPrice = (key: string, field: 'assetPrice' | 'solPrice', value: string) => {
    setSettlementPrices(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value
      }
    }));
  };

  // Calculate summary stats
  const totalMargin = positions.reduce((sum, pos) => {
    const margin = pos.role === 'seller' 
      ? lamportsToSol(pos.account.sellerMargin)
      : lamportsToSol(pos.account.buyerMargin);
    return sum + margin;
  }, 0);

  const totalInitialMargin = positions.reduce((sum, pos) => 
    sum + lamportsToSol(pos.account.initialMargin), 0
  );

  const totalPnL = totalMargin - totalInitialMargin;
  const activeContracts = positions.filter(p => p.account.status.owned).length;

  if (!mounted) {
    return (
      <>
        <div className="portfolio-page-bg"></div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading...</p>
        </div>
      </>
    );
  }

  if (!connected) {
    return (
      <>
        <div className="portfolio-page-bg"></div>
        <div className="max-w-6xl mx-auto">
          <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-yellow-200 mb-4">Wallet Not Connected</h2>
            <p className="text-yellow-200">Please connect your wallet to view your portfolio</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="portfolio-page-bg"></div>
      <div className="space-y-8">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            My Portfolio
          </h1>
          <p className="text-gray-400 mt-2">
            Wallet: {publicKey && <CopyableAddress address={publicKey.toString()} />}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadExampleData}
            className="px-4 py-2 rounded-lg transition-all text-black"
            style={{ backgroundColor: '#20B2AA' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a9a93'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#20B2AA'}
          >
            📋 Example
          </button>
          <button
            onClick={loadPortfolio}
            className="px-4 py-2 rounded-lg transition-all text-black"
            disabled={loading}
            style={{ backgroundColor: loading ? '#666' : '#20B2AA' }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#1a9a93')}
            onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#20B2AA')}
          >
            {loading ? 'Loading...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {status && (
        <div className={`rounded-lg p-4 ${status.type === 'success' ? 'bg-green-500/10 border border-green-500/50' : 'bg-red-500/10 border border-red-500/50'}`}>
          <p className={status.type === 'success' ? 'text-green-200' : 'text-red-200'}>
            {status.message}
          </p>
        </div>
      )}

      {/* Example Data Banner */}
      {showingExample && (
        <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4">
          <p className="text-blue-200 font-medium">
            📋 Showing Example Portfolio Data
          </p>
          <p className="text-blue-300/70 text-sm mt-1">
            This is sample data to demonstrate portfolio views. Click "Refresh" to load your actual positions.
          </p>
        </div>
      )}

      {/* Portfolio Summary */}
      <div className="grid md:grid-cols-4 gap-4">
        <SummaryCard label="Total Positions" value={positions.length.toString()} />
        <SummaryCard label="Total Margin" value={`${totalMargin.toFixed(4)} SOL`} />
        <SummaryCard 
          label="Unrealized P&L" 
          value={`${totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(4)} SOL`}
          positive={totalPnL >= 0}
        />
        <SummaryCard label="Active Contracts" value={activeContracts.toString()} />
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading portfolio...</p>
        </div>
      ) : positions.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-black/30 backdrop-blur-sm border border-gray-800 rounded-xl">
          <p className="text-xl mb-2">No active positions</p>
          <p className="text-sm">Start trading options to see your portfolio here</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {positions.map((position) => (
              <PositionCard
                key={position.pubkey.toString()}
                position={position}
                onSettle={handleSettlement}
                onExercise={handleExercise}
                onDelist={handleDelist}
                processing={processing === position.pubkey.toString()}
                settlementPrices={settlementPrices[position.pubkey.toString()] || { assetPrice: '', solPrice: '' }}
                updateSettlementPrice={(field, value) => 
                  updateSettlementPrice(position.pubkey.toString(), field, value)
                }
              />
            ))}
          </div>

          {/* Comprehensive Test Scenario - Only show when displaying example data */}
          {showingExample && (
            <div className="bg-black/40 backdrop-blur-sm border border-gray-800 rounded-xl p-6 space-y-6">
              <div className="border-b border-gray-700 pb-4">
                <h2 className="text-2xl font-bold text-purple-300 mb-2">📊 Example Portfolio Test Scenario</h2>
                <p className="text-gray-400">
                  This example demonstrates a comprehensive options portfolio with multiple positions across different states.
                </p>
              </div>

              {/* Overview Section */}
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-purple-200">🎯 Portfolio Overview</h3>
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 space-y-2">
                  <p className="text-gray-300"><span className="font-semibold text-purple-300">Total Positions:</span> 3 active option contracts</p>
                  <p className="text-gray-300"><span className="font-semibold text-purple-300">Roles:</span> 2 owned contracts (buyer), 1 listed contract (seller)</p>
                  <p className="text-gray-300"><span className="font-semibold text-purple-300">Total Margin:</span> 5.4 SOL across all positions</p>
                  <p className="text-gray-300"><span className="font-semibold text-purple-300">Unrealized P&L:</span> +0.70 SOL (aggregate gains/losses)</p>
                </div>
              </div>

              {/* Position 1: AAPL/SOL Call (Exercised) */}
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-blue-200">📈 Position 1: AAPL/SOL Call Option (Exercised)</h3>
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 space-y-3">
                  <div className="space-y-1">
                    <p className="text-gray-300"><span className="font-semibold text-blue-300">PDA:</span> <CopyableAddress address="53NKEBZLkFpB7dBRtHi54FQkAdMKT8uLGCumEPseffTQ" /></p>
                    <p className="text-gray-300"><span className="font-semibold text-blue-300">Seller:</span> <CopyableAddress address="5MDTbGuRjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj" /></p>
                    <p className="text-gray-300"><span className="font-semibold text-blue-300">Owner:</span> <CopyableAddress address="DK1kvyYgjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj" /></p>
                    <p className="text-gray-300"><span className="font-semibold text-blue-300">Role:</span> Owned (Buyer)</p>
                    <p className="text-gray-300"><span className="font-semibold text-blue-300">Status:</span> Exercised ✅</p>
                    <p className="text-gray-300"><span className="font-semibold text-blue-300">Details:</span> Strike $150.00, Premium 0.5 SOL, Final settlement at $165.00</p>
                    <p className="text-gray-300"><span className="font-semibold text-blue-300">Buyer Margin:</span> 1.8 SOL (Initial: 1.5 SOL)</p>
                    <p className="text-gray-300"><span className="font-semibold text-blue-300">Seller Margin:</span> 0.7 SOL</p>
                  </div>
                  <div className="border-t border-blue-500/30 pt-2">
                    <p className="text-green-300 font-medium">💰 Profit: +0.30 SOL</p>
                    <p className="text-gray-400 text-sm">Option was in-the-money and exercised successfully. Daily settlements adjusted margins throughout contract lifecycle.</p>
                  </div>
                </div>
              </div>

              {/* Position 2: TSLA/SOL Put (Listed) */}
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-yellow-200">📊 Position 2: TSLA/SOL Put Option (Listed - Seller)</h3>
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 space-y-3">
                  <div className="space-y-1">
                    <p className="text-gray-300"><span className="font-semibold text-yellow-300">PDA:</span> <CopyableAddress address="7xNKEBZLkFpB7dBRtHi54FQkAdMKT8uLGCumEPaeffYY" /></p>
                    <p className="text-gray-300"><span className="font-semibold text-yellow-300">Seller:</span> <CopyableAddress address="DK1kvyYgjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj" /> (You)</p>
                    <p className="text-gray-300"><span className="font-semibold text-yellow-300">Role:</span> Seller (Writer)</p>
                    <p className="text-gray-300"><span className="font-semibold text-yellow-300">Status:</span> Listed ⏳ (Awaiting buyer)</p>
                    <p className="text-gray-300"><span className="font-semibold text-yellow-300">Details:</span> Strike $240.00, Premium 0.8 SOL, Expiry Jan 31 2025</p>
                    <p className="text-gray-300"><span className="font-semibold text-yellow-300">Seller Margin:</span> 2.0 SOL (Initial margin locked)</p>
                  </div>
                  <div className="border-t border-yellow-500/30 pt-2">
                    <p className="text-yellow-300 font-medium">⏰ Status: No buyer yet</p>
                    <p className="text-gray-400 text-sm">As the seller, you can delist this option before a buyer purchases it. Once purchased, daily settlements will begin.</p>
                  </div>
                  <div className="bg-yellow-500/5 rounded p-2">
                    <p className="text-yellow-200 text-sm font-medium">🎯 Available Actions:</p>
                    <p className="text-gray-400 text-xs">• Delist: Remove from marketplace and reclaim margin</p>
                  </div>
                </div>
              </div>

              {/* Position 3: BTC/SOL Call (Active with Settlements) */}
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-green-200">⚡ Position 3: BTC/SOL Call Option (Active)</h3>
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-3">
                  <div className="space-y-1">
                    <p className="text-gray-300"><span className="font-semibold text-green-300">PDA:</span> <CopyableAddress address="9zMKEBZLkFpB7dBRtHi54FQkAdMKT8uLGCumEPbeffZZ" /></p>
                    <p className="text-gray-300"><span className="font-semibold text-green-300">Seller:</span> <CopyableAddress address="CnmedVctjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj" /></p>
                    <p className="text-gray-300"><span className="font-semibold text-green-300">Owner:</span> <CopyableAddress address="DK1kvyYgjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj" /> (You)</p>
                    <p className="text-gray-300"><span className="font-semibold text-green-300">Role:</span> Owned (Buyer)</p>
                    <p className="text-gray-300"><span className="font-semibold text-green-300">Status:</span> Owned ✅ (Active contract)</p>
                    <p className="text-gray-300"><span className="font-semibold text-green-300">Details:</span> Strike $42,000.00, Premium 1.2 SOL, Current price $45,000.00</p>
                    <p className="text-gray-300"><span className="font-semibold text-green-300">Buyer Margin:</span> 1.6 SOL (Initial: 1.2 SOL)</p>
                    <p className="text-gray-300"><span className="font-semibold text-green-300">Seller Margin:</span> 0.8 SOL</p>
                    <p className="text-gray-300"><span className="font-semibold text-green-300">Settlements:</span> 2 daily settlements processed</p>
                  </div>
                  <div className="border-t border-green-500/30 pt-2">
                    <p className="text-green-300 font-medium">📈 Currently In-The-Money: +$3,000.00</p>
                    <p className="text-gray-400 text-sm">Option is profitable. You can exercise now or wait for more favorable pricing. Daily settlements adjust margins based on price movements.</p>
                  </div>
                  <div className="bg-green-500/5 rounded p-2">
                    <p className="text-green-200 text-sm font-medium">🎯 Available Actions:</p>
                    <p className="text-gray-400 text-xs">• Exercise: Realize current gains (+0.40 SOL estimated)</p>
                    <p className="text-gray-400 text-xs">• Settle: Submit daily settlement to adjust margins</p>
                  </div>
                </div>
              </div>

              {/* Educational Summary */}
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-pink-200">📚 Portfolio Management Guide</h3>
                <div className="bg-pink-500/10 border border-pink-500/30 rounded-lg p-4 space-y-3">
                  <div>
                    <p className="font-semibold text-pink-300 mb-1">Owned Positions (Buyer):</p>
                    <ul className="list-disc list-inside text-gray-300 space-y-1 text-sm">
                      <li>Monitor daily settlements to track margin adjustments</li>
                      <li>Exercise in-the-money options to realize gains</li>
                      <li>Options become exercisable after purchase confirmation</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-pink-300 mb-1">Listed Positions (Seller):</p>
                    <ul className="list-disc list-inside text-gray-300 space-y-1 text-sm">
                      <li>Can delist before purchase to reclaim margin</li>
                      <li>Once purchased, daily settlements become mandatory</li>
                      <li>Margin is locked until contract expiry or exercise</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-pink-300 mb-1">Settlement Process:</p>
                    <ul className="list-disc list-inside text-gray-300 space-y-1 text-sm">
                      <li>Submit current asset and SOL prices for daily settlements</li>
                      <li>Margins adjust based on price movements (gains/losses distributed)</li>
                      <li>Settlements ensure fair value distribution throughout contract life</li>
                    </ul>
                  </div>
                  <div className="bg-pink-500/5 rounded p-3 mt-2">
                    <p className="text-pink-200 text-sm font-medium">💡 Pro Tip:</p>
                    <p className="text-gray-300 text-sm">Regularly settle active positions to ensure accurate margin tracking and reduce counterparty risk. Monitor market movements to make informed exercise decisions.</p>
                  </div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="border-t border-gray-700 pt-4">
                <h3 className="text-lg font-semibold text-gray-300 mb-3">📊 Portfolio Statistics</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <p className="text-gray-400 text-sm">Total Value Locked</p>
                    <p className="text-white text-xl font-bold">5.40 SOL</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <p className="text-gray-400 text-sm">Realized P&L</p>
                    <p className="text-green-400 text-xl font-bold">+0.30 SOL</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <p className="text-gray-400 text-sm">Unrealized P&L</p>
                    <p className="text-green-400 text-xl font-bold">+0.40 SOL</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      </div>
    </>
  );
}

function SummaryCard({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="bg-black/30 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
      <div className="text-sm text-gray-400 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${positive !== undefined ? (positive ? 'text-green-400' : 'text-red-400') : 'text-white'}`}>
        {value}
      </div>
    </div>
  );
}

function PositionCard({
  position,
  onSettle,
  onExercise,
  onDelist,
  processing,
  settlementPrices,
  updateSettlementPrice,
}: {
  position: { pubkey: PublicKey; account: OptionData; role: 'seller' | 'owner' };
  onSettle: (optionPDA: PublicKey) => void;
  onExercise: (optionPDA: PublicKey) => void;
  onDelist: (optionPDA: PublicKey) => void;
  processing: boolean;
  settlementPrices: { assetPrice: string; solPrice: string };
  updateSettlementPrice: (field: 'assetPrice' | 'solPrice', value: string) => void;
}) {
  const { account, pubkey, role } = position;
  const [showSettleForm, setShowSettleForm] = useState(false);
  
  const isCall = account.optionType === 0;
  const statusString = getStatusString(account.status);
  const currentMargin = role === 'seller' 
    ? lamportsToSol(account.sellerMargin)
    : lamportsToSol(account.buyerMargin);
  const initialMargin = lamportsToSol(account.initialMargin);
  const pnl = currentMargin - initialMargin;
  
  const canExercise = account.status.owned && role === 'owner';
  const canSettle = account.status.owned;
  const canDelist = account.status.listed && role === 'seller';

  return (
    <div className="bg-black/30 backdrop-blur-sm border border-gray-800 rounded-xl p-6 space-y-4">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-2xl font-bold text-white">{account.underlying}</h3>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
              isCall ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {getOptionTypeString(account.optionType)}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm ${
              role === 'owner' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
            }`}>
              {role === 'owner' ? 'Buyer' : 'Seller'}
            </span>
            <span className="px-3 py-1 rounded-full text-sm bg-gray-500/20 text-gray-400">
              {statusString}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            PDA: <CopyableAddress address={pubkey.toString()} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
        <div>
          <div className="text-gray-400">Strike Price</div>
          <div className="text-white font-semibold">{lamportsToSol(account.strike).toFixed(6)} SOL</div>
        </div>
        <div>
          <div className="text-gray-400">Premium</div>
          <div className="text-white font-semibold">{lamportsToSol(account.price).toFixed(4)} SOL</div>
        </div>
        <div>
          <div className="text-gray-400">Current Margin</div>
          <div className="text-white font-semibold">{currentMargin.toFixed(4)} SOL</div>
          <div className="text-xs text-gray-500">Initial: {initialMargin.toFixed(4)} SOL</div>
        </div>
        <div>
          <div className="text-gray-400">P&L</div>
          <div className={`font-semibold ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {pnl >= 0 ? '+' : ''}{pnl.toFixed(4)} SOL
          </div>
        </div>
        <div>
          <div className="text-gray-400">Expiry</div>
          <div className="text-white font-semibold">{formatDate(account.expiryDate.toNumber())}</div>
        </div>
      </div>

      {account.lastSettlementDate.toNumber() > 0 && (
        <div className="text-xs text-gray-500">
          Last Settlement: {formatDate(account.lastSettlementDate.toNumber())} | 
          Price: {lamportsToSol(account.lastSettlementPrice).toFixed(6)} SOL
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {canSettle && (
          <button
            onClick={() => setShowSettleForm(!showSettleForm)}
            className="px-4 py-2 rounded-lg text-sm transition-all text-black"
            style={{ backgroundColor: '#20B2AA' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a9a93'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#20B2AA'}
          >
            {showSettleForm ? 'Hide' : 'Daily Settlement'}
          </button>
        )}
        {canExercise && (
          <button
            onClick={() => onExercise(pubkey)}
            disabled={processing}
            className="px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-50 text-black"
            style={{ backgroundColor: processing ? '#666' : '#20B2AA' }}
            onMouseEnter={(e) => !processing && (e.currentTarget.style.backgroundColor = '#1a9a93')}
            onMouseLeave={(e) => !processing && (e.currentTarget.style.backgroundColor = '#20B2AA')}
          >
            {processing ? 'Exercising...' : 'Exercise Option'}
          </button>
        )}
        {canDelist && (
          <button
            onClick={() => onDelist(pubkey)}
            disabled={processing}
            className="px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-50 text-black"
            style={{ backgroundColor: processing ? '#666' : '#20B2AA' }}
            onMouseEnter={(e) => !processing && (e.currentTarget.style.backgroundColor = '#1a9a93')}
            onMouseLeave={(e) => !processing && (e.currentTarget.style.backgroundColor = '#20B2AA')}
          >
            {processing ? 'Delisting...' : 'Delist'}
          </button>
        )}
      </div>

      {showSettleForm && (
        <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
          <h4 className="font-semibold text-white">Settlement Prices (USD with 6 decimals)</h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Asset Price (USD)</label>
              <input
                type="number"
                value={settlementPrices.assetPrice}
                onChange={(e) => updateSettlementPrice('assetPrice', e.target.value)}
                placeholder="e.g., 150.00"
                step="0.01"
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">SOL Price (USD)</label>
              <input
                type="number"
                value={settlementPrices.solPrice}
                onChange={(e) => updateSettlementPrice('solPrice', e.target.value)}
                placeholder="e.g., 100.00"
                step="0.01"
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
              />
            </div>
          </div>
          <button
            onClick={() => onSettle(pubkey)}
            disabled={processing}
            className="w-full px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 text-sm transition-all disabled:opacity-50"
          >
            {processing ? 'Settling...' : 'Execute Settlement'}
          </button>
        </div>
      )}
    </div>
  );
}
