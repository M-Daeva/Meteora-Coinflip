import { PublicKey } from "@solana/web3.js";
import { N } from ".";

export interface InitArgs {
  worker: PublicKey;
  baseMint: PublicKey;
  vrfProgram: PublicKey;
  dbcProgram: PublicKey;
  dammProgram: PublicKey;
  dbcConfig: PublicKey;
  minQuoteBet: N<64>;
  maxQuoteBet: N<64>;
}

export interface PlaceBetArgs {
  betNonce: N<64>;
  betAmount: N<64>;
  betSide: BetSide;
  minQuoteOut: N<64>;
}

export enum BetSide {
  Head,
  Tail,
}

export interface SettleBetArgs {
  betNonce: N<64>;
  user: PublicKey;
}
