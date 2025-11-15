import React, { useEffect, useState } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletProvider, ConnectionProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const network = WalletAdapterNetwork.Devnet;
const endpoint = 'https://api.devnet.solana.com';

const WalletConnect: React.FC = () => {
    const [wallet, setWallet] = useState<any>(null);
    const [connected, setConnected] = useState<boolean>(false);

    const wallets = [new PhantomWalletAdapter()];

    useEffect(() => {
        if (wallet) {
            wallet.on('connect', () => {
                setConnected(true);
                toast.success('Wallet connected!');
            });

            wallet.on('disconnect', () => {
                setConnected(false);
                toast.error('Wallet disconnected!');
            });
        }

        return () => {
            if (wallet) {
                wallet.disconnect();
            }
        };
    }, [wallet]);

    const connectWallet = async () => {
        if (wallet) {
            await wallet.connect();
        }
    };

    const disconnectWallet = async () => {
        if (wallet) {
            await wallet.disconnect();
        }
    };

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <div>
                    {connected ? (
                        <button onClick={disconnectWallet}>Disconnect Wallet</button>
                    ) : (
                        <button onClick={connectWallet}>Connect Wallet</button>
                    )}
                    <ToastContainer />
                </div>
            </WalletProvider>
        </ConnectionProvider>
    );
};

export default WalletConnect;