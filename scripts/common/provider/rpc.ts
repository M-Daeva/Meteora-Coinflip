import * as anchor from "@coral-xyz/anchor";
import type { TxSigner } from "../signer";
import type { Cluster } from "../config";
import type { ComputeConfig } from "../interfaces";
import type { IBlockchainProvider, TxLifetime } from "./interface";
import { wait as sleep } from "../utils";
import {
  type Commitment,
  Connection,
  PublicKey,
  VersionedTransaction,
} from "@solana/web3.js";

/**
 * Anchor provider used ONLY to build instructions / decode accounts.
 * It refuses to sign, so nothing can bypass handleTx.
 */
export function readonlyAnchorProvider(
  connection: Connection,
  publicKey: PublicKey
): anchor.AnchorProvider {
  const reject = async (): Promise<never> => {
    throw new Error(
      "Program provider is read-only: send transactions via handleTx"
    );
  };
  return new anchor.AnchorProvider(
    connection,
    {
      publicKey,
      signTransaction: reject,
      signAllTransactions: reject,
    } as unknown as anchor.Wallet,
    { commitment: "confirmed" }
  );
}

export class RpcProvider implements IBlockchainProvider {
  readonly applyComputeBudget = true;

  constructor(
    readonly connection: Connection,
    readonly signer: TxSigner,
    readonly cluster: Cluster,
    private readonly commitment: Commitment = "confirmed"
  ) {}

  async getLatestBlockhash(): Promise<TxLifetime> {
    return this.connection.getLatestBlockhash(this.commitment);
  }

  async getAddressLookupTables(addresses: PublicKey[]) {
    return Promise.all(
      addresses.map(async (address) => {
        const { value } = await this.connection.getAddressLookupTable(address);
        if (!value)
          throw new Error(`ALT account not found: ${address.toBase58()}`);
        return value;
      })
    );
  }

  async getPriorityFee(
    payer: PublicKey,
    config: ComputeConfig = {}
  ): Promise<number> {
    const {
      priorityFeeMultiplier = 1,
      priorityFeeBase = 0,
      maxPriorityFee = 0.01 * 1e9,
      minPriorityFee = 0,
    } = config;

    try {
      const fees = await this.connection.getRecentPrioritizationFees({
        lockedWritableAccounts: [payer],
      });
      const base = fees.length
        ? Math.ceil(
            fees.reduce((acc, f) => acc + f.prioritizationFee, 0) / fees.length
          )
        : 0;
      const fee = Math.ceil(base * priorityFeeMultiplier + priorityFeeBase);
      return Math.min(maxPriorityFee, Math.max(minPriorityFee, fee));
    } catch (error) {
      console.warn("Failed to get recent prioritization fees:", error);
      return priorityFeeBase;
    }
  }

  async simulate(tx: VersionedTransaction): Promise<number | undefined> {
    const { value } = await this.connection.simulateTransaction(tx, {
      sigVerify: false,
      commitment: this.commitment,
    });
    if (value.err) {
      throw new Error(
        `Simulation failed: ${JSON.stringify(value.err)}\n${(
          value.logs ?? []
        ).join("\n")}`
      );
    }
    return value.unitsConsumed;
  }

  async sendAndConfirm(
    tx: VersionedTransaction,
    lifetime: TxLifetime
  ): Promise<string> {
    const signature = await this.connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      preflightCommitment: this.commitment,
    });
    const { value } = await this.connection.confirmTransaction(
      { signature, ...lifetime },
      this.commitment
    );
    if (value.err)
      throw new Error(`Transaction failed: ${JSON.stringify(value.err)}`);
    return signature;
  }

  async getTransaction(signature: string, attempts = 5) {
    // Freshly confirmed txs can briefly be missing from getParsedTransaction
    for (let i = 0; i < attempts; i++) {
      const tx = await this.connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
        commitment: "confirmed",
      });
      if (tx) return tx;
      await sleep(500);
    }
    return null;
  }

  async requestAirdrop(
    publicKey: PublicKey,
    lamports: number
  ): Promise<string> {
    const signature = await this.connection.requestAirdrop(publicKey, lamports);
    await this.connection.confirmTransaction(
      { signature, ...(await this.getLatestBlockhash()) },
      this.commitment
    );
    return signature;
  }

  async getTokenAccountBalance(
    tokenAccount: PublicKey
  ): Promise<[number, number]> {
    try {
      const { value } = await this.connection.getTokenAccountBalance(
        tokenAccount
      );
      return [Number(value.amount), Number(value.uiAmount || 0)];
    } catch {
      return [0, 0];
    }
  }

  getCoinBalance(owner: PublicKey) {
    return this.connection.getBalance(owner);
  }

  getSlot() {
    return this.connection.getSlot({ commitment: this.commitment });
  }

  async getClockTime(): Promise<number> {
    return (await this.connection.getBlockTime(await this.getSlot())) || 0;
  }

  getRentExempt(space: number) {
    return this.connection.getMinimumBalanceForRentExemption(space);
  }

  async fetchMultipleAccounts<T = any, IDL extends anchor.Idl = anchor.Idl>(
    program: anchor.Program<IDL>,
    accountName: string,
    addresses: PublicKey[]
  ): Promise<T[]> {
    const fetcher = (program.account as any)[accountName];
    if (!fetcher) throw new Error(`Unknown account type: ${accountName}`);
    return fetcher.fetchMultiple(addresses);
  }

  getAccountInfo(address: PublicKey) {
    return this.connection.getAccountInfo(address);
  }

  wait(delayS: number) {
    return sleep(1e3 * delayS);
  }
}
