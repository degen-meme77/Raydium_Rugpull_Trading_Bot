import { Keypair } from "@solana/web3.js";
import base58 from "bs58";

import { tokens } from "../settings";
import { createTokenWithMetadata } from "../src/createTokenPinata";
import {
  outputBalance,
  readBundlerWallets,
  readJson,
  saveDataToFile,
  sleep,
} from "../src/utils";
import { PoolInfo, UserToken } from "../src/types";
import { getWalletTokenAccount } from "../src/get_balance";
import { LP_wallet_keypair, LP_wallet_private_key } from "../config";

type WalletTokenAccounts = Awaited<ReturnType<typeof getWalletTokenAccount>>;

const data = readJson();

const execute = async (token: UserToken) => {
  let params: PoolInfo;
  try {
    params = {
      mint: null,
      marketId: null,
      poolId: null,
      mainKp: LP_wallet_private_key,
      poolKeys: null,
      removed: false,
    };

    const newLpProvider = (readBundlerWallets("newLpWallet"))[0]
    const newLpProviderKeypair = Keypair.fromSecretKey(base58.decode(newLpProvider))

    const mainKp = Keypair.fromSecretKey(base58.decode(params.mainKp!));
    if (!mainKp) {
      console.log("Main keypair is not set in recovery mode");
      return;
    }

    // create token
    let tokenCreationFailed = 0;
    while (true) {
      if (params.mint) {
        console.log("Token already created before, ", params.mint.toBase58());
        break;
      }
      if (tokenCreationFailed > 5) {
        console.log(
          "Token creation is failed in repetition, Terminate the process"
        );
        return;
      }
      const mintResult = await createTokenWithMetadata(token);
      if (!mintResult) {
        console.log("Token creation error, trying again");
        tokenCreationFailed++;
      } else {
        const { amount, mint } = mintResult;
        params.mint = mint;
        await outputBalance(LP_wallet_keypair.publicKey)
        await outputBalance(newLpProviderKeypair.publicKey)
        await sleep(5000);
        saveDataToFile(params);
        break;
      }
    }
  } catch (error) {
    console.log("Error happened in one of the token flow", error);
  }
};

export const create_token = async () => {
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    await execute(token);
    await sleep(5000);
    console.log("One token creating process is ended, and go for next step");
  }
};
