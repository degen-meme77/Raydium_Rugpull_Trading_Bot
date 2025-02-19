import {
  ComputeBudgetProgram,
  Keypair,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import base58 from "bs58";

import { connection, LP_wallet_keypair } from "./config";
import { outputBalance, readBundlerWallets, readVolumeWalletDataJson, saveNewFile, sleep } from "./src/utils";

const mainKp = LP_wallet_keypair;

const gather_volume = async () => {
  const walletsData = readVolumeWalletDataJson();

  const wallets = walletsData.map((privateKey) =>
    Keypair.fromSecretKey(base58.decode(privateKey))
  );

  const newLpProvider = (readBundlerWallets("newLpWallet"))[0]
  const newLpProviderKeypair = Keypair.fromSecretKey(base58.decode(newLpProvider))

  wallets.push(newLpProviderKeypair)

  wallets.map(async (kp, i) => {
    try {
      const solBalance = await connection.getBalance(kp.publicKey);
      if (solBalance > 0)
        console.log(
          "Wallet ",
          kp.publicKey.toBase58(),
          " SOL balance is ",
          (solBalance / 10 ** 9).toFixed(4)
        );
      await sleep(i * 50);
      const accountInfo = await connection.getAccountInfo(kp.publicKey);

      const ixs: TransactionInstruction[] = [];

      if (accountInfo) {
        const solBal = await connection.getBalance(kp.publicKey);
        ixs.push(
          SystemProgram.transfer({
            fromPubkey: kp.publicKey,
            toPubkey: mainKp.publicKey,
            lamports: solBal,
          })
        );
      }

      if (ixs.length) {
        const tx = new Transaction().add(
          ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: 500_000,
          }),
          ComputeBudgetProgram.setComputeUnitLimit({ units: 50_000 }),
          ...ixs
        );
        tx.feePayer = mainKp.publicKey;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        const sig = await sendAndConfirmTransaction(
          connection,
          tx,
          [mainKp, kp],
          { commitment: "confirmed" }
        );
        console.log(
          `Gathered SOL from wallets ${i} : https://solscan.io/tx/${sig}`
        );
      }

    } catch (error) {
      console.log("transaction error while gathering", error);
    }
  });

};

gather_volume()