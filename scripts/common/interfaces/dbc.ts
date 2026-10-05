import { PublicKey } from "@solana/web3.js";
import { N } from ".";
import { BN } from "@coral-xyz/anchor";

export interface CreateConfigArgs {
  configParameters: ConfigParameters;
}

export interface ConfigParameters {
  poolFees: PoolFee;
  collectFeeMode: N<8>;
  migrationOption: N<8>;
  activationType: N<8>;
  tokenType: N<8>;
  tokenDecimal: N<8>;
  partnerLiquidityPercentage: N<8>;
  partnerPermanentLockedLiquidityPercentage: N<8>;
  creatorLiquidityPercentage: N<8>;
  creatorPermanentLockedLiquidityPercentage: N<8>;
  migrationQuoteThreshold: N<64>;
  sqrtStartPrice: BN;
  lockedVesting: LockedVestingParams;
  migrationFeeOption: N<8>;
  tokenSupply?: TokenSupplyParams;
  /** percentage of trading fee creator can share with partner */
  creatorTradingFeePercentage: N<8>;
  tokenUpdateAuthority: N<8>;
  migrationFee: MigrationFee;
  migratedPoolFee: MigratedPoolFee;
  /** pool creation fee in SOL lamports value */
  poolCreationFee: N<64>;
  partnerLiquidityVestingInfo: LiquidityVestingInfoParams;
  creatorLiquidityVestingInfo: LiquidityVestingInfoParams;
  migratedPoolBaseFeeMode: N<8>;
  migratedPoolMarketCapFeeSchedulerParams: MigratedPoolMarketCapFeeSchedulerParams;
  enableFirstSwapWithMinFee: boolean;
  compoundingFeeBps: N<16>;
  /** padding for future use */
  padding: N<8>[];
  curve: LiquidityDistributionParameters[];
}

export interface PoolFee {
  baseFee: BaseFee;
  dynamicFee?: DynamicFee;
}

export interface BaseFee {
  cliffFeeNumerator: N<64>;
  firstFactor: N<32>;
  secondFactor: N<64>;
  thirdFactor: N<64>;
  baseFeeMode: N<32>;
}

export interface DynamicFee {
  binStep: N<32>;
  binStepU128: N<128>;
  filterPeriod: N<32>;
  decayPeriod: N<32>;
  reductionFactor: N<32>;
  maxVolatilityAccumulator: N<32>;
  variableFeeControl: N<32>;
}

export interface MigrationFee {
  feePercentage: N<8>;
  creatorFeePercentage: N<8>;
}

export interface MigratedPoolFee {
  collectFeeMode: N<8>;
  dynamicFee: N<8>;
  poolFeeBps: N<16>;
}

export interface MigratedPoolMarketCapFeeSchedulerParams {
  numberOfPeriod: N<16>;
  sqrtPriceStepBps: N<16>;
  schedulerExpirationDuration: N<32>;
  reductionFactor: N<64>;
}

export interface TokenSupplyParams {
  /** pre migration token supply */
  preMigrationTokenSupply: N<64>;
  /**
   * post migration token supply
   * because DBC allows users to swap over the migration quote threshold, in extreme cases
   * total supply post migration may increase slightly
   * (between preMigrationTokenSupply and postMigrationTokenSupply)
   */
  postMigrationTokenSupply: N<64>;
}

export interface LockedVestingParams {
  amountPerPeriod: N<64>;
  cliffDurationFromMigrationTime: N<64>;
  frequency: N<64>;
  numberOfPeriod: N<64>;
  cliffUnlockAmount: N<64>;
}

export interface LiquidityVestingInfoParams {
  vestingPercentage: N<8>;
  bpsPerPeriod: N<16>;
  numberOfPeriods: N<16>;
  cliffDurationFromMigrationTime: N<32>;
  frequency: N<32>;
}

export interface LiquidityDistributionParameters {
  sqrtPrice: BN;
  liquidity: BN;
}

export interface CreatePoolWithToken2022Args {
  params: InitializePoolParameters;
}

export interface InitializePoolParameters {
  name: string;
  symbol: string;
  uri: string;
}
