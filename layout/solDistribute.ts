import {
  ComputeBudgetProgram,
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { cluster, connection } from "../config";
import { quote_Mint_amount, volSolAmount, volumeWalletName, volWalletNum } from "../settings";
import { LP_wallet_keypair } from "../config";
import base58 from "bs58";
import { execute } from "../src/legacy";
import {
  outputBalance,
  readBundlerWallets,
  saveBundlerWalletsToFile,
  sleep,
} from "../src/utils";

export const distribute_sol = async () => {
  console.log(`Creating ${volWalletNum} Wallets for VolumeBot Running.`);

  let wallets: string[] = [];
  let newLpWallet = Keypair.generate()

  saveBundlerWalletsToFile([base58.encode(newLpWallet.secretKey)], "newLpWallet")

  const newLpProvider = (readBundlerWallets("newLpWallet"))[0]
  const newLpProviderKeypair = Keypair.fromSecretKey(base58.decode(newLpProvider))

  const sendSolTx: TransactionInstruction[] = [];
  sendSolTx.push(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 100_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 250_000 }),
    SystemProgram.transfer({
      fromPubkey: LP_wallet_keypair.publicKey,
      toPubkey: newLpProviderKeypair.publicKey,
      lamports: Math.floor((0.8 + quote_Mint_amount) * LAMPORTS_PER_SOL),
    })
  );

  let index = 0;
  while (true) {
    try {
      if (index > 3) {
        console.log("Error in distribution");
        return null;
      }
      const siTx = new Transaction().add(...sendSolTx);
      const latestBlockhash = await connection.getLatestBlockhash();
      siTx.feePayer = LP_wallet_keypair.publicKey;
      siTx.recentBlockhash = latestBlockhash.blockhash;
      const messageV0 = new TransactionMessage({
        payerKey: LP_wallet_keypair.publicKey,
        recentBlockhash: latestBlockhash.blockhash,
        instructions: sendSolTx,
      }).compileToV0Message();
      const transaction = new VersionedTransaction(messageV0);
      transaction.sign([LP_wallet_keypair]);
      // console.log(await connection.simulateTransaction(transaction))
      const txSig = await execute(transaction, latestBlockhash, 1);
      const tokenBuyTx = txSig
        ? `https://solscan.io/tx/${txSig}${cluster == "devnet" ? "?cluster=devnet" : ""}`
        : "";
      console.log("SOL sent to new pool creator wallet: ", tokenBuyTx);
      break;
    } catch (error) {
      index++;
    }
  }

  // Step 1 - creating wallets
  for (let i = 0; i < volWalletNum; i++) {
    const newWallet = Keypair.generate();
    wallets.push(base58.encode(newWallet.secretKey));
  }
  saveBundlerWalletsToFile(wallets, volumeWalletName);

  // console.log("Volume wallets: ", wallets)

  const savedWallets = readBundlerWallets(volumeWalletName);
  const walletKPs = savedWallets.map((wallet: string) =>
    Keypair.fromSecretKey(base58.decode(wallet))
  );

  const batchLength = 20;
  const batchNum = Math.ceil(volWalletNum / batchLength);

  try {
    for (let i = 0; i < batchNum; i++) {
      const sendSolTx: TransactionInstruction[] = [];
      sendSolTx.push(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 100_000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 250_000 })
      );
      for (let j = 0; j < batchLength; j++) {
        if (i * batchLength + j >= volWalletNum) continue;
        sendSolTx.push(
          SystemProgram.transfer({
            fromPubkey: LP_wallet_keypair.publicKey,
            toPubkey: walletKPs[i * batchLength + j].publicKey,
            lamports: volSolAmount * LAMPORTS_PER_SOL,
          })
        );
      }

      let index = 0;
      while (true) {
        try {
          if (index > 3) {
            console.log("Error in distribution");
            return null;
          }
          const siTx = new Transaction().add(...sendSolTx);
          const latestBlockhash = await connection.getLatestBlockhash();
          siTx.feePayer = LP_wallet_keypair.publicKey;
          siTx.recentBlockhash = latestBlockhash.blockhash;
          const messageV0 = new TransactionMessage({
            payerKey: LP_wallet_keypair.publicKey,
            recentBlockhash: latestBlockhash.blockhash,
            instructions: sendSolTx,
          }).compileToV0Message();
          const transaction = new VersionedTransaction(messageV0);
          transaction.sign([LP_wallet_keypair]);
          // console.log(await connection.simulateTransaction(transaction))
          const txSig = await execute(transaction, latestBlockhash, 1);
          const tokenBuyTx = txSig
            ? `https://solscan.io/tx/${txSig}${cluster == "devnet" ? "?cluster=devnet" : ""}`
            : "";
          console.log("SOL distributed ", tokenBuyTx);
          break;
        } catch (error) {
          index++;
        }
      }
      await sleep(3000);
    }
    console.log("Successfully distributed sol to bundler wallets!");

    await outputBalance(LP_wallet_keypair.publicKey)
    await outputBalance(newLpProviderKeypair.publicKey)
  } catch (error) {
    console.log(error);
    console.log(`Failed to transfer SOL to New LP provider wallet`);
  }
};
