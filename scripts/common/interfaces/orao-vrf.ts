import { PublicKey } from "@solana/web3.js";
import { type N } from ".";

export interface InitNetworkArgs {
  fee: N<64>;
  configAuthority: PublicKey;
  fulfillmentAuthorities: PublicKey[];
  tokenFeeConfig?: OraoTokenFeeConfig;
}

export interface OraoTokenFeeConfig {
  mint: PublicKey;
  treasury: PublicKey;
  fee: N<64>;
}
