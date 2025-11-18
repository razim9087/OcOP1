'use client';

import { Connection, PublicKey } from '@solana/web3.js';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Program, AnchorProvider, web3 } from '@coral-xyz/anchor';

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

export default function ContractHistoryPage() {
  const searchParams = useSearchParams();
  const [contractAddress, setContractAddress] = useState('');
  const [contract, setContract] = useState<ContractDetails | null>(null);
  const [ownershipHistory, setOwnershipHistory] = useState<OwnershipHistory[]>([]);
  const [settlementHistory, setSettlementHistory] = useState<SettlementHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rpcEndpoint, setRpcEndpoint] = useState('http://localhost:8899');

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
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : 'Search'}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
            ❌ {error}
          </div>
        )}
      </div>

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
