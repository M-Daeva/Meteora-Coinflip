import { Keypair, PublicKey } from "@solana/web3.js";
import { networks, ProgramName } from "../config";

export type Network = (typeof networks)[number];

export type NetworkConfig = {
  [k in Network]: string;
};

export type ProgramAddress = {
  [k in ProgramName]: string;
};

export enum ResultType {
  Ixs,
  IxsWithCu,
  EncodedTx, // base58
  EncodedTxBase64,
  BroadcastedTx,
}

export interface IHelpers {
  temporarySender?: Keypair;
  defaultWallet: PublicKey;
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
  payer?: Keypair;
  addressLookupTableAddresses?: PublicKey[];
  isToken2022?: boolean;
  computeConfig?: ComputeConfig;
  isDisplayed?: boolean;
  // disable tx simulation and use constant blockhash
  // it makes the function pure and available for tests
  isSimulationDisabled?: boolean;
  // useful when all signers aren't available before tx serialization
  partialSigning?: boolean;
};

// Settings that don't require executor
type TxSettingsWithoutExecutor = BaseTxSettings & {
  resultType?: ResultType.Ixs | ResultType.IxsWithCu | ResultType.BroadcastedTx;
  executor?: PublicKey;
};

// Settings that require executor (EncodedTx)
type TxSettingsWithExecutor = BaseTxSettings & {
  resultType: ResultType.EncodedTx | ResultType.EncodedTxBase64;
  executor: PublicKey; // required here
};

// Always include executor in the base, but make it optional there
export type TxSettings = (
  | TxSettingsWithoutExecutor
  | TxSettingsWithExecutor
) & {
  executor?: PublicKey; // This ensures executor is always accessible
};

type D = 8 | 16 | 32 | 64 | 128;
export type N<T extends D> = number;

export type QuerySettings = {
  tokenProgram?: PublicKey | string;
  isAtomic?: boolean;
  isDisplayed?: boolean;
};

export interface TokenWeight {
  collateralWeight: number;
  loanWeight: number;
}

export interface TokenConfig {
  decimals: number;
  isToken2022: boolean;
}

export interface GetAtaParams {
  mint: PublicKey | string;
  owner: PublicKey | string;
  tokenProgram: PublicKey | string;
}
