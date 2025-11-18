'use client';

import { useEffect, useState } from 'react';

export default function Footer() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // SOL price in USD (you can fetch this from an API in a real implementation)
  const solPrice = 98.45;

  // Convert USD prices to SOL
  const prices = [
    { symbol: '📈 AAPL', usdPrice: 150.23, change: '+2.4%' },
    { symbol: '📊 TSLA', usdPrice: 245.67, change: '+1.8%' },
    { symbol: '💹 MSFT', usdPrice: 380.12, change: '+1.2%' },
    { symbol: '📈 NVDA', usdPrice: 495.84, change: '+3.5%' },
    { symbol: '📊 GOOGL', usdPrice: 142.56, change: '+0.8%' },
    { symbol: '💹 AMZN', usdPrice: 178.93, change: '+1.5%' },
    { symbol: '📈 META', usdPrice: 325.47, change: '+2.1%' },
    { symbol: '📊 NFLX', usdPrice: 412.68, change: '-0.3%' },
  ];

  const pricesInSol = prices.map(p => ({
    ...p,
    solPrice: (p.usdPrice / solPrice).toFixed(4)
  }));

  // Duplicate for seamless loop
  const tickerContent = [...pricesInSol, ...pricesInSol].map((p, i) => 
    `${p.symbol} ${p.solPrice} SOL ${p.change}`
  ).join(' • ');

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-purple-500/30 bg-gradient-to-r from-gray-900/95 to-gray-800/95 backdrop-blur-lg">
      <div className="flex h-10">
        {/* Scrolling prices section - 75% width */}
        <div className="w-3/4 border-r border-purple-500/30 overflow-hidden relative">
          <div className="absolute whitespace-nowrap animate-ticker-scroll py-2 text-sm font-medium text-gray-300">
            {tickerContent} • {tickerContent}
          </div>
        </div>
        
        {/* Static message section - 25% width */}
        <div className="w-1/4 flex items-center justify-center px-4">
          <p className="text-xs text-purple-300 font-medium text-center">
            💡 All prices displayed in SOL
          </p>
        </div>
      </div>
    </div>
  );
}
