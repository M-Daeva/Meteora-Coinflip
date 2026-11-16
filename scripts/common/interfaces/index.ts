import type { PublicKey } from "@solana/web3.js";
import type { Actor, SignerLike } from "../signer";

export enum ResultType {
  Ixs,
  IxsWithCu,
  EncodedTxBase58,
  EncodedTxBase64,
  BroadcastedTx,
}

// Configuration for compute units and priority fees
export interface ComputeConfig {
  priorityFeeMultiplier?: number; // multiplier for base priority fee (default: 1.0)
  priorityFeeBase?: number; // base fee in microlamports to add (default: 0)
  cuMultiplier?: number; // multiplier for simulated CU usage (default: 1.15)
  cuBase?: number; // base CU to add (default: 0)
  maxPriorityFee?: number; // max priority fee cap in microlamports
  minPriorityFee?: number; // min priority fee floor in microlamports
}

type BaseTxSettings = {
  /** Fee payer. Keypair / keychain signer / wallet, or a PublicKey that signs elsewhere. Default: provider.signer */
  payer?: Actor;
  /** Extra signers for this call only (new account keypairs, co-signers, ...) */
  signers?: SignerLike[];
  addressLookupTableAddresses?: PublicKey[];
  isToken2022?: boolean;
  computeConfig?: ComputeConfig;
  isDisplayed?: boolean;
  // disable tx simulation and use constant blockhash
  // it makes the function pure and available for tests
  isSimulationDisabled?: boolean;
  // EncodedTx*: sign with every signer available here, leave the rest empty.
  // Without it encoded txs are returned unsigned.
  partialSigning?: boolean;
};

// Settings that don't require executor
type TxSettingsWithoutExecutor = BaseTxSettings & {
  resultType?: ResultType.Ixs | ResultType.IxsWithCu | ResultType.BroadcastedTx;
  /** Acts as sender for this call only (overrides withSender) */
  executor?: Actor;
};

// Settings that require executor (EncodedTx)
type TxSettingsWithExecutor = BaseTxSettings & {
  resultType: ResultType.EncodedTxBase58 | ResultType.EncodedTxBase64;
  /** Who will sign the encoded tx; usually the user's PublicKey */
  executor: Actor;
};

export type TxSettings = TxSettingsWithoutExecutor | TxSettingsWithExecutor;

type D = 8 | 16 | 32 | 64 | 128;
export type N<_T extends D> = number;

export type QuerySettings = {
  tokenProgram?: PublicKey | string;
  isAtomic?: boolean;
  isDisplayed?: boolean;
};

export interface TokenConfig {
  decimals: number;
  isToken2022: boolean;
}

export interface GetAtaParams {
  mint: PublicKey | string;
  owner: PublicKey | string;
  tokenProgram: PublicKey | string;
}
