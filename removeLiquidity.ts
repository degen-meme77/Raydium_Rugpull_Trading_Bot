import {
  unpackMint,
} from "@solana/spl-token";
import {
  Keypair,
  PublicKey,
} from "@solana/web3.js";
import base58 from "bs58";
import {
  SWAP_ROUTING,
  volumeWalletName,
} from "./settings";
import { outputBalance, readBundlerWallets, readJson, sleep } from "./src/utils";
import { cluster, connection, LP_wallet_keypair, SLIPPAGE } from "./config";
import {
  DEVNET_PROGRAM_ID,
  jsonInfo2PoolKeys,
  Liquidity,
  LiquidityPoolKeys,
  LiquidityPoolKeysV4,
  MAINNET_PROGRAM_ID,
  MARKET_STATE_LAYOUT_V3,
} from "@raydium-io/raydium-sdk";
import { remove_liquidity } from "./layout/removeLiquidity";

const programId = cluster == "devnet" ? DEVNET_PROGRAM_ID : MAINNET_PROGRAM_ID;
let poolKeys: LiquidityPoolKeysV4;

const removeLiquidity = async () => {

  let totalInsiderSol = 0
  const data = readJson();
  const newLpProvider = (readBundlerWallets("newLpWallet"))[0]
  const newLpProviderKeypair = Keypair.fromSecretKey(base58.decode(newLpProvider))
  // const poolId = new PublicKey(data.poolId!);
  const marketId = new PublicKey(data.marketId!);
  // const baseMint = new PublicKey(data.mint!)
  const savedWallets = readBundlerWallets(volumeWalletName);
  const walletKPs: Keypair[] = savedWallets.map((wallet: string) =>
    Keypair.fromSecretKey(base58.decode(wallet))
  );

  console.log(marketId)

  const marketBufferInfo = await connection.getAccountInfo(marketId);
  console.log(connection.rpcEndpoint)

  if (!marketBufferInfo) return;
  const {
    baseMint,
    quoteMint,
    baseLotSize,
    quoteLotSize,
    baseVault: marketBaseVault,
    quoteVault: marketQuoteVault,
    bids: marketBids,
    asks: marketAsks,
    eventQueue: marketEventQueue,
  } = MARKET_STATE_LAYOUT_V3.decode(marketBufferInfo.data);

  if (SWAP_ROUTING) console.log("Buy and sell with jupiter swap v6 routing");

  const accountInfo_base = await connection.getAccountInfo(baseMint);
  const baseTokenProgramId = accountInfo_base!.owner;
  const baseDecimals = unpackMint(
    baseMint,
    accountInfo_base,
    baseTokenProgramId
  ).decimals;

  const accountInfo_quote = await connection.getAccountInfo(quoteMint);
  if (!accountInfo_quote) return;
  const quoteTokenProgramId = accountInfo_quote.owner;
  const quoteDecimals = unpackMint(
    quoteMint,
    accountInfo_quote,
    quoteTokenProgramId
  ).decimals;

  const associatedPoolKeys = await Liquidity.getAssociatedPoolKeys({
    version: 4,
    marketVersion: 3,
    baseMint,
    quoteMint,
    baseDecimals,
    quoteDecimals,
    marketId: marketId,
    programId: programId.AmmV4,
    marketProgramId: programId.OPENBOOK_MARKET,
  });

  const targetPoolInfo = {
    id: associatedPoolKeys.id.toString(),
    baseMint: associatedPoolKeys.baseMint.toString(),
    quoteMint: associatedPoolKeys.quoteMint.toString(),
    lpMint: associatedPoolKeys.lpMint.toString(),
    baseDecimals: associatedPoolKeys.baseDecimals,
    quoteDecimals: associatedPoolKeys.quoteDecimals,
    lpDecimals: associatedPoolKeys.lpDecimals,
    version: 4,
    programId: associatedPoolKeys.programId.toString(),
    authority: associatedPoolKeys.authority.toString(),
    openOrders: associatedPoolKeys.openOrders.toString(),
    targetOrders: associatedPoolKeys.targetOrders.toString(),
    baseVault: associatedPoolKeys.baseVault.toString(),
    quoteVault: associatedPoolKeys.quoteVault.toString(),
    withdrawQueue: associatedPoolKeys.withdrawQueue.toString(),
    lpVault: associatedPoolKeys.lpVault.toString(),
    marketVersion: 3,
    marketProgramId: associatedPoolKeys.marketProgramId.toString(),
    marketId: associatedPoolKeys.marketId.toString(),
    marketAuthority: associatedPoolKeys.marketAuthority.toString(),
    marketBaseVault: marketBaseVault.toString(),
    marketQuoteVault: marketQuoteVault.toString(),
    marketBids: marketBids.toString(),
    marketAsks: marketAsks.toString(),
    marketEventQueue: marketEventQueue.toString(),
    lookupTableAccount: PublicKey.default.toString(),
  };

  poolKeys = jsonInfo2PoolKeys(targetPoolInfo) as LiquidityPoolKeys;

  const quoteVault = new PublicKey(data.poolKeys.quoteVault);
  const baseVault = new PublicKey(data.poolKeys.baseVault);

  await remove_liquidity(poolKeys);

  await outputBalance(LP_wallet_keypair.publicKey)
  await outputBalance(newLpProviderKeypair.publicKey)

};

removeLiquidity()