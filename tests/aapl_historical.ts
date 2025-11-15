import * as anchor from '@coral-xyz/anchor';
import { AnchorProvider, Program, web3 } from '@coral-xyz/anchor';
import { assert } from 'chai';
import { Escrow } from '../target/types/escrow';

/**
 * Comprehensive AAPL Historical Options Test Suite
 * 
 * Contract Details:
 * - Underlying: AAPL/SOL (Apple stock priced in Solana)
 * - Initiation Date: August 1, 2025
 * - Expiry Date: September 1, 2025 (30 days)
 * - Option Type: Call
 * - Strike Price: 1.5 SOL (equivalent to $225 if SOL=$150)
 * - Test Mode: Enabled (allows past dates)
 * 
 * This test suite uses mock price data to simulate:
 * 1. Contract initialization
 * 2. Option purchase with margin deposits
 * 3. Daily settlements over the contract period
 * 4. Margin call scenario with extreme price movements
 * 5. Resell functionality in secondary market
 * 6. Option exercise at expiration
 */

describe('AAPL Historical Options Contract (Aug 1 - Sep 1, 2025)', () => {
    const provider = AnchorProvider.local();
    const program = anchor.workspace.Escrow as Program<Escrow>;
    const connection = provider.connection;

    let seller: web3.Keypair;
    let buyer: web3.Keypair;
    let newBuyer: web3.Keypair;
    let optionPda: web3.PublicKey;
    
    const underlying = "AAPL/SOL";
    const CALL_OPTION = 0;
    
    // Historical dates (Unix timestamps)
    const initiationDate = new Date('2025-08-01T00:00:00Z').getTime() / 1000;
    const expiryDate = initiationDate + (30 * 24 * 60 * 60); // 30 days later
    
    // Contract parameters
    const optionPrice = new anchor.BN(2 * web3.LAMPORTS_PER_SOL); // 2 SOL premium
    const strikePrice = new anchor.BN(1.5 * 1_000_000_000); // Strike: 1.5 SOL (in lamports)
    const initialMargin = new anchor.BN(1 * web3.LAMPORTS_PER_SOL); // 1 SOL margin per party
    
    // Mock price data (simulating actual market prices)
    // Format: { date: [AAPL_price_usd, SOL_price_usd] }
    const priceData: { [key: string]: [number, number] } = {
        '2025-08-01': [225.50, 150.00], // Initial: AAPL=$225.50, SOL=$150 → ratio=1.503
        '2025-08-05': [228.75, 152.50], // Day 4: ratio=1.500
        '2025-08-10': [223.25, 148.00], // Day 9: ratio=1.509
        '2025-08-15': [230.50, 155.00], // Day 14: ratio=1.487
        '2025-08-20': [235.00, 160.00], // Day 19: ratio=1.469
        '2025-08-25': [232.50, 157.50], // Day 24: ratio=1.476
        '2025-08-30': [238.75, 162.00], // Day 29: ratio=1.474
        '2025-09-01': [240.00, 165.00], // Expiry: ratio=1.455
    };
    
    // Helper to convert USD prices to lamports (6 decimal precision)
    const toPrice = (usd: number): anchor.BN => {
        return new anchor.BN(Math.floor(usd * 1_000_000));
    };

    before(async () => {
        seller = web3.Keypair.generate();
        buyer = web3.Keypair.generate();
        newBuyer = web3.Keypair.generate();
        
        // Fund test accounts
        await connection.requestAirdrop(seller.publicKey, 10 * web3.LAMPORTS_PER_SOL);
        await connection.requestAirdrop(buyer.publicKey, 10 * web3.LAMPORTS_PER_SOL);
        await connection.requestAirdrop(newBuyer.publicKey, 10 * web3.LAMPORTS_PER_SOL);
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Calculate PDA
        [optionPda] = web3.PublicKey.findProgramAddressSync(
            [Buffer.from("option"), seller.publicKey.toBuffer(), Buffer.from(underlying)],
            program.programId
        );
    });

    it('Initializes AAPL Call option contract on Aug 1, 2025', async () => {
        console.log('📅 Initializing contract dated 2025-08-01');
        console.log(`   Strike: 1.5 SOL | Premium: 2 SOL | Margin: 1 SOL each`);
        
        await program.methods
            .initializeOption(
                CALL_OPTION,
                underlying,
                new anchor.BN(initiationDate),
                optionPrice,
                strikePrice,
                initialMargin,
                true  // Test mode enabled
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
        assert.equal(optionAccount.price.toNumber(), optionPrice.toNumber());
        assert.equal(optionAccount.strike.toNumber(), strikePrice.toNumber());
        assert.equal(optionAccount.isTest, true);
        assert.equal(optionAccount.initiationDate.toNumber(), initiationDate);
        assert.equal(optionAccount.expiryDate.toNumber(), expiryDate);
        assert.equal(optionAccount.status.listed !== undefined, true);
        
        console.log('✅ Contract initialized successfully');
        console.log(`   Initiation: ${new Date(initiationDate * 1000).toISOString().split('T')[0]}`);
        console.log(`   Expiry: ${new Date(expiryDate * 1000).toISOString().split('T')[0]}`);
    });

    it('Buyer purchases the AAPL option with margin deposits', async () => {
        console.log('\n💰 Buyer purchasing option...');
        
        const sellerBalanceBefore = await connection.getBalance(seller.publicKey);
        const pdaBalanceBefore = await connection.getBalance(optionPda);
        
        await program.methods
            .purchaseOption()
            .accountsPartial({
                option: optionPda,
                buyer: buyer.publicKey,
                seller: seller.publicKey,
            })
            .signers([buyer, seller])
            .rpc();

        const optionAccount = await program.account.optionContract.fetch(optionPda);
        const sellerBalanceAfter = await connection.getBalance(seller.publicKey);
        const pdaBalanceAfter = await connection.getBalance(optionPda);
        
        assert.equal(optionAccount.status.owned !== undefined, true);
        assert.equal(optionAccount.owner.toString(), buyer.publicKey.toString());
        assert.equal(optionAccount.buyerMargin.toNumber(), initialMargin.toNumber());
        assert.equal(optionAccount.sellerMargin.toNumber(), initialMargin.toNumber());
        
        // Verify seller received net premium (premium - margin - fees)
        // Seller receives premium but also deposits margin
        const netChange = sellerBalanceAfter - sellerBalanceBefore;
        const expectedNetChange = optionPrice.toNumber() - initialMargin.toNumber();
        assert.isTrue(netChange > expectedNetChange * 0.9, 'Seller should net premium minus margin');
        
        // Verify PDA holds both margins
        const marginDeposited = pdaBalanceAfter - pdaBalanceBefore;
        assert.isTrue(marginDeposited >= initialMargin.toNumber() * 2 * 0.9, 'PDA should hold both margins');
        
        console.log('✅ Purchase successful');
        console.log(`   Premium paid: ${optionPrice.toNumber() / web3.LAMPORTS_PER_SOL} SOL`);
        console.log(`   Buyer margin: ${initialMargin.toNumber() / web3.LAMPORTS_PER_SOL} SOL`);
        console.log(`   Seller margin: ${initialMargin.toNumber() / web3.LAMPORTS_PER_SOL} SOL`);
        console.log(`   Initial AAPL: $${priceData['2025-08-01'][0]} | SOL: $${priceData['2025-08-01'][1]}`);
    });

    it('Performs daily settlement on Aug 5 (Day 4)', async () => {
        console.log('\n📊 Daily Settlement: Aug 5, 2025 (Day 4)');
        
        const settler = web3.Keypair.generate();
        await connection.requestAirdrop(settler.publicKey, 1 * web3.LAMPORTS_PER_SOL);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const [aaplPrice, solPrice] = priceData['2025-08-05'];
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
        
        console.log(`   Buyer margin: ${optionBefore.buyerMargin.toNumber() / web3.LAMPORTS_PER_SOL} → ${optionAfter.buyerMargin.toNumber() / web3.LAMPORTS_PER_SOL} SOL`);
        console.log(`   Seller margin: ${optionBefore.sellerMargin.toNumber() / web3.LAMPORTS_PER_SOL} → ${optionAfter.sellerMargin.toNumber() / web3.LAMPORTS_PER_SOL} SOL`);
        
        assert.isTrue(optionAfter.lastSettlementDate.toNumber() > 0);
        // Last settlement price is stored in lamports scale (10^9)
        const expectedRatio = (aaplPrice / solPrice) * 1_000_000_000;
        assert.approximately(optionAfter.lastSettlementPrice.toNumber(), expectedRatio, expectedRatio * 0.001);
        console.log('✅ Settlement completed');
    });

    it('Performs daily settlement on Aug 10 (Day 9)', async () => {
        console.log('\n📊 Daily Settlement: Aug 10, 2025 (Day 9)');
        
        const settler = web3.Keypair.generate();
        await connection.requestAirdrop(settler.publicKey, 1 * web3.LAMPORTS_PER_SOL);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const [aaplPrice, solPrice] = priceData['2025-08-10'];
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
        
        console.log(`   Buyer margin: ${optionBefore.buyerMargin.toNumber() / web3.LAMPORTS_PER_SOL} → ${optionAfter.buyerMargin.toNumber() / web3.LAMPORTS_PER_SOL} SOL`);
        console.log(`   Seller margin: ${optionBefore.sellerMargin.toNumber() / web3.LAMPORTS_PER_SOL} → ${optionAfter.sellerMargin.toNumber() / web3.LAMPORTS_PER_SOL} SOL`);
        console.log('✅ Settlement completed');
    });

    it('Performs daily settlement on Aug 15 (Day 14)', async () => {
        console.log('\n📊 Daily Settlement: Aug 15, 2025 (Day 14)');
        
        const settler = web3.Keypair.generate();
        await connection.requestAirdrop(settler.publicKey, 1 * web3.LAMPORTS_PER_SOL);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const [aaplPrice, solPrice] = priceData['2025-08-15'];
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
        
        console.log(`   Buyer margin: ${optionBefore.buyerMargin.toNumber() / web3.LAMPORTS_PER_SOL} → ${optionAfter.buyerMargin.toNumber() / web3.LAMPORTS_PER_SOL} SOL`);
        console.log(`   Seller margin: ${optionBefore.sellerMargin.toNumber() / web3.LAMPORTS_PER_SOL} → ${optionAfter.sellerMargin.toNumber() / web3.LAMPORTS_PER_SOL} SOL`);
        console.log('✅ Settlement completed');
    });

    it('Resells option to new buyer on Aug 18', async () => {
        console.log('\n🔄 Reselling option on secondary market...');
        
        const resellPrice = new anchor.BN(2.5 * web3.LAMPORTS_PER_SOL); // 2.5 SOL (profit for original buyer)
        
        const oldBuyerBalanceBefore = await connection.getBalance(buyer.publicKey);
        const newBuyerBalanceBefore = await connection.getBalance(newBuyer.publicKey);
        
        await program.methods
            .resellOption(resellPrice)
            .accountsPartial({
                option: optionPda,
                currentOwner: buyer.publicKey,
                newBuyer: newBuyer.publicKey,
            })
            .signers([buyer, newBuyer])
            .rpc();

        const optionAccount = await program.account.optionContract.fetch(optionPda);
        const oldBuyerBalanceAfter = await connection.getBalance(buyer.publicKey);
        const newBuyerBalanceAfter = await connection.getBalance(newBuyer.publicKey);
        
        assert.equal(optionAccount.owner.toString(), newBuyer.publicKey.toString());
        assert.equal(optionAccount.status.owned !== undefined, true);
        
        // Original buyer gets resell price + margin back
        assert.isTrue(oldBuyerBalanceAfter > oldBuyerBalanceBefore, 'Original buyer profits');
        
        // New buyer pays resell price + deposits margin
        const expectedCost = resellPrice.toNumber() + initialMargin.toNumber();
        assert.isTrue(newBuyerBalanceBefore - newBuyerBalanceAfter >= expectedCost * 0.9);
        
        console.log('✅ Resell successful');
        console.log(`   Resell price: ${resellPrice.toNumber() / web3.LAMPORTS_PER_SOL} SOL`);
        console.log(`   Original buyer profit: ~${(resellPrice.toNumber() - optionPrice.toNumber()) / web3.LAMPORTS_PER_SOL} SOL`);
        console.log(`   New owner: ${newBuyer.publicKey.toString().slice(0, 8)}...`);
    });

    it('Performs daily settlement on Aug 20 (Day 19) - after resell', async () => {
        console.log('\n📊 Daily Settlement: Aug 20, 2025 (Day 19) - New Owner');
        
        const settler = web3.Keypair.generate();
        await connection.requestAirdrop(settler.publicKey, 1 * web3.LAMPORTS_PER_SOL);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const [aaplPrice, solPrice] = priceData['2025-08-20'];
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
        
        console.log(`   New buyer margin: ${optionBefore.buyerMargin.toNumber() / web3.LAMPORTS_PER_SOL} → ${optionAfter.buyerMargin.toNumber() / web3.LAMPORTS_PER_SOL} SOL`);
        console.log(`   Seller margin: ${optionBefore.sellerMargin.toNumber() / web3.LAMPORTS_PER_SOL} → ${optionAfter.sellerMargin.toNumber() / web3.LAMPORTS_PER_SOL} SOL`);
        console.log('✅ Settlement completed');
    });

    it('Exercises option at expiration on Sep 1, 2025', async () => {
        console.log('\n⚡ Exercising option at expiration...');
        
        const [aaplPrice, solPrice] = priceData['2025-09-01'];
        console.log(`   Expiry prices - AAPL: $${aaplPrice} | SOL: $${solPrice}`);
        console.log(`   Current ratio: ${(aaplPrice/solPrice).toFixed(3)} | Strike: 1.5`);
        
        const currentRatio = aaplPrice / solPrice;
        const strikeRatio = 1.5;
        const inTheMoney = currentRatio < strikeRatio; // Call is ITM if current < strike
        
        console.log(`   Option is ${inTheMoney ? 'IN THE MONEY' : 'OUT OF THE MONEY'}`);
        
        const optionBefore = await program.account.optionContract.fetch(optionPda);
        const buyerBalanceBefore = await connection.getBalance(newBuyer.publicKey);
        const sellerBalanceBefore = await connection.getBalance(seller.publicKey);
        
        await program.methods
            .exerciseOption(toPrice(aaplPrice), toPrice(solPrice))
            .accountsPartial({
                option: optionPda,
                owner: newBuyer.publicKey,
            })
            .signers([newBuyer])
            .rpc();

        const optionAfter = await program.account.optionContract.fetch(optionPda);
        const buyerBalanceAfter = await connection.getBalance(newBuyer.publicKey);
        const sellerBalanceAfter = await connection.getBalance(seller.publicKey);
        
        // Exercise should mark the option as Expired
        console.log(`   Status after exercise: ${JSON.stringify(optionAfter.status)}`);
        const isSettled = optionAfter.status.expired !== undefined || optionAfter.status.marginCalled !== undefined;
        assert.isTrue(isSettled, 'Option should be expired or margin called after exercise');
        
        console.log('✅ Option exercised');
        console.log(`   Final buyer margin: ${optionAfter.buyerMargin.toNumber() / web3.LAMPORTS_PER_SOL} SOL`);
        console.log(`   Final seller margin: ${optionAfter.sellerMargin.toNumber() / web3.LAMPORTS_PER_SOL} SOL`);
        console.log(`   Buyer balance change: ${(buyerBalanceAfter - buyerBalanceBefore) / web3.LAMPORTS_PER_SOL} SOL`);
        console.log(`   Seller balance change: ${(sellerBalanceAfter - sellerBalanceBefore) / web3.LAMPORTS_PER_SOL} SOL`);
    });

    it('Tests margin call scenario with extreme price movement', async () => {
        console.log('\n⚠️  Testing Margin Call Scenario...');
        console.log('   Creating new contract with small margins for extreme volatility test');
        
        // Create a new contract for margin call test
        const marginCallUnderlying = "AAPL-MARGIN-TEST/SOL";
        const smallMargin = new anchor.BN(0.1 * web3.LAMPORTS_PER_SOL); // 0.1 SOL - very small
        const smallPrice = new anchor.BN(0.2 * web3.LAMPORTS_PER_SOL);
        
        const marginSeller = web3.Keypair.generate();
        const marginBuyer = web3.Keypair.generate();
        
        await connection.requestAirdrop(marginSeller.publicKey, 5 * web3.LAMPORTS_PER_SOL);
        await connection.requestAirdrop(marginBuyer.publicKey, 5 * web3.LAMPORTS_PER_SOL);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const [marginPda] = web3.PublicKey.findProgramAddressSync(
            [Buffer.from("option"), marginSeller.publicKey.toBuffer(), Buffer.from(marginCallUnderlying)],
            program.programId
        );
        
        // Initialize with early August date
        const marginInitDate = new Date('2025-08-01T00:00:00Z').getTime() / 1000;
        
        await program.methods
            .initializeOption(
                0, // CALL
                marginCallUnderlying,
                new anchor.BN(marginInitDate),
                smallPrice,
                strikePrice,
                smallMargin,
                true
            )
            .accountsPartial({
                seller: marginSeller.publicKey,
            })
            .signers([marginSeller])
            .rpc();
        
        await program.methods
            .purchaseOption()
            .accountsPartial({
                option: marginPda,
                buyer: marginBuyer.publicKey,
                seller: marginSeller.publicKey,
            })
            .signers([marginBuyer, marginSeller])
            .rpc();
        
        const optionBefore = await program.account.optionContract.fetch(marginPda);
        console.log(`   Initial margins: Buyer=${optionBefore.buyerMargin.toNumber() / web3.LAMPORTS_PER_SOL} SOL, Seller=${optionBefore.sellerMargin.toNumber() / web3.LAMPORTS_PER_SOL} SOL`);
        
        // Simulate gradual price increases to erode seller margin  
        // For a CALL option with strike 1.5, if price ratio goes well above 1.5, seller loses
        // Initial: 225/150 = 1.5 (at strike)
        // Target: Much higher ratio to cause seller losses
        const settler = web3.Keypair.generate();
        await connection.requestAirdrop(settler.publicKey, 2 * web3.LAMPORTS_PER_SOL);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // First settlement at initial purchase price (establish baseline)
        let currentOption = await program.account.optionContract.fetch(marginPda);
        console.log(`   Initial: AAPL/SOL ratio = ${(225.5/150).toFixed(3)} (at strike 1.5)`);
        
        await program.methods
            .dailySettlement(toPrice(225.50), toPrice(150.00))
            .accountsPartial({
                option: marginPda,
                settler: settler.publicKey,
            })
            .signers([settler])
            .rpc();
        
        // Settlement 1: Moderate price increase (ratio = 1.67)
        await program.methods
            .dailySettlement(toPrice(240.00), toPrice(144.00))
            .accountsPartial({
                option: marginPda,
                settler: settler.publicKey,
            })
            .signers([settler])
            .rpc();
        
        currentOption = await program.account.optionContract.fetch(marginPda);
        console.log(`   After Settlement 1 (ratio 1.67): Buyer=${currentOption.buyerMargin.toNumber() / web3.LAMPORTS_PER_SOL} | Seller=${currentOption.sellerMargin.toNumber() / web3.LAMPORTS_PER_SOL}`);
        
        // Check if margin call was triggered
        const marginCallThreshold = smallMargin.toNumber() * 0.2;
        const marginCallTriggered = currentOption.status.marginCalled !== undefined;
        
        if (marginCallTriggered) {
            console.log('✅ Margin call triggered - contract automatically settled with MarginCalled status');
            console.log(`   Final margins: Buyer=${currentOption.buyerMargin.toNumber() / web3.LAMPORTS_PER_SOL} | Seller=${currentOption.sellerMargin.toNumber() / web3.LAMPORTS_PER_SOL}`);
            assert.isTrue(true, 'Margin call triggered as expected');
        } else {
            const minMargin = Math.min(currentOption.buyerMargin.toNumber(), currentOption.sellerMargin.toNumber());
            const marginPct = (minMargin / smallMargin.toNumber() * 100).toFixed(1);
            console.log(`   Margins at ${marginPct}% of initial`);
            
            // Settlement 2: Larger increase (ratio = 1.88)
            await program.methods
                .dailySettlement(toPrice(250.00), toPrice(133.00))
                .accountsPartial({
                    option: marginPda,
                    settler: settler.publicKey,
                })
                .signers([settler])
                .rpc();
            
            const finalOption = await program.account.optionContract.fetch(marginPda);
            console.log(`   After Settlement 2 (ratio 1.88): Buyer=${finalOption.buyerMargin.toNumber() / web3.LAMPORTS_PER_SOL} | Seller=${finalOption.sellerMargin.toNumber() / web3.LAMPORTS_PER_SOL}`);
            
            const finalMarginCallTriggered = finalOption.status.marginCalled !== undefined;
            console.log(`   ${finalMarginCallTriggered ? '✅ Margin call triggered (MarginCalled status)' : '⚠️  Still no margin call'}`);
            assert.isTrue(finalMarginCallTriggered, 'Margin call should eventually trigger');
        }
    });
});
