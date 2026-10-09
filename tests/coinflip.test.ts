import * as anchor from "@coral-xyz/anchor";
import { describe, it, expect, beforeAll } from "vitest";
import { ResultType } from "../scripts/common/interfaces";
import { initApp, shouldFailAsync } from "./litesvm-suite";
import { AppUser } from "../scripts/common/config/litesvm";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { App } from "../scripts/common/account";
import { getKeypairFromSeed, li } from "../scripts/common/utils";
import { AppToken, Cluster, getMintByAppToken } from "../scripts/common/config";

const { BN } = anchor;

const CLUSTER: Cluster = Cluster.Localnet;

describe("Coinflip", () => {
  const U64_MAX = new BN("18446744073709551615");
  const MIN_SQRT_PRICE = new BN("4295048016");
  const MAX_SQRT_PRICE = new BN("79226673521066979257578248091");

  const user = new AppUser();
  const adminKeypair = user.getAdmin();
  const worker = user.getWorker();
  const payer = user.getPayer();

  let app: App;
  let token: Record<AppToken, PublicKey>;

  beforeAll(async () => {
    app = await initApp(CLUSTER, adminKeypair);
    ({ token } = app);
    user.setChain(app.chain);
  });

  it("swap before and after migration", async () => {
    const AMOUNT_TO_SWAP_BEFORE_MIGRATION = 6_000_000;
    const AMOUNT_TO_SWAP_AFTER_MIGRATION = 1_000_000;

    const configKp = getKeypairFromSeed(2_000);
    const baseMintKP = getKeypairFromSeed(2_001);
    const quoteMint = getMintByAppToken(app.provider.cluster, AppToken.USDC);

    const [alice] = await user.rotateUsers(1);

    // --- prepare damm ---

    const CREATE_CONFIG_KEY = 0;
    const permission = new BN(1).shln(CREATE_CONFIG_KEY);
    const index = new BN(0);

    await app.dammV2.tryCreateOperatorAccount(
      adminKeypair.publicKey, // the address that will later call createConfig
      permission,
      { resultType: ResultType.BroadcastedTx }
    );

    const [poolAuthority] = app.dbc.pdaPoolAuthority();
    await app.dammV2.tryCreateDynamicConfig(
      index,
      {
        index,
        configParameters: {
          poolCreatorAuthority: poolAuthority,
          permission,
        },
      },
      { resultType: ResultType.BroadcastedTx }
    );

    // fund pool authority
    await app.chain.transferSol(1, poolAuthority);

    // --- prepare dbc ---

    const sqrtStartPrice = MIN_SQRT_PRICE.shln(32);
    const cliffFeeNumerator = 20_000_000;
    const endFeeNumerator = 3_000_000;
    const numberOfPeriod = 60;
    const periodFrequency = 1;
    const reductionFactor =
      (cliffFeeNumerator - endFeeNumerator) / numberOfPeriod;

    const curves = [];
    for (let i = 1; i <= 16; i++) {
      if (i == 16) {
        curves.push({
          sqrtPrice: MAX_SQRT_PRICE,
          liquidity: U64_MAX.shln(30 + i),
        });
      } else {
        curves.push({
          sqrtPrice: MAX_SQRT_PRICE.muln(i * 5).divn(100),
          liquidity: U64_MAX.shln(30 + i),
        });
      }
    }

    await app.dbc.tryCreateConfig(
      configKp,
      {
        configParameters: {
          poolFees: {
            baseFee: {
              cliffFeeNumerator: cliffFeeNumerator,
              firstFactor: numberOfPeriod,
              secondFactor: periodFrequency,
              thirdFactor: reductionFactor,
              baseFeeMode: 0,
            },
          },
          activationType: 0,
          collectFeeMode: 0,
          migrationOption: 1, // damm v2
          tokenType: 1, // token-2022
          tokenDecimal: 6,
          migrationQuoteThreshold: 5_000_000,
          partnerLiquidityPercentage: 20,
          creatorLiquidityPercentage: 20,
          partnerPermanentLockedLiquidityPercentage: 55,
          creatorPermanentLockedLiquidityPercentage: 5,
          sqrtStartPrice,
          lockedVesting: {
            amountPerPeriod: 0,
            cliffDurationFromMigrationTime: 0,
            frequency: 0,
            numberOfPeriod: 0,
            cliffUnlockAmount: 0,
          },
          migrationFeeOption: 6, // customizable
          // tokenSupply: undefined,
          creatorTradingFeePercentage: 0,
          tokenUpdateAuthority: 0,
          migrationFee: {
            feePercentage: 0,
            creatorFeePercentage: 0,
          },
          poolCreationFee: 0,
          migratedPoolFee: {
            poolFeeBps: 100,
            collectFeeMode: 0,
            dynamicFee: 0,
          },
          curve: curves,
          creatorLiquidityVestingInfo: {
            vestingPercentage: 0,
            cliffDurationFromMigrationTime: 0,
            bpsPerPeriod: 0,
            numberOfPeriods: 0,
            frequency: 0,
          },
          partnerLiquidityVestingInfo: {
            vestingPercentage: 0,
            cliffDurationFromMigrationTime: 0,
            bpsPerPeriod: 0,
            numberOfPeriods: 0,
            frequency: 0,
          },
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
        },
      },
      { resultType: ResultType.BroadcastedTx }
    );

    await app.dbc.tryCreatePoolWithToken2022(
      baseMintKP,
      quoteMint,
      configKp.publicKey,
      {
        params: {
          name: "test token-2022",
          symbol: "TEST",
          uri: "abc.com",
        },
      },
      { resultType: ResultType.BroadcastedTx }
    );

    // --- swap in virtual pool ---

    let aliceUsdcBefore = await app.chain.getAtaBalance(
      alice.publicKey,
      quoteMint
    );
    let aliceBaseBefore = await app.chain.getAtaBalance(
      alice.publicKey,
      baseMintKP.publicKey
    );

    await app.dbc.withSender(alice).trySwap(
      baseMintKP.publicKey,
      quoteMint,
      configKp.publicKey,
      {
        swapParameters2: {
          swapMode: 1, // partial fill
          amount0: AMOUNT_TO_SWAP_BEFORE_MIGRATION,
          amount1: 0,
        },
      },
      { resultType: ResultType.BroadcastedTx }
    );

    let aliceUsdcAfter = await app.chain.getAtaBalance(
      alice.publicKey,
      quoteMint
    );
    let aliceBaseAfter = await app.chain.getAtaBalance(
      alice.publicKey,
      baseMintKP.publicKey
    );

    expect(aliceUsdcBefore - aliceUsdcAfter).toBe(5_102_041);
    expect(aliceBaseAfter - aliceBaseBefore).toBe(4_988_198);

    // --- migrate ---

    await app.dbc.tryCreateMeteoraDammV2Metadata(
      baseMintKP.publicKey,
      quoteMint,
      configKp.publicKey,
      { resultType: ResultType.BroadcastedTx }
    );

    const [dammConfig] = app.dammV2.pdaConfig(index);

    await app.dbc.tryMigrateToDammV2(
      app.dammV2,
      Keypair.generate(),
      Keypair.generate(),
      baseMintKP.publicKey,
      quoteMint,
      configKp.publicKey,
      dammConfig,
      { resultType: ResultType.BroadcastedTx }
    );

    // --- swap in DAMM pool ---

    const [dammPool] = app.dammV2.pdaDammV2PoolAddress(
      dammConfig,
      baseMintKP.publicKey,
      quoteMint
    );

    aliceUsdcBefore = await app.chain.getAtaBalance(alice.publicKey, quoteMint);
    aliceBaseBefore = await app.chain.getAtaBalance(
      alice.publicKey,
      baseMintKP.publicKey
    );

    await app.dammV2.withSender(alice).trySwap(
      dammPool,
      quoteMint,
      {
        params: {
          amount0: new BN(AMOUNT_TO_SWAP_AFTER_MIGRATION),
          amount1: new BN(0),
          swapMode: 0,
        },
      },
      { resultType: ResultType.BroadcastedTx }
    );

    aliceUsdcAfter = await app.chain.getAtaBalance(alice.publicKey, quoteMint);
    aliceBaseAfter = await app.chain.getAtaBalance(
      alice.publicKey,
      baseMintKP.publicKey
    );

    expect(aliceUsdcBefore - aliceUsdcAfter).toBe(
      AMOUNT_TO_SWAP_AFTER_MIGRATION
    );
    expect(aliceBaseAfter - aliceBaseBefore).toBe(822_239);
  });

  it("randomness", async () => {
    const [alice] = await user.rotateUsers(1);

    await app.oraoVrf.tryInitNetwork(
      {
        fee: 1_000_000,
        configAuthority: adminKeypair.publicKey,
        fulfillmentAuthorities: [worker.publicKey],
      },
      { resultType: ResultType.BroadcastedTx }
    );

    const seed = Keypair.generate().publicKey.toBytes();

    await app.oraoVrf.withSender(alice).tryRequest(seed, {
      resultType: ResultType.BroadcastedTx,
    });

    const {
      request: { pending },
    } = await app.oraoVrf.queryRequest(seed);
    expect(pending?.[0].seed).toEqual([...seed]);

    await app.oraoVrf.withSender(worker).tryFulfill(seed, {
      resultType: ResultType.BroadcastedTx,
    });

    const {
      request: { fulfilled },
    } = await app.oraoVrf.queryRequest(seed);
    expect(fulfilled?.[0].seed).toEqual([...seed]);
    expect(fulfilled?.[0].randomness).not.toEqual([]);
  });
});
