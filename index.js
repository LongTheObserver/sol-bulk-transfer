const { Keypair, PublicKey, Connection, SystemProgram, Transaction, ComputeBudgetProgram } = require('@solana/web3.js');
const fs = require('fs');
require('dotenv').config();
const bs58 = require('bs58');

const recipient = process.env.RECIPIENT;
const https = process.env.HTTPS_RPC;
const wss = process.env.WSS_RPC;

const raw = fs.readFileSync("wallets.json", "utf8");
const data = JSON.parse(raw)

const connection = new Connection(https, {
    wsEndpoint: wss,
    commitment: "confirmed"
})

async function transferSol(senderWallet, recipientPublicKey) {
    // Decode the recipient's public key
    const recipientKey = new PublicKey(recipientPublicKey);
    const balance = await connection.getBalance(senderWallet.publicKey)
    const fee = await connection.getMinimumBalanceForRentExemption(0)

    // Construct a transaction to transfer SOL
    const transaction = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: senderWallet.publicKey,
            toPubkey: recipientKey,
            lamports: balance - 10000, // Convert SOL to lamports
        })
    );
    transaction.add(ComputeBudgetProgram.setComputeUnitPrice({microLamports: 25000}))
    // transaction.add(ComputeBudgetProgram.setComputeUnitLimit({units: 200}))

    // Sign the transaction
    transaction.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
    // transaction.sign(senderWallet);

    // Send the transaction
    const transactionId = await connection.sendTransaction(transaction, [senderWallet])

    return transactionId;
}

const runAll = async (arr) => {
    for (let i = 0; i < arr.length; i++) {
        let wallet = Keypair.fromSecretKey(new Uint8Array(bs58.decode(arr[i])));
        try {
            const tx = await transferSol(wallet, recipient)
            console.log(`Transaction from address ${wallet.publicKey.toBase58()} completed successfully with tx: ${tx}`);
        } catch (e) {
            console.log(`Cannot transfer from address ${wallet.publicKey.toBase58()} due to error: ${e.message}`);
        }
    }
}

runAll(data)