// Pure data + derivation helpers: no imports from app-user / app (avoids import cycles).
import type { LiteSVM } from "litesvm";
import { statSync } from "node:fs";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { AppToken, Cluster, getMintByAppToken } from "../../common/config";
import { getKeypairFromSeed, rootPath } from "../../backend/utils";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

/** scripts/tests/setup → project root */
export const DEPLOY_DIR = "./target/deploy";
export const DUMPS_DIR = "./scripts/tests/dumps";

export function getProgramPath(programName: string): string {
  return rootPath(`${DEPLOY_DIR}/${programName}.so`);
}

export function getDumpsPath(programName: string): string {
  return rootPath(`${DUMPS_DIR}/${programName}.so`);
}

export function getProgramSize(programName: string): number {
  const programPath = getProgramPath(programName);
  try {
    return statSync(programPath).size;
  } catch {
    throw new Error(`${programPath} program isn't found!`);
  }
}

export function getDeploymentCost(
  litesvm: LiteSVM,
  programSize: number
): number {
  const K = 100;
  const rentExemption = litesvm.minimumBalanceForRentExemption(
    BigInt(programSize)
  );
  const deploymentCost = Number(rentExemption) / LAMPORTS_PER_SOL;
  return Math.ceil(deploymentCost * K) / K;
}

// ---------------------------------------------------------------------------
// Balances (legacy values; SOL / token amounts are UI units)
// ---------------------------------------------------------------------------

export const INITIAL_SOL_BALANCE_DEFAULT = 10;
export const INITIAL_SOL_BALANCE_INCREASED = 1_000;

export const INITIAL_TOKEN_BALANCE_DEFAULT = 10_000;
export const INITIAL_TOKEN_BALANCE_INCREASED = 1_000_000;

// ---------------------------------------------------------------------------
// Deterministic keypairs: keypairs.txt = getKeypairFromSeed(0..999)
// 0-99 mints, 100-999 users. Legacy USER_KEYPAIR_LIST[i] = seed 100 + i.
// ---------------------------------------------------------------------------

// 103-109 are reserved for other priveledged addresses
export const SEED = {
  FIRST_MINT: 0,
  LAST_MINT: 99,
  ADMIN: 100, // USER_KEYPAIR_LIST[0]
  PAYER: 101, // USER_KEYPAIR_LIST[1]
  WORKER: 102, // USER_KEYPAIR_LIST[2]
  FIRST_USER: 110, // AppUser.index = 10
  MAX: 999,
} as const;

const keypairCache = new Map<number, Keypair>();

/** Same keypair as the `seed` entry of keypairs.txt (derived once, then cached) */
export function getTestKeypair(seed: number): Keypair {
  if (!Number.isInteger(seed) || seed < 0 || seed > SEED.MAX) {
    throw new Error(
      `Test keypair seed must be an integer in 0..${SEED.MAX}, got ${seed}`
    );
  }

  let keypair = keypairCache.get(seed);
  if (!keypair) {
    keypair = getKeypairFromSeed(seed);
    keypairCache.set(seed, keypair);
  }
  return keypair;
}

export const KEYPAIR_DEFAULT: Keypair = getTestKeypair(SEED.MAX);

/** User keypair (seeds 100..999) by address. Same contract as legacy getKeypairForAddress. */
export function getKeypairForAddress(address: PublicKey): Keypair {
  for (let seed = SEED.ADMIN; seed <= SEED.MAX; seed++) {
    const keypair = getTestKeypair(seed);
    if (keypair.publicKey.equals(address)) return keypair;
  }
  throw new Error(`No keypair found for address ${address.toBase58()}`);
}

// ---------------------------------------------------------------------------
// Mints
// ---------------------------------------------------------------------------

export interface TokenConfig {
  decimals: number;
  isToken2022: boolean;
}

export const TOKEN_CONFIG_DEFAULT: TokenConfig = {
  decimals: 0,
  isToken2022: false,
};

// Record<AppToken, …> makes the compiler flag every missing token.
export const TOKEN_CONFIG: Record<AppToken, TokenConfig> = {
  // Layer-1 tokens
  [AppToken.WSOL]: { decimals: 9, isToken2022: false },
  [AppToken.wETH]: { decimals: 9, isToken2022: false },
  [AppToken.wBTC]: { decimals: 8, isToken2022: false },
  [AppToken.cbBTC]: { decimals: 8, isToken2022: false },
  [AppToken.zBTC]: { decimals: 8, isToken2022: false },
  [AppToken.LBTC]: { decimals: 8, isToken2022: false },
  // Stablecoins
  [AppToken.USDC]: { decimals: 6, isToken2022: false },
  [AppToken.USDT]: { decimals: 6, isToken2022: false },
  [AppToken.USDY]: { decimals: 6, isToken2022: false },
  [AppToken.USDS]: { decimals: 6, isToken2022: false },
  [AppToken.PYUSD]: { decimals: 6, isToken2022: false },
  [AppToken.sUSDe]: { decimals: 6, isToken2022: false },
  [AppToken.USDe]: { decimals: 6, isToken2022: false },
  [AppToken.syrupUSDC]: { decimals: 6, isToken2022: false },
  [AppToken.AUSD]: { decimals: 6, isToken2022: false },
  // Liquid staking tokens
  [AppToken.mSOL]: { decimals: 9, isToken2022: false },
  [AppToken.jitoSOL]: { decimals: 9, isToken2022: false },
  [AppToken.bSOL]: { decimals: 9, isToken2022: false },
  [AppToken.dSOL]: { decimals: 9, isToken2022: false },
  [AppToken.BNSOL]: { decimals: 9, isToken2022: false },
  [AppToken.JLP]: { decimals: 6, isToken2022: false },
  // Utility tokens
  [AppToken.PYTH]: { decimals: 6, isToken2022: false },
  [AppToken.JUP]: { decimals: 6, isToken2022: false },
  [AppToken.TNSR]: { decimals: 6, isToken2022: false },
  [AppToken.DRIFT]: { decimals: 6, isToken2022: false },
  [AppToken.INF]: { decimals: 9, isToken2022: false },
  [AppToken.JTO]: { decimals: 9, isToken2022: false },
  [AppToken.ME]: { decimals: 6, isToken2022: false },
  [AppToken.RENDER]: { decimals: 8, isToken2022: false },
  [AppToken.CLOUD]: { decimals: 9, isToken2022: false },
  [AppToken.W]: { decimals: 6, isToken2022: false },
  // Meme & community tokens
  [AppToken.BONK]: { decimals: 5, isToken2022: false },
  [AppToken.WIF]: { decimals: 6, isToken2022: false },
  [AppToken.POPCAT]: { decimals: 9, isToken2022: false },
  [AppToken.MOTHER]: { decimals: 6, isToken2022: false },
  [AppToken.PENGU]: { decimals: 6, isToken2022: false },
  [AppToken.TRUMP]: { decimals: 6, isToken2022: false },
  [AppToken.MELANIA]: { decimals: 9, isToken2022: false },
  [AppToken.AI16Z]: { decimals: 6, isToken2022: false },
  [AppToken.FARTCOIN]: { decimals: 9, isToken2022: false },
  [AppToken.PUMP]: { decimals: 9, isToken2022: true },
  [AppToken.ZEUS]: { decimals: 6, isToken2022: false },
  [AppToken["2Z"]]: { decimals: 6, isToken2022: false },
  [AppToken.MET]: { decimals: 9, isToken2022: false },
  [AppToken.dfdvSOL]: { decimals: 9, isToken2022: false },

  // Kamino extension
  [AppToken.jupSOL]: { decimals: 9, isToken2022: false },
  [AppToken.USDG]: { decimals: 6, isToken2022: true },
  [AppToken.hSOL]: { decimals: 9, isToken2022: false },
  [AppToken.STKESOL]: { decimals: 9, isToken2022: false },
  // Tokenized equities (xStocks)
  [AppToken.SPYx]: { decimals: 8, isToken2022: true },
  [AppToken.TSLAx]: { decimals: 8, isToken2022: true },
  [AppToken.QQQx]: { decimals: 8, isToken2022: true },
  [AppToken.NVDAx]: { decimals: 8, isToken2022: true },
  [AppToken.GOOGLx]: { decimals: 8, isToken2022: true },
  [AppToken.MSTRx]: { decimals: 8, isToken2022: true },
  [AppToken.AAPLx]: { decimals: 8, isToken2022: true },
  [AppToken.CRCLx]: { decimals: 8, isToken2022: true },
  [AppToken.HOODx]: { decimals: 8, isToken2022: true },
};

/** Mints added to the localnet ALT (legacy order) */
export const ALT_TOKENS: AppToken[] = [
  AppToken.USDC,
  AppToken.wBTC,
  AppToken.PYTH,
  AppToken.WSOL,
  AppToken.wETH,
  AppToken.PUMP,
];

let mintKeypairs: Map<AppToken, Keypair> | undefined;

/**
 * Replaces legacy TOKEN_KEYPAIRS: for every token, the seed 0..99 keypair whose pubkey is
 * TOKEN_LOCALNET[token] (the invariant the legacy commented-out check asserted).
 * WSOL is native and skipped; tokens whose localnet mint isn't a mint seed
 * (legacy KEYPAIR_DEFAULT placeholders) are skipped too.
 * Iteration order = AppToken declaration order, same as legacy.
 */
export function getMintKeypairs(): ReadonlyMap<AppToken, Keypair> {
  if (mintKeypairs) return mintKeypairs;

  const bySeed = new Map<string, Keypair>();
  for (let seed = SEED.FIRST_MINT; seed <= SEED.LAST_MINT; seed++) {
    const keypair = getTestKeypair(seed);
    bySeed.set(keypair.publicKey.toBase58(), keypair);
  }

  mintKeypairs = new Map();
  for (const token of Object.values(AppToken)) {
    if (token === AppToken.WSOL) continue;

    const keypair = bySeed.get(
      getMintByAppToken(Cluster.Localnet, token).toBase58()
    );
    if (keypair) mintKeypairs.set(token, keypair);
  }
  return mintKeypairs;
}

export function getMintKeypair(token: AppToken): Keypair {
  const keypair = getMintKeypairs().get(token);
  if (!keypair) throw new Error(`${token} has no localnet mint keypair`);
  return keypair;
}

// ---------------------------------------------------------------------------
// Prices (mock localnet USD prices)
// ---------------------------------------------------------------------------

/** Placeholder for a token with no mock price */
export const PRICE_DEFAULT = 0;

// Record<AppToken, …> makes the compiler flag every missing token.
export const TOKEN_AND_PRICE_LIST: Record<AppToken, number> = {
  // Layer-1 tokens
  [AppToken.WSOL]: 200,
  [AppToken.wETH]: 3_300,
  [AppToken.wBTC]: 100_000,
  [AppToken.cbBTC]: 100_000,
  [AppToken.zBTC]: 100_000,
  [AppToken.LBTC]: 100_000,
  // Stablecoins
  [AppToken.USDC]: 1,
  [AppToken.USDT]: 1,
  [AppToken.USDY]: 1,
  [AppToken.USDS]: 1,
  [AppToken.PYUSD]: 1,
  [AppToken.sUSDe]: 1,
  [AppToken.USDe]: 1,
  [AppToken.syrupUSDC]: 1,
  [AppToken.AUSD]: 1,
  // Liquid staking tokens
  [AppToken.mSOL]: 155,
  [AppToken.jitoSOL]: 180,
  [AppToken.bSOL]: 155,
  [AppToken.dSOL]: 155,
  [AppToken.BNSOL]: 155,
  [AppToken.JLP]: 4.5,
  // Utility tokens
  [AppToken.PYTH]: 0.1,
  [AppToken.JUP]: 0.22,
  [AppToken.TNSR]: 0.3,
  [AppToken.DRIFT]: 0.5,
  [AppToken.INF]: 1.1,
  [AppToken.JTO]: 1.5,
  [AppToken.ME]: 2,
  [AppToken.RENDER]: 5,
  [AppToken.CLOUD]: 0.8,
  [AppToken.W]: 0.15,
  // Meme & community tokens
  [AppToken.BONK]: 0.000019,
  [AppToken.WIF]: 1.05,
  [AppToken.POPCAT]: 0.35,
  [AppToken.MOTHER]: 0.04,
  [AppToken.PENGU]: 0.013,
  [AppToken.TRUMP]: 8,
  [AppToken.MELANIA]: 1.2,
  [AppToken.AI16Z]: 0.9,
  [AppToken.FARTCOIN]: 1.3,
  [AppToken.PUMP]: 0.005,
  [AppToken.ZEUS]: 0.25,
  [AppToken["2Z"]]: 0.08,
  [AppToken.MET]: 0.12,
  [AppToken.dfdvSOL]: 155,

  // Kamino extension
  [AppToken.jupSOL]: 250,
  [AppToken.USDG]: 1,
  [AppToken.hSOL]: 250,
  [AppToken.STKESOL]: 80,
  // Tokenized equities (xStocks)
  [AppToken.SPYx]: 750,
  [AppToken.TSLAx]: 415,
  [AppToken.QQQx]: 730,
  [AppToken.NVDAx]: 200,
  [AppToken.GOOGLx]: 360,
  [AppToken.MSTRx]: 100,
  [AppToken.AAPLx]: 315,
  [AppToken.CRCLx]: 70,
  [AppToken.HOODx]: 120,
};

/** Mock localnet USD price of `appToken`. Throws if it has no price. */
export function getPriceByAppTokenLocal(appToken: AppToken): number {
  const price = TOKEN_AND_PRICE_LIST[appToken];
  if (!Number.isFinite(price) || price <= PRICE_DEFAULT) {
    throw new Error(`${appToken} has no mock localnet price`);
  }

  return price;
}
