import * as anchor from '@coral-xyz/anchor';
import { AnchorProvider, Program, web3 } from '@coral-xyz/anchor';
import { assert } from 'chai';
import { Escrow } from '../target/types/escrow';

/**
 * Multiple Ownership Transfer Test Suite
 * 
 * This test demonstrates a complete contract lifecycle with 5 ownership transfers
 * Contract: AAPL/SOL Call Option
 * Strike: 1.5 SOL | Premium: 2 SOL | Margin: 1 SOL
 * 
 * Ownership Transfer Chain:
 * Seller → Buyer1 (Purchase) → Buyer2 (Resell $2.5) → Buyer3 (Resell $3.0) 
 * → Buyer4 (Resell $2.8) → Buyer5 (Resell $3.5)
 */

describe('Multiple Ownership Transfer Test (5 Transfers)', () => {
    const provider = AnchorProvider.local();
    const program = anchor.workspace.Escrow as Program<Escrow>;
    const connection = provider.connection;

    let seller: web3.Keypair;
    let buyers: web3.Keypair[] = [];
    let optionPda: web3.PublicKey;
    
    const underlying = "AAPL/SOL";
    const CALL_OPTION = 0;
    
    // Contract parameters
    const optionPrice = new anchor.BN(2 * web3.LAMPORTS_PER_SOL); // 2 SOL premium
    const strikePrice = new anchor.BN(1.5 * 1_000_000_000); // 1.5 SOL strike
    const initialMargin = new anchor.BN(1 * web3.LAMPORTS_PER_SOL); // 1 SOL margin
    
    // Resell prices for each transfer
    const resellPrices = [
        new anchor.BN(2.5 * web3.LAMPORTS_PER_SOL), // Buyer1 → Buyer2: 2.5 SOL
        new anchor.BN(3.0 * web3.LAMPORTS_PER_SOL), // Buyer2 → Buyer3: 3.0 SOL
        new anchor.BN(2.8 * web3.LAMPORTS_PER_SOL), // Buyer3 → Buyer4: 2.8 SOL
        new anchor.BN(3.5 * web3.LAMPORTS_PER_SOL), // Buyer4 → Buyer5: 3.5 SOL
    ];
    
    // Mock price data for settlements between transfers
    const settlementPrices: [number, number][] = [
        [228.75, 152.50], // After purchase
        [232.00, 155.00], // After 1st resell
        [235.50, 158.00], // After 2nd resell
        [238.00, 160.00], // After 3rd resell
        [240.00, 165.00], // After 4th resell (final)
    ];
    
    const toPrice = (usd: number): anchor.BN => {
        return new anchor.BN(Math.floor(usd * 1_000_000));
    };

    before(async () => {
        // Generate seller and 5 buyers
        seller = web3.Keypair.generate();
        for (let i = 0; i < 5; i++) {
            buyers.push(web3.Keypair.generate());
        }
        
        // Fund all accounts
        console.log('📝 Funding accounts...');
        await connection.requestAirdrop(seller.publicKey, 10 * web3.LAMPORTS_PER_SOL);
        for (const buyer of buyers) {
            await connection.requestAirdrop(buyer.publicKey, 10 * web3.LAMPORTS_PER_SOL);
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Calculate PDA (this is the contract identifier)
        [optionPda] = web3.PublicKey.findProgramAddressSync(
            [Buffer.from("option"), seller.publicKey.toBuffer(), Buffer.from(underlying)],
            program.programId
        );
        
        console.log('');
        console.log('═══════════════════════════════════════════════════════');
        console.log('📋 Test Configuration');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`Contract PDA: ${optionPda.toString()}`);
        console.log(`Program ID: ${program.programId.toString()}`);
        console.log(`Seller: ${seller.publicKey.toString().slice(0, 8)}...`);
        for (let i = 0; i < buyers.length; i++) {
            console.log(`Buyer ${i + 1}: ${buyers[i].publicKey.toString().slice(0, 8)}...`);
        }
        console.log('═══════════════════════════════════════════════════════');
        console.log('');
    });

    it('Step 1: Initialize AAPL/SOL Call Option', async () => {
        console.log('🔨 STEP 1: Initializing Contract');
        console.log('   Type: Call Option');
        console.log('   Underlying: AAPL/SOL');
        console.log('   Strike: 1.5 SOL');
        console.log('   Premium: 2 SOL');
        console.log('   Margin: 1 SOL (each party)');
        
        const initiationDate = Math.floor(Date.now() / 1000);
        
        await program.methods
            .initializeOption(
                CALL_OPTION,
                underlying,
                new anchor.BN(initiationDate),
                optionPrice,
                strikePrice,
                initialMargin,
                true
            )
            .accountsPartial({
                seller: seller.publicKey,
            })
            .signers([seller])
            .rpc();

        const optionAccount = await program.account.optionContract.fetch(optionPda);
        
        assert.equal(optionAccount.optionType, CALL_OPTION);
        assert.equal(optionAccount.underlying, underlying);
        assert.equal(optionAccount.seller.toString(), seller.publicKey.toString());
        
        console.log('   ✅ Contract initialized successfully');
        console.log(`   Contract Address: ${optionPda.toString()}`);
        console.log('');
    });

    it('Step 2: Buyer 1 purchases option (Transfer #1)', async () => {
        console.log('💰 STEP 2: Initial Purchase (Transfer #1)');
        console.log(`   Seller → Buyer 1`);
        console.log(`   Price: ${optionPrice.toNumber() / web3.LAMPORTS_PER_SOL} SOL`);
        
        await program.methods
            .purchaseOption()
            .accountsPartial({
                option: optionPda,
                buyer: buyers[0].publicKey,
                seller: seller.publicKey,
            })
            .signers([buyers[0], seller])
            .rpc();

        const optionAccount = await program.account.optionContract.fetch(optionPda);
        
        assert.equal(optionAccount.status.owned !== undefined, true);
        assert.equal(optionAccount.owner.toString(), buyers[0].publicKey.toString());
        
        console.log('   ✅ Purchase successful');
        console.log(`   New Owner: ${buyers[0].publicKey.toString().slice(0, 8)}...`);
        console.log('');
        
        // Settlement after purchase
        await performSettlement(0, 'After Purchase');
    });

    it('Step 3: Transfer #2 - Buyer 1 → Buyer 2', async () => {
        console.log('🔄 STEP 3: Resell #1 (Transfer #2)');
        console.log(`   Buyer 1 → Buyer 2`);
        console.log(`   Price: ${resellPrices[0].toNumber() / web3.LAMPORTS_PER_SOL} SOL`);
        console.log(`   Profit for Buyer 1: ${(resellPrices[0].toNumber() - optionPrice.toNumber()) / web3.LAMPORTS_PER_SOL} SOL`);
        
        await program.methods
            .resellOption(resellPrices[0])
            .accountsPartial({
                option: optionPda,
                currentOwner: buyers[0].publicKey,
                newBuyer: buyers[1].publicKey,
            })
            .signers([buyers[0], buyers[1]])
            .rpc();

        const optionAccount = await program.account.optionContract.fetch(optionPda);
        assert.equal(optionAccount.owner.toString(), buyers[1].publicKey.toString());
        
        console.log('   ✅ Resell successful');
        console.log(`   New Owner: ${buyers[1].publicKey.toString().slice(0, 8)}...`);
        console.log('');
        
        await performSettlement(1, 'After Transfer #2');
    });

    it('Step 4: Transfer #3 - Buyer 2 → Buyer 3', async () => {
        console.log('🔄 STEP 4: Resell #2 (Transfer #3)');
        console.log(`   Buyer 2 → Buyer 3`);
        console.log(`   Price: ${resellPrices[1].toNumber() / web3.LAMPORTS_PER_SOL} SOL`);
        console.log(`   Profit for Buyer 2: ${(resellPrices[1].toNumber() - resellPrices[0].toNumber()) / web3.LAMPORTS_PER_SOL} SOL`);
        
        await program.methods
            .resellOption(resellPrices[1])
            .accountsPartial({
                option: optionPda,
                currentOwner: buyers[1].publicKey,
                newBuyer: buyers[2].publicKey,
            })
            .signers([buyers[1], buyers[2]])
            .rpc();

        const optionAccount = await program.account.optionContract.fetch(optionPda);
        assert.equal(optionAccount.owner.toString(), buyers[2].publicKey.toString());
        
        console.log('   ✅ Resell successful');
        console.log(`   New Owner: ${buyers[2].publicKey.toString().slice(0, 8)}...`);
        console.log('');
        
        await performSettlement(2, 'After Transfer #3');
    });

    it('Step 5: Transfer #4 - Buyer 3 → Buyer 4', async () => {
        console.log('🔄 STEP 5: Resell #3 (Transfer #4)');
        console.log(`   Buyer 3 → Buyer 4`);
        console.log(`   Price: ${resellPrices[2].toNumber() / web3.LAMPORTS_PER_SOL} SOL`);
        console.log(`   Loss for Buyer 3: ${(resellPrices[1].toNumber() - resellPrices[2].toNumber()) / web3.LAMPORTS_PER_SOL} SOL`);
        
        await program.methods
            .resellOption(resellPrices[2])
            .accountsPartial({
                option: optionPda,
                currentOwner: buyers[2].publicKey,
                newBuyer: buyers[3].publicKey,
            })
            .signers([buyers[2], buyers[3]])
            .rpc();

        const optionAccount = await program.account.optionContract.fetch(optionPda);
        assert.equal(optionAccount.owner.toString(), buyers[3].publicKey.toString());
        
        console.log('   ✅ Resell successful');
        console.log(`   New Owner: ${buyers[3].publicKey.toString().slice(0, 8)}...`);
        console.log('');
        
        await performSettlement(3, 'After Transfer #4');
    });

    it('Step 6: Transfer #5 - Buyer 4 → Buyer 5 (Final)', async () => {
        console.log('🔄 STEP 6: Resell #4 (Transfer #5 - Final)');
        console.log(`   Buyer 4 → Buyer 5`);
        console.log(`   Price: ${resellPrices[3].toNumber() / web3.LAMPORTS_PER_SOL} SOL`);
        console.log(`   Profit for Buyer 4: ${(resellPrices[3].toNumber() - resellPrices[2].toNumber()) / web3.LAMPORTS_PER_SOL} SOL`);
        
        await program.methods
            .resellOption(resellPrices[3])
            .accountsPartial({
                option: optionPda,
                currentOwner: buyers[3].publicKey,
                newBuyer: buyers[4].publicKey,
            })
            .signers([buyers[3], buyers[4]])
            .rpc();

        const optionAccount = await program.account.optionContract.fetch(optionPda);
        assert.equal(optionAccount.owner.toString(), buyers[4].publicKey.toString());
        
        console.log('   ✅ Resell successful');
        console.log(`   New Owner (Final): ${buyers[4].publicKey.toString().slice(0, 8)}...`);
        console.log('');
        
        await performSettlement(4, 'After Transfer #5 (Final)');
    });

    it('Step 7: Exercise option at expiration', async () => {
        console.log('⚡ STEP 7: Exercise Option');
        console.log(`   Final Owner: Buyer 5`);
        
        const [aaplPrice, solPrice] = settlementPrices[4];
        const currentRatio = aaplPrice / solPrice;
        const strikeRatio = 1.5;
        
        console.log(`   AAPL: $${aaplPrice} | SOL: $${solPrice}`);
        console.log(`   Current Ratio: ${currentRatio.toFixed(3)} | Strike: ${strikeRatio}`);
        console.log(`   Status: ${currentRatio < strikeRatio ? 'IN THE MONEY' : 'OUT OF THE MONEY'}`);
        
        await program.methods
            .exerciseOption(toPrice(aaplPrice), toPrice(solPrice))
            .accountsPartial({
                option: optionPda,
                owner: buyers[4].publicKey,
            })
            .signers([buyers[4]])
            .rpc();

        const optionAccount = await program.account.optionContract.fetch(optionPda);
        const isSettled = optionAccount.status.expired !== undefined || optionAccount.status.marginCalled !== undefined;
        assert.isTrue(isSettled);
        
        console.log('   ✅ Option exercised successfully');
        console.log('');
        console.log('═══════════════════════════════════════════════════════');
        console.log('📊 OWNERSHIP TRANSFER SUMMARY');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`Contract: ${optionPda.toString()}`);
        console.log('');
        console.log('Transfer Chain:');
        console.log(`  0. Seller (${seller.publicKey.toString().slice(0, 8)}...) → Creates contract`);
        console.log(`  1. Buyer 1 (${buyers[0].publicKey.toString().slice(0, 8)}...) → Purchases for ${optionPrice.toNumber() / web3.LAMPORTS_PER_SOL} SOL`);
        console.log(`  2. Buyer 2 (${buyers[1].publicKey.toString().slice(0, 8)}...) → Buys for ${resellPrices[0].toNumber() / web3.LAMPORTS_PER_SOL} SOL`);
        console.log(`  3. Buyer 3 (${buyers[2].publicKey.toString().slice(0, 8)}...) → Buys for ${resellPrices[1].toNumber() / web3.LAMPORTS_PER_SOL} SOL`);
        console.log(`  4. Buyer 4 (${buyers[3].publicKey.toString().slice(0, 8)}...) → Buys for ${resellPrices[2].toNumber() / web3.LAMPORTS_PER_SOL} SOL`);
        console.log(`  5. Buyer 5 (${buyers[4].publicKey.toString().slice(0, 8)}...) → Buys for ${resellPrices[3].toNumber() / web3.LAMPORTS_PER_SOL} SOL (FINAL)`);
        console.log('');
        console.log(`Total Transfers: 5`);
        console.log(`Total Settlements: 5`);
        console.log(`Final Status: ${JSON.stringify(optionAccount.status)}`);
        console.log('═══════════════════════════════════════════════════════');
    });

    async function performSettlement(index: number, label: string) {
        const settler = web3.Keypair.generate();
        await connection.requestAirdrop(settler.publicKey, 1 * web3.LAMPORTS_PER_SOL);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const [aaplPrice, solPrice] = settlementPrices[index];
        console.log(`📊 Settlement: ${label}`);
        console.log(`   AAPL: $${aaplPrice} | SOL: $${solPrice} | Ratio: ${(aaplPrice/solPrice).toFixed(3)}`);
        
        const optionBefore = await program.account.optionContract.fetch(optionPda);
        
        await program.methods
            .dailySettlement(toPrice(aaplPrice), toPrice(solPrice))
            .accountsPartial({
                option: optionPda,
                settler: settler.publicKey,
            })
            .signers([settler])
            .rpc();

        const optionAfter = await program.account.optionContract.fetch(optionPda);
        
        console.log(`   Buyer Margin: ${optionBefore.buyerMargin.toNumber() / web3.LAMPORTS_PER_SOL} → ${optionAfter.buyerMargin.toNumber() / web3.LAMPORTS_PER_SOL} SOL`);
        console.log(`   Seller Margin: ${optionBefore.sellerMargin.toNumber() / web3.LAMPORTS_PER_SOL} → ${optionAfter.sellerMargin.toNumber() / web3.LAMPORTS_PER_SOL} SOL`);
        console.log('   ✅ Settlement completed');
        console.log('');
    }
});
