import { AnchorProvider, Program, web3 } from '@project-serum/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import idl from '../idl/escrow.json';

const { SystemProgram } = web3;

const network = "https://api.mainnet-beta.solana.com"; // Change to your desired network
const connection = new Connection(network, 'processed');

const provider = AnchorProvider.local(connection);
const programId = new PublicKey(idl.metadata.address);
const program = new Program(idl, programId, provider);

export const createEscrow = async (user1: PublicKey, user2: PublicKey, amount: number) => {
    const tx = await program.rpc.createEscrow(user1, user2, amount, {
        accounts: {
            escrow: escrowPublicKey, // Replace with actual escrow public key
            user1: user1,
            user2: user2,
            systemProgram: SystemProgram.programId,
        },
    });
    return tx;
};

export const releaseEscrow = async (escrowPublicKey: PublicKey) => {
    const tx = await program.rpc.releaseEscrow({
        accounts: {
            escrow: escrowPublicKey,
            systemProgram: SystemProgram.programId,
        },
    });
    return tx;
};