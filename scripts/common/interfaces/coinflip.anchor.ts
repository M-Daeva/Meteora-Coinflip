// Auto-generated Anchor types and converters
import * as anchor from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { InitArgs, PlaceBetArgs, BetSide } from './coinflip';

// Anchor-generated types
export type AnchorBetSide =
  | { head: {} }
  | { tail: {} };

export type AnchorInitArgs = [
  
];

export type AnchorPlaceBetArgs = [
  anchor.BN,
  anchor.BN,
  AnchorBetSide
];


// Type converters
export function convertBetSide(
  value: BetSide
): AnchorBetSide {
  switch (value) {
    case BetSide.Head:
      return { head: {} };
    case BetSide.Tail:
      return { tail: {} };
    default:
      throw new Error(`Unknown BetSide value: ${value}`);
  }
}

export function convertInitArgs(
  args: InitArgs
): AnchorInitArgs {
  return [
    
  ];
}

export function convertPlaceBetArgs(
  args: PlaceBetArgs
): AnchorPlaceBetArgs {
  return [
    new anchor.BN(args.betNonce),
    new anchor.BN(args.betAmount),
    convertBetSide(args.betSide)
  ];
}

