import React, { useState } from 'react';
import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { Program, Provider, web3 } from '@project-serum/anchor';
import idl from '../utils/idl.json'; // Assuming you have an IDL file for your program

const Transaction = () => {
    const wallet = useAnchorWallet();
    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState(0);
    const [transactionStatus, setTransactionStatus] = useState('');

    const handleTransaction = async () => {
        if (!wallet) {
            setTransactionStatus('Please connect your wallet.');
            return;
        }

        const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
        const provider = new Provider(connection, wallet, Provider.defaultOptions());
        const program = new Program(idl, idl.metadata.address, provider);

        try {
            const tx = await program.rpc.sendTransaction(new web3.BN(amount), {
                accounts: {
                    sender: wallet.publicKey,
                    recipient: new PublicKey(recipient),
                    systemProgram: SystemProgram.programId,
                },
            });
            setTransactionStatus(`Transaction successful: ${tx}`);
        } catch (error) {
            setTransactionStatus(`Transaction failed: ${error.message}`);
        }
    };

    return (
        <div>
            <h2>Transaction</h2>
            <input
                type="text"
                placeholder="Recipient Address"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
            />
            <input
                type="number"
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
            />
            <button onClick={handleTransaction}>Send Transaction</button>
            {transactionStatus && <p>{transactionStatus}</p>}
        </div>
    );
};

export default Transaction;