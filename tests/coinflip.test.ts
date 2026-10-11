import * as anchor from "@coral-xyz/anchor";
import { describe, it, expect, beforeAll } from "vitest";
import { ResultType, TxSettings } from "../scripts/common/interfaces";
import { initApp } from "./litesvm-suite";
import { AppUser } from "../scripts/common/config/litesvm";
import { Keypair, PublicKey } from "@solana/web3.js";
import { App } from "../scripts/common/account";
import { getKeypairFromSeed } from "../scripts/common/utils";
import { AppToken, Cluster, getMintByAppToken } from "../scripts/common/config";
import { BetSide } from "../scripts/common/interfaces/coinflip";

// ============================================================
// === constants ===
// ============================================================

const { BN } = anchor;

const CLUSTER: Cluster = Cluster.Localnet;

const U64_MAX = new BN("18446744073709551615");
const MIN_SQRT_PRICE = new BN("4295048016");
const MAX_SQRT_PRICE = new BN("79226673521066979257578248091");

const TX: TxSettings = { resultType: ResultType.BroadcastedTx };

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

// ============================================================
// === tests ===
// ============================================================

describe("Coinflip", () => {
  const user = new AppUser();
  const admin = user.getAdmin();
  const worker = user.getWorker();

  const dbcConfigKp = getKeypairFromSeed(2_000);
  const baseMintKp = getKeypairFromSeed(2_001);
  const dbcConfig = dbcConfigKp.publicKey;
  const baseMint = baseMintKp.publicKey;

  let app: App;
  let quoteMint: PublicKey;
  let dammConfig: PublicKey;
  let alice: Keypair;

  // --- setup ---

  async function setupVrf() {
    await app.oraoVrf.tryInitNetwork(
      {
        fee: VRF_FEE,
        configAuthority: admin.publicKey,
        fulfillmentAuthorities: [worker.publicKey],
      },
      TX
    );
  }

  async function setupDamm() {
    const [dbcPoolAuthority] = app.dbc.pdaPoolAuthority();

    // admin is whitelisted to call createConfig
    await app.dammV2.tryCreateOperatorAccount(
      admin.publicKey,
      DAMM_CREATE_CONFIG_PERMISSION,
      TX
    );

    // only DBC pool authority can create pools in this config
    await app.dammV2.tryCreateDynamicConfig(
      DAMM_CONFIG_INDEX,
      {
        index: DAMM_CONFIG_INDEX,
        configParameters: {
          poolCreatorAuthority: dbcPoolAuthority,
          permission: DAMM_CREATE_CONFIG_PERMISSION,
        },
      },
      TX
    );

    // pool authority pays for the DAMM pool on migration
    await app.chain.transferSol(1, dbcPoolAuthority);

    [dammConfig] = app.dammV2.pdaConfig(DAMM_CONFIG_INDEX);
  }

  async function setupDbc() {
    await app.dbc.tryCreateConfig(
      dbcConfigKp,
      { configParameters: buildDbcConfigParameters() },
      TX
    );

    await app.dbc.tryCreatePoolWithToken2022(
      baseMintKp,
      quoteMint,
      dbcConfig,
      { params: { name: "test token-2022", symbol: "TEST", uri: "abc.com" } },
      TX
    );
  }

  async function setupCoinflip() {
    await app.coinflip.tryInit(
      {
        worker: worker.publicKey,
        baseMint,
        vrfProgram: app.oraoVrf.program.programId,
        dbcProgram: app.dbc.program.programId,
        dammProgram: app.dammV2.program.programId,
        dbcConfig,
        dammConfig,
        minQuoteBet: MIN_QUOTE_BET,
        maxQuoteBet: MAX_QUOTE_BET,
      },
      TX
    );

    // bankroll for prizes
    await app.chain.transferTokens(
      BigInt(APP_USDC_FUNDING),
      quoteMint,
      admin.publicKey,
      app.coinflip.pdaConfig()[0],
      TX
    );
  }

  // --- actions ---

  async function getBalances(owner: PublicKey) {
    const [usdc, base] = await Promise.all([
      app.chain.getAtaBalance(owner, quoteMint),
      app.chain.getAtaBalance(owner, baseMint),
    ]);
    return { usdc, base };
  }

  /** Runs `action` and returns the owner's balance change (after - before). */
  async function withBalanceDelta(
    owner: PublicKey,
    action: () => Promise<unknown>
  ) {
    const before = await getBalances(owner);
    await action();
    const after = await getBalances(owner);
    return { usdc: after.usdc - before.usdc, base: after.base - before.base };
  }

  async function buyOnCurve(buyer: Keypair, quoteAmount: number) {
    await app.dbc.withSender(buyer).trySwap(
      baseMint,
      quoteMint,
      dbcConfig,
      {
        swapParameters2: {
          swapMode: 1, // partial fill
          amount0: quoteAmount,
          amount1: 0,
        },
      },
      TX
    );
  }

  async function migrate() {
    await app.dbc.tryCreateMeteoraDammV2Metadata(
      baseMint,
      quoteMint,
      dbcConfig,
      TX
    );

    await app.dbc.tryMigrateToDammV2(
      app.dammV2,
      Keypair.generate(),
      Keypair.generate(),
      baseMint,
      quoteMint,
      dbcConfig,
      dammConfig,
      TX
    );
  }

  function placeBet(
    bettor: Keypair,
    betNonce: number,
    betSide: BetSide,
    betAmount = BET_AMOUNT
  ) {
    return withBalanceDelta(bettor.publicKey, () =>
      app.coinflip
        .withSender(bettor)
        .tryPlaceBet(
          app.dbc,
          app.dammV2,
          app.oraoVrf,
          { betAmount, betSide, betNonce, minQuoteOut: MIN_QUOTE_OUT },
          TX
        )
    );
  }

  async function fulfillRandomness(bettor: Keypair, betNonce: number) {
    const [betPda] = app.coinflip.pdaBet(bettor.publicKey, betNonce);
    const seed = betPda.toBuffer();

    await app.oraoVrf.withSender(worker).tryFulfill(seed, TX);

    const {
      request: { fulfilled },
    } = await app.oraoVrf.queryRequest(seed);
    expect(fulfilled?.[0].randomness).not.toEqual([]);
  }

  function settleBet(bettor: Keypair, betNonce: number) {
    return withBalanceDelta(bettor.publicKey, () =>
      app.coinflip
        .withSender(worker)
        .trySettleBet(app.oraoVrf, { betNonce, user: bettor.publicKey }, TX)
    );
  }

  // --- lifecycle ---

  beforeAll(async () => {
    app = await initApp(CLUSTER, admin);
    user.setChain(app.chain);
    quoteMint = getMintByAppToken(app.provider.cluster, AppToken.USDC);
    [alice] = await user.rotateUsers(1);

    await setupVrf();
    await setupDamm();
    await setupDbc();
    await setupCoinflip();
  });

  // tests below share chain state and must run in order

  it("bets via DBC before migration", async () => {
    const betNonce = 43;

    await buyOnCurve(alice, SWAP_BEFORE_BET);

    const placed = await placeBet(alice, betNonce, BetSide.Head);
    expect(placed).toEqual({ usdc: 0, base: -BET_AMOUNT });

    const bet = await app.coinflip.queryBet(alice.publicKey, betNonce);
    expect("head" in bet.side).toBeTruthy();

    await fulfillRandomness(alice, betNonce);

    const settled = await settleBet(alice, betNonce);
    expect(settled).toEqual({ usdc: 196_534, base: 0 });
  });

  it("migrates the curve to DAMM v2", async () => {
    await buyOnCurve(alice, SWAP_TO_COMPLETE_CURVE);
    await migrate();

    const { poolState } = await app.dbc.queryVirtualPool(
      dbcConfig,
      quoteMint,
      baseMint
    );
    expect(poolState.isMigrated).toBeTruthy();
  });

  it("bets via DAMM v2 after migration", async () => {
    const betNonce = 44;

    const placed = await placeBet(alice, betNonce, BetSide.Tail);
    expect(placed).toEqual({ usdc: 0, base: -BET_AMOUNT });

    await fulfillRandomness(alice, betNonce);

    const settled = await settleBet(alice, betNonce);
    expect(settled).toEqual({ usdc: 195_769, base: 0 });
  });
});
