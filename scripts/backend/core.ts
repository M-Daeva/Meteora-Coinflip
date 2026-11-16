import * as anchor from "@coral-xyz/anchor";
import { loadAdminSigner } from "./signer.node";
import {
  AppToken,
  Cluster,
  getMintByAppToken,
  li,
  ResultType,
} from "../common";
import { initApp } from "./app";
import { getKeypairFromSeed } from "./utils";
import { getMintKeypairs } from "../tests/setup/litesvm-config";
import { PublicKey } from "@solana/web3.js";

const CLUSTER: Cluster = Cluster.Devnet;

// ============================================================
// === constants ===
// ============================================================

const { BN } = anchor;

const U64_MAX = new BN("18446744073709551615");
const MIN_SQRT_PRICE = new BN("4295048016");
const MAX_SQRT_PRICE = new BN("79226673521066979257578248091");

const VRF_FEE = 1_000_000;

const DAMM_CONFIG_INDEX = new BN(0);
const DAMM_CREATE_CONFIG_PERMISSION = new BN(1).shln(0); // CREATE_CONFIG_KEY = 0

const DBC_MIGRATION_QUOTE_THRESHOLD = 5_000_000;
const APP_USDC_FUNDING = 10_000_000;
const MIN_QUOTE_BET = 1_000;
const MAX_QUOTE_BET = 10_000_000;

const SWAP_BEFORE_BET = 3_000_000; // stays below the migration threshold
const SWAP_TO_COMPLETE_CURVE = 6_000_000; // partial fill, completes the curve

const BET_AMOUNT = 100_000;
const MIN_QUOTE_OUT = 90_000;

// ============================================================
// === DBC config builders ===
// ============================================================

function buildCurve() {
  return Array.from({ length: 16 }, (_, k) => {
    const i = k + 1;
    return {
      sqrtPrice:
        i === 16 ? MAX_SQRT_PRICE : MAX_SQRT_PRICE.muln(i * 5).divn(100),
      liquidity: U64_MAX.shln(30 + i),
    };
  });
}

function buildBaseFee() {
  const cliffFeeNumerator = 20_000_000;
  const endFeeNumerator = 3_000_000;
  const numberOfPeriod = 60;
  const periodFrequency = 1;

  return {
    cliffFeeNumerator,
    firstFactor: numberOfPeriod,
    secondFactor: periodFrequency,
    thirdFactor: (cliffFeeNumerator - endFeeNumerator) / numberOfPeriod,
    baseFeeMode: 0,
  };
}

const NO_LIQUIDITY_VESTING = {
  vestingPercentage: 0,
  cliffDurationFromMigrationTime: 0,
  bpsPerPeriod: 0,
  numberOfPeriods: 0,
  frequency: 0,
};

function buildDbcConfigParameters() {
  return {
    poolFees: { baseFee: buildBaseFee() },
    activationType: 0,
    collectFeeMode: 0,
    migrationOption: 1, // damm v2
    tokenType: 1, // token-2022
    tokenDecimal: 6,
    migrationQuoteThreshold: DBC_MIGRATION_QUOTE_THRESHOLD,
    partnerLiquidityPercentage: 20,
    creatorLiquidityPercentage: 20,
    partnerPermanentLockedLiquidityPercentage: 55,
    creatorPermanentLockedLiquidityPercentage: 5,
    sqrtStartPrice: MIN_SQRT_PRICE.shln(32),
    lockedVesting: {
      amountPerPeriod: 0,
      cliffDurationFromMigrationTime: 0,
      frequency: 0,
      numberOfPeriod: 0,
      cliffUnlockAmount: 0,
    },
    migrationFeeOption: 6, // customizable
    creatorTradingFeePercentage: 0,
    tokenUpdateAuthority: 0,
    migrationFee: { feePercentage: 0, creatorFeePercentage: 0 },
    poolCreationFee: 0,
    migratedPoolFee: { poolFeeBps: 100, collectFeeMode: 0, dynamicFee: 0 },
    curve: buildCurve(),
    creatorLiquidityVestingInfo: NO_LIQUIDITY_VESTING,
    partnerLiquidityVestingInfo: NO_LIQUIDITY_VESTING,
    enableFirstSwapWithMinFee: true,
    compoundingFeeBps: 0,
    migratedPoolBaseFeeMode: 0,
    migratedPoolMarketCapFeeSchedulerParams: {
      numberOfPeriod: 0,
      sqrtPriceStepBps: 0,
      schedulerExpirationDuration: 0,
      reductionFactor: 0,
    },
    padding: new Array(2).fill(0),
  };
}

async function main() {
  const adminSigner = await loadAdminSigner();
  const app = await initApp(CLUSTER, adminSigner);

  const quoteMintKp = getMintKeypairs().get(AppToken.USDC);
  if (!quoteMintKp) throw new Error("USDC KP isn't found");
  const quoteMint = quoteMintKp.publicKey;

  // create devnet usdc

  // await app.chain.createMint(quoteMintKp, 6, [], {
  //   resultType: ResultType.BroadcastedTx,
  //   isToken2022: false,
  // });
  // await app.chain.mintTokens(600, quoteMint, adminSigner.publicKey, {
  //   resultType: ResultType.BroadcastedTx,
  //   isDisplayed: true,
  // });

  const baseMintKp = getKeypairFromSeed(9_906);
  const baseMint = baseMintKp.publicKey;

  const dbcConfigKp = getKeypairFromSeed(9_907);
  const dbcConfig = dbcConfigKp.publicKey;

  // create virtual pool (creates base mint automatically)

  // await app.dbc.tryCreateConfig(
  //   dbcConfigKp,
  //   { configParameters: buildDbcConfigParameters() },
  //   { resultType: ResultType.BroadcastedTx, isDisplayed: true }
  // );

  // await app.dbc.tryCreatePoolWithToken2022(
  //   baseMintKp,
  //   quoteMint,
  //   dbcConfig,
  //   { params: { name: "Coinflip test token", symbol: "CFTT", uri: "abc.com" } },
  //   { resultType: ResultType.BroadcastedTx, isDisplayed: true }
  // );

  await app.dbc.queryVirtualPool(dbcConfig, baseMint, quoteMint, true);

  await app.coinflip.tryInit(
    {
      worker: adminSigner.publicKey,
      baseMint,
      vrfProgram: app.oraoVrf.program.programId,
      dbcProgram: app.dbc.program.programId,
      dammProgram: app.dammV2.program.programId,
      dbcConfig,
      dammConfig: PublicKey.default,
      minQuoteBet: MIN_QUOTE_BET,
      maxQuoteBet: MAX_QUOTE_BET,
    },
    { resultType: ResultType.BroadcastedTx, isDisplayed: true }
  );
}

main();
