'use client';

import { Connection, PublicKey } from '@solana/web3.js';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Program, AnchorProvider, web3 } from '@coral-xyz/anchor';

// Copyable address component
function CopyableAddress({ address, label }: { address: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <span className="inline-flex items-center gap-1">
      {label && <span>{label}</span>}
      <span className="font-mono text-gray-300">{address.slice(0, 8)}...</span>
      <button
        onClick={handleCopy}
        className="text-xs px-1.5 py-0.5 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
        title={`Copy full address: ${address}`}
      >
        {copied ? '✓' : '📋'}
      </button>
    </span>
  );
}

interface ContractDetails {
  address: string;
  optionType: string;
  underlying: string;
  seller: string;
  owner: string | null;
  strike: number;
  price: number;
  initiationDate: number;
  expiryDate: number;
  status: string;
  buyerMargin: number;
  sellerMargin: number;
  lastSettlementPrice: number;
  lastSettlementDate: number;
  isTest: boolean;
}

interface OwnershipHistory {
  owner: string;
  acquiredAt: number;
  acquiredSlot: number;
  transactionType: string;
  price?: number;
}

interface SettlementHistory {
  date: number;
  slot: number;
  price: number;
  buyerMargin: number;
  sellerMargin: number;
  settler: string;
}

// Example contract data from test_data/contract_history.json
const EXAMPLE_CONTRACT_DATA = {
  "address": "53NKEBZLkFpB7dBRtHi54FQkAdMKT8uLGCumEPseffTQ",
  "programId": "FX3EgWWVrVCzgtntijpgfCT22C7HXpq6Py9DrYmDjR3E",
  "type": "Call Option",
  "underlying": "AAPL/SOL",
  "strike": 1.5,
  "premium": 2.0,
  "margin": 1.0,
  "seller": "5MDTbGuR...",
  "initiationDate": "2025-08-01T00:00:00.000Z",
  "expiryDate": "2025-08-31T00:00:00.000Z",
  "status": "expired",
  "transactions": [
    { slot: 302, type: "initialization", timestamp: "2025-08-01T00:00:00.000Z", signature: "init_sig_302" },
    { slot: 303, type: "purchase", timestamp: "2025-08-01T01:00:00.000Z", signature: "purchase_sig_303", buyer: "GXvnDHZ3...", price: 2.0 },
    { slot: 304, type: "settlement", timestamp: "2025-08-05T00:00:00.000Z", signature: "settlement_sig_304", day: 4, ratio: 1.5, buyerMargin: 1.0, sellerMargin: 1.0 },
    { slot: 305, type: "settlement", timestamp: "2025-08-10T00:00:00.000Z", signature: "settlement_sig_305", day: 9, ratio: 1.508, buyerMargin: 1.008445945, sellerMargin: 0.991554055 },
    { slot: 306, type: "settlement", timestamp: "2025-08-15T00:00:00.000Z", signature: "settlement_sig_306", day: 14, ratio: 1.487, buyerMargin: 0.987096774, sellerMargin: 1.012903226 },
    { slot: 307, type: "resell", timestamp: "2025-08-18T00:00:00.000Z", signature: "resell_sig_307", seller: "GXvnDHZ3...", buyer: "Cz8WtKjn...", price: 2.5, profit: 0.5 },
    { slot: 310, type: "settlement", timestamp: "2025-08-20T00:00:00.000Z", signature: "settlement_sig_310", day: 19, ratio: 1.497, buyerMargin: 0.996774193, sellerMargin: 1.003225807 },
    { slot: 311, type: "resell", timestamp: "2025-08-22T00:00:00.000Z", signature: "resell_sig_311", seller: "Cz8WtKjn...", buyer: "G2eX9ZrE...", price: 3.0, profit: 0.5 },
    { slot: 314, type: "settlement", timestamp: "2025-08-24T00:00:00.000Z", signature: "settlement_sig_314", day: 23, ratio: 1.491, buyerMargin: 0.990506329, sellerMargin: 1.009493671 },
    { slot: 315, type: "resell", timestamp: "2025-08-26T00:00:00.000Z", signature: "resell_sig_315", seller: "G2eX9ZrE...", buyer: "CnmedVct...", price: 2.8, profit: -0.2 },
    { slot: 318, type: "settlement", timestamp: "2025-08-28T00:00:00.000Z", signature: "settlement_sig_318", day: 27, ratio: 1.488, buyerMargin: 0.9875, sellerMargin: 1.0125 },
    { slot: 319, type: "resell", timestamp: "2025-08-29T00:00:00.000Z", signature: "resell_sig_319", seller: "CnmedVct...", buyer: "DK1kvyYg...", price: 3.5, profit: 0.7 },
    { slot: 322, type: "settlement", timestamp: "2025-08-31T00:00:00.000Z", signature: "settlement_sig_322", day: 30, ratio: 1.455, buyerMargin: 0.954545454, sellerMargin: 1.045454546 },
    { slot: 323, type: "exercise", timestamp: "2025-08-31T23:59:59.000Z", signature: "exercise_sig_323", finalOwner: "DK1kvyYg...", status: "IN THE MONEY" }
  ]
};

export default function ContractHistoryPage() {
  const searchParams = useSearchParams();
  const [contractAddress, setContractAddress] = useState('');
  const [contract, setContract] = useState<ContractDetails | null>(null);
  const [ownershipHistory, setOwnershipHistory] = useState<OwnershipHistory[]>([]);
  const [settlementHistory, setSettlementHistory] = useState<SettlementHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rpcEndpoint, setRpcEndpoint] = useState('http://localhost:8899');
  const [showingExample, setShowingExample] = useState(false);

  // Don't load example data on mount - let user choose
  useEffect(() => {
    // Empty - user must click Example button to load data
  }, []);

  const loadExampleData = () => {
    // Convert example data to component state format
    const exampleContract: ContractDetails = {
      address: EXAMPLE_CONTRACT_DATA.address,
      optionType: 'Call',
      underlying: EXAMPLE_CONTRACT_DATA.underlying,
      seller: EXAMPLE_CONTRACT_DATA.seller,
      owner: 'DK1kvyYg...', // Final owner
      strike: EXAMPLE_CONTRACT_DATA.strike * 1e9,
      price: EXAMPLE_CONTRACT_DATA.premium * 1e9,
      initiationDate: new Date(EXAMPLE_CONTRACT_DATA.initiationDate).getTime() / 1000,
      expiryDate: new Date(EXAMPLE_CONTRACT_DATA.expiryDate).getTime() / 1000,
      status: 'Expired',
      buyerMargin: 0.954545454,
      sellerMargin: 1.045454546,
      lastSettlementPrice: 1.455 * 1e9,
      lastSettlementDate: new Date('2025-08-31T00:00:00.000Z').getTime() / 1000,
      isTest: true,
    };

    const owners: OwnershipHistory[] = EXAMPLE_CONTRACT_DATA.transactions
      .filter((tx: any) => tx.type === 'purchase' || tx.type === 'resell')
      .map((tx: any, idx: number) => ({
        owner: tx.buyer || 'Unknown',
        acquiredAt: new Date(tx.timestamp).getTime() / 1000,
        acquiredSlot: tx.slot,
        transactionType: tx.type === 'purchase' ? 'Purchase' : 'Resell',
        price: tx.price ? tx.price * 1e9 : undefined,
      }));

    const settlements: SettlementHistory[] = EXAMPLE_CONTRACT_DATA.transactions
      .filter((tx: any) => tx.type === 'settlement')
      .map((tx: any) => ({
        date: new Date(tx.timestamp).getTime() / 1000,
        slot: tx.slot,
        price: tx.ratio * 1e9,
        buyerMargin: tx.buyerMargin,
        sellerMargin: tx.sellerMargin,
        settler: 'System',
      }));

    setContract(exampleContract);
    setOwnershipHistory(owners);
    setSettlementHistory(settlements);
    setShowingExample(true);
  };

  const fetchContractHistory = async () => {
    if (!contractAddress) {
      setError('Please enter a contract address');
      return;
    }

    setLoading(true);
    setError('');
    setContract(null);
    setOwnershipHistory([]);
    setSettlementHistory([]);
    setShowingExample(false);

    try {
      const connection = new Connection(rpcEndpoint, 'confirmed');
      const contractPubkey = new PublicKey(contractAddress);

      // First, fetch the account data to get current contract state
      const accountInfo = await connection.getAccountInfo(contractPubkey);
      if (!accountInfo) {
        setError('Contract account not found');
        setLoading(false);
        return;
      }

      // Parse the account data (Anchor discriminator is 8 bytes, then the struct)
      const data = accountInfo.data;
      
      // Skip 8 byte discriminator, read the OptionContract struct
      let offset = 8;
      
      // Read option_type (1 byte)
      const optionType = data[offset];
      offset += 1;
      
      // Read underlying (String: 4 bytes length + max 32 chars)
      const underlyingLen = data.readUInt32LE(offset);
      offset += 4;
      const underlying = data.slice(offset, offset + underlyingLen).toString('utf-8');
      offset += 32; // Max string allocation
      
      // Read seller (32 bytes)
      const seller = new PublicKey(data.slice(offset, offset + 32)).toString();
      offset += 32;
      
      // Read dates and other fields
      const initiationDate = Number(data.readBigInt64LE(offset));
      offset += 8;
      const expiryDate = Number(data.readBigInt64LE(offset));
      offset += 8;
      
      // Read status (1 byte enum)
      const statusByte = data[offset];
      offset += 1;
      const statusMap = ['Listed', 'Owned', 'Expired', 'Delisted', 'Margin Called'];
      const status = statusMap[statusByte] || 'Unknown';
      
      // Read price and strike
      const price = Number(data.readBigUInt64LE(offset));
      offset += 8;
      const strike = Number(data.readBigUInt64LE(offset));
      offset += 8;
      
      // Read owner
      const owner = new PublicKey(data.slice(offset, offset + 32)).toString();
      offset += 32;
      
      // Skip bump and is_test
      offset += 2;
      
      // Read margin fields
      const initialMargin = Number(data.readBigUInt64LE(offset));
      offset += 8;
      const sellerMargin = Number(data.readBigUInt64LE(offset));
      offset += 8;
      const buyerMargin = Number(data.readBigUInt64LE(offset));
      offset += 8;
      const lastSettlementDate = Number(data.readBigInt64LE(offset));
      offset += 8;
      const lastSettlementPrice = Number(data.readBigUInt64LE(offset));

      const contractData: ContractDetails = {
        address: contractAddress,
        optionType: optionType === 0 ? 'Call' : 'Put',
        underlying,
        seller,
        owner: owner !== PublicKey.default.toString() ? owner : null,
        strike,
        price,
        initiationDate,
        expiryDate,
        status,
        buyerMargin: buyerMargin / 1e9,
        sellerMargin: sellerMargin / 1e9,
        lastSettlementPrice,
        lastSettlementDate,
        isTest: true,
      };

      setContract(contractData);

      // Fetch all transactions for this contract
      const signatures = await connection.getSignaturesForAddress(contractPubkey, { limit: 1000 });
      
      let parsedContractData: ContractDetails | null = null;
      const owners: OwnershipHistory[] = [];
      const settlements: SettlementHistory[] = [];

      // Parse transactions in chronological order (oldest first)
      for (let i = signatures.length - 1; i >= 0; i--) {
        const sig = signatures[i];
        const tx = await connection.getParsedTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
        });

        if (!tx?.meta?.logMessages) continue;

        const logs = tx.meta.logMessages;
        const timestamp = sig.blockTime || 0;

        // Check for initialization
        if (logs.some(log => log.includes('initialize_option'))) {
          // Extract contract details from logs
          const typeLog = logs.find(log => log.includes('Option Type:'));
          const underlyingLog = logs.find(log => log.includes('Underlying:'));
          const strikeLog = logs.find(log => log.includes('Strike:'));
          const priceLog = logs.find(log => log.includes('Price:'));
          
          if (!parsedContractData) {
            parsedContractData = {
              address: contractAddress,
              optionType: typeLog ? (typeLog.includes('Call') ? 'Call' : 'Put') : 'Unknown',
              underlying: underlyingLog?.split('Underlying: ')[1]?.trim() || 'Unknown',
              seller: tx.transaction.message.accountKeys[0]?.pubkey.toString() || '',
              owner: null,
              strike: strikeLog ? parseFloat(strikeLog.split('Strike: ')[1]) : 0,
              price: priceLog ? parseFloat(priceLog.split('Price: ')[1]) : 0,
              initiationDate: timestamp,
              expiryDate: 0,
              status: 'Listed',
              buyerMargin: 0,
              sellerMargin: 0,
              lastSettlementPrice: 0,
              lastSettlementDate: 0,
              isTest: false,
            };
          }
        }

        // Check for purchase
        if (logs.some(log => log.includes('purchase_option'))) {
          const buyer = tx.transaction.message.accountKeys.find(key => 
            logs.some(log => log.includes(key.pubkey.toString()))
          );
          if (buyer) {
            owners.push({
              owner: buyer.pubkey.toString(),
              acquiredAt: timestamp,
              acquiredSlot: sig.slot,
              transactionType: 'Purchase',
              price: parsedContractData?.price,
            });
            if (parsedContractData) {
              parsedContractData.owner = buyer.pubkey.toString();
              parsedContractData.status = 'Owned';
            }
          }
        }

        // Check for resell
        if (logs.some(log => log.includes('resell_option'))) {
          const priceLog = logs.find(log => log.includes('Resell Price:'));
          const newOwner = tx.transaction.message.accountKeys[2]?.pubkey.toString();
          if (newOwner) {
            owners.push({
              owner: newOwner,
              acquiredAt: timestamp,
              acquiredSlot: sig.slot,
              transactionType: 'Resell',
              price: priceLog ? parseFloat(priceLog.split('Resell Price: ')[1]) / 1e9 : undefined,
            });
            if (parsedContractData) {
              parsedContractData.owner = newOwner;
            }
          }
        }

        // Check for settlement
        if (logs.some(log => log.includes('settlement_daily'))) {
          const priceLog = logs.find(log => log.includes('Settlement Price:'));
          const buyerMarginLog = logs.find(log => log.includes('Buyer Margin:'));
          const sellerMarginLog = logs.find(log => log.includes('Seller Margin:'));
          
          settlements.push({
            date: timestamp,
            slot: sig.slot,
            price: priceLog ? parseFloat(priceLog.split('Settlement Price: ')[1]) : 0,
            buyerMargin: buyerMarginLog ? parseFloat(buyerMarginLog.split('Buyer Margin: ')[1]) / 1e9 : 0,
            sellerMargin: sellerMarginLog ? parseFloat(sellerMarginLog.split('Seller Margin: ')[1]) / 1e9 : 0,
            settler: tx.transaction.message.accountKeys[0]?.pubkey.toString() || '',
          });

          if (parsedContractData && buyerMarginLog && sellerMarginLog) {
            parsedContractData.buyerMargin = parseFloat(buyerMarginLog.split('Buyer Margin: ')[1]) / 1e9;
            parsedContractData.sellerMargin = parseFloat(sellerMarginLog.split('Seller Margin: ')[1]) / 1e9;
            parsedContractData.lastSettlementDate = timestamp;
            if (priceLog) {
              parsedContractData.lastSettlementPrice = parseFloat(priceLog.split('Settlement Price: ')[1]);
            }
          }
        }

        // Check for exercise
        if (logs.some(log => log.includes('exercise_option'))) {
          if (parsedContractData) {
            parsedContractData.status = 'Expired';
          }
        }

        // Check for margin call
        if (logs.some(log => log.includes('Margin call triggered'))) {
          if (parsedContractData) {
            parsedContractData.status = 'Margin Called';
          }
        }
      }

      if (!parsedContractData) {
        setError('Contract not found or no initialization transaction found');
        return;
      }

      setContract(parsedContractData);
      setOwnershipHistory(owners);
      setSettlementHistory(settlements);
    } catch (err) {
      console.error('Error fetching contract history:', err);
      setError('Failed to fetch contract history. Make sure the address is valid and the RPC is accessible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-black/30 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
        <h1 className="text-3xl font-bold text-white mb-4">📜 Contract History Explorer</h1>
        <p className="text-gray-400 mb-6">View the complete lifecycle and ownership history of an options contract</p>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">RPC Endpoint</label>
          <select
            value={rpcEndpoint}
            onChange={(e) => setRpcEndpoint(e.target.value)}
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white"
          >
            <option value="http://localhost:8899">Local Validator (localhost:8899)</option>
            <option value="https://api.devnet.solana.com">Devnet</option>
            <option value="https://api.mainnet-beta.solana.com">Mainnet Beta</option>
          </select>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={contractAddress}
            onChange={(e) => setContractAddress(e.target.value)}
            placeholder="Enter contract address (e.g., FX3EgWWVrVCzgtntijpgfCT22C7HXpq6Py9DrYmDjR3E)"
            className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-500"
          />
          <button
            onClick={fetchContractHistory}
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {loading ? 'Loading...' : 'Search'}
          </button>
          <button
            onClick={loadExampleData}
            className="px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap text-black"
            style={{ backgroundColor: '#20B2AA' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1a9a93'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#20B2AA'}
          >
            📋 Example
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
            ❌ {error}
          </div>
        )}

        {showingExample && contract && (
          <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/50 rounded-lg">
            <p className="text-blue-200 text-sm">
              <strong>📋 Showing Example Contract History</strong><br />
              This is demonstration data from <code className="bg-blue-900/30 px-2 py-1 rounded">test_data/contract_history.json</code> showing a complete contract lifecycle with multiple ownership transfers, settlements, and final exercise.
            </p>
          </div>
        )}
      </div>

      {showingExample && contract && (
        <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 backdrop-blur-sm border border-blue-500/50 rounded-xl p-6">
          <h2 className="text-2xl font-bold text-blue-200 mb-4">📊 Complete Test Scenario</h2>
          
          <div className="space-y-6">
            {/* Overview */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Overview</h3>
              <div className="bg-black/30 rounded-lg p-4 space-y-2 text-sm text-gray-300">
                <p>• <strong className="text-blue-300">Contract PDA:</strong> <CopyableAddress address="53NKEBZLkFpB7dBRtHi54FQkAdMKT8uLGCumEPseffTQ" /></p>
                <p>• <strong className="text-blue-300">Contract Type:</strong> AAPL/SOL Call Option</p>
                <p>• <strong className="text-blue-300">Strike Price:</strong> 1.5 SOL (Asset/SOL ratio)</p>
                <p>• <strong className="text-blue-300">Premium:</strong> 2.0 SOL</p>
                <p>• <strong className="text-blue-300">Initial Margin:</strong> 1.0 SOL (both buyer and seller)</p>
                <p>• <strong className="text-blue-300">Duration:</strong> 30 days (Aug 1-31, 2025)</p>
                <p>• <strong className="text-blue-300">Total Transactions:</strong> 14</p>
              </div>
            </div>

            {/* Ownership Chain */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">👥 Ownership Transfer Chain</h3>
              <div className="bg-black/30 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">1️⃣</div>
                  <div className="text-sm text-gray-300">
                    <p className="font-semibold text-white">Seller <CopyableAddress address="5MDTbGuRjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj" /> creates contract</p>
                    <p className="text-xs text-gray-400">Posts 1.0 SOL margin, lists for 2.0 SOL premium</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-2xl">2️⃣</div>
                  <div className="text-sm text-gray-300">
                    <p className="font-semibold text-green-400">Buyer 1 <CopyableAddress address="GXvnDHZ3jjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj" /> purchases for 2.0 SOL</p>
                    <p className="text-xs text-gray-400">Pays premium + posts 1.0 SOL margin</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-2xl">3️⃣</div>
                  <div className="text-sm text-gray-300">
                    <p className="font-semibold text-green-400">Buyer 2 <CopyableAddress address="Cz8WtKjnjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj" /> buys for 2.5 SOL</p>
                    <p className="text-xs text-green-300">Buyer 1 profit: +0.5 SOL</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-2xl">4️⃣</div>
                  <div className="text-sm text-gray-300">
                    <p className="font-semibold text-green-400">Buyer 3 <CopyableAddress address="G2eX9ZrEjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj" /> buys for 3.0 SOL</p>
                    <p className="text-xs text-green-300">Buyer 2 profit: +0.5 SOL</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-2xl">5️⃣</div>
                  <div className="text-sm text-gray-300">
                    <p className="font-semibold text-red-400">Buyer 4 <CopyableAddress address="CnmedVctjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj" /> buys for 2.8 SOL</p>
                    <p className="text-xs text-red-300">Buyer 3 loss: -0.2 SOL (sold lower)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-2xl">6️⃣</div>
                  <div className="text-sm text-gray-300">
                    <p className="font-semibold text-green-400">Buyer 5 <CopyableAddress address="DK1kvyYgjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj" /> buys for 3.5 SOL (FINAL)</p>
                    <p className="text-xs text-green-300">Buyer 4 profit: +0.7 SOL</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Settlements */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">📈 Daily Settlement Adjustments</h3>
              <div className="bg-black/30 rounded-lg p-4 space-y-2 text-sm">
                <div className="grid grid-cols-5 gap-2 font-semibold text-gray-400 text-xs border-b border-gray-700 pb-2">
                  <div>Day</div>
                  <div>AAPL/SOL Ratio</div>
                  <div>Buyer Margin</div>
                  <div>Seller Margin</div>
                  <div>Change</div>
                </div>
                <div className="grid grid-cols-5 gap-2 text-gray-300">
                  <div>Day 4</div>
                  <div>1.500</div>
                  <div className="text-blue-300">1.000 SOL</div>
                  <div className="text-purple-300">1.000 SOL</div>
                  <div className="text-gray-400">No change</div>
                </div>
                <div className="grid grid-cols-5 gap-2 text-gray-300">
                  <div>Day 9</div>
                  <div>1.508</div>
                  <div className="text-green-400">1.008 SOL ↑</div>
                  <div className="text-red-400">0.992 SOL ↓</div>
                  <div className="text-green-300">+0.008 buyer</div>
                </div>
                <div className="grid grid-cols-5 gap-2 text-gray-300">
                  <div>Day 14</div>
                  <div>1.487</div>
                  <div className="text-red-400">0.987 SOL ↓</div>
                  <div className="text-green-400">1.013 SOL ↑</div>
                  <div className="text-red-300">-0.021 buyer</div>
                </div>
                <div className="grid grid-cols-5 gap-2 text-gray-300">
                  <div>Day 19</div>
                  <div>1.497</div>
                  <div className="text-green-400">0.997 SOL ↑</div>
                  <div className="text-red-400">1.003 SOL ↓</div>
                  <div className="text-green-300">+0.010 buyer</div>
                </div>
                <div className="grid grid-cols-5 gap-2 text-gray-300">
                  <div>Day 23</div>
                  <div>1.491</div>
                  <div className="text-red-400">0.991 SOL ↓</div>
                  <div className="text-green-400">1.009 SOL ↑</div>
                  <div className="text-red-300">-0.006 buyer</div>
                </div>
                <div className="grid grid-cols-5 gap-2 text-gray-300">
                  <div>Day 27</div>
                  <div>1.488</div>
                  <div className="text-red-400">0.988 SOL ↓</div>
                  <div className="text-green-400">1.013 SOL ↑</div>
                  <div className="text-red-300">-0.003 buyer</div>
                </div>
                <div className="grid grid-cols-5 gap-2 text-gray-300 border-t border-gray-700 pt-2 font-semibold">
                  <div>Day 30</div>
                  <div>1.455</div>
                  <div className="text-red-400">0.955 SOL ↓</div>
                  <div className="text-green-400">1.045 SOL ↑</div>
                  <div className="text-red-300">-0.033 buyer</div>
                </div>
              </div>
            </div>

            {/* Final Exercise */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">✅ Final Exercise (Day 30)</h3>
              <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-4 space-y-2 text-sm text-gray-300">
                <p>• <strong className="text-green-300">Final Owner:</strong> Buyer 5 (DK1kvyYg...)</p>
                <p>• <strong className="text-green-300">Strike Ratio:</strong> 1.500 SOL</p>
                <p>• <strong className="text-green-300">Final Ratio:</strong> 1.455 SOL</p>
                <p>• <strong className="text-green-300">Status:</strong> <span className="bg-green-500/20 px-2 py-1 rounded text-green-400">IN THE MONEY</span></p>
                <p>• <strong className="text-green-300">Final Buyer Margin:</strong> 0.955 SOL (returned)</p>
                <p>• <strong className="text-green-300">Final Seller Margin:</strong> 1.045 SOL (returned)</p>
                <p className="text-xs text-gray-400 mt-3 italic">
                  The option was exercised successfully at expiration. The buyer benefited from the favorable 
                  price movement, while multiple intermediate traders profited from resales on the secondary market.
                </p>
              </div>
            </div>

            {/* Summary Stats */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">📊 Summary Statistics</h3>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="bg-black/30 rounded-lg p-3">
                  <div className="text-xs text-gray-400">Total Transactions</div>
                  <div className="text-2xl font-bold text-white">14</div>
                </div>
                <div className="bg-black/30 rounded-lg p-3">
                  <div className="text-xs text-gray-400">Ownership Transfers</div>
                  <div className="text-2xl font-bold text-blue-400">5</div>
                </div>
                <div className="bg-black/30 rounded-lg p-3">
                  <div className="text-xs text-gray-400">Daily Settlements</div>
                  <div className="text-2xl font-bold text-purple-400">6</div>
                </div>
                <div className="bg-black/30 rounded-lg p-3">
                  <div className="text-xs text-gray-400">Final Status</div>
                  <div className="text-xl font-bold text-green-400">Exercised</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {contract && (
        <>
          {/* Contract Details Card */}
          <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Contract Details</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <DetailRow label="Contract Address" value={contract.address} mono />
                <DetailRow label="Type" value={`${contract.optionType} Option`} />
                <DetailRow label="Underlying Asset" value={contract.underlying} />
                <DetailRow label="Status" value={contract.status} colored />
                <DetailRow label="Seller" value={`${contract.seller.slice(0, 8)}...${contract.seller.slice(-8)}`} mono />
                {contract.owner && (
                  <DetailRow label="Current Owner" value={`${contract.owner.slice(0, 8)}...${contract.owner.slice(-8)}`} mono />
                )}
              </div>

              <div className="space-y-3">
                <DetailRow label="Strike Price" value={`${(contract.strike / 1e9).toFixed(4)} SOL`} />
                <DetailRow label="Premium" value={`${(contract.price / 1e9).toFixed(4)} SOL`} />
                <DetailRow label="Creation Date" value={new Date(contract.initiationDate * 1000).toLocaleString()} />
                <DetailRow label="Buyer Margin" value={`${contract.buyerMargin.toFixed(4)} SOL`} />
                <DetailRow label="Seller Margin" value={`${contract.sellerMargin.toFixed(4)} SOL`} />
                {contract.lastSettlementDate > 0 && (
                  <DetailRow 
                    label="Last Settlement" 
                    value={new Date(contract.lastSettlementDate * 1000).toLocaleString()} 
                  />
                )}
              </div>
            </div>

            {contract.lastSettlementPrice > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <p className="text-sm text-gray-400">Last Settlement Price (Conversion Factor)</p>
                <p className="text-2xl font-bold text-white">{(contract.lastSettlementPrice / 1e9).toFixed(6)}</p>
                <p className="text-xs text-gray-500 mt-1">Strike Conversion Factor: {(contract.strike / 1e9).toFixed(6)}</p>
              </div>
            )}
          </div>

          {/* Ownership History */}
          {ownershipHistory.length > 0 && (
            <div className="bg-black/30 backdrop-blur-sm border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800">
                <h3 className="text-xl font-semibold text-white">👥 Ownership History</h3>
                <p className="text-sm text-gray-400">{ownershipHistory.length} owner(s)</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">#</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Owner</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Type</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Price</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Date</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Slot</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {ownershipHistory.map((owner, idx) => (
                      <tr key={idx} className="hover:bg-gray-800/30">
                        <td className="px-6 py-4 text-gray-400">{idx + 1}</td>
                        <td className="px-6 py-4 font-mono text-sm text-purple-400">
                          {owner.owner.slice(0, 8)}...{owner.owner.slice(-8)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-sm ${
                            owner.transactionType === 'Purchase' 
                              ? 'bg-green-500/20 text-green-300' 
                              : 'bg-blue-500/20 text-blue-300'
                          }`}>
                            {owner.transactionType}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-300">
                          {owner.price ? `${owner.price / 1e9} SOL` : '-'}
                        </td>
                        <td className="px-6 py-4 text-gray-400 text-sm">
                          {new Date(owner.acquiredAt * 1000).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-gray-400 text-sm">
                          {owner.acquiredSlot.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Settlement History */}
          {settlementHistory.length > 0 && (
            <div className="bg-black/30 backdrop-blur-sm border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800">
                <h3 className="text-xl font-semibold text-white">📊 Settlement History</h3>
                <p className="text-sm text-gray-400">{settlementHistory.length} settlement(s)</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">#</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Date</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Conversion Factor</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Buyer Margin</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Seller Margin</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Settler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {settlementHistory.map((settlement, idx) => (
                      <tr key={idx} className="hover:bg-gray-800/30">
                        <td className="px-6 py-4 text-gray-400">{idx + 1}</td>
                        <td className="px-6 py-4 text-gray-300 text-sm">
                          {new Date(settlement.date * 1000).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-white font-semibold">
                          {(settlement.price / 1e9).toFixed(6)}
                        </td>
                        <td className="px-6 py-4 text-green-400">
                          {settlement.buyerMargin.toFixed(4)} SOL
                        </td>
                        <td className="px-6 py-4 text-blue-400">
                          {settlement.sellerMargin.toFixed(4)} SOL
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-gray-400">
                          {settlement.settler.slice(0, 8)}...
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DetailRow({ label, value, mono, colored }: { label: string; value: string; mono?: boolean; colored?: boolean }) {
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Listed': 'text-blue-400',
      'Owned': 'text-green-400',
      'Expired': 'text-gray-400',
      'Margin Called': 'text-red-400',
    };
    return colors[status] || 'text-white';
  };

  return (
    <div>
      <p className="text-sm text-gray-400">{label}</p>
      <p className={`text-base font-semibold ${
        colored ? getStatusColor(value) : 'text-white'
      } ${mono ? 'font-mono text-sm' : ''} break-all`}>
        {value}
      </p>
    </div>
  );
}
