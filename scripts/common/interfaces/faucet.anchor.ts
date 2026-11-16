// Auto-generated Anchor types and converters
import * as anchor from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { type InitArgs, type ClaimArgs } from './faucet';

// Anchor-generated types
export type AnchorInitArgs = [
  anchor.BN,
  anchor.BN
];

export type AnchorClaimArgs = [
  
];


// Type converters
export function convertInitArgs(
  args: InitArgs
): AnchorInitArgs {
  return [
    new anchor.BN(args.claimableAmount),
    new anchor.BN(args.claimCooldown)
  ];
}

export function convertClaimArgs(
  args: ClaimArgs
): AnchorClaimArgs {
  return [
    
  ];
}

