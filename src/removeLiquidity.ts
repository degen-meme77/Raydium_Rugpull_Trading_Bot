import {
  TOKEN_PROGRAM_ID,
  Token,
  TokenAmount,
  Liquidity,
  TxVersion,
  LiquidityPoolKeysV4,
  jsonInfo2PoolKeys,
  InnerSimpleV0Transaction,
  buildSimpleTransaction,
  LOOKUP_TABLE_CACHE,
} from "@raydium-io/raydium-sdk";
import { Keypair, PublicKey } from "@solana/web3.js";
import { sendTx } from "./build_a_sendtxn";
import { getATAAddress, getWalletTokenAccount, sleep } from "./utils";
import { cluster, connection, } from "../config";
import { formatAmmKeysById } from "./swapOnlyAmm";
import { VersionedTransaction } from "@solana/web3.js";
import { TransactionMessage } from "@solana/web3.js";
import { sendBundle } from "./bundle";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

export const ammRemoveLiquidity = async (
  mainKp: Keypair,
  poolId: PublicKey,
  poolKeysParam: LiquidityPoolKeysV4,
) => {
  try {
    let poolKeys = poolKeysParam
    // const poolInfo = await formatAmmKeysById(connection, poolId.toBase58())
    // poolKeys = jsonInfo2PoolKeys(poolInfo)
    const lpToken = new Token(
      TOKEN_PROGRAM_ID,
      poolKeys!.lpMint,
      poolKeys!.lpDecimals
    );
    // const lpTokenAccount = await getATAAddress(
    //   TOKEN_PROGRAM_ID,
    //   mainKp.publicKey,
    //   poolKeys.lpMint
    // );

    const lpTokenAccount = await getAssociatedTokenAddressSync(poolKeys!.lpMint, mainKp.publicKey)

    let lpBalance = await connection.getTokenAccountBalance(
      lpTokenAccount
    );

    let amount_in = new TokenAmount(lpToken, lpBalance.value.amount);
    if (lpBalance.value.uiAmount == 0) {
      console.log("No lp token in wallet")
      return
    }
    const tokenAccountRawInfos_LP = await getWalletTokenAccount(
      connection,
      mainKp.publicKey
    );

    const lp_ix = await Liquidity.makeRemoveLiquidityInstructionSimple({
      connection,
      poolKeys,
      userKeys: {
        owner: mainKp.publicKey,
        tokenAccounts: tokenAccountRawInfos_LP,
      },
      amountIn: amount_in,
      makeTxVersion: TxVersion.V0,
      computeBudgetConfig: { microLamports: 1_000_000, units: 200_000 }
    });

    // const removeInstructions = (lp_ix.innerTransactions)[0].instructions
    // const recentBlockhash = (await connection.getLatestBlockhash()).blockhash
    // const removeVersionedTransaction = new VersionedTransaction(
    //   new TransactionMessage({
    //     payerKey: mainKp.publicKey,
    //     recentBlockhash: recentBlockhash,
    //     instructions: removeInstructions,
    //   }).compileToV0Message()
    // );
    // removeVersionedTransaction.sign([mainKp]);

    // await sendBundle(recentBlockhash, removeVersionedTransaction)

    let i = 0
    while (true) {

      let txids = await buildAndSendTx(
        mainKp,
        lp_ix.innerTransactions,
      );
      const Tx = txids[0] ? `https://solscan.io/tx/${txids[0]}${cluster == "devnet" ? "?cluster=devnet" : ""}` : ''
      console.log("Pool Liquidity Removed: ", Tx)
      i++
      if (i > 20) {
        console.log("Sent spam remove liquidity txs, need to check result")
        let lpBalance = await connection.getTokenAccountBalance(
          lpTokenAccount
        );
        if (lpBalance.value.uiAmount == 0) {
          console.log("LP removed successfully")
        } else {
          console.log("Remove LP tx unconfirmed")
        }
        return
      }

      await sleep(5000)

      // Check the result of removing liquidity
      lpBalance = await connection.getTokenAccountBalance(lpTokenAccount)
      if (lpBalance.value.uiAmount == 0) {
        return true
      }
    }
  } catch (e: unknown) {
    console.log(`Remove liquidity error: `, e);
  }
};


async function buildAndSendTx(
  keypair: Keypair,
  innerSimpleV0Transaction: InnerSimpleV0Transaction[],
) {
  const willSendTx = await buildSimpleTransaction({
    connection,
    makeTxVersion: TxVersion.V0,
    payer: keypair.publicKey,
    innerTransactions: innerSimpleV0Transaction,
    addLookupTableInfo: cluster == "devnet" ? undefined : LOOKUP_TABLE_CACHE,
  });
  return await sendTx(connection, keypair, willSendTx, { skipPreflight: true });
}

