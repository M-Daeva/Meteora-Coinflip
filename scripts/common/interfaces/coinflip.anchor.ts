// Auto-generated Anchor types and converters
import * as anchor from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { InitArgs, PlaceBetArgs, SettleBetArgs, BetSide } from './coinflip';

// Anchor-generated types
export type AnchorBetSide =
  | { head: {} }
  | { tail: {} };

export type AnchorInitArgs = [
  PublicKey,
  PublicKey,
  PublicKey,
  PublicKey,
  PublicKey,
  PublicKey,
  PublicKey,
  anchor.BN,
  anchor.BN
];

export type AnchorPlaceBetArgs = [
  anchor.BN,
  anchor.BN,
  AnchorBetSide,
  anchor.BN
];

export type AnchorSettleBetArgs = [
  anchor.BN,
  PublicKey
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
    args.worker,
    args.baseMint,
    args.vrfProgram,
    args.dbcProgram,
    args.dammProgram,
    args.dbcConfig,
    args.dammConfig,
    new anchor.BN(args.minQuoteBet),
    new anchor.BN(args.maxQuoteBet)
  ];
}

export function convertPlaceBetArgs(
  args: PlaceBetArgs
): AnchorPlaceBetArgs {
  return [
    new anchor.BN(args.betNonce),
    new anchor.BN(args.betAmount),
    convertBetSide(args.betSide),
    new anchor.BN(args.minQuoteOut)
  ];
}

export function convertSettleBetArgs(
  args: SettleBetArgs
): AnchorSettleBetArgs {
  return [
    new anchor.BN(args.betNonce),
    args.user
  ];
}

