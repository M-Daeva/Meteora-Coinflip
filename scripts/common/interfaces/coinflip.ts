import { PublicKey } from "@solana/web3.js";
import { N } from ".";

export interface InitArgs {
  worker: PublicKey;
}

export interface PlaceBetArgs {
  betNonce: N<64>;
  betAmount: N<64>;
  betSide: BetSide;
}

export enum BetSide {
  Head,
  Tail,
}

export interface SettleBetArgs {
  betNonce: N<64>;
  user: PublicKey;
}
