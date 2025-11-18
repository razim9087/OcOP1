'use client';

import { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';

export default function CreatePage() {
  const { connected, publicKey } = useWallet();
  const [formData, setFormData] = useState({
    underlying: '',
    type: 'call',
    strikePrice: '',
    premium: '',
    expiryDate: '',
    margin: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Add contract creation logic here
    console.log('Creating contract with:', formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

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
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          Create Option Contract
        </h1>
        <p className="text-gray-400 mt-2">List a new option contract for buyers to purchase</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-black/30 backdrop-blur-sm border border-gray-800 rounded-xl p-6 space-y-6">
          {/* Underlying Asset */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Underlying Asset
            </label>
            <input
              type="text"
              name="underlying"
              value={formData.underlying}
              onChange={handleChange}
              placeholder="e.g., AAPL, TSLA, BTC"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white"
              required
            />
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
            >
              <option value="call">Call Option</option>
              <option value="put">Put Option</option>
            </select>
          </div>

          {/* Strike Price */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Strike Price (SOL)
            </label>
            <input
              type="number"
              name="strikePrice"
              value={formData.strikePrice}
              onChange={handleChange}
              placeholder="e.g., 1.5"
              step="0.01"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white"
              required
            />
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
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white"
              required
            />
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
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white"
              required
            />
          </div>

          {/* Expiry Date */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Expiry Date
            </label>
            <input
              type="date"
              name="expiryDate"
              value={formData.expiryDate}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white"
              required
            />
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4">
          <h3 className="font-semibold text-blue-200 mb-2">📌 Important Notes:</h3>
          <ul className="text-sm text-blue-200 space-y-1">
            <li>• Your margin will be locked in the escrow contract</li>
            <li>• Daily settlements will adjust margins based on price movements</li>
            <li>• Contracts can be resold on the secondary market</li>
            <li>• Ensure you have sufficient SOL for transaction fees</li>
          </ul>
        </div>

        <button
          type="submit"
          className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all text-lg"
        >
          Create Contract
        </button>
      </form>
    </div>
  );
}
