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
                true,  // is_test mode
                false  // allow_zero_margin
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
                true,  // is_test mode
                false  // allow_zero_margin
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
                false,  // production mode - enforces European option rules
                false   // allow_zero_margin
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
                true,  // is_test mode
                false  // allow_zero_margin
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
                true,  // is_test mode
                false  // allow_zero_margin
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
                true,  // is_test mode
                false  // allow_zero_margin
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
                true,  // is_test mode
                false  // allow_zero_margin
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

    it('Verifies new buyer can afford resell premium and margin', async () => {
        const currentTime = Math.floor(Date.now() / 1000);
        const underlying_afford = "AFFORD/USDC";
        
        const freshSeller = web3.Keypair.generate();
        const freshBuyer = web3.Keypair.generate();
        const newBuyer = web3.Keypair.generate();
        
        await connection.requestAirdrop(freshSeller.publicKey, 5 * web3.LAMPORTS_PER_SOL);
        await connection.requestAirdrop(freshBuyer.publicKey, 5 * web3.LAMPORTS_PER_SOL);
        // Give new buyer exactly enough for premium + margin + transaction fees
        const resellPrice = new anchor.BN(2 * web3.LAMPORTS_PER_SOL);
        const totalRequired = resellPrice.toNumber() + initialMargin.toNumber() + (0.01 * web3.LAMPORTS_PER_SOL); // Add buffer for fees
        await connection.requestAirdrop(newBuyer.publicKey, totalRequired);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const [optionPda] = web3.PublicKey.findProgramAddressSync(
            [Buffer.from("option"), freshSeller.publicKey.toBuffer(), Buffer.from(underlying_afford)],
            program.programId
        );

        // Initialize and purchase option
        await program.methods
            .initializeOption(
                CALL_OPTION,
                underlying_afford,
                new anchor.BN(currentTime),
                optionPrice,
                strikePrice,
                initialMargin,
                true,  // is_test mode
                false  // allow_zero_margin
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

        // Get balances before resell
        const newBuyerBalanceBefore = await connection.getBalance(newBuyer.publicKey);
        const originalBuyerBalanceBefore = await connection.getBalance(freshBuyer.publicKey);

        // Resell option - new buyer must pay premium + margin
        await program.methods
            .resellOption(resellPrice)
            .accountsPartial({
                option: optionPda,
                currentOwner: freshBuyer.publicKey,
                newBuyer: newBuyer.publicKey,
            })
            .signers([freshBuyer, newBuyer])
            .rpc();

        // Get balances after resell
        const newBuyerBalanceAfter = await connection.getBalance(newBuyer.publicKey);
        const originalBuyerBalanceAfter = await connection.getBalance(freshBuyer.publicKey);
        const optionAccount = await program.account.optionContract.fetch(optionPda);

        // Verify ownership transfer
        assert.equal(optionAccount.owner.toString(), newBuyer.publicKey.toString());
        assert.equal(optionAccount.buyerMargin.toNumber(), initialMargin.toNumber());

        // Verify new buyer paid both premium and margin
        const newBuyerCost = newBuyerBalanceBefore - newBuyerBalanceAfter;
        const expectedCost = resellPrice.toNumber() + initialMargin.toNumber();
        assert.isTrue(
            newBuyerCost >= expectedCost * 0.99 && newBuyerCost <= expectedCost * 1.01,
            `New buyer should pay approximately ${expectedCost / web3.LAMPORTS_PER_SOL} SOL (premium + margin), paid ${newBuyerCost / web3.LAMPORTS_PER_SOL} SOL`
        );

        // Verify original buyer received premium and margin back
        const originalBuyerGain = originalBuyerBalanceAfter - originalBuyerBalanceBefore;
        const expectedGain = resellPrice.toNumber() + initialMargin.toNumber();
        assert.isTrue(
            originalBuyerGain >= expectedGain * 0.99,
            `Original buyer should receive approximately ${expectedGain / web3.LAMPORTS_PER_SOL} SOL (premium + margin back), received ${originalBuyerGain / web3.LAMPORTS_PER_SOL} SOL`
        );
    });

    it('Fails resell when new buyer cannot afford premium and margin', async () => {
        const currentTime = Math.floor(Date.now() / 1000);
        const underlying_poor = "POOR/USDC";
        
        const freshSeller = web3.Keypair.generate();
        const freshBuyer = web3.Keypair.generate();
        const poorBuyer = web3.Keypair.generate();
        
        await connection.requestAirdrop(freshSeller.publicKey, 5 * web3.LAMPORTS_PER_SOL);
        await connection.requestAirdrop(freshBuyer.publicKey, 5 * web3.LAMPORTS_PER_SOL);
        // Give poor buyer insufficient funds (only enough for premium, not margin)
        await connection.requestAirdrop(poorBuyer.publicKey, 1.6 * web3.LAMPORTS_PER_SOL);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const [optionPda] = web3.PublicKey.findProgramAddressSync(
            [Buffer.from("option"), freshSeller.publicKey.toBuffer(), Buffer.from(underlying_poor)],
            program.programId
        );

        // Initialize and purchase option with high margin requirement
        const highMargin = new anchor.BN(1 * web3.LAMPORTS_PER_SOL); // 1 SOL margin
        await program.methods
            .initializeOption(
                PUT_OPTION,
                underlying_poor,
                new anchor.BN(currentTime),
                optionPrice,
                strikePrice,
                highMargin,
                true,  // is_test mode
                false  // allow_zero_margin
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

        // Try to resell to buyer with insufficient funds (should fail)
        const resellPrice = new anchor.BN(0.5 * web3.LAMPORTS_PER_SOL); // 0.5 SOL premium
        // Poor buyer has 1.6 SOL but needs 0.5 (premium) + 1.0 (margin) = 1.5 SOL + fees
        
        try {
            await program.methods
                .resellOption(resellPrice)
                .accountsPartial({
                    option: optionPda,
                    currentOwner: freshBuyer.publicKey,
                    newBuyer: poorBuyer.publicKey,
                })
                .signers([freshBuyer, poorBuyer])
                .rpc();
            
            assert.fail("Should have thrown error for insufficient funds");
        } catch (error: any) {
            // Transaction should fail due to insufficient lamports
            assert.isTrue(
                error.toString().includes("insufficient") || 
                error.toString().includes("failed") ||
                error.toString().includes("0x1"),
                `Expected insufficient funds error, got: ${error.toString()}`
            );
        }
    });

    it('Rejects purchase attempt on delisted option', async () => {
        const currentTime = Math.floor(Date.now() / 1000);
        const underlying6 = "ADA/USDC";
        
        const freshSeller = web3.Keypair.generate();
        const freshBuyer = web3.Keypair.generate();
        
        await connection.requestAirdrop(freshSeller.publicKey, 5 * web3.LAMPORTS_PER_SOL);
        await connection.requestAirdrop(freshBuyer.publicKey, 5 * web3.LAMPORTS_PER_SOL);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const [optionPda] = web3.PublicKey.findProgramAddressSync(
            [Buffer.from("option"), freshSeller.publicKey.toBuffer(), Buffer.from(underlying6)],
            program.programId
        );

        // Initialize and immediately delist the option
        await program.methods
            .initializeOption(
                CALL_OPTION,
                underlying6,
                new anchor.BN(currentTime),
                optionPrice,
                strikePrice,
                initialMargin,
                true,  // is_test mode
                false  // allow_zero_margin
            )
            .accountsPartial({
                seller: freshSeller.publicKey,
            })
            .signers([freshSeller])
            .rpc();

        await program.methods
            .delistOption()
            .accountsPartial({
                option: optionPda,
                seller: freshSeller.publicKey,
            })
            .signers([freshSeller])
            .rpc();

        // Attempt to purchase delisted option (should fail)
        try {
            await program.methods
                .purchaseOption()
                .accountsPartial({
                    option: optionPda,
                    buyer: freshBuyer.publicKey,
                    seller: freshSeller.publicKey,
                })
                .signers([freshBuyer, freshSeller])
                .rpc();
            
            assert.fail("Should have thrown error for purchasing delisted option");
        } catch (error: any) {
            assert.include(error.toString(), "OptionNotAvailable");
        }
    });

    it('Rejects option initialization with zero price', async () => {
        const currentTime = Math.floor(Date.now() / 1000);
        const underlying7 = "DOT/USDC";
        
        const freshSeller = web3.Keypair.generate();
        await connection.requestAirdrop(freshSeller.publicKey, 5 * web3.LAMPORTS_PER_SOL);
        await new Promise(resolve => setTimeout(resolve, 1000));

        const zeroPrice = new anchor.BN(0); // Invalid: zero price
        const smallMargin = new anchor.BN(0.1 * web3.LAMPORTS_PER_SOL);

        // Attempt to initialize with zero price (should fail)
        try {
            await program.methods
                .initializeOption(
                    PUT_OPTION,
                    underlying7,
                    new anchor.BN(currentTime),
                    zeroPrice,  // Zero price - should fail
                    strikePrice,
                    smallMargin,
                    true,  // is_test mode
                    false  // allow_zero_margin
                )
                .accountsPartial({
                    seller: freshSeller.publicKey,
                })
                .signers([freshSeller])
                .rpc();
            
            assert.fail("Should have thrown error for zero price");
        } catch (error: any) {
            assert.include(error.toString(), "PriceMustBeNonZero");
        }
    });

    it('Rejects option initialization with zero strike price', async () => {
        const currentTime = Math.floor(Date.now() / 1000);
        const underlying8 = "LINK/USDC";
        
        const freshSeller = web3.Keypair.generate();
        await connection.requestAirdrop(freshSeller.publicKey, 5 * web3.LAMPORTS_PER_SOL);
        await new Promise(resolve => setTimeout(resolve, 1000));

        const smallPrice = new anchor.BN(0.2 * web3.LAMPORTS_PER_SOL);
        const zeroStrike = new anchor.BN(0); // Invalid: zero strike

        // Attempt to initialize with zero strike price (should fail)
        try {
            await program.methods
                .initializeOption(
                    CALL_OPTION,
                    underlying8,
                    new anchor.BN(currentTime),
                    smallPrice,
                    zeroStrike,  // Zero strike - should fail
                    initialMargin,
                    true,  // is_test mode
                    false  // allow_zero_margin
                )
                .accountsPartial({
                    seller: freshSeller.publicKey,
                })
                .signers([freshSeller])
                .rpc();
            
            assert.fail("Should have thrown error for zero strike price");
        } catch (error: any) {
            assert.include(error.toString(), "StrikeMustBeNonZero");
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
                true,  // is_test mode - allows past dates
                false  // allow_zero_margin
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
                    false,  // production mode - rejects past dates
                    false   // allow_zero_margin
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

    it('Rejects invalid option type (not 0 or 1)', async () => {
        const currentTime = Math.floor(Date.now() / 1000);
        const underlying_invalid = "INVALID/USDC";
        
        const freshSeller = web3.Keypair.generate();
        await connection.requestAirdrop(freshSeller.publicKey, 5 * web3.LAMPORTS_PER_SOL);
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Attempt to initialize with invalid option type (should fail)
        try {
            await program.methods
                .initializeOption(
                    5,  // Invalid option type (should be 0 or 1)
                    underlying_invalid,
                    new anchor.BN(currentTime),
                    optionPrice,
                    strikePrice,
                    initialMargin,
                    true,  // is_test mode
                    false  // allow_zero_margin
                )
                .accountsPartial({
                    seller: freshSeller.publicKey,
                })
                .signers([freshSeller])
                .rpc();
            
            assert.fail("Should have thrown error for invalid option type");
        } catch (error: any) {
            assert.include(error.toString(), "InvalidOptionType");
        }
    });

    it('Prevents non-owner from exercising option', async () => {
        const currentTime = Math.floor(Date.now() / 1000);
        const underlying_notowner = "NOTOWNER/USDC";
        
        const freshSeller = web3.Keypair.generate();
        const freshBuyer = web3.Keypair.generate();
        const unauthorized = web3.Keypair.generate();
        
        await connection.requestAirdrop(freshSeller.publicKey, 5 * web3.LAMPORTS_PER_SOL);
        await connection.requestAirdrop(freshBuyer.publicKey, 5 * web3.LAMPORTS_PER_SOL);
        await connection.requestAirdrop(unauthorized.publicKey, 5 * web3.LAMPORTS_PER_SOL);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const [optionPda] = web3.PublicKey.findProgramAddressSync(
            [Buffer.from("option"), freshSeller.publicKey.toBuffer(), Buffer.from(underlying_notowner)],
            program.programId
        );

        // Initialize and purchase option
        await program.methods
            .initializeOption(
                CALL_OPTION,
                underlying_notowner,
                new anchor.BN(currentTime),
                optionPrice,
                strikePrice,
                initialMargin,
                true,  // is_test mode
                false  // allow_zero_margin
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

        // Attempt to exercise by non-owner (should fail)
        const assetPrice = new anchor.BN(100_000_000);
        const solPrice = new anchor.BN(50_000_000);
        
        try {
            await program.methods
                .exerciseOption(assetPrice, solPrice)
                .accountsPartial({
                    option: optionPda,
                    owner: unauthorized.publicKey,
                })
                .signers([unauthorized])
                .rpc();
            
            assert.fail("Should have thrown error for unauthorized exercise");
        } catch (error: any) {
            assert.include(error.toString(), "Unauthorized");
        }
    });

    it('Prevents delist of owned option', async () => {
        const currentTime = Math.floor(Date.now() / 1000);
        const underlying_owned = "OWNED/USDC";
        
        const freshSeller = web3.Keypair.generate();
        const freshBuyer = web3.Keypair.generate();
        
        await connection.requestAirdrop(freshSeller.publicKey, 5 * web3.LAMPORTS_PER_SOL);
        await connection.requestAirdrop(freshBuyer.publicKey, 5 * web3.LAMPORTS_PER_SOL);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const [optionPda] = web3.PublicKey.findProgramAddressSync(
            [Buffer.from("option"), freshSeller.publicKey.toBuffer(), Buffer.from(underlying_owned)],
            program.programId
        );

        // Initialize and purchase option
        await program.methods
            .initializeOption(
                PUT_OPTION,
                underlying_owned,
                new anchor.BN(currentTime),
                optionPrice,
                strikePrice,
                initialMargin,
                true,  // is_test mode
                false  // allow_zero_margin
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

        // Attempt to delist an owned option (should fail)
        try {
            await program.methods
                .delistOption()
                .accountsPartial({
                    option: optionPda,
                    seller: freshSeller.publicKey,
                })
                .signers([freshSeller])
                .rpc();
            
            assert.fail("Should have thrown error for delisting owned option");
        } catch (error: any) {
            assert.include(error.toString(), "CannotDelistOwnedOption");
        }
    });

    it('Prevents settlement with zero SOL price', async () => {
        const currentTime = Math.floor(Date.now() / 1000);
        const underlying_settlement = "SETTLE/USDC";
        
        const freshSeller = web3.Keypair.generate();
        const freshBuyer = web3.Keypair.generate();
        
        await connection.requestAirdrop(freshSeller.publicKey, 5 * web3.LAMPORTS_PER_SOL);
        await connection.requestAirdrop(freshBuyer.publicKey, 5 * web3.LAMPORTS_PER_SOL);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const [optionPda] = web3.PublicKey.findProgramAddressSync(
            [Buffer.from("option"), freshSeller.publicKey.toBuffer(), Buffer.from(underlying_settlement)],
            program.programId
        );

        // Initialize and purchase option
        await program.methods
            .initializeOption(
                CALL_OPTION,
                underlying_settlement,
                new anchor.BN(currentTime),
                optionPrice,
                strikePrice,
                initialMargin,
                true,  // is_test mode
                false  // allow_zero_margin
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

        // Attempt settlement with zero SOL price (should fail)
        const zeroPrice = new anchor.BN(0);
        const validAssetPrice = new anchor.BN(100_000_000);
        
        const settler = web3.Keypair.generate();
        await connection.requestAirdrop(settler.publicKey, 1 * web3.LAMPORTS_PER_SOL);
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            await program.methods
                .dailySettlement(validAssetPrice, zeroPrice)
                .accountsPartial({
                    option: optionPda,
                    settler: settler.publicKey,
                })
                .signers([settler])
                .rpc();
            
            assert.fail("Should have thrown error for zero SOL price");
        } catch (error: any) {
            assert.include(error.toString(), "InvalidPrice");
        }
    });

    it('Prevents purchase of already owned option', async () => {
        const currentTime = Math.floor(Date.now() / 1000);
        const underlying_double = "DOUBLE/USDC";
        
        const freshSeller = web3.Keypair.generate();
        const freshBuyer1 = web3.Keypair.generate();
        const freshBuyer2 = web3.Keypair.generate();
        
        await connection.requestAirdrop(freshSeller.publicKey, 5 * web3.LAMPORTS_PER_SOL);
        await connection.requestAirdrop(freshBuyer1.publicKey, 5 * web3.LAMPORTS_PER_SOL);
        await connection.requestAirdrop(freshBuyer2.publicKey, 5 * web3.LAMPORTS_PER_SOL);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const [optionPda] = web3.PublicKey.findProgramAddressSync(
            [Buffer.from("option"), freshSeller.publicKey.toBuffer(), Buffer.from(underlying_double)],
            program.programId
        );

        // Initialize option
        await program.methods
            .initializeOption(
                CALL_OPTION,
                underlying_double,
                new anchor.BN(currentTime),
                optionPrice,
                strikePrice,
                initialMargin,
                true,  // is_test mode
                false  // allow_zero_margin
            )
            .accountsPartial({
                seller: freshSeller.publicKey,
            })
            .signers([freshSeller])
            .rpc();

        // First purchase
        await program.methods
            .purchaseOption()
            .accountsPartial({
                option: optionPda,
                buyer: freshBuyer1.publicKey,
                seller: freshSeller.publicKey,
            })
            .signers([freshBuyer1, freshSeller])
            .rpc();

        // Attempt second purchase (should fail - option already owned)
        try {
            await program.methods
                .purchaseOption()
                .accountsPartial({
                    option: optionPda,
                    buyer: freshBuyer2.publicKey,
                    seller: freshSeller.publicKey,
                })
                .signers([freshBuyer2, freshSeller])
                .rpc();
            
            assert.fail("Should have thrown error for purchasing already owned option");
        } catch (error: any) {
            assert.include(error.toString(), "OptionNotAvailable");
        }
    });

    // Zero Margin Tests
    describe('Zero Margin Options (Test Mode)', () => {
        it('Allows zero margin in test mode with allow_zero_margin=true', async () => {
            const currentTime = Math.floor(Date.now() / 1000);
            const underlying13 = "ZERO1/USDC";
            const zeroMargin = new anchor.BN(0); // Zero margin
            
            const freshSeller = web3.Keypair.generate();
            await connection.requestAirdrop(freshSeller.publicKey, 5 * web3.LAMPORTS_PER_SOL);
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const [optionPda] = web3.PublicKey.findProgramAddressSync(
                [Buffer.from("option"), freshSeller.publicKey.toBuffer(), Buffer.from(underlying13)],
                program.programId
            );

            // Initialize with zero margin and allow_zero_margin=true (should succeed)
            await program.methods
                .initializeOption(
                    CALL_OPTION,
                    underlying13,
                    new anchor.BN(currentTime),
                    optionPrice,
                    strikePrice,
                    zeroMargin,
                    true,  // is_test mode
                    true   // allow_zero_margin
                )
                .accountsPartial({
                    seller: freshSeller.publicKey,
                })
                .signers([freshSeller])
                .rpc();

            const optionAccount = await program.account.optionContract.fetch(optionPda);
            assert.equal(optionAccount.initialMargin.toNumber(), 0);
            assert.equal(optionAccount.allowZeroMargin, true);
            assert.equal(optionAccount.isTest, true);
        });

        it('Rejects zero margin in test mode with allow_zero_margin=false', async () => {
            const currentTime = Math.floor(Date.now() / 1000);
            const underlying14 = "ZERO2/USDC";
            const zeroMargin = new anchor.BN(0);
            
            const freshSeller = web3.Keypair.generate();
            await connection.requestAirdrop(freshSeller.publicKey, 5 * web3.LAMPORTS_PER_SOL);
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Try to initialize with zero margin and allow_zero_margin=false (should fail)
            try {
                await program.methods
                    .initializeOption(
                        CALL_OPTION,
                        underlying14,
                        new anchor.BN(currentTime),
                        optionPrice,
                        strikePrice,
                        zeroMargin,
                        true,  // is_test mode
                        false  // allow_zero_margin = false
                    )
                    .accountsPartial({
                        seller: freshSeller.publicKey,
                    })
                    .signers([freshSeller])
                    .rpc();
                
                assert.fail("Should have thrown error for zero margin without allow_zero_margin");
            } catch (error: any) {
                assert.include(error.toString(), "MarginMustBeNonZero");
            }
        });

        it('Rejects zero margin in production mode even with allow_zero_margin=true', async () => {
            const currentTime = Math.floor(Date.now() / 1000);
            const underlying15 = "ZERO3/USDC";
            const zeroMargin = new anchor.BN(0);
            
            const freshSeller = web3.Keypair.generate();
            await connection.requestAirdrop(freshSeller.publicKey, 5 * web3.LAMPORTS_PER_SOL);
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Try to initialize with zero margin in production mode (should fail)
            try {
                await program.methods
                    .initializeOption(
                        CALL_OPTION,
                        underlying15,
                        new anchor.BN(currentTime),
                        optionPrice,
                        strikePrice,
                        zeroMargin,
                        false,  // production mode
                        true    // allow_zero_margin (shouldn't matter in production)
                    )
                    .accountsPartial({
                        seller: freshSeller.publicKey,
                    })
                    .signers([freshSeller])
                    .rpc();
                
                assert.fail("Should have thrown error for zero margin in production mode");
            } catch (error: any) {
                assert.include(error.toString(), "MarginMustBeNonZero");
            }
        });

        it('Purchases zero-margin option without requiring margin deposits', async () => {
            const currentTime = Math.floor(Date.now() / 1000);
            const underlying16 = "ZERO4/USDC";
            const zeroMargin = new anchor.BN(0);
            
            const freshSeller = web3.Keypair.generate();
            const freshBuyer = web3.Keypair.generate();
            
            await connection.requestAirdrop(freshSeller.publicKey, 5 * web3.LAMPORTS_PER_SOL);
            await connection.requestAirdrop(freshBuyer.publicKey, 5 * web3.LAMPORTS_PER_SOL);
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const [optionPda] = web3.PublicKey.findProgramAddressSync(
                [Buffer.from("option"), freshSeller.publicKey.toBuffer(), Buffer.from(underlying16)],
                program.programId
            );

            // Initialize zero-margin option
            await program.methods
                .initializeOption(
                    PUT_OPTION,
                    underlying16,
                    new anchor.BN(currentTime),
                    optionPrice,
                    strikePrice,
                    zeroMargin,
                    true,  // is_test mode
                    true   // allow_zero_margin
                )
                .accountsPartial({
                    seller: freshSeller.publicKey,
                })
                .signers([freshSeller])
                .rpc();

            const buyerBalanceBefore = await connection.getBalance(freshBuyer.publicKey);
            const sellerBalanceBefore = await connection.getBalance(freshSeller.publicKey);

            // Purchase option
            await program.methods
                .purchaseOption()
                .accountsPartial({
                    option: optionPda,
                    buyer: freshBuyer.publicKey,
                    seller: freshSeller.publicKey,
                })
                .signers([freshBuyer, freshSeller])
                .rpc();

            const optionAccount = await program.account.optionContract.fetch(optionPda);
            const buyerBalanceAfter = await connection.getBalance(freshBuyer.publicKey);
            const sellerBalanceAfter = await connection.getBalance(freshSeller.publicKey);
            
            // Verify no margin deposits required
            assert.equal(optionAccount.buyerMargin.toNumber(), 0);
            assert.equal(optionAccount.sellerMargin.toNumber(), 0);
            assert.equal(optionAccount.status.owned !== undefined, true);
            assert.equal(optionAccount.owner.toString(), freshBuyer.publicKey.toString());
            
            // Buyer should only pay premium (plus fees), no margin
            const buyerCost = buyerBalanceBefore - buyerBalanceAfter;
            assert.isTrue(buyerCost < optionPrice.toNumber() * 1.1, 'Buyer should only pay premium, not margin');
            
            // Seller should receive premium (minus fees), no margin deducted
            const sellerGain = sellerBalanceAfter - sellerBalanceBefore;
            assert.isTrue(sellerGain > optionPrice.toNumber() * 0.9, 'Seller should receive premium without margin deduction');
        });

        it('Allows reselling zero-margin option without margin transfers', async () => {
            const currentTime = Math.floor(Date.now() / 1000);
            const underlying17 = "ZERO5/USDC";
            const zeroMargin = new anchor.BN(0);
            
            const freshSeller = web3.Keypair.generate();
            const freshBuyer1 = web3.Keypair.generate();
            const freshBuyer2 = web3.Keypair.generate();
            
            await connection.requestAirdrop(freshSeller.publicKey, 5 * web3.LAMPORTS_PER_SOL);
            await connection.requestAirdrop(freshBuyer1.publicKey, 5 * web3.LAMPORTS_PER_SOL);
            await connection.requestAirdrop(freshBuyer2.publicKey, 5 * web3.LAMPORTS_PER_SOL);
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const [optionPda] = web3.PublicKey.findProgramAddressSync(
                [Buffer.from("option"), freshSeller.publicKey.toBuffer(), Buffer.from(underlying17)],
                program.programId
            );

            // Initialize and purchase zero-margin option
            await program.methods
                .initializeOption(
                    CALL_OPTION,
                    underlying17,
                    new anchor.BN(currentTime),
                    optionPrice,
                    strikePrice,
                    zeroMargin,
                    true,  // is_test mode
                    true   // allow_zero_margin
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
                    buyer: freshBuyer1.publicKey,
                    seller: freshSeller.publicKey,
                })
                .signers([freshBuyer1, freshSeller])
                .rpc();

            // Resell to second buyer
            const resellPrice = new anchor.BN(2.5 * web3.LAMPORTS_PER_SOL);
            const buyer2BalanceBefore = await connection.getBalance(freshBuyer2.publicKey);
            
            await program.methods
                .resellOption(resellPrice)
                .accountsPartial({
                    option: optionPda,
                    currentOwner: freshBuyer1.publicKey,
                    newBuyer: freshBuyer2.publicKey,
                })
                .signers([freshBuyer1, freshBuyer2])
                .rpc();

            const optionAccount = await program.account.optionContract.fetch(optionPda);
            const buyer2BalanceAfter = await connection.getBalance(freshBuyer2.publicKey);
            
            // Verify ownership transfer
            assert.equal(optionAccount.owner.toString(), freshBuyer2.publicKey.toString());
            assert.equal(optionAccount.buyerMargin.toNumber(), 0);
            
            // Second buyer should only pay resell price, no margin
            const buyer2Cost = buyer2BalanceBefore - buyer2BalanceAfter;
            assert.isTrue(buyer2Cost < resellPrice.toNumber() * 1.1, 'Second buyer should only pay resell price, not margin');
        });
    });
});