'use client';

import { useState, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';

declare global {
  interface Window {
    solana?: any;
  }
}

export default function WalletButton() {
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [inputKey, setInputKey] = useState('');

  useEffect(() => {
    setMounted(true);
    
    // Check if Phantom is installed and already connected
    if (typeof window !== 'undefined' && window.solana?.isPhantom) {
      if (window.solana.isConnected && window.solana.publicKey) {
        const key = new PublicKey(window.solana.publicKey.toString());
        setPublicKey(key);
        localStorage.setItem('phantomPublicKey', key.toBase58());
        localStorage.setItem('walletType', 'extension');
      }
      
      // Listen for account changes
      window.solana.on('connect', (pubkey: any) => {
        const key = new PublicKey(pubkey.toString());
        setPublicKey(key);
        localStorage.setItem('phantomPublicKey', key.toBase58());
        localStorage.setItem('walletType', 'extension');
      });

      window.solana.on('disconnect', () => {
        setPublicKey(null);
        localStorage.removeItem('phantomPublicKey');
        localStorage.removeItem('walletType');
      });

      window.solana.on('accountChanged', (pubkey: any) => {
        if (pubkey) {
          const key = new PublicKey(pubkey.toString());
          setPublicKey(key);
          localStorage.setItem('phantomPublicKey', key.toBase58());
        } else {
          setPublicKey(null);
          localStorage.removeItem('phantomPublicKey');
        }
      });
    } else {
      // Check localStorage for manually saved public key
      const savedKey = localStorage.getItem('phantomPublicKey');
      const walletType = localStorage.getItem('walletType');
      if (savedKey && walletType === 'manual') {
        try {
          setPublicKey(new PublicKey(savedKey));
        } catch (error) {
          localStorage.removeItem('phantomPublicKey');
          localStorage.removeItem('walletType');
        }
      }
    }
  }, []);

  const connectWallet = async () => {
    // First, try to connect with Phantom extension if available
    if (typeof window !== 'undefined' && window.solana?.isPhantom) {
      try {
        setConnecting(true);
        const response = await window.solana.connect();
        const key = new PublicKey(response.publicKey.toString());
        setPublicKey(key);
        localStorage.setItem('phantomPublicKey', key.toBase58());
        localStorage.setItem('walletType', 'extension');
      } catch (error) {
        console.error('Error connecting to Phantom extension:', error);
        alert('Failed to connect to Phantom extension. You can enter your public key manually instead.');
      } finally {
        setConnecting(false);
      }
    } else {
      // Fallback to manual input
      setShowInput(true);
    }
  };

  const handleManualConnect = () => {
    try {
      setConnecting(true);
      const key = new PublicKey(inputKey.trim());
      setPublicKey(key);
      
      // Store in localStorage for persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('phantomPublicKey', inputKey.trim());
        localStorage.setItem('walletType', 'manual');
      }
      
      setShowInput(false);
      setInputKey('');
    } catch (error) {
      alert('Invalid public key. Please enter a valid Solana address.');
    } finally {
      setConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    // If connected via extension, disconnect from it
    if (typeof window !== 'undefined' && window.solana?.isPhantom && window.solana.isConnected) {
      try {
        await window.solana.disconnect();
      } catch (error) {
        console.error('Error disconnecting from Phantom:', error);
      }
    }
    
    setPublicKey(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('phantomPublicKey');
      localStorage.removeItem('walletType');
    }
  };

  if (!mounted) {
    return (
      <div className="flex items-center gap-4">
        <div className="bg-gray-800 rounded-lg px-6 py-2 font-semibold text-gray-400">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      {showInput ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="Enter Phantom wallet public key"
              className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 w-80"
              onKeyPress={(e) => e.key === 'Enter' && handleManualConnect()}
            />
            <button
              onClick={handleManualConnect}
              disabled={!inputKey.trim() || connecting}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg px-6 py-2 font-semibold transition-all disabled:opacity-50"
            >
              {connecting ? 'Connecting...' : 'Connect'}
            </button>
            <button
              onClick={() => {
                setShowInput(false);
                setInputKey('');
              }}
              className="bg-gray-700 hover:bg-gray-600 rounded-lg px-4 py-2 font-semibold transition-all"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-gray-400 italic">
            Note: Manual entry is read-only. Install Phantom extension for full functionality.
          </p>
        </div>
      ) : (
        <>
          {publicKey && (
            <div className="hidden md:block text-sm text-gray-300">
              {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
            </div>
          )}
          <button
            onClick={publicKey ? disconnectWallet : connectWallet}
            disabled={connecting}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg px-6 py-2 font-semibold transition-all disabled:opacity-50"
          >
            {connecting ? 'Connecting...' : publicKey ? 'Disconnect' : 'Connect Wallet'}
          </button>
          {!publicKey && typeof window !== 'undefined' && !window.solana?.isPhantom && (
            <button
              onClick={() => setShowInput(true)}
              className="bg-gray-700 hover:bg-gray-600 rounded-lg px-4 py-2 text-sm font-semibold transition-all"
            >
              Manual Entry
            </button>
          )}
        </>
      )}
    </div>
  );
}
