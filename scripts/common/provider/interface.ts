import type * as anchor from "@coral-xyz/anchor";
import type { Buffer } from "buffer";
import type { TxSigner } from "../signer";
import type { Cluster } from "../config";
import type { ComputeConfig } from "../interfaces";
import type {
  AccountInfo,
  AddressLookupTableAccount,
  ParsedTransactionWithMeta,
  PublicKey,
  VersionedTransaction,
} from "@solana/web3.js";

export interface TxLifetime {
  blockhash: string;
  lastValidBlockHeight: number;
}

export interface IBlockchainProvider {
  readonly cluster: Cluster;
  /** Default fee payer and sender unless overridden per call / via withSender. */
  readonly signer: TxSigner;
  /** Add ComputeBudget ixs (simulate for CU limit + priority fee). */
  readonly applyComputeBudget: boolean;

  // --- transaction pipeline (used by handleTx) ---
  getLatestBlockhash(): Promise<TxLifetime>;
  getAddressLookupTables(
    addresses: PublicKey[]
  ): Promise<AddressLookupTableAccount[]>;
  getPriorityFee(payer: PublicKey, config?: ComputeConfig): Promise<number>;
  /** Simulates an unsigned tx, throws on failure, returns CU consumed. */
  simulate(tx: VersionedTransaction): Promise<number | undefined>;
  /** Broadcasts a fully signed tx, waits for confirmation, returns base58 signature. */
  sendAndConfirm(
    tx: VersionedTransaction,
    lifetime: TxLifetime
  ): Promise<string>;
  getTransaction(signature: string): Promise<ParsedTransactionWithMeta | null>;

  // --- reads / env helpers ---
  requestAirdrop(publicKey: PublicKey, lamports: number): Promise<string>;
  /** returns [atomicsAmount, uiAmount] */
  getTokenAccountBalance(tokenAccount: PublicKey): Promise<[number, number]>;
  getCoinBalance(owner: PublicKey): Promise<number>;
  getSlot(): Promise<number>;
  getClockTime(): Promise<number>;
  getRentExempt(space: number): Promise<number>;
  fetchMultipleAccounts<T = any, IDL extends anchor.Idl = anchor.Idl>(
    program: anchor.Program<IDL>,
    accountName: string,
    addresses: PublicKey[]
  ): Promise<T[]>;
  getAccountInfo(address: PublicKey): Promise<AccountInfo<Buffer> | null>;
  wait(delayS: number): Promise<void>;
}
