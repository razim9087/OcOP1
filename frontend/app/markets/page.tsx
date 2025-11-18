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
  purchaseOption,
  type OptionData
} from '@/lib/contract-operations';
import { 
  lamportsToSol, 
  formatDate, 
  getStatusString, 
  getOptionTypeString 
} from '@/lib/anchor-client';

// Example market data showcasing various option contracts
const EXAMPLE_MARKET_DATA = [
  {
    pubkey: new PublicKey('53NKEBZLkFpB7dBRtHi54FQkAdMKT8uLGCumEPseffTQ'),
    account: {
      optionType: 0,
      underlying: 'AAPL/SOL',
      seller: new PublicKey('5MDTbGuRjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj'),
      initiationDate: new BN(1722470400),
      expiryDate: new BN(1725062399),
      status: { listed: {} },
      price: new BN(2000000000),
      strike: new BN(1500000000),
      owner: new PublicKey('11111111111111111111111111111111'),
      bump: 1,
      isTest: true,
      initialMargin: new BN(1000000000),
      sellerMargin: new BN(1000000000),
      buyerMargin: new BN(0),
      lastSettlementDate: new BN(0),
      lastSettlementPrice: new BN(0)
    }
  },
  {
    pubkey: new PublicKey('7xNKEBZLkFpB7dBRtHi54FQkAdMKT8uLGCumEPaeffYY'),
    account: {
      optionType: 1,
      underlying: 'TSLA/SOL',
      seller: new PublicKey('GXvnDHZ3jjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj'),
      initiationDate: new BN(1722384000),
      expiryDate: new BN(1724976000),
      status: { listed: {} },
      price: new BN(1500000000),
      strike: new BN(2400000000),
      owner: new PublicKey('11111111111111111111111111111111'),
      bump: 1,
      isTest: true,
      initialMargin: new BN(800000000),
      sellerMargin: new BN(800000000),
      buyerMargin: new BN(0),
      lastSettlementDate: new BN(0),
      lastSettlementPrice: new BN(0)
    }
  },
  {
    pubkey: new PublicKey('9zMKEBZLkFpB7dBRtHi54FQkAdMKT8uLGCumEPbeffZZ'),
    account: {
      optionType: 0,
      underlying: 'BTC/SOL',
      seller: new PublicKey('Cz8WtKjnjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj'),
      initiationDate: new BN(1722211200),
      expiryDate: new BN(1724803200),
      status: { owned: {} },
      price: new BN(3000000000),
      strike: new BN(42000000000000),
      owner: new PublicKey('DK1kvyYgjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj'),
      bump: 1,
      isTest: true,
      initialMargin: new BN(1200000000),
      sellerMargin: new BN(800000000),
      buyerMargin: new BN(1600000000),
      lastSettlementDate: new BN(1723420800),
      lastSettlementPrice: new BN(45000000000000)
    }
  },
  {
    pubkey: new PublicKey('4aMKEBZLkFpB7dBRtHi54FQkAdMKT8uLGCumEPceffAA'),
    account: {
      optionType: 1,
      underlying: 'ETH/SOL',
      seller: new PublicKey('G2eX9ZrEjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj'),
      initiationDate: new BN(1722297600),
      expiryDate: new BN(1724889600),
      status: { listed: {} },
      price: new BN(1000000000),
      strike: new BN(2800000000),
      owner: new PublicKey('11111111111111111111111111111111'),
      bump: 1,
      isTest: true,
      initialMargin: new BN(600000000),
      sellerMargin: new BN(600000000),
      buyerMargin: new BN(0),
      lastSettlementDate: new BN(0),
      lastSettlementPrice: new BN(0)
    }
  },
  {
    pubkey: new PublicKey('6bMKEBZLkFpB7dBRtHi54FQkAdMKT8uLGCumEPdeffBB'),
    account: {
      optionType: 0,
      underlying: 'SOL/USDC',
      seller: new PublicKey('CnmedVctjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj'),
      initiationDate: new BN(1722124800),
      expiryDate: new BN(1724716800),
      status: { listed: {} },
      price: new BN(500000000),
      strike: new BN(150000000),
      owner: new PublicKey('11111111111111111111111111111111'),
      bump: 1,
      isTest: true,
      initialMargin: new BN(400000000),
      sellerMargin: new BN(400000000),
      buyerMargin: new BN(0),
      lastSettlementDate: new BN(0),
      lastSettlementPrice: new BN(0)
    }
  }
];

export default function MarketsPage() {
  const { connected, publicKey, connection, wallet } = usePhantomWallet();
  const [filter, setFilter] = useState<'all' | 'listed' | 'owned'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | '0' | '1'>('all'); // 0=Call, 1=Put
  const [contracts, setContracts] = useState<{ pubkey: PublicKey; account: OptionData }[]>([]);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showingExample, setShowingExample] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && connected && wallet) {
      loadContracts();
      setShowingExample(false);
    }
  }, [mounted, connected, wallet]);

  const loadExampleData = () => {
    setContracts(EXAMPLE_MARKET_DATA);
    setShowingExample(true);
    setLoading(false);
    setStatus(null);
  };

  const loadContracts = async () => {
    if (!wallet) return;
    
    setLoading(true);
    setShowingExample(false);
    try {
      const allOptions = await fetchAllOptions(connection, wallet as any);
      setContracts(allOptions);
    } catch (error) {
      console.error('Error loading contracts:', error);
      setStatus({ type: 'error', message: 'Failed to load contracts' });
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (optionPDA: PublicKey, sellerPubkey: PublicKey) => {
    if (!wallet || !publicKey) return;

    setPurchasing(optionPDA.toString());
    setStatus(null);

    try {
      const signature = await purchaseOption(
        connection,
        wallet as any,
        optionPDA,
        sellerPubkey
      );

      setStatus({
        type: 'success',
        message: `Option purchased successfully! Signature: ${signature.slice(0, 8)}...`,
      });

      // Reload contracts
      await loadContracts();
    } catch (error: any) {
      console.error('Error purchasing option:', error);
      
      let errorMessage = 'Failed to purchase option';
      
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
        errorMessage = '⚠️ Not enough SOL to purchase option. Please add more SOL to your wallet.';
        alert('❌ Insufficient SOL Balance\n\nYou do not have enough SOL to purchase this option.\n\nRequired: Premium + Initial margin + transaction fees\nPlease add more SOL to your wallet and try again.');
      } else {
        errorMessage = error.message || errorMessage;
      }
      
      setStatus({
        type: 'error',
        message: errorMessage,
      });
    } finally {
      // Always re-enable the button
      setPurchasing(null);
    }
  };


  
  // Apply filters to all contracts for regular section
  const filteredContracts = contracts.filter((c) => {
    const statusMatch = filter === 'all' || 
      (filter === 'listed' && c.account.status.listed) ||
      (filter === 'owned' && c.account.status.owned);
    
    const typeMatch = typeFilter === 'all' || 
      c.account.optionType === parseInt(typeFilter);
    
    return statusMatch && typeMatch;
  });
  


  if (!mounted) {
    return (
      <>
        <div className="markets-page-bg"></div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="markets-page-bg"></div>
      <div className="space-y-8">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Options Markets
        </h1>
        <div className="flex gap-2 flex-wrap">
          <div className="flex gap-2">
            <FilterButton
              label="All Status"
              active={filter === 'all'}
              onClick={() => setFilter('all')}
            />
            <FilterButton
              label="Listed"
              active={filter === 'listed'}
              onClick={() => setFilter('listed')}
            />
            <FilterButton
              label="Owned"
              active={filter === 'owned'}
              onClick={() => setFilter('owned')}
            />
          </div>
          <div className="flex gap-2">
            <FilterButton
              label="All Types"
              active={typeFilter === 'all'}
              onClick={() => setTypeFilter('all')}
            />
            <FilterButton
              label="Calls"
              active={typeFilter === '0'}
              onClick={() => setTypeFilter('0')}
            />
            <FilterButton
              label="Puts"
              active={typeFilter === '1'}
              onClick={() => setTypeFilter('1')}
            />
          </div>
          <button
            onClick={loadExampleData}
            className="px-4 py-2 rounded-lg transition-all font-medium text-black"
            style={{ backgroundColor: '#20B2AA' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a9a93'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#20B2AA'}
          >
            📋 Example
          </button>
          <button
            onClick={loadContracts}
            className="px-4 py-2 rounded-lg font-medium transition-all text-black"
            disabled={loading}
            style={{ backgroundColor: loading ? '#666' : '#20B2AA' }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#1a9a93')}
            onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#20B2AA')}
          >
            {loading ? 'Loading...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {/* Example Data Banner */}
      {showingExample && (
        <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4">
          <p className="text-blue-200 font-medium">
            📋 Showing Example Market Data
          </p>
          <p className="text-blue-300/70 text-sm mt-1">
            This is sample data to demonstrate the options marketplace. Click "Refresh" to load actual contracts from the blockchain.
          </p>
        </div>
      )}

      {status && (
        <div className={`rounded-lg p-4 ${status.type === 'success' ? 'bg-green-500/10 border border-green-500/50' : 'bg-red-500/10 border border-red-500/50'}`}>
          <p className={status.type === 'success' ? 'text-green-200' : 'text-red-200'}>
            {status.message}
          </p>
        </div>
      )}

      {!connected ? (
        <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-6 text-center">
          <p className="text-yellow-200">Please connect your wallet to view and trade options</p>
        </div>
      ) : loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading contracts...</p>
        </div>
      ) : filteredContracts.length === 0 ? (
        <div className="bg-gray-800/50 rounded-lg p-12 text-center">
          <p className="text-gray-400 text-lg">No contracts found matching your filters</p>
        </div>
      ) : (
        <>
          {/* Regular Contracts Section */}
          {filteredContracts.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-purple-300">Active Contracts</h2>
              <div className="grid gap-4">
                {filteredContracts.filter(c => c && c.pubkey).map((contract) => (
                  <ContractCard 
                    key={contract.pubkey.toString()} 
                    contract={contract}
                    onPurchase={handlePurchase}
                    purchasing={purchasing === contract.pubkey.toString()}
                    currentWallet={publicKey}
                  />
                ))}
              </div>
            </div>
          )}


        </>
      )}

      {/* Comprehensive Test Scenario - Only show when displaying example data */}
      {showingExample && (
            <div className="bg-black/40 backdrop-blur-sm border border-gray-800 rounded-xl p-6 space-y-6">
              <div className="border-b border-gray-700 pb-4">
                <h2 className="text-2xl font-bold text-purple-300 mb-2">📊 Example Markets Test Scenario</h2>
                <p className="text-gray-400">
                  This example demonstrates a diverse options marketplace with various contract types, states, and underlying assets.
                </p>
              </div>

              {/* Overview Section */}
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-purple-200">🎯 Marketplace Overview</h3>
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 space-y-2">
                  <p className="text-gray-300"><span className="font-semibold text-purple-300">Total Contracts:</span> 5 option contracts across multiple assets</p>
                  <p className="text-gray-300"><span className="font-semibold text-purple-300">Listed Contracts:</span> 4 available for purchase (AAPL, TSLA, ETH, SOL)</p>
                  <p className="text-gray-300"><span className="font-semibold text-purple-300">Owned Contracts:</span> 1 active contract (BTC)</p>
                  <p className="text-gray-300"><span className="font-semibold text-purple-300">Call Options:</span> 3 contracts (AAPL, BTC, SOL)</p>
                  <p className="text-gray-300"><span className="font-semibold text-purple-300">Put Options:</span> 2 contracts (TSLA, ETH)</p>
                </div>
              </div>

              {/* Contract 1: AAPL/SOL Call (Listed) */}
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-green-200">📈 Contract 1: AAPL/SOL Call Option (Listed)</h3>
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-3">
                  <div className="space-y-1">
                    <p className="text-gray-300"><span className="font-semibold text-green-300">PDA:</span> <CopyableAddress address="53NKEBZLkFpB7dBRtHi54FQkAdMKT8uLGCumEPseffTQ" /></p>
                    <p className="text-gray-300"><span className="font-semibold text-green-300">Seller:</span> <CopyableAddress address="5MDTbGuRjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj" /></p>
                    <p className="text-gray-300"><span className="font-semibold text-green-300">Type:</span> Call Option</p>
                    <p className="text-gray-300"><span className="font-semibold text-green-300">Status:</span> Listed (Available for Purchase)</p>
                    <p className="text-gray-300"><span className="font-semibold text-green-300">Strike:</span> 1.5 SOL</p>
                    <p className="text-gray-300"><span className="font-semibold text-green-300">Premium:</span> 2.0 SOL</p>
                    <p className="text-gray-300"><span className="font-semibold text-green-300">Margin Required:</span> 1.0 SOL</p>
                    <p className="text-gray-300"><span className="font-semibold text-green-300">Expiry:</span> August 31, 2025</p>
                  </div>
                  <div className="border-t border-green-500/30 pt-2">
                    <p className="text-green-300 font-medium">✅ Available for Purchase</p>
                    <p className="text-gray-400 text-sm">This is a call option on AAPL priced in SOL. Buyers can purchase the right to benefit from AAPL price increases.</p>
                  </div>
                </div>
              </div>

              {/* Contract 2: TSLA/SOL Put (Listed) */}
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-red-200">📉 Contract 2: TSLA/SOL Put Option (Listed)</h3>
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-3">
                  <div className="space-y-1">
                    <p className="text-gray-300"><span className="font-semibold text-red-300">PDA:</span> <CopyableAddress address="7xNKEBZLkFpB7dBRtHi54FQkAdMKT8uLGCumEPaeffYY" /></p>
                    <p className="text-gray-300"><span className="font-semibold text-red-300">Seller:</span> <CopyableAddress address="GXvnDHZ3jjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj" /></p>
                    <p className="text-gray-300"><span className="font-semibold text-red-300">Type:</span> Put Option</p>
                    <p className="text-gray-300"><span className="font-semibold text-red-300">Status:</span> Listed (Available for Purchase)</p>
                    <p className="text-gray-300"><span className="font-semibold text-red-300">Strike:</span> 2.4 SOL (equivalent to $240 at current prices)</p>
                    <p className="text-gray-300"><span className="font-semibold text-red-300">Premium:</span> 1.5 SOL</p>
                    <p className="text-gray-300"><span className="font-semibold text-red-300">Margin Required:</span> 0.8 SOL</p>
                    <p className="text-gray-300"><span className="font-semibold text-red-300">Expiry:</span> August 30, 2025</p>
                  </div>
                  <div className="border-t border-red-500/30 pt-2">
                    <p className="text-red-300 font-medium">✅ Available for Purchase</p>
                    <p className="text-gray-400 text-sm">Put option provides downside protection. Profitable if TSLA price falls below the strike price.</p>
                  </div>
                </div>
              </div>

              {/* Contract 3: BTC/SOL Call (Owned) */}
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-blue-200">⚡ Contract 3: BTC/SOL Call Option (Active)</h3>
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 space-y-3">
                  <div className="space-y-1">
                    <p className="text-gray-300"><span className="font-semibold text-blue-300">PDA:</span> <CopyableAddress address="9zMKEBZLkFpB7dBRtHi54FQkAdMKT8uLGCumEPbeffZZ" /></p>
                    <p className="text-gray-300"><span className="font-semibold text-blue-300">Seller:</span> <CopyableAddress address="Cz8WtKjnjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj" /></p>
                    <p className="text-gray-300"><span className="font-semibold text-blue-300">Owner:</span> <CopyableAddress address="DK1kvyYgjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj" /></p>
                    <p className="text-gray-300"><span className="font-semibold text-blue-300">Type:</span> Call Option</p>
                    <p className="text-gray-300"><span className="font-semibold text-blue-300">Status:</span> Owned (Active Contract)</p>
                    <p className="text-gray-300"><span className="font-semibold text-blue-300">Strike:</span> 42,000 SOL (equivalent to $42,000 BTC)</p>
                    <p className="text-gray-300"><span className="font-semibold text-blue-300">Premium:</span> 3.0 SOL (already paid)</p>
                    <p className="text-gray-300"><span className="font-semibold text-blue-300">Current Buyer Margin:</span> 1.6 SOL</p>
                    <p className="text-gray-300"><span className="font-semibold text-blue-300">Last Settlement:</span> $45,000 (In-the-Money by $3,000)</p>
                  </div>
                  <div className="border-t border-blue-500/30 pt-2">
                    <p className="text-blue-300 font-medium">🎯 Already Purchased & Owned</p>
                    <p className="text-gray-400 text-sm">This contract is owned by a buyer and has undergone settlements. Not available for purchase - shows an active position in the market.</p>
                  </div>
                </div>
              </div>

              {/* Contract 4: ETH/SOL Put (Listed) */}
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-yellow-200">🔷 Contract 4: ETH/SOL Put Option (Listed)</h3>
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 space-y-3">
                  <div className="space-y-1">
                    <p className="text-gray-300"><span className="font-semibold text-yellow-300">PDA:</span> <CopyableAddress address="4aMKEBZLkFpB7dBRtHi54FQkAdMKT8uLGCumEPceffAA" /></p>
                    <p className="text-gray-300"><span className="font-semibold text-yellow-300">Seller:</span> <CopyableAddress address="G2eX9ZrEjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj" /></p>
                    <p className="text-gray-300"><span className="font-semibold text-yellow-300">Type:</span> Put Option</p>
                    <p className="text-gray-300"><span className="font-semibold text-yellow-300">Status:</span> Listed (Available for Purchase)</p>
                    <p className="text-gray-300"><span className="font-semibold text-yellow-300">Strike:</span> 2.8 SOL</p>
                    <p className="text-gray-300"><span className="font-semibold text-yellow-300">Premium:</span> 1.0 SOL</p>
                    <p className="text-gray-300"><span className="font-semibold text-yellow-300">Margin Required:</span> 0.6 SOL</p>
                    <p className="text-gray-300"><span className="font-semibold text-yellow-300">Expiry:</span> August 29, 2025</p>
                  </div>
                  <div className="border-t border-yellow-500/30 pt-2">
                    <p className="text-yellow-300 font-medium">✅ Available for Purchase</p>
                    <p className="text-gray-400 text-sm">ETH put option with lower premium - suitable for hedging ETH positions.</p>
                  </div>
                </div>
              </div>

              {/* Contract 5: SOL/USDC Call (Listed) */}
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-pink-200">💫 Contract 5: SOL/USDC Call Option (Listed)</h3>
                <div className="bg-pink-500/10 border border-pink-500/30 rounded-lg p-4 space-y-3">
                  <div className="space-y-1">
                    <p className="text-gray-300"><span className="font-semibold text-pink-300">PDA:</span> <CopyableAddress address="6bMKEBZLkFpB7dBRtHi54FQkAdMKT8uLGCumEPdeffBB" /></p>
                    <p className="text-gray-300"><span className="font-semibold text-pink-300">Seller:</span> <CopyableAddress address="CnmedVctjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj" /></p>
                    <p className="text-gray-300"><span className="font-semibold text-pink-300">Type:</span> Call Option</p>
                    <p className="text-gray-300"><span className="font-semibold text-pink-300">Status:</span> Listed (Available for Purchase)</p>
                    <p className="text-gray-300"><span className="font-semibold text-pink-300">Strike:</span> 0.15 SOL ($150 equivalent)</p>
                    <p className="text-gray-300"><span className="font-semibold text-pink-300">Premium:</span> 0.5 SOL</p>
                    <p className="text-gray-300"><span className="font-semibold text-pink-300">Margin Required:</span> 0.4 SOL</p>
                    <p className="text-gray-300"><span className="font-semibold text-pink-300">Expiry:</span> August 27, 2025</p>
                  </div>
                  <div className="border-t border-pink-500/30 pt-2">
                    <p className="text-pink-300 font-medium">✅ Available for Purchase</p>
                    <p className="text-gray-400 text-sm">Lower cost option for SOL exposure - ideal for testing or smaller positions.</p>
                  </div>
                </div>
              </div>

              {/* Educational Guide */}
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-cyan-200">📚 Marketplace Guide</h3>
                <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 space-y-3">
                  <div>
                    <p className="font-semibold text-cyan-300 mb-1">Call Options:</p>
                    <ul className="list-disc list-inside text-gray-300 space-y-1 text-sm">
                      <li>Profit when the underlying asset price rises above the strike price</li>
                      <li>Limited downside risk (max loss = premium paid)</li>
                      <li>Ideal for bullish market outlooks</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-cyan-300 mb-1">Put Options:</p>
                    <ul className="list-disc list-inside text-gray-300 space-y-1 text-sm">
                      <li>Profit when the underlying asset price falls below the strike price</li>
                      <li>Used for hedging or bearish speculation</li>
                      <li>Limited downside risk (max loss = premium paid)</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-cyan-300 mb-1">Purchasing Process:</p>
                    <ul className="list-disc list-inside text-gray-300 space-y-1 text-sm">
                      <li>Click "Buy Option" to purchase listed contracts</li>
                      <li>You'll need: Premium + Initial Margin + transaction fees in SOL</li>
                      <li>After purchase, contract moves to "Owned" status in your portfolio</li>
                      <li>You cannot purchase your own listed options</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-cyan-300 mb-1">Filtering Options:</p>
                    <ul className="list-disc list-inside text-gray-300 space-y-1 text-sm">
                      <li>Use status filters to view Listed or Owned contracts only</li>
                      <li>Use type filters to view only Calls or Puts</li>
                      <li>Combine filters to find specific contract types</li>
                    </ul>
                  </div>
                  <div className="bg-cyan-500/5 rounded p-3 mt-2">
                    <p className="text-cyan-200 text-sm font-medium">💡 Pro Tip:</p>
                    <p className="text-gray-300 text-sm">The marketplace shows all available options. Look for contracts with favorable strike prices and premiums relative to current market conditions. Remember to check expiry dates!</p>
                  </div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="border-t border-gray-700 pt-4">
                <h3 className="text-lg font-semibold text-gray-300 mb-3">📊 Market Statistics</h3>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <p className="text-gray-400 text-sm">Total Volume</p>
                    <p className="text-white text-xl font-bold">8.0 SOL</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <p className="text-gray-400 text-sm">Avg Premium</p>
                    <p className="text-white text-xl font-bold">1.6 SOL</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <p className="text-gray-400 text-sm">Listed Contracts</p>
                    <p className="text-white text-xl font-bold">4</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <p className="text-gray-400 text-sm">Active Contracts</p>
                    <p className="text-white text-xl font-bold">1</p>
                  </div>
                </div>
              </div>
            </div>
          )}
      </div>
    </>
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

function ContractCard({ 
  contract,
  onPurchase,
  purchasing,
  currentWallet
}: { 
  contract: { pubkey?: PublicKey; publicKey?: PublicKey; account: OptionData };
  onPurchase: (optionPDA: PublicKey, seller: PublicKey) => void;
  purchasing: boolean;
  currentWallet: PublicKey | null;
}) {
  const { account, pubkey, publicKey } = contract;
  const contractKey = pubkey || publicKey;
  const isCall = account.optionType === 0;
  const isListed = account.status.listed;
  const statusString = getStatusString(account.status);
  
  // Check if current wallet is the seller
  const isSeller = currentWallet && account.seller.equals(currentWallet);

  return (
    <div className="bg-black/30 backdrop-blur-sm border border-gray-800 rounded-xl p-6 hover:border-purple-500 transition-all">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div className="space-y-3 flex-1 min-w-[300px]">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-2xl font-bold text-white">{account.underlying}</h3>
            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold ${
                isCall ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}
            >
              {getOptionTypeString(account.optionType)}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-sm ${
                isListed ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'
              }`}
            >
              {statusString}
            </span>
            {account.isTest && (
              <span className="px-3 py-1 rounded-full text-sm bg-yellow-500/20 text-yellow-400">
                TEST
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-400">Strike Price</div>
              <div className="text-white font-semibold">{lamportsToSol(account.strike).toFixed(4)} SOL</div>
            </div>
            <div>
              <div className="text-gray-400">Premium</div>
              <div className="text-white font-semibold">{lamportsToSol(account.price).toFixed(4)} SOL</div>
            </div>
            <div>
              <div className="text-gray-400">Expiry</div>
              <div className="text-white font-semibold">{formatDate(account.expiryDate.toNumber())}</div>
            </div>
            <div>
              <div className="text-gray-400">Margin Required</div>
              <div className="text-white font-semibold">{lamportsToSol(account.initialMargin).toFixed(4)} SOL</div>
            </div>
          </div>

          <div className="text-sm text-gray-400">
            Seller: <CopyableAddress address={account.seller.toString()} />
          </div>

          <div className="text-xs text-gray-500">
            PDA: <CopyableAddress address={contractKey!.toString()} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {isListed && !isSeller ? (
            <button 
              onClick={() => onPurchase(contractKey!, account.seller)}
              disabled={purchasing}
              className="px-6 py-2 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed text-black"
              style={{ backgroundColor: purchasing ? '#666' : '#20B2AA' }}
              onMouseEnter={(e) => !purchasing && (e.currentTarget.style.backgroundColor = '#1a9a93')}
              onMouseLeave={(e) => !purchasing && (e.currentTarget.style.backgroundColor = '#20B2AA')}
            >
              {purchasing ? 'Purchasing...' : 'Buy Option'}
            </button>
          ) : isListed && isSeller ? (
            <button className="px-6 py-2 bg-gray-700 rounded-lg font-semibold cursor-not-allowed" disabled>
              Your Listing
            </button>
          ) : (
            <button className="px-6 py-2 bg-gray-700 rounded-lg font-semibold cursor-not-allowed" disabled>
              {statusString}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
