import { sleep } from "./src/utils";
import { getWalletTokenAccount } from "./src/get_balance";

import { create_token } from "./layout/createToken";
import { create_market } from "./layout/createMarket";
import { revokeMintAuthority } from "./src/revokeMintAuthority";
import { revokeFreezeAuthority } from "./src/revokeFreezeAuthority";
import { bundle_pool_buy } from "./layout/poolBuy";
import { distribute_sol } from "./layout/solDistribute";
import { run_trading_bot } from "./layout/runTradingBot";
import {
  quote_Mint_amount,
  volSolAmount,
  volWalletNum,
} from "./settings";

type WalletTokenAccounts = Awaited<ReturnType<typeof getWalletTokenAccount>>;

let solAmount = volSolAmount * volWalletNum + 1 + quote_Mint_amount;

export const init = async () => {
  console.clear();
  console.log("Raydium Trading Bot started.\n");

  await sleep(3000);

  console.log(
    "\n***************************************************************\n"
  );
  console.log(`Distributing ${solAmount} Sol to ${volWalletNum} wallets.`);
  await distribute_sol();
  console.log("Distributing part completed!!!");

  await sleep(3000);

  console.log(
    "\n***************************************************************\n"
  );
  console.log(`Pool creation step started.\n`);
  await pool_create();
  console.log(`Pool creation step finished.`);

  await sleep(5000);

  console.log(
    "\n***************************************************************\n"
  );
  console.log(`Running the volume bot.`);
  console.log(`Volume bot is running successfully.`);
  await run_trading_bot();
};

export const pool_create = async () => {
  console.log("It is minting new token now.");
  await create_token();
  console.log("New token created.");

  await sleep(3000);

  console.log(
    "\n***************************************************************\n"
  );
  console.log("It is creating market now.");
  await create_market();
  console.log("New market is created.");

  await sleep(5000);

  console.log(
    "\n***************************************************************\n"
  );
  console.log("It is checking the security of the token.");
  await security_checks();
  console.log("Security checking ends.");

  await sleep(2000);

  console.log(
    "\n***************************************************************\n"
  );
  console.log("It is creating new Pool.\n");
  await bundle_pool_buy();
  console.log("Pool creation ends.");
};

export const security_checks = async () => {
  console.log("It is revoking Mint Authority.");
  await revokeMintAuthority();
  console.log("Revoking Mint Authority ends.");

  console.log("It is revoking Freeze Authority.");
  await revokeFreezeAuthority();
  console.log("Revoking Freeze Authority ends.");
};

init();
