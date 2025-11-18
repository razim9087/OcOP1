'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function WalletButton() {
  const { publicKey } = useWallet();

  return (
    <div className="flex items-center gap-4">
      {publicKey && (
        <div className="hidden md:block text-sm text-gray-300">
          {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
        </div>
      )}
      <WalletMultiButton className="!bg-gradient-to-r !from-purple-600 !to-pink-600 hover:!from-purple-700 hover:!to-pink-700 !rounded-lg !px-6 !py-2 !font-semibold" />
    </div>
  );
}
