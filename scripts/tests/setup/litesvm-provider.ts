import { existsSync, readFileSync } from "node:fs";
import * as anchor from "@coral-xyz/anchor";
import { ComputeBudget, LiteSVM, TransactionMetadata } from "litesvm";
import bs58 from "bs58";
import type { TxSigner } from "../../common/signer";
import { BPF_LOADER_UPGRADEABLE, Cluster } from "../../common/config";
import type {
  IBlockchainProvider,
  TxLifetime,
} from "../../common/provider/interface";
import {
  type AccountInfo,
  type ParsedTransactionWithMeta,
  AddressLookupTableAccount,
  AddressLookupTableProgram,
  PublicKey,
  VersionedTransaction,
} from "@solana/web3.js";

// UpgradeableLoaderState (bincode)
const PROGRAM_ACCOUNT_SIZE = 36; // u32 variant = 2 | programdata pubkey
const PROGRAMDATA_METADATA_SIZE = 45; // u32 variant = 3 | u64 slot | u8 Option tag | authority

/**
 * Same budget as the legacy getLiteSvmProvider: 10M CU, 256 KiB heap.
 * Native mints (WSOL for SPL Token and Token-2022) exist on every real cluster
 * but not in a bare LiteSVM — withNativeMints() replaces the legacy createWSOL.
 */
export function createLiteSvm(): LiteSVM {
  const budget = new ComputeBudget();
  budget.computeUnitLimit = BigInt(10_000_000);
  budget.heapSize = 256 * 1_024;

  return new LiteSVM()
    .withDefaultPrograms()
    .withNativeMints()
    .withComputeBudget(budget);
}

export class LiteSvmProvider implements IBlockchainProvider {
  readonly cluster = Cluster.Localnet;
  /** Keeps CU consumption identical to the old LiteSVM path */
  readonly applyComputeBudget = false;
  private readonly litesvm: LiteSVM;

  constructor(readonly signer: TxSigner, litesvm?: LiteSVM) {
    this.litesvm = litesvm ?? createLiteSvm();
  }

  getLiteSVM(): LiteSVM {
    return this.litesvm;
  }

  // --- transaction pipeline ---

  async getLatestBlockhash(): Promise<TxLifetime> {
    // fresh blockhash per tx → identical txs don't hit AlreadyProcessed
    this.litesvm.expireBlockhash();
    return {
      blockhash: this.litesvm.latestBlockhash(),
      lastValidBlockHeight: 999_999,
    };
  }

  async getAddressLookupTables(addresses: PublicKey[]) {
    return Promise.all(
      addresses.map(async (key) => {
        const account = await this.getAccountInfo(key);
        if (!account)
          throw new Error(`ALT account not found: ${key.toBase58()}`);
        return new AddressLookupTableAccount({
          key,
          state: AddressLookupTableAccount.deserialize(account.data),
        });
      })
    );
  }

  async getPriorityFee(): Promise<number> {
    return 0;
  }

  async simulate(): Promise<number | undefined> {
    return undefined; // no CU tuning on LiteSVM (applyComputeBudget = false)
  }

  async sendAndConfirm(tx: VersionedTransaction): Promise<string> {
    const result = this.litesvm.sendTransaction(tx);
    if ("err" in result) {
      throw new Error(
        `\n${result.err()}\nLogs:\n${result.meta()?.prettyLogs() ?? ""}`
      );
    }

    const { compiledInstructions, staticAccountKeys } = tx.message;
    const touchesAlt = compiledInstructions.some((ix) =>
      staticAccountKeys[ix.programIdIndex]?.equals(
        AddressLookupTableProgram.programId
      )
    );
    // ALT changes activate on the next slot
    if (touchesAlt) await this.wait(1);

    return bs58.encode(tx.signatures[0]);
  }

  async getTransaction(
    signature: string
  ): Promise<ParsedTransactionWithMeta | null> {
    const result = this.litesvm.getTransaction(bs58.decode(signature));
    if (!result) return null;

    const meta = result as TransactionMetadata;
    const clock = this.litesvm.getClock();

    return {
      slot: Number(clock.slot),
      blockTime: Number(clock.unixTimestamp),
      version: 0,
      transaction: {
        message: {
          accountKeys: [],
          instructions: meta.innerInstructions(),
          recentBlockhash: this.litesvm.latestBlockhash(),
        },
        signatures: [signature],
      } as any,
      meta: {
        err: null,
        fee: 0,
        logMessages: meta.logs() || [],
        computeUnitsConsumed: Number(meta.computeUnitsConsumed()),
      } as any,
    };
  }

  // --- reads / env helpers ---

  /** `lamports` is atomic (ChainHelpers.requestAirdrop converts SOL → lamports) */
  async requestAirdrop(
    publicKey: PublicKey,
    lamports: number | bigint
  ): Promise<string> {
    const result = this.litesvm.airdrop(publicKey, BigInt(lamports));
    if (!result || "err" in result) {
      throw new Error(
        `Airdrop failed: ${result ? String(result.err()) : "Unknown error"}`
      );
    }
    return "airdrop_" + publicKey.toBase58();
  }

  async getTokenAccountBalance(
    tokenAccount: PublicKey
  ): Promise<[number, number]> {
    const account = this.litesvm.getAccount(tokenAccount);
    if (!account) return [0, 0];

    const mint = new PublicKey(account.data.slice(0, 32));
    const mintAccount = this.litesvm.getAccount(mint);
    if (!mintAccount) throw new Error("Mint account not found");

    const decimals = mintAccount.data[44]; // same offset for SPL Token and Token-2022
    const amount = account.data.slice(64, 72);
    const atomics = Number(
      new DataView(
        amount.buffer,
        amount.byteOffset,
        amount.byteLength
      ).getBigUint64(0, true)
    );
    return [atomics, atomics / 10 ** decimals];
  }

  async getCoinBalance(owner: PublicKey): Promise<number> {
    return Number(this.litesvm.getBalance(owner) || 0);
  }

  async getSlot(): Promise<number> {
    return Number(this.litesvm.getClock().slot);
  }

  async getClockTime(): Promise<number> {
    return Number(this.litesvm.getClock().unixTimestamp);
  }

  async getRentExempt(space: number): Promise<number> {
    return Number(this.litesvm.minimumBalanceForRentExemption(BigInt(space)));
  }

  async fetchMultipleAccounts<T = any, IDL extends anchor.Idl = anchor.Idl>(
    program: anchor.Program<IDL>,
    accountName: string,
    addresses: PublicKey[]
  ): Promise<T[]> {
    return addresses.map((address) => {
      const info = this.litesvm.getAccount(address);
      if (!info)
        throw new Error(
          `${accountName} account not found at ${address.toBase58()}`
        );
      return program.coder.accounts.decode(accountName, Buffer.from(info.data));
    });
  }

  async getAccountInfo(
    address: PublicKey
  ): Promise<AccountInfo<Buffer> | null> {
    const account = this.litesvm.getAccount(address);
    if (!account) return null;
    return {
      data: Buffer.from(account.data),
      executable: account.executable,
      lamports: Number(account.lamports),
      owner: new PublicKey(account.owner),
      rentEpoch: Number(account.rentEpoch),
    };
  }

  async wait(delayS: number): Promise<void> {
    const clock = this.litesvm.getClock();
    clock.unixTimestamp += BigInt(delayS);
    clock.slot += BigInt(Math.floor(delayS / 0.4));
    this.litesvm.setClock(clock);
  }

  // --- LiteSVM-specific ---

  setAccount(address: PublicKey, account: any): void {
    this.litesvm.setAccount(address, account);
  }

  /**
   * Deploys the first existing file of `candidatePaths` as a BPF Loader Upgradeable program
   * (Program + ProgramData accounts) with the given upgrade authority.
   *
   * litesvm.addProgramFromFile can't be used here: litesvm < 0.10 loads programs with the
   * non-upgradeable BPFLoader2, so there's no ProgramData account to hold an upgrade authority.
   */
  addProgramFromFile(
    programId: PublicKey,
    candidatePaths: string[],
    upgradeAuthority: PublicKey = this.signer.publicKey
  ): void {
    const programPath = candidatePaths.find((x) => existsSync(x));
    if (!programPath) {
      throw new Error(
        `No .so found for ${programId.toBase58()}, tried:\n  ${candidatePaths.join(
          "\n  "
        )}`
      );
    }

    const elf = readFileSync(programPath);
    const [programData] = PublicKey.findProgramAddressSync(
      [programId.toBuffer()],
      BPF_LOADER_UPGRADEABLE
    );
    const rent = (space: number) =>
      Number(this.litesvm.minimumBalanceForRentExemption(BigInt(space)));

    // ProgramData first: setting the executable Program account loads it from here
    const programDataBytes = Buffer.alloc(
      PROGRAMDATA_METADATA_SIZE + elf.length
    );
    programDataBytes.writeUInt32LE(3, 0);
    programDataBytes.writeBigUInt64LE(this.litesvm.getClock().slot, 4);
    programDataBytes[12] = 1;
    upgradeAuthority.toBuffer().copy(programDataBytes, 13);
    elf.copy(programDataBytes, PROGRAMDATA_METADATA_SIZE);

    this.setAccount(programData, {
      lamports: rent(programDataBytes.length),
      data: programDataBytes,
      owner: BPF_LOADER_UPGRADEABLE,
      executable: false,
      rentEpoch: 0,
    });

    const programBytes = Buffer.alloc(PROGRAM_ACCOUNT_SIZE);
    programBytes.writeUInt32LE(2, 0);
    programData.toBuffer().copy(programBytes, 4);

    this.setAccount(programId, {
      lamports: rent(PROGRAM_ACCOUNT_SIZE),
      data: programBytes,
      owner: BPF_LOADER_UPGRADEABLE,
      executable: true,
      rentEpoch: 0,
    });
  }

  // Bincode layout of UpgradeableLoaderState::ProgramData:
  // [0..4] u32 variant = 3 | [4..12] u64 slot | [12] u8 Option tag | [13..45] authority
  setProgramUpgradeAuthority(programId: PublicKey, authority: PublicKey): void {
    const [programData] = PublicKey.findProgramAddressSync(
      [programId.toBuffer()],
      BPF_LOADER_UPGRADEABLE
    );
    const existing = this.litesvm.getAccount(programData);
    if (!existing) {
      throw new Error(
        `ProgramData account not found for ${programId.toBase58()} — call addProgramFromFile first`
      );
    }
    const data = Buffer.from(existing.data);
    data[12] = 1;
    authority.toBuffer().copy(data, 13);
    this.setAccount(programData, { ...existing, data });
  }
}
