import {
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
  createSyncNativeInstruction,
  getAssociatedTokenAddress,
  getMint,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
  unpackMint,
} from "@solana/spl-token";
import {
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  TransactionMessage,
  VersionedTransaction,
  TransactionInstruction,
  ComputeBudgetProgram,
  SystemProgram,
} from "@solana/web3.js";
import base58 from "bs58";
import {
  ADDITIONAL_FEE,
  BUY_AMOUNT,
  BUY_INTERVAL_MAX,
  BUY_INTERVAL_MIN,
  BUY_LOWER_AMOUNT,
  BUY_UPPER_AMOUNT,
  IS_RANDOM,
  liquidityCheckingAmount,
  liquidityCheckingTime,
  quote_Mint_amount,
  SWAP_ROUTING,
  volumeWalletName,
  volWalletNum,
} from "../settings";
import { outputBalance, readBundlerWallets, readJson, sleep } from "../src/utils";
import { cluster, connection, LP_wallet_keypair, SLIPPAGE } from "../config";
import {
  CurrencyAmount,
  DEVNET_PROGRAM_ID,
  jsonInfo2PoolKeys,
  Liquidity,
  LiquidityPoolKeys,
  LiquidityPoolKeysV4,
  MAINNET_PROGRAM_ID,
  MARKET_STATE_LAYOUT_V3,
  Percent,
  SOL,
  Token,
} from "@raydium-io/raydium-sdk";
import BN from "bn.js";
import { executeVersionedTx } from "../src/execute";
import { remove_liquidity } from "./removeLiquidity";
import { gather_volume } from "../gather";
import { tipAccount } from "../src/poolAll";
import { sendBundle } from "../src/bundle";

const programId = cluster == "devnet" ? DEVNET_PROGRAM_ID : MAINNET_PROGRAM_ID;
let poolKeys: LiquidityPoolKeysV4;

export const run_trading_bot = async () => {

  const intervalId = setInterval(async () => {
    checked++
    const wsolBal = (await connection.getTokenAccountBalance(quoteVault)).value.uiAmount;
    console.log(`Current Liquidity of your pool is ${wsolBal}Sol and Total insider tx is ${totalInsiderSol}Sol.`);
    if (checked > liquidityCheckingTime || liquidityCheckingAmount < (wsolBal! - quote_Mint_amount - totalInsiderSol)) {
      try {
        if (checked > liquidityCheckingTime) {
          console.log(`Liquidity checking time exceeds the limit to remove liquidity`)
        }
        else {
          console.log(
            `Liquidity of your pool exceeds the point to remove liquidity`
          );
        }

        clearInterval(intervalId);

        console.log(`\nRemoving liquidity from your pool`);
        await remove_liquidity(poolKeys);

        console.log("It is gathering Sol from volume bot wallets.")
        await gather_volume()
        await sleep(10000)

        await outputBalance(LP_wallet_keypair.publicKey)
        await outputBalance(newLpProviderKeypair.publicKey)

        process.exit(1)
      } catch (err) {
        console.log(err)
      }
    }
  }, checkInterval * 1000)

  await sleep(5000)

  walletKPs.map(async (kp, i) => {
    await sleep(((BUY_INTERVAL_MAX + BUY_INTERVAL_MIN) * i) / 2);
    while (true) {
      // buy part
      const BUY_INTERVAL = Math.round(
        Math.random() * (BUY_INTERVAL_MAX - BUY_INTERVAL_MIN) + BUY_INTERVAL_MIN
      );

      const solBalance = (await connection.getBalance(walletKPs[i].publicKey)) / LAMPORTS_PER_SOL;

      let buyAmount: number;
      if (IS_RANDOM)
        buyAmount = Number(
          (
            Math.random() * (BUY_UPPER_AMOUNT - BUY_LOWER_AMOUNT) + BUY_LOWER_AMOUNT
          ).toFixed(6)
        );
      else buyAmount = BUY_AMOUNT;

      if (solBalance < ADDITIONAL_FEE) {
        // console.log("Balance is not enough: ", solBalance, "SOL");
        // continue;
      }

      // try buying until success
      let j = 0;
      while (true) {
        try {
          if (j > 10) {
            // console.log("Error in buy transaction")
            return;
          }
  
          const result = await buy(walletKPs[i], baseMint, buyAmount, i);
          if (result) {
            totalInsiderSol = totalInsiderSol + buyAmount
            break;
          } else {
            j++;
            // console.log("Buy failed, try again")
            await sleep(2000);
          }
        } catch (err) {
          console.log(".")
        }
      }

      await sleep(BUY_INTERVAL_MIN * volWalletNum);

    }
  });
};
