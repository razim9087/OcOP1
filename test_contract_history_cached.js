/**
 * Test script to verify contract history functionality using cached data
 * This demonstrates the transaction history without performing live tests
 */

const fs = require('fs');
const path = require('path');

const HISTORY_FILE = path.join(__dirname, 'test_data', 'contract_history.json');

function loadContractHistory() {
  try {
    const data = fs.readFileSync(HISTORY_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Error loading contract history:', error.message);
    console.error('\n💡 Tip: Run the ownership transfer test first to generate history data:');
    console.error('   ./run_ownership_test.sh\n');
    return null;
  }
}

function displayContractHistory() {
  console.log('🔍 Contract History (Cached Data)');
  console.log('==========================================\n');

  const history = loadContractHistory();
  if (!history) return;

  // Display contract info
  console.log('📝 Contract Information:');
  console.log(`   Address: ${history.contract.address}`);
  console.log(`   Program ID: ${history.contract.programId}`);
  console.log(`   Type: ${history.contract.type}`);
  console.log(`   Underlying: ${history.contract.underlying}`);
  console.log(`   Strike: ${history.contract.strike} SOL`);
  console.log(`   Premium: ${history.contract.premium} SOL`);
  console.log(`   Margin: ${history.contract.margin} SOL (each party)\n`);

  // Display participants
  console.log('👥 Participants:');
  Object.entries(history.participants).forEach(([role, address]) => {
    console.log(`   ${role}: ${address}`);
  });
  console.log('');

  // Display transaction breakdown
  console.log('📊 Transaction Analysis:');
  console.log(`   Total Transactions: ${history.summary.totalTransactions}`);
  console.log(`   ├─ Initializations: ${history.summary.initializations}`);
  console.log(`   ├─ Purchases: ${history.summary.purchases}`);
  console.log(`   ├─ Resells: ${history.summary.resells}`);
  console.log(`   ├─ Settlements: ${history.summary.settlements}`);
  console.log(`   └─ Exercises: ${history.summary.exercises}`);
  console.log(`   Total Ownership Transfers: ${history.summary.totalOwnershipTransfers}\n`);

  // Display transaction timeline
  console.log('📅 Transaction Timeline:');
  history.transactions.forEach((tx, index) => {
    const emoji = {
      'initialization': '🔨',
      'purchase': '💰',
      'resell': '🔄',
      'settlement': '📊',
      'exercise': '⚡'
    }[tx.type] || '📝';

    console.log(`\n${index + 1}. ${emoji} ${tx.type.toUpperCase()} (Slot ${tx.slot})`);
    console.log(`   Time: ${tx.timestamp}`);
    console.log(`   Instruction: ${tx.instruction}`);
    
    if (tx.type === 'initialization') {
      console.log(`   Strike: ${tx.details.strike} SOL`);
      console.log(`   Premium: ${tx.details.premium} SOL`);
      console.log(`   Dates: ${tx.details.initiationDate} → ${tx.details.expiryDate}`);
    } else if (tx.type === 'purchase') {
      console.log(`   Buyer: ${tx.details.buyer}`);
      console.log(`   Price: ${tx.details.price} SOL`);
      console.log(`   AAPL: $${tx.details.aaplPrice} | SOL: $${tx.details.solPrice}`);
    } else if (tx.type === 'resell') {
      console.log(`   From: ${tx.details.seller}`);
      console.log(`   To: ${tx.details.buyer}`);
      console.log(`   Price: ${tx.details.price} SOL`);
      console.log(`   Profit: ${tx.details.profit > 0 ? '+' : ''}${tx.details.profit} SOL`);
      console.log(`   Transfer #${tx.details.transferNumber}`);
    } else if (tx.type === 'settlement') {
      console.log(`   Day ${tx.details.day}`);
      console.log(`   AAPL: $${tx.details.aaplPrice} | SOL: $${tx.details.solPrice}`);
      console.log(`   Ratio: ${tx.details.ratio}`);
      console.log(`   Buyer Margin: ${tx.details.buyerMargin.toFixed(6)} SOL (${tx.details.buyerChange > 0 ? '+' : ''}${tx.details.buyerChange.toFixed(6)})`);
      console.log(`   Seller Margin: ${tx.details.sellerMargin.toFixed(6)} SOL (${tx.details.sellerChange > 0 ? '+' : ''}${tx.details.sellerChange.toFixed(6)})`);
    } else if (tx.type === 'exercise') {
      console.log(`   Final Owner: ${tx.details.finalOwner}`);
      console.log(`   Status: ${tx.details.status}`);
      console.log(`   Current Ratio: ${tx.details.currentRatio} | Strike: ${tx.details.strikeRatio}`);
      console.log(`   Final Buyer Margin: ${tx.details.finalBuyerMargin.toFixed(6)} SOL`);
      console.log(`   Final Seller Margin: ${tx.details.finalSellerMargin.toFixed(6)} SOL`);
    }
  });

  // Display ownership chain
  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('📊 OWNERSHIP TRANSFER CHAIN');
  console.log('═══════════════════════════════════════════════════════');
  history.summary.ownershipChain.forEach((transfer, index) => {
    console.log(`${index}. ${transfer}`);
  });
  console.log('═══════════════════════════════════════════════════════\n');

  // Final status
  console.log(`✅ Final Status: ${history.summary.finalStatus.toUpperCase()}`);
  console.log('\n📱 View in frontend:');
  console.log(`   http://localhost:3000/contract?address=${history.contract.address}`);
  console.log('\n📋 Copy contract address:');
  console.log(`   ${history.contract.address}\n`);
}

// Run if executed directly
if (require.main === module) {
  displayContractHistory();
}

module.exports = { loadContractHistory, displayContractHistory };
