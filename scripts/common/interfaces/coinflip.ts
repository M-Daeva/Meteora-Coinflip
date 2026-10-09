import { PublicKey } from "@solana/web3.js";
import { N } from ".";

export interface InitArgs {}

export interface PlaceBetArgs {
  betNonce: N<64>;
  betAmount: N<64>;
  betSide: BetSide;
}

export enum BetSide {
  Head,
  Tail,
}
