import { UserToken } from "./src/types";

// **************************************************** //
// ***************   SETTINGS   *********************** //
// **************************************************** //
// You should set following values before you run the program.

// settings about token you are going to Mint
export const tokens: UserToken[] = [
  {
    name: "AIHorse",
    symbol: "AH",
    decimals: 9,
    description: "Hello, AI!",
    uiAmount: 10 ** 9,
    image: "./src/images/1.jpg",
    extensions: {
      website: "https://github.com/T",
      twitter: "https://x.com/d",
      telegram: "https://t.me/@Pio",
    },
    tags: ["Meme", "Tokenization"],
    creator: {
      name: "Pio",
      site: "https://github.com/Pio",
    },
  },
];

// The amount of Solana to distribute to volumebot wallets
export const volSolAmount = 0.08; // solana
// The number of wallets to distribute from master wallets
export const volWalletNum = 10; // except Lp_wallet to create the pool
// The name of volume bot wallets
export const volumeWalletName = "volumeWallets";
// The amount of liquidity by Outsiders in Threshold checking
export const liquidityCheckingAmount = 1;
// The time limit to check liquidity
export const liquidityCheckingTime = 6000;


// amount of baseToken to put into the pool (0.5 is 50%, 1 is 100%)
export const input_baseMint_tokens_percentage = 1; //ABC-Mint amount of tokens you want to add in Lp e.g. 1 = 100%. 0.9= 90%
// amount of Sol to put into the Pool as liquidity
export let quote_Mint_amount = 0.2; //COIN-SOL, amount of SOL u want to add to Pool amount
// percent of LP tokens to burn
export const burnLpQuantityPercent = 0; // 70 is 70% of total lp token supply


// Settings for Trading bot
export const IS_RANDOM = true;
export const SWAP_ROUTING = false;
export const BUY_AMOUNT = 0.01;
export const BUY_UPPER_AMOUNT = 0.0005;
export const BUY_LOWER_AMOUNT = 0.0002;
export const BUY_INTERVAL_MAX = 4000;
export const BUY_INTERVAL_MIN = 2000;
export const ADDITIONAL_FEE = 0.006; // should be larger than 0.006SOL
