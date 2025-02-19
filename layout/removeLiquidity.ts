import { Keypair, PublicKey } from "@solana/web3.js";

import { tokens } from "../settings";
import { outputBalance, readBundlerWallets, readJson, saveDataToFile, sleep } from "../src/utils";
import { getWalletTokenAccount } from "../src/get_balance";
import { ammRemoveLiquidity } from "../src/removeLiquidity";
import { init } from "..";
import base58 from "bs58";
import { LiquidityPoolKeysV4 } from "@raydium-io/raydium-sdk";

type WalletTokenAccounts = Awaited<ReturnType<typeof getWalletTokenAccount>>;

const execute = async (poolKeysParam: LiquidityPoolKeysV4) => {

  const newLpProvider = (readBundlerWallets("newLpWallet"))[0]
  const newLpProviderKeypair = Keypair.fromSecretKey(base58.decode(newLpProvider))
  // remove liquidity
  console.log(
    "\n***************************************************************\n"
  );
  await sleep(5000);
  const data = readJson();
  let params = {
    mint: data.mint ? new PublicKey(data.mint) : null,
    marketId: data.marketId ? new PublicKey(data.marketId) : null,
    poolId: data.poolId ? new PublicKey(data.poolId) : null,
    mainKp: data.mainKp,
    poolKeys: data.poolKeys,
    removed: data.removed,
  };
  let removeTried = 0;
  while (true) {
    if (removeTried > 3) {
      console.log(
        "Remove liquidity transaction called many times, pull tx failed"
      );
      return;
    }
    const removed = await ammRemoveLiquidity(newLpProviderKeypair, params.poolId!, poolKeysParam);
    if (removed) {
      params.removed = true;
      saveDataToFile(params);
      await sleep(2000);
      await outputBalance(newLpProviderKeypair.publicKey);
      return
    } else {
      console.log("Failed to remove liquidity");
      removeTried++;
    }
    await sleep(2000);
  }
};

export const remove_liquidity = async (poolKeysParam: LiquidityPoolKeysV4) => {
  for (let i = 0; i < tokens.length; i++) {
    // console.log(`Token ${i + 1} Liquidity Removed`);
    await execute(poolKeysParam);
    console.log("One token remove process is ended, and go for next one");
  }
};

// remove_liquidity()
