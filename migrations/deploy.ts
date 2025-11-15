import * as anchor from '@project-serum/anchor';

async function main() {
    const provider = anchor.Provider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.Escrow;

    const escrowAccount = anchor.web3.Keypair.generate();
    const transactionValue = new anchor.BN(1000); // Example transaction value

    const tx = await program.rpc.initializeEscrow(transactionValue, {
        accounts: {
            escrow: escrowAccount.publicKey,
            user1: provider.wallet.publicKey,
            user2: provider.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
        },
        signers: [escrowAccount],
    });

    console.log("Transaction successful with signature:", tx);
}

main().catch(err => {
    console.error(err);
});