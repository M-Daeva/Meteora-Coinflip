import * as anchor from "@coral-xyz/anchor";
import { describe, it, expect, beforeAll } from "vitest";
import { ResultType } from "../scripts/common/interfaces";
import { initApp, shouldFailAsync } from "./litesvm-suite";
import { AppUser } from "../scripts/common/config/litesvm";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { App } from "../scripts/common/account";
import { getKeypairFromSeed, li } from "../scripts/common/utils";
import { AppToken, Cluster, getMintByAppToken } from "../scripts/common/config";
import { BetSide } from "../scripts/common/interfaces/coinflip";

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

    // --- prepare vrf ---

    await app.oraoVrf.tryInitNetwork(
      {
        fee: 1_000_000,
        configAuthority: adminKeypair.publicKey,
        fulfillmentAuthorities: [worker.publicKey],
      },
      { resultType: ResultType.BroadcastedTx }
    );

    // --- prepare damm ---

    const CREATE_CONFIG_KEY = 0;
    const permission = new BN(1).shln(CREATE_CONFIG_KEY);
    const index = new BN(0);

    const [dammConfig] = app.dammV2.pdaConfig(index);
    const [poolAuthority] = app.dbc.pdaPoolAuthority();

    await app.dammV2.tryCreateOperatorAccount(
      adminKeypair.publicKey, // the address that will later call createConfig
      permission,
      { resultType: ResultType.BroadcastedTx }
    );

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

    // --- prepare coinflip ---

    await app.coinflip.tryInit(
      {
        worker: worker.publicKey,
        baseMint: baseMintKP.publicKey,
        vrfProgram: app.oraoVrf.program.programId,
        dbcProgram: app.dbc.program.programId,
        dammProgram: app.dammV2.program.programId,
        dbcConfig: configKp.publicKey,
        dammConfig,
        minQuoteBet: 1_000,
        maxQuoteBet: 10_000_000,
      },
      { resultType: ResultType.BroadcastedTx }
    );

    // fund with usdc
    await app.chain.transferTokens(
      BigInt(10_000_000),
      quoteMint,
      adminKeypair.publicKey,
      app.coinflip.pdaConfig()[0],
      { resultType: ResultType.BroadcastedTx }
    );

    // --- swap in virtual pool ---

    await app.dbc.withSender(alice).trySwap(
      baseMintKP.publicKey,
      quoteMint,
      configKp.publicKey,
      {
        swapParameters2: {
          swapMode: 1, // partial fill
          amount0: AMOUNT_TO_SWAP_BEFORE_MIGRATION / 2,
          amount1: 0,
        },
      },
      { resultType: ResultType.BroadcastedTx }
    );

    // --- bet via dbc ---

    const dbcBetNonce = 43;
    const dbcBetAmount = 100_000;

    let aliceUsdcBefore = await app.chain.getAtaBalance(
      alice.publicKey,
      quoteMint
    );
    let aliceBaseBefore = await app.chain.getAtaBalance(
      alice.publicKey,
      baseMintKP.publicKey
    );

    await app.coinflip.withSender(alice).tryPlaceBet(
      app.dbc,
      app.dammV2,
      app.oraoVrf,
      {
        betAmount: dbcBetAmount,
        betSide: BetSide.Head,
        betNonce: dbcBetNonce,
        minQuoteOut: 90_000,
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

    expect(aliceUsdcAfter - aliceUsdcBefore).toBe(0);
    expect(aliceBaseBefore - aliceBaseAfter).toBe(dbcBetAmount);

    const bet = await app.coinflip.queryBet(alice.publicKey, dbcBetNonce);
    expect("head" in bet.side).toBeTruthy();

    const [seed] = app.coinflip.pdaBet(alice.publicKey, dbcBetNonce);
    await app.oraoVrf.withSender(worker).tryFulfill(seed.toBuffer(), {
      resultType: ResultType.BroadcastedTx,
    });

    const {
      request: { fulfilled },
    } = await app.oraoVrf.queryRequest(seed.toBuffer());
    expect(fulfilled?.[0].randomness).not.toEqual([]);

    aliceUsdcBefore = aliceUsdcAfter;
    aliceBaseBefore = aliceBaseAfter;

    await app.coinflip.withSender(worker).trySettleBet(
      app.oraoVrf,
      {
        betNonce: dbcBetNonce,
        user: alice.publicKey,
      },
      { resultType: ResultType.BroadcastedTx }
    );

    aliceUsdcAfter = await app.chain.getAtaBalance(alice.publicKey, quoteMint);
    aliceBaseAfter = await app.chain.getAtaBalance(
      alice.publicKey,
      baseMintKP.publicKey
    );

    expect(aliceUsdcAfter - aliceUsdcBefore).toBe(196_534);
    expect(aliceBaseBefore - aliceBaseAfter).toBe(0);

    // --- migrate ---

    // complete the curve
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

    await app.dbc.tryCreateMeteoraDammV2Metadata(
      baseMintKP.publicKey,
      quoteMint,
      configKp.publicKey,
      { resultType: ResultType.BroadcastedTx }
    );

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

    // --- bet via damm ---

    const dammBetNonce = 44;
    const dammBetAmount = 100_000;

    aliceUsdcBefore = await app.chain.getAtaBalance(alice.publicKey, quoteMint);
    aliceBaseBefore = await app.chain.getAtaBalance(
      alice.publicKey,
      baseMintKP.publicKey
    );

    await app.coinflip.withSender(alice).tryPlaceBet(
      app.dbc,
      app.dammV2,
      app.oraoVrf,
      {
        betAmount: dammBetAmount,
        betSide: BetSide.Tail,
        betNonce: dammBetNonce,
        minQuoteOut: 90_000,
      },
      { resultType: ResultType.BroadcastedTx }
    );

    aliceUsdcAfter = await app.chain.getAtaBalance(alice.publicKey, quoteMint);
    aliceBaseAfter = await app.chain.getAtaBalance(
      alice.publicKey,
      baseMintKP.publicKey
    );

    expect(aliceUsdcAfter - aliceUsdcBefore).toBe(0);
    expect(aliceBaseBefore - aliceBaseAfter).toBe(dammBetAmount);

    const [dammSeed] = app.coinflip.pdaBet(alice.publicKey, dammBetNonce);
    await app.oraoVrf.withSender(worker).tryFulfill(dammSeed.toBuffer(), {
      resultType: ResultType.BroadcastedTx,
    });

    aliceUsdcBefore = aliceUsdcAfter;
    aliceBaseBefore = aliceBaseAfter;

    await app.coinflip
      .withSender(worker)
      .trySettleBet(
        app.oraoVrf,
        { betNonce: dammBetNonce, user: alice.publicKey },
        { resultType: ResultType.BroadcastedTx }
      );

    aliceUsdcAfter = await app.chain.getAtaBalance(alice.publicKey, quoteMint);
    aliceBaseAfter = await app.chain.getAtaBalance(
      alice.publicKey,
      baseMintKP.publicKey
    );

    expect(aliceUsdcAfter - aliceUsdcBefore).toBe(195_769);
    expect(aliceBaseBefore - aliceBaseAfter).toBe(0);
  });
});
