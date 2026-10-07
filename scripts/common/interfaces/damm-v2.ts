import { PublicKey } from "@solana/web3.js";
import { N } from ".";
import { BN } from "@coral-xyz/anchor";

export interface CreateConfigArgs {
  index: BN;
  configParameters: StaticConfigParameters;
}

export interface StaticConfigParameters {
  poolFees: PoolFeeParameters;
  sqrtMinPrice: BN;
  sqrtMaxPrice: BN;
  vaultConfigKey: PublicKey;
  poolCreatorAuthority: PublicKey;
  activationType: N<8>;
  collectFeeMode: N<8>;
  permission: BN;
}

export interface CreateDynamicConfigArgs {
  index: BN;
  configParameters: DynamicConfigParameters;
}

export interface DynamicConfigParameters {
  poolCreatorAuthority: PublicKey;
  permission: BN;
}

export interface PoolFeeParameters {
  // Base fee
  baseFee: BaseFeeParameters;
  // compounding fee bps, only have value if CollectFeeMode::Compounding
  compoundingFeeBps: N<16>;
  // padding for future use
  padding: N<8>;
  // dynamic fee
  dynamicFee?: DynamicFeeParameters;
}

export interface BaseFeeParameters {
  data: N<8>[];
}

export interface DynamicFeeParameters {
  binStep: N<16>;
  binStepU128: BN;
  filterPeriod: N<16>;
  decayPeriod: N<16>;
  reductionFactor: N<16>;
  maxVolatilityAccumulator: N<32>;
  variableFeeControl: N<32>;
}

export interface SwapV2Args {
  params: SwapParameters2;
}

export interface SwapParameters2 {
  amount0: BN;
  amount1: BN;
  swapMode: number;
}
