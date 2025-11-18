import { useState, useEffect } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { useConnection } from '@solana/wallet-adapter-react';

declare global {
  interface Window {
    solana?: any;
  }
}

export function usePhantomWallet() {
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [connected, setConnected] = useState(false);
  const { connection } = useConnection();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if Phantom extension is installed and connected
    if (window.solana?.isPhantom) {
      if (window.solana.isConnected && window.solana.publicKey) {
        const key = new PublicKey(window.solana.publicKey.toString());
        setPublicKey(key);
        setConnected(true);
        localStorage.setItem('phantomPublicKey', key.toBase58());
        localStorage.setItem('walletType', 'extension');
      }

      // Listen for Phantom events
      window.solana.on('connect', (pubkey: any) => {
        const key = new PublicKey(pubkey.toString());
        setPublicKey(key);
        setConnected(true);
      });

      window.solana.on('disconnect', () => {
        setPublicKey(null);
        setConnected(false);
      });

      window.solana.on('accountChanged', (pubkey: any) => {
        if (pubkey) {
          const key = new PublicKey(pubkey.toString());
          setPublicKey(key);
          setConnected(true);
        } else {
          setPublicKey(null);
          setConnected(false);
        }
      });
    } else {
      // Fallback to localStorage for manual entry
      const savedKey = localStorage.getItem('phantomPublicKey');
      const walletType = localStorage.getItem('walletType');
      if (savedKey && walletType === 'manual') {
        try {
          const key = new PublicKey(savedKey);
          setPublicKey(key);
          setConnected(true);
        } catch (error) {
          localStorage.removeItem('phantomPublicKey');
          localStorage.removeItem('walletType');
        }
      }
    }

    // Listen to storage events for cross-tab sync
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'phantomPublicKey') {
        if (e.newValue) {
          try {
            const key = new PublicKey(e.newValue);
            setPublicKey(key);
            setConnected(true);
          } catch (error) {
            setPublicKey(null);
            setConnected(false);
          }
        } else {
          setPublicKey(null);
          setConnected(false);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const connect = async () => {
    if (typeof window === 'undefined') {
      throw new Error('Window object not available');
    }

    // Try to connect with Phantom extension if available
    if (window.solana?.isPhantom) {
      const response = await window.solana.connect();
      const key = new PublicKey(response.publicKey.toString());
      setPublicKey(key);
      setConnected(true);
      return key;
    }

    // Otherwise return current key or throw error
    if (publicKey) {
      return publicKey;
    }
    throw new Error('Please connect your wallet using the Connect Wallet button');
  };

  const disconnect = async () => {
    if (typeof window !== 'undefined' && window.solana?.isPhantom && window.solana.isConnected) {
      await window.solana.disconnect();
    }
    
    setPublicKey(null);
    setConnected(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('phantomPublicKey');
      localStorage.removeItem('walletType');
    }
  };

  const signTransaction = async (transaction: any) => {
    if (typeof window !== 'undefined' && window.solana?.isPhantom) {
      return await window.solana.signTransaction(transaction);
    }
    throw new Error('Transaction signing requires Phantom wallet extension. Manual entry is read-only.');
  };

  const signAllTransactions = async (transactions: any[]) => {
    if (typeof window !== 'undefined' && window.solana?.isPhantom) {
      return await window.solana.signAllTransactions(transactions);
    }
    throw new Error('Transaction signing requires Phantom wallet extension. Manual entry is read-only.');
  };

  return {
    publicKey,
    connected,
    connection,
    connect,
    disconnect,
    signTransaction,
    signAllTransactions,
    wallet: typeof window !== 'undefined' ? window.solana : null,
  };
}
