/**
 * Test script to verify contract history functionality
 * This simulates what the frontend does to fetch contract history
 * Results are saved to test_data/contract_history.json for future use
 */

const { Connection, PublicKey } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

const CONTRACT_ADDRESS = '53NKEBZLkFpB7dBRtHi54FQkAdMKT8uLGCumEPseffTQ';
const RPC_ENDPOINT = 'http://localhost:8899';
const HISTORY_FILE = path.join(__dirname, 'test_data', 'contract_history.json');

async function testContractHistory() {
  console.log('🔍 Testing Contract History Functionality');
  console.log('==========================================\n');
  
  try {
    const connection = new Connection(RPC_ENDPOINT, 'confirmed');
    const contractPubkey = new PublicKey(CONTRACT_ADDRESS);

    console.log(`📝 Contract Address: ${CONTRACT_ADDRESS}`);
    console.log(`🌐 RPC Endpoint: ${RPC_ENDPOINT}\n`);

    // Fetch account info
    console.log('1️⃣  Fetching account info...');
    const accountInfo = await connection.getAccountInfo(contractPubkey);
    
    if (!accountInfo) {
      console.error('❌ Contract account not found!');
      return;
    }
    
    console.log(`✅ Account found! Data size: ${accountInfo.data.length} bytes\n`);

    // Fetch transaction signatures
    console.log('2️⃣  Fetching transaction signatures...');
    const signatures = await connection.getSignaturesForAddress(contractPubkey, { limit: 100 });
    console.log(`✅ Found ${signatures.length} transactions\n`);

    // Parse transactions
    console.log('3️⃣  Analyzing transaction history...');
    let initCount = 0, purchaseCount = 0, resellCount = 0, settlementCount = 0, exerciseCount = 0;
    
    for (let i = 0; i < Math.min(signatures.length, 20); i++) {
      const sig = signatures[i];
      const tx = await connection.getParsedTransaction(sig.signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!tx?.meta?.logMessages) continue;

      const logs = tx.meta.logMessages;
      
      // Debug: Show first transaction's logs
      if (i === 0) {
        console.log(`\n   📋 Sample logs from first transaction:`);
        logs.slice(0, 5).forEach(log => console.log(`      ${log}`));
        console.log('');
      }
      
      if (logs.some(log => log.includes('initialize_option') || log.includes('InitializeOption'))) {
        initCount++;
        console.log(`   ✓ Initialization at slot ${sig.slot}`);
      }
      if (logs.some(log => log.includes('purchase_option') || log.includes('PurchaseOption'))) {
        purchaseCount++;
        console.log(`   ✓ Purchase at slot ${sig.slot}`);
      }
      if (logs.some(log => log.includes('resell_option') || log.includes('ResellOption'))) {
        resellCount++;
        console.log(`   ✓ Resell at slot ${sig.slot}`);
      }
      if (logs.some(log => log.includes('settlement_daily') || log.includes('SettlementDaily'))) {
        settlementCount++;
        console.log(`   ✓ Settlement at slot ${sig.slot}`);
      }
      if (logs.some(log => log.includes('exercise_option') || log.includes('ExerciseOption'))) {
        exerciseCount++;
        console.log(`   ✓ Exercise at slot ${sig.slot}`);
      }
    }

    console.log('\n📊 Transaction Summary:');
    console.log(`   Initializations: ${initCount}`);
    console.log(`   Purchases: ${purchaseCount}`);
    console.log(`   Resells: ${resellCount}`);
    console.log(`   Settlements: ${settlementCount}`);
    console.log(`   Exercises: ${exerciseCount}`);
    console.log(`   Total Ownership Transfers: ${purchaseCount + resellCount}`);

    // Update the history file if it exists
    try {
      if (fs.existsSync(HISTORY_FILE)) {
        const historyData = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
        historyData.contract.address = CONTRACT_ADDRESS;
        historyData.summary.totalTransactions = signatures.length;
        historyData.summary.initializations = initCount;
        historyData.summary.purchases = purchaseCount;
        historyData.summary.resells = resellCount;
        historyData.summary.settlements = settlementCount;
        historyData.summary.exercises = exerciseCount;
        historyData.summary.totalOwnershipTransfers = purchaseCount + resellCount;
        
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(historyData, null, 2));
        console.log(`\n💾 History data updated: ${HISTORY_FILE}`);
      }
    } catch (error) {
      console.log(`\n⚠️  Could not update history file: ${error.message}`);
    }

    console.log('\n✅ Contract history functionality test completed successfully!');
    console.log('\n📱 To test in the frontend:');
    console.log(`   1. Navigate to: http://localhost:3000/contract`);
    console.log(`   2. Paste the contract address: ${CONTRACT_ADDRESS}`);
    console.log(`   3. Make sure RPC endpoint is set to: http://localhost:8899`);
    console.log(`   4. Click "Search" to view the complete history`);
    console.log('\n💡 To view cached history without running tests:');
    console.log(`   node test_contract_history_cached.js`);

  } catch (error) {
    console.error('❌ Error testing contract history:', error);
  }
}

testContractHistory();
