import bs58 from 'bs58';

// import { newTokenTimestampPerf } from '../streaming/raydium';

import {
  PublicKey,
  Keypair,
  VersionedTransaction,
  MessageV0,
  Connection
} from '@solana/web3.js';

import { Bundle } from 'jito-ts/dist/sdk/block-engine/types';
import { searcherClient } from 'jito-ts/dist/sdk/block-engine/searcher';
import { BLOCKENGINE_URL, connection, JITO_FEE, LP_wallet_private_key } from '../config';
import base58 from 'bs58';

const SIGNER_WALLET = Keypair.fromSecretKey(bs58.decode(LP_wallet_private_key));

const blockEngineUrl = BLOCKENGINE_URL || '';

// console.log('BLOCK_ENGINE_URL:', blockEngineUrl);
const c = searcherClient(blockEngineUrl, undefined);

// Get Tip Accounts
let tipAccounts: string[] = [];
(async () => {
  try {
    const result = await c.getTipAccounts(); // Result<string[], SearcherClientError>
    if (result.ok) {
      tipAccounts = result.value; // Access the successful value
      // console.log('Result:', tipAccounts);
    } else {
      console.error('Error:', result.error); // Access the error
    }
  } catch (error) {
    console.error('Unexpected Error:', error); // Handle unexpected errors
  }
})();

export async function sendBundle(latestBlockhash: string, transaction: VersionedTransaction, wallet: Keypair) {

  try {

    // console.log(await connection.simulateTransaction(transaction, {sigVerify: true}))

    const latestBlockhash1 = await connection.getLatestBlockhash()

    const _tipAccount = tipAccounts[Math.floor(Math.random() * 6)];
    const tipAccount = new PublicKey(_tipAccount);
    const tipAmount: number = Number(JITO_FEE);


    const b = new Bundle([transaction], 5);
    b.addTipTx(
      wallet,
      tipAmount,      // Adjust Jito tip amount here
      tipAccount,
      latestBlockhash1.blockhash
    );

    const bundleResult = await c.sendBundle(b);
    // console.log(bundleResult)

    // const bundleTimestampPerf = performance.now()
    // const bundleTimestampDate = new Date();
    // const bundleTimeFormatted = `${bundleTimestampDate.getHours().toString().padStart(2, '0')}:${bundleTimestampDate.getMinutes().toString().padStart(2, '0')}:${bundleTimestampDate.getSeconds().toString().padStart(2, '0')}.${bundleTimestampDate.getMilliseconds().toString().padStart(3, '0')}`;
    // const elapsedStreamToBundlePerf = bundleTimestampPerf - newTokenTimestampPerf;

    // logger.warn(`Time Elapsed (Streamed > Bundle send): ${elapsedStreamToBundlePerf}ms`);
    // logger.info(`Time bundle sent: ${bundleTimeFormatted} | bundleResult = ${bundleResult}`);
    // logger.info(`https://dexscreener.com/solana/${mint}?maker=${SIGNER_WALLET.publicKey}`);
    // logger.info(`https://dexscreener.com/solana/${mint}`);

    return bundleResult.ok

  } catch (error) {
    // console.log(error);
  }

}

// export async function getJitoLeaderSchedule() {

//   const leaderSchedule = new Set<number>();
//   const cs = searcherClient(blockEngineUrl);

//   let response: any;
//   try {
//     response = await cs.getConnectedLeaders();
//   } catch (error) {
//     console.error('Error:', error);
//   }

//   for (let key in response) {

//     let validator = response[key];

//     for (let slot in validator.slots) {

//       leaderSchedule.add(validator.slots[slot] as number);
//     }
//   }

//   return leaderSchedule;
// }