import * as anchor from "@coral-xyz/anchor";
import { describe, it, expect, beforeAll } from "vitest";
import { ResultType } from "../scripts/common/interfaces";
import { initApp, shouldFailAsync } from "./litesvm-suite";
import { AppUser } from "../scripts/common/config/litesvm";
import {
  AccountInfo,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import { App } from "../scripts/common/account";
import { unpack as unpackTokenMetadata } from "@solana/spl-token-metadata";
import * as spl from "@solana/spl-token";
import { IBlockchainProvider } from "../scripts/common/account/provider";
import { getKeypairFromSeed, li } from "../scripts/common/utils";
import { BorshFeeTimeSchedulerAccount } from "../scripts/common/account/damm-v2";
import {
  ExtensionType,
  getExtensionData,
  getExtensionTypes,
  getMetadataPointerState,
  unpackMint,
} from "@solana/spl-token";
import {
  AppToken,
  Cluster,
  getMintByAppToken,
  PROGRAM,
} from "../scripts/common/config";

const { BN } = anchor;

const CLUSTER: Cluster = Cluster.Localnet;

describe("Coinflip", () => {
  const BASIS_POINT_MAX = 10_000;
  const OFFSET = 64;
  const U64_MAX = new BN("18446744073709551615");
  const MIN_SQRT_PRICE = new BN("4295048016");
  const MAX_SQRT_PRICE = new BN("79226673521066979257578248091");

  const user = new AppUser();
  const adminKeypair = user.getAdmin();
  const _worker = user.getWorker();
  const payer = user.getPayer();

  let app: App;
  let token: Record<AppToken, PublicKey>;
  // dbc config
  let configKp: anchor.web3.Keypair = Keypair.generate(); // default

  beforeAll(async () => {
    app = await initApp(CLUSTER, adminKeypair);
    ({ token } = app);
    user.setChain(app.chain);
  });

  it("swap in virtual pool", async () => {
    configKp = getKeypairFromSeed(2_000);
    const baseMintKP = getKeypairFromSeed(2_001);
    const quoteMint = getMintByAppToken(app.provider.cluster, AppToken.USDC);

    const [alice] = await user.rotateUsers(1);

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
          migrationQuoteThreshold: LAMPORTS_PER_SOL * 5,
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

    await app.dbc.queryPoolConfig(configKp.publicKey);

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

    await app.dbc.queryVirtualPool(
      configKp.publicKey,
      baseMintKP.publicKey,
      quoteMint
    );

    const aliceUsdcBefore = await app.chain.getAtaBalance(
      alice.publicKey,
      quoteMint
    );
    const aliceBaseTokenBefore = await app.chain.getAtaBalance(
      alice.publicKey,
      baseMintKP.publicKey
    );

    await app.dbc.withSender(alice).trySwap(
      baseMintKP.publicKey,
      quoteMint,
      configKp.publicKey,
      {
        swapParameters2: {
          swapMode: 0,
          amount0: 1_000_000,
          amount1: 0,
        },
      },
      { resultType: ResultType.BroadcastedTx }
    );

    const aliceUsdcAfter = await app.chain.getAtaBalance(
      alice.publicKey,
      quoteMint
    );
    const aliceBaseTokenAfter = await app.chain.getAtaBalance(
      alice.publicKey,
      baseMintKP.publicKey
    );

    li({
      aliceUsdcBefore,
      aliceUsdcAfter,
      aliceBaseTokenBefore,
      aliceBaseTokenAfter,
    });
  });

  it("prepare damm", async () => {
    const CREATE_CONFIG_KEY = 0;
    const permission = new BN(1).shln(CREATE_CONFIG_KEY);
    const index = new BN(0);

    const baseMint = getKeypairFromSeed(2_001).publicKey;
    const quoteMint = getMintByAppToken(app.provider.cluster, AppToken.USDC);

    const [alice] = await user.rotateUsers(1);

    await app.dammV2.tryCreateOperatorAccount(
      adminKeypair.publicKey, // the address that will later call createConfig
      permission,
      { resultType: ResultType.BroadcastedTx }
    );

    const feeTimeScheduler: BorshFeeTimeSchedulerAccount = {
      cliffFeeNumerator: new BN(2_500_000),
      numberOfPeriod: 0,
      reductionFactor: new BN(0),
      periodFrequency: new BN(0),
      baseFeeMode: 0,
      padding: new Array(0).fill(0),
    };

    const baseFeeData = app.dammV2.program.coder.types.encode(
      "borshFeeTimeScheduler",
      feeTimeScheduler
    );

    await app.dammV2.tryCreateConfig(
      index,
      {
        index,
        configParameters: {
          poolFees: {
            baseFee: {
              data: Array.from(baseFeeData),
            },
            compoundingFeeBps: 0,
            padding: 0,
            // dynamicFee: null,
          },
          sqrtMinPrice: new BN(MIN_SQRT_PRICE),
          sqrtMaxPrice: new BN(MAX_SQRT_PRICE),
          vaultConfigKey: PublicKey.default,
          poolCreatorAuthority: adminKeypair.publicKey,
          activationType: 1,
          collectFeeMode: 0,
          permission: new BN(0),
        },
      },
      { resultType: ResultType.BroadcastedTx }
    );

    await app.dammV2.queryConfig(index);

    await app.dbc.tryCreateMeteoraDammV2Metadata(
      baseMint,
      quoteMint,
      configKp.publicKey,
      { resultType: ResultType.BroadcastedTx, isDisplayed: true }
    );

    // await app.dbc.queryDammMigrationMetadata(
    //   configKp.publicKey,
    //   baseMint,
    //   quoteMint,
    //   true
    // );
  });
});
