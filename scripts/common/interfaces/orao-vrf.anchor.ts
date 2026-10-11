// Auto-generated Anchor types and converters
import * as anchor from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { InitNetworkArgs, OraoTokenFeeConfig } from './orao-vrf';

// Anchor-generated types
export type AnchorInitNetworkArgs = [
  anchor.BN,
  PublicKey,
  PublicKey[],
  AnchorOraoTokenFeeConfig | null
];

export interface AnchorOraoTokenFeeConfig {
  mint: PublicKey;
  treasury: PublicKey;
  fee: anchor.BN;
}


// Type converters
export function convertInitNetworkArgs(
  args: InitNetworkArgs
): AnchorInitNetworkArgs {
  return [
    new anchor.BN(args.fee),
    args.configAuthority,
    args.fulfillmentAuthorities,
    args.tokenFeeConfig != null ? convertOraoTokenFeeConfig(args.tokenFeeConfig) : null
  ];
}

export function convertOraoTokenFeeConfig(
  obj: OraoTokenFeeConfig
): AnchorOraoTokenFeeConfig {
  return {
    mint: obj.mint,
    treasury: obj.treasury,
    fee: new anchor.BN(obj.fee),
  };
}

