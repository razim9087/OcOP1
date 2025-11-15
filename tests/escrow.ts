import * as anchor from '@coral-xyz/anchor';
import { AnchorProvider, Program, web3 } from '@coral-xyz/anchor';
import { assert } from 'chai';
import { Escrow } from '../target/types/escrow';

describe('Options Contract', () => {
    const provider = AnchorProvider.local();
    
    // Use anchor.workspace to access the program
    const program = anchor.workspace.Escrow as Program<Escrow>;
    const connection = provider.connection;

    let seller: web3.Keypair;
    let buyer: web3.Keypair;
    
    const underlying = "SOL/USDC";
    const optionPrice = new anchor.BN(1 * web3.LAMPORTS_PER_SOL); // 1 SOL
    const strikePrice = new anchor.BN(150_000_000_000); // Strike: 150 SOL per asset unit
    const initialMargin = new anchor.BN(0.5 * web3.LAMPORTS_PER_SOL); // 0.5 SOL margin per party
    const CALL_OPTION = 0;
    const PUT_OPTION = 1;

    before(async () => {
        seller = web3.Keypair.generate();
        buyer = web3.Keypair.generate();
        
        // Airdrop SOL to users for testing
        await connection.requestAirdrop(seller.publicKey, 5 * web3.LAMPORTS_PER_SOL);
        await connection.requestAirdrop(buyer.publicKey, 5 * web3.LAMPORTS_PER_SOL);
        
        // Wait for airdrops to confirm
        await new Promise(resolve => setTimeout(resolve, 2000));
    });

    it('Initializes a Call option contract', async () => {
        const currentTime = Math.floor(Date.now() / 1000);
        
        const [optionPda] = web3.PublicKey.findProgramAddressSync(
            [Buffer.from("option"), seller.publicKey.toBuffer(), Buffer.from(underlying)],
            program.programId
        );

        await program.methods
            .initializeOption(
                CALL_OPTION,
                underlying,
                new anchor.BN(currentTime),
                optionPrice,
                strikePrice,
                initialMargin,
                true  // is_test mode
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
        assert.equal(optionAccount.status.listed !== undefined, true);
        
        // Verify expiry is 30 days from initiation
        const expectedExpiry = currentTime + (30 * 24 * 60 * 60);
        assert.equal(optionAccount.expiryDate.toNumber(), expectedExpiry);
    });

    it('Purchases an option contract', async () => {
        const currentTime = Math.floor(Date.now() / 1000);
        const underlying2 = "ETH/USDC";
        
        const [optionPda] = web3.PublicKey.findProgramAddressSync(
            [Buffer.from("option"), seller.publicKey.toBuffer(), Buffer.from(underlying2)],
            program.programId
        );

        // Initialize option
        await program.methods
            .initializeOption(
                PUT_OPTION,
                underlying2,
                new anchor.BN(currentTime),
                optionPrice,
                strikePrice,
                initialMargin,
                true  // is_test mode
            )
            .accountsPartial({
                seller: seller.publicKey,
            })
            .signers([seller])
            .rpc();

        // Get seller balance before
        const sellerBalanceBefore = await connection.getBalance(seller.publicKey);

        // Purchase option
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
        
        assert.equal(optionAccount.status.owned !== undefined, true);
        assert.equal(optionAccount.owner.toString(), buyer.publicKey.toString());
        
        // Verify payment transferred
        const sellerBalanceAfter = await connection.getBalance(seller.publicKey);
        assert.isTrue(sellerBalanceAfter > sellerBalanceBefore);
    });

    it('Prevents early exercise before expiry date', async () => {
        const currentTime = Math.floor(Date.now() / 1000);
        const underlying3 = "BTC/USDC";
        
        const [optionPda] = web3.PublicKey.findProgramAddressSync(
            [Buffer.from("option"), seller.publicKey.toBuffer(), Buffer.from(underlying3)],
            program.programId
        );

        // Initialize and purchase option (production mode to test early exercise prevention)
        await program.methods
            .initializeOption(
                CALL_OPTION,
                underlying3,
                new anchor.BN(currentTime),
                optionPrice,
                strikePrice,
                initialMargin,
                false  // production mode - enforces European option rules
            )
            .accountsPartial({
                seller: seller.publicKey,
            })
            .signers([seller])
            .rpc();

        await program.methods
            .purchaseOption()
            .accountsPartial({
                option: optionPda,
                buyer: buyer.publicKey,
                seller: seller.publicKey,
            })
            .signers([buyer, seller])
            .rpc();

        // Attempt to exercise before expiry - should fail
        const assetPrice = new anchor.BN(100_000_000); // $100 USD (6 decimals)
        const solPrice = new anchor.BN(50_000_000);    // $50 USD (6 decimals)
        
        try {
            await program.methods
                .exerciseOption(assetPrice, solPrice)
                .accountsPartial({
                    option: optionPda,
                    owner: buyer.publicKey,
                })
                .signers([buyer])
                .rpc();
            
            assert.fail("Should have thrown error for early exercise");
        } catch (error: any) {
            assert.include(error.toString(), "CannotExerciseBeforeExpiry");
        }

        // Verify option is still owned (not exercised)
        const optionAccount = await program.account.optionContract.fetch(optionPda);
        assert.equal(optionAccount.status.owned !== undefined, true);
    });

    it('Verifies margin deposits after purchase', async () => {
        const currentTime = Math.floor(Date.now() / 1000);
        const underlying5 = "AVAX/USDC";
        
        const [optionPda] = web3.PublicKey.findProgramAddressSync(
            [Buffer.from("option"), seller.publicKey.toBuffer(), Buffer.from(underlying5)],
            program.programId
        );

        // Initialize option
        await program.methods
            .initializeOption(
                CALL_OPTION,
                underlying5,
                new anchor.BN(currentTime),
                optionPrice,
                strikePrice,
                initialMargin,
                true  // is_test mode
            )
            .accountsPartial({
                seller: seller.publicKey,
            })
            .signers([seller])
            .rpc();

        // Get option PDA balance before purchase
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

        // Verify margins are set correctly
        const optionAccount = await program.account.optionContract.fetch(optionPda);
        assert.equal(optionAccount.buyerMargin.toNumber(), initialMargin.toNumber());
        assert.equal(optionAccount.sellerMargin.toNumber(), initialMargin.toNumber());
        assert.equal(optionAccount.initialMargin.toNumber(), initialMargin.toNumber());
        
        // Verify PDA received both margin deposits
        const pdaBalanceAfter = await connection.getBalance(optionPda);
        const expectedIncrease = initialMargin.toNumber() * 2; // Both buyer and seller margins
        assert.isTrue(pdaBalanceAfter >= pdaBalanceBefore + expectedIncrease);
    });

    it('Delists an unsold option', async () => {
        const currentTime = Math.floor(Date.now() / 1000);
        const underlying4 = "MATIC/USDC";
        
        const [optionPda] = web3.PublicKey.findProgramAddressSync(
            [Buffer.from("option"), seller.publicKey.toBuffer(), Buffer.from(underlying4)],
            program.programId
        );

        // Initialize option
        await program.methods
            .initializeOption(
                PUT_OPTION,
                underlying4,
                new anchor.BN(currentTime),
                optionPrice,
                strikePrice,
                initialMargin,
                true  // is_test mode
            )
            .accountsPartial({
                seller: seller.publicKey,
            })
            .signers([seller])
            .rpc();

        // Delist option
        await program.methods
            .delistOption()
            .accountsPartial({
                option: optionPda,
                seller: seller.publicKey,
            })
            .signers([seller])
            .rpc();

        const optionAccount = await program.account.optionContract.fetch(optionPda);
        assert.equal(optionAccount.status.delisted !== undefined, true);
    });

    it('Resells an option to a new buyer', async () => {
        const currentTime = Math.floor(Date.now() / 1000);
        const underlying9 = "UNI/USDC";
        
        // Use fresh keypairs with adequate funds
        const freshSeller = web3.Keypair.generate();
        const freshBuyer = web3.Keypair.generate();
        
        await connection.requestAirdrop(freshSeller.publicKey, 5 * web3.LAMPORTS_PER_SOL);
        await connection.requestAirdrop(freshBuyer.publicKey, 5 * web3.LAMPORTS_PER_SOL);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const [optionPda] = web3.PublicKey.findProgramAddressSync(
            [Buffer.from("option"), freshSeller.publicKey.toBuffer(), Buffer.from(underlying9)],
            program.programId
        );

        // Initialize option
        await program.methods
            .initializeOption(
                CALL_OPTION,
                underlying9,
                new anchor.BN(currentTime),
                optionPrice,
                strikePrice,
                initialMargin,
                true  // is_test mode
            )
            .accountsPartial({
                seller: freshSeller.publicKey,
            })
            .signers([freshSeller])
            .rpc();

        // First purchase by original buyer
        await program.methods
            .purchaseOption()
            .accountsPartial({
                option: optionPda,
                buyer: freshBuyer.publicKey,
                seller: freshSeller.publicKey,
            })
            .signers([freshBuyer, freshSeller])
            .rpc();

        // Create a new buyer
        const newBuyer = web3.Keypair.generate();
        await connection.requestAirdrop(newBuyer.publicKey, 5 * web3.LAMPORTS_PER_SOL);
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Get balances before resell
        const buyerBalanceBefore = await connection.getBalance(freshBuyer.publicKey);
        const newBuyerBalanceBefore = await connection.getBalance(newBuyer.publicKey);

        // Resell at a higher price
        const resellPrice = new anchor.BN(1.5 * web3.LAMPORTS_PER_SOL); // 1.5 SOL
        
        await program.methods
            .resellOption(resellPrice)
            .accountsPartial({
                option: optionPda,
                currentOwner: freshBuyer.publicKey,
                newBuyer: newBuyer.publicKey,
            })
            .signers([freshBuyer, newBuyer])
            .rpc();

        // Verify new owner
        const optionAccount = await program.account.optionContract.fetch(optionPda);
        assert.equal(optionAccount.owner.toString(), newBuyer.publicKey.toString());
        assert.equal(optionAccount.status.owned !== undefined, true);

        // Verify original buyer received resell price and their margin back
        const buyerBalanceAfter = await connection.getBalance(freshBuyer.publicKey);
        assert.isTrue(buyerBalanceAfter > buyerBalanceBefore, "Original buyer should receive payment");

        // Verify new buyer paid resell price and deposited margin
        const newBuyerBalanceAfter = await connection.getBalance(newBuyer.publicKey);
        const expectedCost = resellPrice.toNumber() + initialMargin.toNumber();
        assert.isTrue(newBuyerBalanceBefore - newBuyerBalanceAfter >= expectedCost * 0.9, "New buyer should pay resell price and margin");
    });

    it('Prevents unauthorized resell', async () => {
        const currentTime = Math.floor(Date.now() / 1000);
        const underlying10 = "AAVE/USDC";
        
        const freshSeller = web3.Keypair.generate();
        const freshBuyer = web3.Keypair.generate();
        const unauthorized = web3.Keypair.generate();
        
        await connection.requestAirdrop(freshSeller.publicKey, 5 * web3.LAMPORTS_PER_SOL);
        await connection.requestAirdrop(freshBuyer.publicKey, 5 * web3.LAMPORTS_PER_SOL);
        await connection.requestAirdrop(unauthorized.publicKey, 5 * web3.LAMPORTS_PER_SOL);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const [optionPda] = web3.PublicKey.findProgramAddressSync(
            [Buffer.from("option"), freshSeller.publicKey.toBuffer(), Buffer.from(underlying10)],
            program.programId
        );

        // Initialize and purchase option
        await program.methods
            .initializeOption(
                PUT_OPTION,
                underlying10,
                new anchor.BN(currentTime),
                optionPrice,
                strikePrice,
                initialMargin,
                true  // is_test mode
            )
            .accountsPartial({
                seller: freshSeller.publicKey,
            })
            .signers([freshSeller])
            .rpc();

        await program.methods
            .purchaseOption()
            .accountsPartial({
                option: optionPda,
                buyer: freshBuyer.publicKey,
                seller: freshSeller.publicKey,
            })
            .signers([freshBuyer, freshSeller])
            .rpc();

        const newBuyer = web3.Keypair.generate();
        await connection.requestAirdrop(newBuyer.publicKey, 5 * web3.LAMPORTS_PER_SOL);
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Try to resell with unauthorized user (should fail)
        const resellPrice = new anchor.BN(1.5 * web3.LAMPORTS_PER_SOL);
        
        try {
            await program.methods
                .resellOption(resellPrice)
                .accountsPartial({
                    option: optionPda,
                    currentOwner: unauthorized.publicKey,
                    newBuyer: newBuyer.publicKey,
                })
                .signers([unauthorized, newBuyer])
                .rpc();
            
            assert.fail("Should have thrown error for unauthorized resell");
        } catch (error: any) {
            assert.include(error.toString(), "Unauthorized");
        }
    });

    it.skip('Performs daily settlement and updates margins (requires 24hr wait)', async () => {
        // This test is skipped because it requires 24 hours to pass since purchase
        // In a real scenario, daily settlement would be called after 24+ hours
        const currentTime = Math.floor(Date.now() / 1000);
        const underlying6 = "ADA/USDC";
        
        const [optionPda] = web3.PublicKey.findProgramAddressSync(
            [Buffer.from("option"), seller.publicKey.toBuffer(), Buffer.from(underlying6)],
            program.programId
        );

        await program.methods
            .initializeOption(
                CALL_OPTION,
                underlying6,
                new anchor.BN(currentTime),
                optionPrice,
                strikePrice,
                initialMargin,
                true  // is_test mode
            )
            .accountsPartial({
                seller: seller.publicKey,
            })
            .signers([seller])
            .rpc();

        await program.methods
            .purchaseOption()
            .accountsPartial({
                option: optionPda,
                buyer: buyer.publicKey,
                seller: seller.publicKey,
            })
            .signers([buyer, seller])
            .rpc();

        // Note: In production, wait 24+ hours before calling daily_settlement
        const settlementAssetPrice = new anchor.BN(110_000_000); 
        const settlementSolPrice = new anchor.BN(50_000_000);
        
        const settler = web3.Keypair.generate();
        await connection.requestAirdrop(settler.publicKey, 1 * web3.LAMPORTS_PER_SOL);
        await new Promise(resolve => setTimeout(resolve, 1000));

        await program.methods
            .dailySettlement(settlementAssetPrice, settlementSolPrice)
            .accountsPartial({
                option: optionPda,
                settler: settler.publicKey,
            })
            .signers([settler])
            .rpc();

        const optionAfter = await program.account.optionContract.fetch(optionPda);
        assert.isTrue(optionAfter.lastSettlementDate.toNumber() > 0);
    });

    it.skip('Triggers margin call when margin falls below 20% threshold (requires 24hr wait)', async () => {
        const currentTime = Math.floor(Date.now() / 1000);
        const underlying7 = "DOT/USDC";
        
        const [optionPda] = web3.PublicKey.findProgramAddressSync(
            [Buffer.from("option"), seller.publicKey.toBuffer(), Buffer.from(underlying7)],
            program.programId
        );

        // Use smaller amounts for this test
        const smallMargin = new anchor.BN(0.1 * web3.LAMPORTS_PER_SOL); // 0.1 SOL
        const smallPrice = new anchor.BN(0.2 * web3.LAMPORTS_PER_SOL); // 0.2 SOL

        // Initialize PUT option
        await program.methods
            .initializeOption(
                PUT_OPTION,
                underlying7,
                new anchor.BN(currentTime),
                smallPrice,
                strikePrice,
                smallMargin,
                true  // is_test mode
            )
            .accountsPartial({
                seller: seller.publicKey,
            })
            .signers([seller])
            .rpc();

        await program.methods
            .purchaseOption()
            .accountsPartial({
                option: optionPda,
                buyer: buyer.publicKey,
                seller: seller.publicKey,
            })
            .signers([buyer, seller])
            .rpc();

        // Note: This test is skipped because settlement requires 24 hours to pass
        // In production, after 24+ hours, call daily_settlement with extreme prices
        const extremeAssetPrice = new anchor.BN(500_000_000); 
        const extremeSolPrice = new anchor.BN(50_000_000);
        
        const settler = web3.Keypair.generate();
        await connection.requestAirdrop(settler.publicKey, 1 * web3.LAMPORTS_PER_SOL);
        await new Promise(resolve => setTimeout(resolve, 1000));

        await program.methods
            .dailySettlement(extremeAssetPrice, extremeSolPrice)
            .accountsPartial({
                option: optionPda,
                settler: settler.publicKey,
            })
            .signers([settler])
            .rpc();

        const optionAfter = await program.account.optionContract.fetch(optionPda);
        const marginCallTriggered = optionAfter.status.expired !== undefined;
        assert.isTrue(marginCallTriggered);
    });

    it.skip('Prevents settlement on the same day (requires 24hr wait)', async () => {
        const currentTime = Math.floor(Date.now() / 1000);
        const underlying8 = "LINK/USDC";
        
        const [optionPda] = web3.PublicKey.findProgramAddressSync(
            [Buffer.from("option"), seller.publicKey.toBuffer(), Buffer.from(underlying8)],
            program.programId
        );

        const smallPrice = new anchor.BN(0.2 * web3.LAMPORTS_PER_SOL);

        await program.methods
            .initializeOption(
                CALL_OPTION,
                underlying8,
                new anchor.BN(currentTime),
                smallPrice,
                strikePrice,
                initialMargin,
                true  // is_test mode
            )
            .accountsPartial({
                seller: seller.publicKey,
            })
            .signers([seller])
            .rpc();

        await program.methods
            .purchaseOption()
            .accountsPartial({
                option: optionPda,
                buyer: buyer.publicKey,
                seller: seller.publicKey,
            })
            .signers([buyer, seller])
            .rpc();

        // First settlement
        const assetPrice = new anchor.BN(100_000_000);
        const solPrice = new anchor.BN(50_000_000);
        
        const settler = web3.Keypair.generate();
        await connection.requestAirdrop(settler.publicKey, 1 * web3.LAMPORTS_PER_SOL);
        await new Promise(resolve => setTimeout(resolve, 1000));

        await program.methods
            .dailySettlement(assetPrice, solPrice)
            .accountsPartial({
                option: optionPda,
                settler: settler.publicKey,
            })
            .signers([settler])
            .rpc();

        // Attempt second settlement immediately (should fail)
        try {
            await program.methods
                .dailySettlement(assetPrice, solPrice)
                .accountsPartial({
                    option: optionPda,
                    settler: settler.publicKey,
                })
                .signers([settler])
                .rpc();
            
            assert.fail("Should have thrown error for same-day settlement");
        } catch (error: any) {
            assert.include(error.toString(), "AlreadySettledToday");
        }
    });

    it('Allows past dates for test contracts', async () => {
        const pastTime = Math.floor(Date.now() / 1000) - (10 * 24 * 60 * 60); // 10 days ago
        const underlying11 = "TEST/USDC";
        
        const freshSeller = web3.Keypair.generate();
        await connection.requestAirdrop(freshSeller.publicKey, 5 * web3.LAMPORTS_PER_SOL);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const [optionPda] = web3.PublicKey.findProgramAddressSync(
            [Buffer.from("option"), freshSeller.publicKey.toBuffer(), Buffer.from(underlying11)],
            program.programId
        );

        // Initialize test contract with past date (should succeed)
        await program.methods
            .initializeOption(
                CALL_OPTION,
                underlying11,
                new anchor.BN(pastTime),
                optionPrice,
                strikePrice,
                initialMargin,
                true  // is_test mode - allows past dates
            )
            .accountsPartial({
                seller: freshSeller.publicKey,
            })
            .signers([freshSeller])
            .rpc();

        const optionAccount = await program.account.optionContract.fetch(optionPda);
        assert.equal(optionAccount.isTest, true);
        assert.equal(optionAccount.initiationDate.toNumber(), pastTime);
    });

    it('Prevents past dates for production contracts', async () => {
        const pastTime = Math.floor(Date.now() / 1000) - (10 * 24 * 60 * 60); // 10 days ago
        const underlying12 = "PROD/USDC";
        
        const freshSeller = web3.Keypair.generate();
        await connection.requestAirdrop(freshSeller.publicKey, 5 * web3.LAMPORTS_PER_SOL);
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Try to initialize production contract with past date (should fail)
        try {
            await program.methods
                .initializeOption(
                    CALL_OPTION,
                    underlying12,
                    new anchor.BN(pastTime),
                    optionPrice,
                    strikePrice,
                    initialMargin,
                    false  // production mode - rejects past dates
                )
                .accountsPartial({
                    seller: freshSeller.publicKey,
                })
                .signers([freshSeller])
                .rpc();
            
            assert.fail("Should have thrown error for past initiation date");
        } catch (error: any) {
            assert.include(error.toString(), "InvalidInitiationDate");
        }
    });
});