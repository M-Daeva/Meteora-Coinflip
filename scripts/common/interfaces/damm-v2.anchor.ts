// Auto-generated Anchor types and converters
import * as anchor from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { CreateConfigArgs, StaticConfigParameters, PoolFeeParameters, BaseFeeParameters, DynamicFeeParameters } from './damm-v2';

// Anchor-generated types
export type AnchorCreateConfigArgs = [
  anchor.BN,
  AnchorStaticConfigParameters
];

export interface AnchorStaticConfigParameters {
  poolFees: AnchorPoolFeeParameters;
  sqrtMinPrice: anchor.BN;
  sqrtMaxPrice: anchor.BN;
  vaultConfigKey: PublicKey;
  poolCreatorAuthority: PublicKey;
  activationType: number;
  collectFeeMode: number;
  permission: anchor.BN;
}

export interface AnchorPoolFeeParameters {
  baseFee: AnchorBaseFeeParameters;
  compoundingFeeBps: number;
  padding: number;
  dynamicFee: AnchorDynamicFeeParameters | null;
}

export interface AnchorBaseFeeParameters {
  data: number[];
}

export interface AnchorDynamicFeeParameters {
  binStep: number;
  binStepU128: anchor.BN;
  filterPeriod: number;
  decayPeriod: number;
  reductionFactor: number;
  maxVolatilityAccumulator: number;
  variableFeeControl: number;
}


// Type converters
export function convertCreateConfigArgs(
  args: CreateConfigArgs
): AnchorCreateConfigArgs {
  return [
    args.index,
    convertStaticConfigParameters(args.configParameters)
  ];
}

export function convertStaticConfigParameters(
  obj: StaticConfigParameters
): AnchorStaticConfigParameters {
  return {
    poolFees: convertPoolFeeParameters(obj.poolFees),
    sqrtMinPrice: obj.sqrtMinPrice,
    sqrtMaxPrice: obj.sqrtMaxPrice,
    vaultConfigKey: obj.vaultConfigKey,
    poolCreatorAuthority: obj.poolCreatorAuthority,
    activationType: obj.activationType,
    collectFeeMode: obj.collectFeeMode,
    permission: obj.permission,
  };
}

export function convertPoolFeeParameters(
  obj: PoolFeeParameters
): AnchorPoolFeeParameters {
  return {
    baseFee: convertBaseFeeParameters(obj.baseFee),
    compoundingFeeBps: obj.compoundingFeeBps,
    padding: obj.padding,
    dynamicFee: obj.dynamicFee != null ? convertDynamicFeeParameters(obj.dynamicFee) : null,
  };
}

export function convertBaseFeeParameters(
  obj: BaseFeeParameters
): AnchorBaseFeeParameters {
  return {
    data: obj.data,
  };
}

export function convertDynamicFeeParameters(
  obj: DynamicFeeParameters
): AnchorDynamicFeeParameters {
  return {
    binStep: obj.binStep,
    binStepU128: obj.binStepU128,
    filterPeriod: obj.filterPeriod,
    decayPeriod: obj.decayPeriod,
    reductionFactor: obj.reductionFactor,
    maxVolatilityAccumulator: obj.maxVolatilityAccumulator,
    variableFeeControl: obj.variableFeeControl,
  };
}

