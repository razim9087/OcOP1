'use client';

import { useState, useEffect } from 'react';
import { initializeOption } from '@/lib/contract-operations';
import { usePhantomWallet } from '@/lib/usePhantomWallet';

// NASDAQ Equities with icons
const NASDAQ_EQUITIES = [
  { symbol: 'AAPL', name: 'Apple Inc.', icon: '🍎' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', icon: '🪟' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', icon: '🔍' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', icon: '📦' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', icon: '🎮' },
  { symbol: 'META', name: 'Meta Platforms Inc.', icon: '👤' },
  { symbol: 'TSLA', name: 'Tesla Inc.', icon: '⚡' },
  { symbol: 'AVGO', name: 'Broadcom Inc.', icon: '🔌' },
  { symbol: 'COST', name: 'Costco Wholesale', icon: '🛒' },
  { symbol: 'NFLX', name: 'Netflix Inc.', icon: '🎬' },
  { symbol: 'ADBE', name: 'Adobe Inc.', icon: '🎨' },
  { symbol: 'PEP', name: 'PepsiCo Inc.', icon: '🥤' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', icon: '💻' },
  { symbol: 'CSCO', name: 'Cisco Systems', icon: '🌐' },
  { symbol: 'INTC', name: 'Intel Corporation', icon: '🔲' },
  { symbol: 'CMCSA', name: 'Comcast Corporation', icon: '📡' },
  { symbol: 'QCOM', name: 'QUALCOMM Inc.', icon: '📱' },
  { symbol: 'TXN', name: 'Texas Instruments', icon: '⚙️' },
  { symbol: 'INTU', name: 'Intuit Inc.', icon: '💼' },
  { symbol: 'AMGN', name: 'Amgen Inc.', icon: '💊' },
  { symbol: 'HON', name: 'Honeywell International', icon: '🏭' },
  { symbol: 'SBUX', name: 'Starbucks Corporation', icon: '☕' },
  { symbol: 'AMAT', name: 'Applied Materials', icon: '🔬' },
  { symbol: 'BKNG', name: 'Booking Holdings', icon: '✈️' },
  { symbol: 'GILD', name: 'Gilead Sciences', icon: '🧬' },
  { symbol: 'ADP', name: 'Automatic Data Processing', icon: '📊' },
  { symbol: 'MDLZ', name: 'Mondelez International', icon: '🍫' },
  { symbol: 'REGN', name: 'Regeneron Pharmaceuticals', icon: '💉' },
  { symbol: 'ISRG', name: 'Intuitive Surgical', icon: '🏥' },
  { symbol: 'VRTX', name: 'Vertex Pharmaceuticals', icon: '🧪' },
  { symbol: 'PANW', name: 'Palo Alto Networks', icon: '🔒' },
  { symbol: 'ADI', name: 'Analog Devices', icon: '📟' },
  { symbol: 'LRCX', name: 'Lam Research', icon: '⚡' },
  { symbol: 'MU', name: 'Micron Technology', icon: '💾' },
  { symbol: 'PYPL', name: 'PayPal Holdings', icon: '💳' },
  { symbol: 'KLAC', name: 'KLA Corporation', icon: '🔍' },
  { symbol: 'SNPS', name: 'Synopsys Inc.', icon: '🖥️' },
  { symbol: 'CDNS', name: 'Cadence Design Systems', icon: '📐' },
  { symbol: 'MAR', name: 'Marriott International', icon: '🏨' },
  { symbol: 'MELI', name: 'MercadoLibre', icon: '🛍️' },
  { symbol: 'ORLY', name: "O'Reilly Automotive", icon: '🚗' },
  { symbol: 'CSX', name: 'CSX Corporation', icon: '🚂' },
  { symbol: 'ABNB', name: 'Airbnb Inc.', icon: '🏠' },
  { symbol: 'FTNT', name: 'Fortinet Inc.', icon: '🛡️' },
  { symbol: 'ADSK', name: 'Autodesk Inc.', icon: '🏗️' },
  { symbol: 'NXPI', name: 'NXP Semiconductors', icon: '🔌' },
  { symbol: 'CHTR', name: 'Charter Communications', icon: '📺' },
  { symbol: 'MCHP', name: 'Microchip Technology', icon: '🖲️' },
  { symbol: 'AEP', name: 'American Electric Power', icon: '⚡' },
  { symbol: 'PCAR', name: 'PACCAR Inc.', icon: '🚛' },
].sort((a, b) => a.symbol.localeCompare(b.symbol));

export default function CreatePage() {
  const { connected, publicKey, connection, wallet } = usePhantomWallet();
  const [formData, setFormData] = useState({
    underlying: '',
    type: '0', // 0 = Call, 1 = Put
    strikePrice: '',
    premium: '',
    initiationDate: '',
    margin: '',
    isTest: false,
    allowZeroMargin: false,
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredEquities = NASDAQ_EQUITIES.filter(
    (equity) =>
      equity.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      equity.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectEquity = (symbol: string) => {
    setFormData({ ...formData, underlying: symbol });
    setSearchTerm(symbol);
    setShowDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!wallet || !publicKey) {
      setStatus({ type: 'error', message: 'Wallet not connected' });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const initiationTimestamp = formData.initiationDate 
        ? Math.floor(new Date(formData.initiationDate).getTime() / 1000)
        : Math.floor(Date.now() / 1000);

      const result = await initializeOption(connection, wallet as any, {
        optionType: parseInt(formData.type),
        underlying: formData.underlying.toUpperCase(),
        initiationDate: initiationTimestamp,
        price: parseFloat(formData.premium),
        strike: parseFloat(formData.strikePrice),
        initialMargin: formData.allowZeroMargin ? 0 : parseFloat(formData.margin),
        isTest: formData.isTest,
        allowZeroMargin: formData.allowZeroMargin,
      });

      setStatus({
        type: 'success',
        message: `Contract created successfully! Signature: ${result.signature.slice(0, 8)}...`,
      });

      // Reset form
      setFormData({
        underlying: '',
        type: '0',
        strikePrice: '',
        premium: '',
        initiationDate: '',
        margin: '',
        isTest: false,
        allowZeroMargin: false,
      });
    } catch (error: any) {
      console.error('Error creating option:', error);
      
      // Check if user rejected the transaction - just silently re-enable button
      if (error.message?.includes('User rejected') || error.message?.includes('rejected the request')) {
        // Don't show error, user intentionally cancelled
        setLoading(false);
        return;
      }
      
      // Check for account already exists error
      if (error.message?.includes('already in use') || error.message?.includes('already exists')) {
        alert('⚠️ Contract Already Exists\n\nA contract with this underlying asset already exists for your wallet.\n\nEach wallet can only have one active contract per underlying asset.\nPlease choose a different asset or wait for the existing contract to expire/be exercised.');
        setLoading(false);
        return;
      }
      
      // Check for program/simulation errors (usually means insufficient funds or program issues)
      if (
        error.message?.includes('program that does not exist') ||
        error.message?.includes('Simulation failed') ||
        error.message?.includes('Attempt to debit an account') || 
        error.message?.includes('insufficient funds') ||
        error.message?.includes('insufficient lamports')
      ) {
        // Show alert popup for insufficient funds - don't set error status
        alert('❌ Insufficient SOL Balance\n\nYou do not have enough SOL to create this contract.\n\nRequired: Initial margin + transaction fees (~0.05 SOL minimum)\nPlease add more SOL to your wallet and try again.');
        setLoading(false);
        return;
      }
      
      // For other errors, show in status
      setStatus({
        type: 'error',
        message: error.message || 'Failed to create contract',
      });
    } finally {
      // Always re-enable the button
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value,
    });
  };

  if (!mounted) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
        <p className="text-gray-400 mt-4">Loading...</p>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-yellow-200 mb-4">Wallet Not Connected</h2>
          <p className="text-yellow-200">Please connect your wallet to create options contracts</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="create-page-bg"></div>
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Create Option Contract
          </h1>
          <p className="text-gray-400 mt-2">List a new option contract for buyers to purchase</p>
        </div>

      {status && (
        <div className={`rounded-lg p-4 ${status.type === 'success' ? 'bg-green-500/10 border border-green-500/50' : 'bg-red-500/10 border border-red-500/50'}`}>
          <p className={status.type === 'success' ? 'text-green-200' : 'text-red-200'}>
            {status.message}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-black/30 backdrop-blur-sm border border-gray-800 rounded-xl p-6 space-y-6">
          {/* Underlying Asset */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Underlying Asset Symbol
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search NASDAQ equities..."
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white"
                required
                disabled={loading}
              />
              {showDropdown && !loading && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowDropdown(false)}
                  />
                  <div className="absolute z-20 w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                    {filteredEquities.length > 0 ? (
                      filteredEquities.map((equity) => (
                        <button
                          key={equity.symbol}
                          type="button"
                          onClick={() => handleSelectEquity(equity.symbol)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-700/50 flex items-center gap-3 transition-colors border-b border-gray-700/50 last:border-b-0"
                        >
                          <span className="text-2xl">{equity.icon}</span>
                          <div className="flex-1">
                            <div className="font-semibold text-white">{equity.symbol}</div>
                            <div className="text-sm text-gray-400">{equity.name}</div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-gray-400 text-sm">
                        No equities found
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            {formData.underlying && (
              <div className="mt-2 flex items-center gap-2 text-sm text-green-400">
                <span>✓ Selected:</span>
                <span className="font-semibold">
                  {NASDAQ_EQUITIES.find((e) => e.symbol === formData.underlying)?.icon}{' '}
                  {formData.underlying}
                  {' - '}
                  {NASDAQ_EQUITIES.find((e) => e.symbol === formData.underlying)?.name}
                </span>
              </div>
            )}
          </div>

          {/* Option Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Option Type
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white"
              disabled={loading}
            >
              <option value="0">Call Option</option>
              <option value="1">Put Option</option>
            </select>
          </div>

          {/* Strike Price */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Strike Price (Asset/SOL ratio in SOL)
            </label>
            <input
              type="number"
              name="strikePrice"
              value={formData.strikePrice}
              onChange={handleChange}
              placeholder="e.g., 1.5"
              step="0.000000001"
              min="0.000000001"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white"
              required
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">Price ratio of underlying asset to SOL</p>
          </div>

          {/* Premium */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Premium (SOL)
            </label>
            <input
              type="number"
              name="premium"
              value={formData.premium}
              onChange={handleChange}
              placeholder="e.g., 0.2"
              step="0.01"
              min="0.01"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white"
              required
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">Option price paid by buyer to seller</p>
          </div>

          {/* Margin */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Initial Margin (SOL)
            </label>
            <input
              type="number"
              name="margin"
              value={formData.margin}
              onChange={handleChange}
              placeholder="e.g., 0.5"
              step="0.01"
              min="0.01"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white"
              required={!formData.allowZeroMargin}
              disabled={loading || formData.allowZeroMargin}
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.allowZeroMargin ? 'Zero margin mode enabled' : 'Required from both buyer and seller'}
            </p>
          </div>

          {/* Initiation Date */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Initiation Date (optional)
            </label>
            <input
              type="date"
              name="initiationDate"
              value={formData.initiationDate}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">Leave empty for current date. Expires 30 days after initiation.</p>
          </div>

          {/* Test Mode */}
          <div className="flex items-center">
            <input
              type="checkbox"
              name="isTest"
              id="isTest"
              checked={formData.isTest}
              onChange={handleChange}
              className="w-4 h-4 text-purple-600 bg-gray-900 border-gray-700 rounded focus:ring-purple-500"
              disabled={loading}
            />
            <label htmlFor="isTest" className="ml-2 text-sm text-gray-300">
              Test Mode (allows past dates and flexible testing)
            </label>
          </div>

          {/* Zero Margin Toggle - Only visible in Test Mode */}
          {formData.isTest && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="allowZeroMargin" className="text-sm font-medium text-yellow-200">
                    🧪 Zero Margin Mode
                  </label>
                  <p className="text-xs text-yellow-300/70 mt-1">
                    Create contracts without margin requirements (Test Mode only)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, allowZeroMargin: !formData.allowZeroMargin })}
                  className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                  style={{ backgroundColor: formData.allowZeroMargin ? '#20B2AA' : '#666' }}
                  disabled={loading}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.allowZeroMargin ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4">
          <h3 className="font-semibold text-blue-200 mb-2">📌 Important Notes:</h3>
          <ul className="text-sm text-blue-200 space-y-1">
            <li>• Your margin will be locked when the option is purchased</li>
            <li>• Daily settlements adjust margins based on price movements</li>
            <li>• Margin call triggers at 20% of initial margin</li>
            <li>• Contracts can be resold on the secondary market</li>
            <li>• European-style: Exercise only on expiration date</li>
          </ul>
        </div>

        <button
          type="submit"
          className="w-full py-4 rounded-lg font-semibold transition-all text-lg disabled:opacity-50 disabled:cursor-not-allowed text-black"
          disabled={loading}
          style={{ backgroundColor: loading ? '#666' : '#20B2AA' }}
          onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#1a9a93')}
          onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#20B2AA')}
        >
          {loading ? 'Creating Contract...' : 'Create Contract'}
        </button>
      </form>
      </div>
    </>
  );
}
