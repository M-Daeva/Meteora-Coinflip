// Auto-generated Anchor types and converters
import * as anchor from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { CreateConfigArgs, ConfigParameters, PoolFee, BaseFee, DynamicFee, MigrationFee, MigratedPoolFee, MigratedPoolMarketCapFeeSchedulerParams, TokenSupplyParams, LockedVestingParams, LiquidityVestingInfoParams, LiquidityDistributionParameters, CreatePoolWithToken2022Args, InitializePoolParameters, SwapArgs, SwapParameters2 } from './dbc';

// Anchor-generated types
export type AnchorCreateConfigArgs = [
  AnchorConfigParameters
];

export interface AnchorConfigParameters {
  poolFees: AnchorPoolFee;
  collectFeeMode: number;
  migrationOption: number;
  activationType: number;
  tokenType: number;
  tokenDecimal: number;
  partnerLiquidityPercentage: number;
  partnerPermanentLockedLiquidityPercentage: number;
  creatorLiquidityPercentage: number;
  creatorPermanentLockedLiquidityPercentage: number;
  migrationQuoteThreshold: anchor.BN;
  sqrtStartPrice: anchor.BN;
  lockedVesting: AnchorLockedVestingParams;
  migrationFeeOption: number;
  tokenSupply: AnchorTokenSupplyParams | null;
  creatorTradingFeePercentage: number;
  tokenUpdateAuthority: number;
  migrationFee: AnchorMigrationFee;
  migratedPoolFee: AnchorMigratedPoolFee;
  poolCreationFee: anchor.BN;
  partnerLiquidityVestingInfo: AnchorLiquidityVestingInfoParams;
  creatorLiquidityVestingInfo: AnchorLiquidityVestingInfoParams;
  migratedPoolBaseFeeMode: number;
  migratedPoolMarketCapFeeSchedulerParams: AnchorMigratedPoolMarketCapFeeSchedulerParams;
  enableFirstSwapWithMinFee: boolean;
  compoundingFeeBps: number;
  padding: number[];
  curve: AnchorLiquidityDistributionParameters[];
}

export interface AnchorPoolFee {
  baseFee: AnchorBaseFee;
  dynamicFee: AnchorDynamicFee | null;
}

export interface AnchorBaseFee {
  cliffFeeNumerator: anchor.BN;
  firstFactor: number;
  secondFactor: anchor.BN;
  thirdFactor: anchor.BN;
  baseFeeMode: number;
}

export interface AnchorDynamicFee {
  binStep: number;
  binStepU128: anchor.BN;
  filterPeriod: number;
  decayPeriod: number;
  reductionFactor: number;
  maxVolatilityAccumulator: number;
  variableFeeControl: number;
}

export interface AnchorMigrationFee {
  feePercentage: number;
  creatorFeePercentage: number;
}

export interface AnchorMigratedPoolFee {
  collectFeeMode: number;
  dynamicFee: number;
  poolFeeBps: number;
}

export interface AnchorMigratedPoolMarketCapFeeSchedulerParams {
  numberOfPeriod: number;
  sqrtPriceStepBps: number;
  schedulerExpirationDuration: number;
  reductionFactor: anchor.BN;
}

export interface AnchorTokenSupplyParams {
  preMigrationTokenSupply: anchor.BN;
  postMigrationTokenSupply: anchor.BN;
}

export interface AnchorLockedVestingParams {
  amountPerPeriod: anchor.BN;
  cliffDurationFromMigrationTime: anchor.BN;
  frequency: anchor.BN;
  numberOfPeriod: anchor.BN;
  cliffUnlockAmount: anchor.BN;
}

export interface AnchorLiquidityVestingInfoParams {
  vestingPercentage: number;
  bpsPerPeriod: number;
  numberOfPeriods: number;
  cliffDurationFromMigrationTime: number;
  frequency: number;
}

export interface AnchorLiquidityDistributionParameters {
  sqrtPrice: anchor.BN;
  liquidity: anchor.BN;
}

export type AnchorCreatePoolWithToken2022Args = [
  AnchorInitializePoolParameters
];

export interface AnchorInitializePoolParameters {
  name: string;
  symbol: string;
  uri: string;
}

export type AnchorSwapArgs = [
  AnchorSwapParameters2
];

export interface AnchorSwapParameters2 {
  amount0: anchor.BN;
  amount1: anchor.BN;
  swapMode: number;
}


// Type converters
export function convertCreateConfigArgs(
  args: CreateConfigArgs
): AnchorCreateConfigArgs {
  return [
    convertConfigParameters(args.configParameters)
  ];
}

export function convertConfigParameters(
  obj: ConfigParameters
): AnchorConfigParameters {
  return {
    poolFees: convertPoolFee(obj.poolFees),
    collectFeeMode: obj.collectFeeMode,
    migrationOption: obj.migrationOption,
    activationType: obj.activationType,
    tokenType: obj.tokenType,
    tokenDecimal: obj.tokenDecimal,
    partnerLiquidityPercentage: obj.partnerLiquidityPercentage,
    partnerPermanentLockedLiquidityPercentage: obj.partnerPermanentLockedLiquidityPercentage,
    creatorLiquidityPercentage: obj.creatorLiquidityPercentage,
    creatorPermanentLockedLiquidityPercentage: obj.creatorPermanentLockedLiquidityPercentage,
    migrationQuoteThreshold: new anchor.BN(obj.migrationQuoteThreshold),
    sqrtStartPrice: obj.sqrtStartPrice,
    lockedVesting: convertLockedVestingParams(obj.lockedVesting),
    migrationFeeOption: obj.migrationFeeOption,
    tokenSupply: obj.tokenSupply != null ? convertTokenSupplyParams(obj.tokenSupply) : null,
    creatorTradingFeePercentage: obj.creatorTradingFeePercentage,
    tokenUpdateAuthority: obj.tokenUpdateAuthority,
    migrationFee: convertMigrationFee(obj.migrationFee),
    migratedPoolFee: convertMigratedPoolFee(obj.migratedPoolFee),
    poolCreationFee: new anchor.BN(obj.poolCreationFee),
    partnerLiquidityVestingInfo: convertLiquidityVestingInfoParams(obj.partnerLiquidityVestingInfo),
    creatorLiquidityVestingInfo: convertLiquidityVestingInfoParams(obj.creatorLiquidityVestingInfo),
    migratedPoolBaseFeeMode: obj.migratedPoolBaseFeeMode,
    migratedPoolMarketCapFeeSchedulerParams: convertMigratedPoolMarketCapFeeSchedulerParams(obj.migratedPoolMarketCapFeeSchedulerParams),
    enableFirstSwapWithMinFee: obj.enableFirstSwapWithMinFee,
    compoundingFeeBps: obj.compoundingFeeBps,
    padding: obj.padding,
    curve: obj.curve.map(convertLiquidityDistributionParameters),
  };
}

export function convertPoolFee(
  obj: PoolFee
): AnchorPoolFee {
  return {
    baseFee: convertBaseFee(obj.baseFee),
    dynamicFee: obj.dynamicFee != null ? convertDynamicFee(obj.dynamicFee) : null,
  };
}

export function convertBaseFee(
  obj: BaseFee
): AnchorBaseFee {
  return {
    cliffFeeNumerator: new anchor.BN(obj.cliffFeeNumerator),
    firstFactor: obj.firstFactor,
    secondFactor: new anchor.BN(obj.secondFactor),
    thirdFactor: new anchor.BN(obj.thirdFactor),
    baseFeeMode: obj.baseFeeMode,
  };
}

export function convertDynamicFee(
  obj: DynamicFee
): AnchorDynamicFee {
  return {
    binStep: obj.binStep,
    binStepU128: new anchor.BN(obj.binStepU128),
    filterPeriod: obj.filterPeriod,
    decayPeriod: obj.decayPeriod,
    reductionFactor: obj.reductionFactor,
    maxVolatilityAccumulator: obj.maxVolatilityAccumulator,
    variableFeeControl: obj.variableFeeControl,
  };
}

export function convertMigrationFee(
  obj: MigrationFee
): AnchorMigrationFee {
  return {
    feePercentage: obj.feePercentage,
    creatorFeePercentage: obj.creatorFeePercentage,
  };
}

export function convertMigratedPoolFee(
  obj: MigratedPoolFee
): AnchorMigratedPoolFee {
  return {
    collectFeeMode: obj.collectFeeMode,
    dynamicFee: obj.dynamicFee,
    poolFeeBps: obj.poolFeeBps,
  };
}

export function convertMigratedPoolMarketCapFeeSchedulerParams(
  obj: MigratedPoolMarketCapFeeSchedulerParams
): AnchorMigratedPoolMarketCapFeeSchedulerParams {
  return {
    numberOfPeriod: obj.numberOfPeriod,
    sqrtPriceStepBps: obj.sqrtPriceStepBps,
    schedulerExpirationDuration: obj.schedulerExpirationDuration,
    reductionFactor: new anchor.BN(obj.reductionFactor),
  };
}

export function convertTokenSupplyParams(
  obj: TokenSupplyParams
): AnchorTokenSupplyParams {
  return {
    preMigrationTokenSupply: new anchor.BN(obj.preMigrationTokenSupply),
    postMigrationTokenSupply: new anchor.BN(obj.postMigrationTokenSupply),
  };
}

export function convertLockedVestingParams(
  obj: LockedVestingParams
): AnchorLockedVestingParams {
  return {
    amountPerPeriod: new anchor.BN(obj.amountPerPeriod),
    cliffDurationFromMigrationTime: new anchor.BN(obj.cliffDurationFromMigrationTime),
    frequency: new anchor.BN(obj.frequency),
    numberOfPeriod: new anchor.BN(obj.numberOfPeriod),
    cliffUnlockAmount: new anchor.BN(obj.cliffUnlockAmount),
  };
}

export function convertLiquidityVestingInfoParams(
  obj: LiquidityVestingInfoParams
): AnchorLiquidityVestingInfoParams {
  return {
    vestingPercentage: obj.vestingPercentage,
    bpsPerPeriod: obj.bpsPerPeriod,
    numberOfPeriods: obj.numberOfPeriods,
    cliffDurationFromMigrationTime: obj.cliffDurationFromMigrationTime,
    frequency: obj.frequency,
  };
}

export function convertLiquidityDistributionParameters(
  obj: LiquidityDistributionParameters
): AnchorLiquidityDistributionParameters {
  return {
    sqrtPrice: obj.sqrtPrice,
    liquidity: obj.liquidity,
  };
}

export function convertCreatePoolWithToken2022Args(
  args: CreatePoolWithToken2022Args
): AnchorCreatePoolWithToken2022Args {
  return [
    convertInitializePoolParameters(args.params)
  ];
}

export function convertInitializePoolParameters(
  obj: InitializePoolParameters
): AnchorInitializePoolParameters {
  return {
    name: obj.name,
    symbol: obj.symbol,
    uri: obj.uri,
  };
}

export function convertSwapArgs(
  args: SwapArgs
): AnchorSwapArgs {
  return [
    convertSwapParameters2(args.swapParameters2)
  ];
}

export function convertSwapParameters2(
  obj: SwapParameters2
): AnchorSwapParameters2 {
  return {
    amount0: new anchor.BN(obj.amount0),
    amount1: new anchor.BN(obj.amount1),
    swapMode: obj.swapMode,
  };
}

