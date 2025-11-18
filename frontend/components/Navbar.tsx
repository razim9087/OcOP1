'use client';

import Link from 'next/link';
import WalletButton from './WalletButton';

export default function Navbar() {
  return (
    <nav className="border-b border-gray-800 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">S</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Solana Options
              </span>
            </Link>
            
            <div className="hidden md:flex gap-6">
          <Link href="/markets" className="text-gray-300 hover:text-white transition-colors">
            Markets
          </Link>
          <Link href="/create" className="text-gray-300 hover:text-white transition-colors">
            Create
          </Link>
          <Link href="/portfolio" className="text-gray-300 hover:text-white transition-colors">
            Portfolio
          </Link>
          <Link href="/transactions" className="text-gray-300 hover:text-white transition-colors">
            Transactions
          </Link>
          <Link href="/lookup" className="text-gray-300 hover:text-white transition-colors">
            Lookup
          </Link>
          <Link href="/contract" className="text-gray-300 hover:text-white transition-colors">
            Contract History
          </Link>
        </div>
          </div>
          
          <WalletButton />
        </div>
      </div>
    </nav>
  );
}
