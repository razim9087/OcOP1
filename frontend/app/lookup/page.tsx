'use client';

import { useState, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
import { usePhantomWallet } from '@/lib/usePhantomWallet';
import {
  fetchOption,
  fetchOptionsBySeller,
  fetchOptionsByOwner,
  type OptionData
} from '@/lib/contract-operations';

// Copyable address component
function CopyableAddress({ address, label, fullWidth }: { address: string; label?: string; fullWidth?: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <span className="inline-flex items-center gap-1">
      {label && <span>{label}</span>}
      <span className="font-mono text-gray-300">{fullWidth ? address : `${address.slice(0, 8)}...`}</span>
      <button
        onClick={handleCopy}
        className="text-xs px-1.5 py-0.5 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
        title={`Copy: ${address}`}
      >
        {copied ? '✓' : '📋'}
      </button>
    </span>
  );
}
import {
  deriveOptionPDA,
  lamportsToSol,
  formatDate,
  getStatusString,
  getOptionTypeString
} from '@/lib/anchor-client';

export default function LookupPage() {
  const { wallet, connection } = usePhantomWallet();
  const [searchType, setSearchType] = useState<'wallet' | 'pda' | 'seller-symbol'>('wallet');
  const [searchInput, setSearchInput] = useState('');
  const [sellerInput, setSellerInput] = useState('');
  const [symbolInput, setSymbolInput] = useState('');
  const [results, setResults] = useState<{ pubkey: PublicKey; account: OptionData }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSearch = async () => {
    if (!wallet) {
      setError('Please connect your wallet');
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      if (searchType === 'wallet') {
        // Search by wallet (owner or seller)
        const walletPubkey = new PublicKey(searchInput);
        const [sellerOptions, ownerOptions] = await Promise.all([
          fetchOptionsBySeller(connection, wallet as any, walletPubkey),
          fetchOptionsByOwner(connection, wallet as any, walletPubkey)
        ]);
        setResults([...sellerOptions, ...ownerOptions]);
      } else if (searchType === 'pda') {
        // Search by PDA
        const pdaPubkey = new PublicKey(searchInput);
        const option = await fetchOption(connection, wallet as any, pdaPubkey);
        if (option) {
          setResults([{ pubkey: pdaPubkey, account: option }]);
        } else {
          setError('Option contract not found');
        }
      } else if (searchType === 'seller-symbol') {
        // Search by seller + underlying symbol
        const sellerPubkey = new PublicKey(sellerInput);
        const [optionPDA] = deriveOptionPDA(sellerPubkey, symbolInput.toUpperCase());
        const option = await fetchOption(connection, wallet as any, optionPDA);
        if (option) {
          setResults([{ pubkey: optionPDA, account: option }]);
        } else {
          setError('Option contract not found');
        }
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
        <p className="text-gray-400 mt-4">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          Contract Lookup
        </h1>
        <p className="text-gray-400 mt-2">
          Search for option contracts by wallet address, PDA, or seller + symbol
        </p>
      </div>

      <div className="bg-black/30 backdrop-blur-sm border border-gray-800 rounded-xl p-6 space-y-6">
        {/* Search Type Selector */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSearchType('wallet')}
            className="px-4 py-2 rounded-lg font-medium transition-all text-black"
            style={{ backgroundColor: searchType === 'wallet' ? '#20B2AA' : '#1f2937' }}
            onMouseEnter={(e) => searchType !== 'wallet' && (e.currentTarget.style.backgroundColor = '#374151')}
            onMouseLeave={(e) => searchType !== 'wallet' && (e.currentTarget.style.backgroundColor = '#1f2937')}
          >
            By Wallet
          </button>
          <button
            onClick={() => setSearchType('pda')}
            className="px-4 py-2 rounded-lg font-medium transition-all text-black"
            style={{ backgroundColor: searchType === 'pda' ? '#20B2AA' : '#1f2937' }}
            onMouseEnter={(e) => searchType !== 'pda' && (e.currentTarget.style.backgroundColor = '#374151')}
            onMouseLeave={(e) => searchType !== 'pda' && (e.currentTarget.style.backgroundColor = '#1f2937')}
          >
            By PDA
          </button>
          <button
            onClick={() => setSearchType('seller-symbol')}
            className="px-4 py-2 rounded-lg font-medium transition-all text-black"
            style={{ backgroundColor: searchType === 'seller-symbol' ? '#20B2AA' : '#1f2937' }}
            onMouseEnter={(e) => searchType !== 'seller-symbol' && (e.currentTarget.style.backgroundColor = '#374151')}
            onMouseLeave={(e) => searchType !== 'seller-symbol' && (e.currentTarget.style.backgroundColor = '#1f2937')}
          >
            By Seller + Symbol
          </button>
        </div>

        {/* Search Input */}
        {searchType === 'wallet' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Wallet Address
            </label>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Enter Solana wallet address..."
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <p className="text-xs text-gray-500 mt-1">
              Finds all contracts where this wallet is seller or owner
            </p>
          </div>
        )}

        {searchType === 'pda' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Option PDA Address
            </label>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Enter option contract PDA..."
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <p className="text-xs text-gray-500 mt-1">
              Direct lookup of a specific option contract
            </p>
          </div>
        )}

        {searchType === 'seller-symbol' && (
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Seller Address
              </label>
              <input
                type="text"
                value={sellerInput}
                onChange={(e) => setSellerInput(e.target.value)}
                placeholder="Seller wallet address..."
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Underlying Symbol
              </label>
              <input
                type="text"
                value={symbolInput}
                onChange={(e) => setSymbolInput(e.target.value)}
                placeholder="e.g., AAPL"
                maxLength={32}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
          </div>
        )}

        <button
          onClick={handleSearch}
          disabled={loading}
          className="w-full py-3 rounded-lg font-semibold transition-all disabled:opacity-50 text-black"
          style={{ backgroundColor: loading ? '#666' : '#20B2AA' }}
          onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#1a9a93')}
          onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#20B2AA')}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-200">{error}</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">
            Found {results.length} contract{results.length !== 1 ? 's' : ''}
          </h2>
          {results.map((result) => (
            <ContractCard key={result.pubkey.toString()} contract={result} />
          ))}
        </div>
      )}

      <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-6">
        <h3 className="font-semibold text-blue-200 mb-3">💡 Tips:</h3>
        <ul className="text-sm text-blue-200 space-y-2">
          <li>• Use wallet search to find all contracts for a specific address</li>
          <li>• Use PDA search if you have the exact contract address</li>
          <li>• Use seller + symbol to find a specific option by its creator</li>
          <li>• PDAs are derived from seller address and underlying symbol</li>
        </ul>
      </div>
    </div>
  );
}

function ContractCard({ contract }: { contract: { pubkey: PublicKey; account: OptionData } }) {
  const { account, pubkey } = contract;
  const isCall = account.optionType === 0;

  return (
    <div className="bg-black/30 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="text-2xl font-bold text-white">{account.underlying}</h3>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
            isCall ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {getOptionTypeString(account.optionType)}
          </span>
          <span className="px-3 py-1 rounded-full text-sm bg-gray-500/20 text-gray-400">
            {getStatusString(account.status)}
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
            <div className="text-white font-semibold">{lamportsToSol(account.strike).toFixed(6)} SOL</div>
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
            <div className="text-gray-400">Initial Margin</div>
            <div className="text-white font-semibold">{lamportsToSol(account.initialMargin).toFixed(4)} SOL</div>
          </div>
        </div>

        <div className="space-y-1 text-sm">
          <div className="text-gray-400">
            Seller: <CopyableAddress address={account.seller.toString()} fullWidth />
          </div>
          {!account.owner.equals(PublicKey.default) && (
            <div className="text-gray-400">
              Owner: <CopyableAddress address={account.owner.toString()} fullWidth />
            </div>
          )}
          <div className="text-gray-400">
            PDA: <CopyableAddress address={pubkey.toString()} fullWidth />
          </div>
        </div>

        {account.status.owned && (
          <div className="grid grid-cols-2 gap-4 text-sm pt-4 border-t border-gray-700">
            <div>
              <div className="text-gray-400">Seller Margin</div>
              <div className="text-white font-semibold">{lamportsToSol(account.sellerMargin).toFixed(4)} SOL</div>
            </div>
            <div>
              <div className="text-gray-400">Buyer Margin</div>
              <div className="text-white font-semibold">{lamportsToSol(account.buyerMargin).toFixed(4)} SOL</div>
            </div>
          </div>
        )}

        {account.lastSettlementDate.toNumber() > 0 && (
          <div className="text-xs text-gray-500 pt-2 border-t border-gray-700">
            Last Settlement: {formatDate(account.lastSettlementDate.toNumber())} | 
            Price: {lamportsToSol(account.lastSettlementPrice).toFixed(6)} SOL
          </div>
        )}
      </div>
    </div>
  );
}
