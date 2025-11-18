'use client';

export default function IntroductionPage() {
  return (
    <>
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Welcome to On-chain Options (OcOP)
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            A decentralized platform for trading European-style options on Solana with automated margin management and daily settlements
          </p>
        </div>

        {/* Onboarding Process */}
        <div className="bg-gradient-to-r from-purple-600/10 to-pink-600/10 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-8">
          <h2 className="text-3xl font-bold text-purple-300 mb-6">🚀 Getting Started</h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-2xl font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Connect Your Wallet</h3>
                <p className="text-gray-300">
                  Click the "Connect Wallet" button in the top right corner. You'll need a Solana wallet like Phantom to interact with the platform. Make sure you're connected to the Solana devnet for testing.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-2xl font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Fund Your Wallet</h3>
                <p className="text-gray-300">
                  Ensure your wallet has SOL on devnet. You can get free devnet SOL from Solana faucets. You'll need SOL to pay for transaction fees, premiums, and margins.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-2xl font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Explore the Markets</h3>
                <p className="text-gray-300">
                  Browse available option contracts in the Markets page. Filter by status (Listed/Owned), type (Calls/Puts), and view detailed contract information including strike prices, premiums, and expiration dates.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-2xl font-bold flex-shrink-0">
                4
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Start Trading</h3>
                <p className="text-gray-300">
                  Purchase existing options or create your own. Manage your positions in the Portfolio page, track transactions, and view detailed contract histories.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-gradient-to-r from-pink-600/10 to-purple-600/10 backdrop-blur-sm border border-pink-500/20 rounded-2xl p-8">
          <h2 className="text-3xl font-bold text-pink-300 mb-6">⚙️ How It Works</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-black/30 backdrop-blur-sm border border-gray-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-2xl font-bold flex-shrink-0">
                  1
                </div>
                <h3 className="text-xl font-bold text-white">Create or Buy Options</h3>
              </div>
              <p className="text-gray-300">
                Sellers create options contracts specifying strike price, premium, and margin requirements. Buyers purchase these contracts by paying the premium and depositing margin.
              </p>
            </div>
            
            <div className="bg-black/30 backdrop-blur-sm border border-gray-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-2xl font-bold flex-shrink-0">
                  2
                </div>
                <h3 className="text-xl font-bold text-white">Daily Settlements</h3>
              </div>
              <p className="text-gray-300">
                Daily price updates trigger P&L calculations. Margins are adjusted between buyer and seller based on price movements relative to the strike price.
              </p>
            </div>
            
            <div className="bg-black/30 backdrop-blur-sm border border-gray-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-2xl font-bold flex-shrink-0">
                  3
                </div>
                <h3 className="text-xl font-bold text-white">Margin Calls</h3>
              </div>
              <p className="text-gray-300">
                If either party's margin falls below 20% of initial margin, a margin call is triggered and positions are forcibly settled to protect both parties.
              </p>
            </div>
            
            <div className="bg-black/30 backdrop-blur-sm border border-gray-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-2xl font-bold flex-shrink-0">
                  4
                </div>
                <h3 className="text-xl font-bold text-white">Exercise or Resell</h3>
              </div>
              <p className="text-gray-300">
                On expiration, the owner can exercise the option for final settlement. Before expiration, options can be resold to other traders at a new price.
              </p>
            </div>
          </div>
        </div>

        {/* Platform Features */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Markets */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">📊</span>
              <h3 className="text-2xl font-bold text-white">Markets</h3>
            </div>
            <p className="text-gray-300 mb-4">
              Browse and purchase available option contracts on the marketplace.
            </p>
            <ul className="space-y-2 text-gray-400">
              <li>• Filter contracts by status (Listed/Owned) and type (Calls/Puts)</li>
              <li>• View real-time contract details including strike, premium, and margins</li>
              <li>• Purchase options instantly with one-click buying</li>
              <li>• See contract expiration dates and settlement status</li>
              <li>• Automatic margin calculations and requirements</li>
            </ul>
          </div>

          {/* Create */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">✏️</span>
              <h3 className="text-2xl font-bold text-white">Create Options</h3>
            </div>
            <p className="text-gray-300 mb-4">
              Create new option contracts as a seller and list them on the marketplace.
            </p>
            <ul className="space-y-2 text-gray-400">
              <li>• Choose from popular equities (AAPL, TSLA, NVDA, etc.)</li>
              <li>• Set custom strike prices, premiums, and expiration dates</li>
              <li>• Define margin requirements for buyers and sellers</li>
              <li>• Test Mode for flexible testing with past dates</li>
              <li>• Zero Margin Mode for testing without capital requirements</li>
            </ul>
          </div>

          {/* Portfolio */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">💼</span>
              <h3 className="text-2xl font-bold text-white">Portfolio</h3>
            </div>
            <p className="text-gray-300 mb-4">
              Manage your active option positions and perform key actions.
            </p>
            <ul className="space-y-2 text-gray-400">
              <li>• View all your owned and sold option contracts</li>
              <li>• Exercise in-the-money options at expiration</li>
              <li>• Perform daily settlements to adjust margins</li>
              <li>• Delist unsold options to reclaim your margin</li>
              <li>• Monitor contract status, P&L, and margin health</li>
            </ul>
          </div>

          {/* Transactions */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">📜</span>
              <h3 className="text-2xl font-bold text-white">Transactions</h3>
            </div>
            <p className="text-gray-300 mb-4">
              Track all your on-chain activity and transaction history.
            </p>
            <ul className="space-y-2 text-gray-400">
              <li>• View complete transaction history with timestamps</li>
              <li>• Filter by transaction type (Initialize, Purchase, Exercise, etc.)</li>
              <li>• See transaction signatures and blockchain confirmations</li>
              <li>• Monitor SOL amounts for each transaction</li>
              <li>• Track wallet balance changes over time</li>
            </ul>
          </div>

          {/* Contract History */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🔍</span>
              <h3 className="text-2xl font-bold text-white">Contract History</h3>
            </div>
            <p className="text-gray-300 mb-4">
              Deep dive into individual contract lifecycles and detailed histories.
            </p>
            <ul className="space-y-2 text-gray-400">
              <li>• Search contracts by PDA (Program Derived Address)</li>
              <li>• View complete contract timeline from creation to settlement</li>
              <li>• Track ownership transfers and resales</li>
              <li>• See all settlement events and margin adjustments</li>
              <li>• Analyze exercise outcomes and final payoffs</li>
            </ul>
          </div>

          {/* Wallet Lookup */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🔎</span>
              <h3 className="text-2xl font-bold text-white">Wallet Lookup</h3>
            </div>
            <p className="text-gray-300 mb-4">
              Search and analyze any wallet's option trading activity.
            </p>
            <ul className="space-y-2 text-gray-400">
              <li>• Look up contracts by wallet address</li>
              <li>• Search by PDA for specific contracts</li>
              <li>• Find contracts by seller + underlying symbol</li>
              <li>• View another user's trading positions</li>
              <li>• Analyze trading patterns and strategies</li>
            </ul>
          </div>
        </div>

        {/* Key Concepts */}
        <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 backdrop-blur-sm border border-blue-500/50 rounded-xl p-8">
          <h2 className="text-3xl font-bold text-blue-200 mb-6">📚 Key Concepts</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">European-Style Options</h3>
              <p className="text-gray-300">
                Can only be exercised at expiration (not before). This simplifies margin management and reduces complexity compared to American-style options.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Daily Settlement</h3>
              <p className="text-gray-300">
                Margins are adjusted daily based on price movements. This ensures both parties maintain adequate collateral and reduces counterparty risk.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Margin Requirements</h3>
              <p className="text-gray-300">
                Both buyers and sellers deposit margins. Margins protect against adverse price movements and ensure contract obligations can be met.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Margin Calls</h3>
              <p className="text-gray-300">
                Triggered when margins fall below 20% of initial deposit. Contracts must be settled or additional margin deposited to maintain positions.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Strike Price</h3>
              <p className="text-gray-300">
                The predetermined price at which the option can be exercised. For calls, profit when settlement price exceeds strike; for puts, when below strike.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Premium</h3>
              <p className="text-gray-300">
                The upfront cost to purchase an option. Paid by the buyer to the seller when the contract is purchased. Non-refundable.
              </p>
            </div>
          </div>
        </div>

        {/* Tips & Best Practices */}
        <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 backdrop-blur-sm border border-green-500/50 rounded-xl p-8">
          <h2 className="text-3xl font-bold text-green-200 mb-6">💡 Tips & Best Practices</h2>
          <div className="space-y-4 text-gray-300">
            <div className="flex gap-3">
              <span className="text-green-400 text-xl">✓</span>
              <p><strong className="text-white">Start with Example Data:</strong> Use the "📋 Example" buttons on each page to see sample data and understand how the platform works before trading real assets.</p>
            </div>
            <div className="flex gap-3">
              <span className="text-green-400 text-xl">✓</span>
              <p><strong className="text-white">Monitor Margins:</strong> Keep track of your margin health in the Portfolio page. Daily settlements can adjust your margin balance based on price movements.</p>
            </div>
            <div className="flex gap-3">
              <span className="text-green-400 text-xl">✓</span>
              <p><strong className="text-white">Understand Expiration:</strong> Options can only be exercised at expiration. Plan ahead and make sure you're available to exercise profitable positions.</p>
            </div>
            <div className="flex gap-3">
              <span className="text-green-400 text-xl">✓</span>
              <p><strong className="text-white">Test Mode First:</strong> When creating contracts, use Test Mode to experiment with different parameters without real capital at risk.</p>
            </div>
            <div className="flex gap-3">
              <span className="text-green-400 text-xl">✓</span>
              <p><strong className="text-white">Review Contract Details:</strong> Always check strike prices, expiration dates, and margin requirements before purchasing or creating options.</p>
            </div>
            <div className="flex gap-3">
              <span className="text-green-400 text-xl">✓</span>
              <p><strong className="text-white">Track Transactions:</strong> Use the Transactions page to verify all your on-chain activities and maintain a record of your trading history.</p>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Ready to Get Started?</h2>
          <p className="text-gray-300 mb-6">
            Connect your wallet and explore the platform with example data
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a
              href="/markets"
              className="px-6 py-3 rounded-lg font-semibold transition-all text-black"
              style={{ backgroundColor: '#20B2AA' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1a9a93')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#20B2AA')}
            >
              Browse Markets
            </a>
            <a
              href="/create"
              className="px-6 py-3 bg-gray-700 rounded-lg font-semibold hover:bg-gray-600 transition-all"
            >
              Create Option
            </a>
            <a
              href="/portfolio"
              className="px-6 py-3 bg-gray-700 rounded-lg font-semibold hover:bg-gray-600 transition-all"
            >
              View Portfolio
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
