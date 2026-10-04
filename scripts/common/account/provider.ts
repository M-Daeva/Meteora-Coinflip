import * as anchor from "@coral-xyz/anchor";
import { Cluster, COMMITMENT } from "../config";
import { LiteSVM, TransactionMetadata } from "litesvm";
import { logAndReturn, wait } from "../utils";
import { ENV } from "../../backend/envs";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionSignature,
  ParsedTransactionWithMeta,
  VersionedTransaction,
  AccountInfo,
} from "@solana/web3.js";

export const BPF_LOADER_UPGRADEABLE = new PublicKey(
  "BPFLoaderUpgradeab1e11111111111111111111111"
);

/**
 * Abstract interface for blockchain providers
 * Allows code to work with both real blockchain and LiteSVM
 */
export interface IBlockchainProvider {
  cluster: Cluster;
  connection: Connection;
  wallet: {
    publicKey: PublicKey;
    signTransaction?: (
      tx: VersionedTransaction
    ) => Promise<VersionedTransaction>;
  };

  sendTransaction(
    tx: Transaction | VersionedTransaction,
    signers?: Keypair[]
  ): Promise<TransactionSignature>;

  confirmTransaction(signature: TransactionSignature): Promise<void>;

  requestAirdrop(
    publicKey: PublicKey,
    lamports: number
  ): Promise<TransactionSignature>;

  // returns [atomicsAmount, uiAmount]
  getTokenAccountBalance(tokenAccount: PublicKey): Promise<[number, number]>;

  getCoinBalance(owner: PublicKey): Promise<number>;

  getTransaction(signature: string): Promise<ParsedTransactionWithMeta | null>;

  getLatestBlockhash(): Promise<{
    blockhash: string;
    lastValidBlockHeight: number;
  }>;

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

/**
 * Wrapper around AnchorProvider for real blockchain
 */
export class RealBlockchainProvider implements IBlockchainProvider {
  constructor(private provider: anchor.AnchorProvider) {}

  get cluster(): Cluster {
    return this.connection.rpcEndpoint === ENV.MAINNET_RPC_URL
      ? Cluster.Mainnet
      : Cluster.Devnet;
  }

  get connection(): Connection {
    return this.provider.connection;
  }

  get wallet() {
    return this.provider.wallet;
  }

  async sendTransaction(
    tx: Transaction | VersionedTransaction,
    _signers?: Keypair[]
  ): Promise<TransactionSignature> {
    // Transaction already signed, just send it
    const rawTx = tx.serialize();
    return this.connection.sendRawTransaction(rawTx, {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });
  }

  async confirmTransaction(signature: TransactionSignature): Promise<void> {
    const { blockhash, lastValidBlockHeight } =
      await this.connection.getLatestBlockhash();

    await this.connection.confirmTransaction({
      blockhash,
      lastValidBlockHeight,
      signature,
    });
  }

  async requestAirdrop(
    publicKey: PublicKey,
    lamports: number
  ): Promise<TransactionSignature> {
    const signature = await this.connection.requestAirdrop(publicKey, lamports);
    await this.confirmTransaction(signature);
    return signature;
  }

  async getTokenAccountBalance(
    tokenAccount: PublicKey
  ): Promise<[number, number]> {
    try {
      const {
        value: { amount, uiAmount },
      } = await this.provider.connection.getTokenAccountBalance(tokenAccount);
      return [Number(amount), Number(uiAmount || 0)];
    } catch (_) {
      return [0, 0];
    }
  }

  async getCoinBalance(owner: PublicKey): Promise<number> {
    return this.provider.connection.getBalance(owner);
  }

  async getTransaction(
    signature: string
  ): Promise<ParsedTransactionWithMeta | null> {
    return this.connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });
  }

  async getLatestBlockhash(): Promise<{
    blockhash: string;
    lastValidBlockHeight: number;
  }> {
    return this.connection.getLatestBlockhash();
  }

  async getSlot(): Promise<number> {
    return this.provider.connection.getSlot({
      commitment: COMMITMENT,
    });
  }

  async getClockTime(): Promise<number> {
    const slot = await this.getSlot();
    const clockTime = await this.provider.connection.getBlockTime(slot);
    return clockTime || 0;
  }

  async getRentExempt(space: number): Promise<number> {
    return this.provider.connection.getMinimumBalanceForRentExemption(space);
  }

  async fetchMultipleAccounts<T = any, IDL extends anchor.Idl = anchor.Idl>(
    program: anchor.Program<IDL>,
    accountName: string,
    addresses: PublicKey[]
  ): Promise<T[]> {
    const accountFetcher = (program.account as any)[accountName];
    if (!accountFetcher) {
      throw new Error(`Unknown account type: ${accountName}`);
    }
    return accountFetcher.fetchMultiple(addresses);
  }

  async getAccountInfo(
    address: PublicKey
  ): Promise<AccountInfo<Buffer> | null> {
    return this.provider.connection.getAccountInfo(address);
  }

  async wait(delayS: number): Promise<void> {
    await wait(1e3 * delayS);
  }
}

/**
 * Wrapper around LiteSVM for local testing
 */
export class LiteSvmProvider implements IBlockchainProvider {
  private litesvm: LiteSVM;
  private _wallet: Keypair;

  constructor(wallet: Keypair, litesvm?: LiteSVM) {
    this._wallet = wallet;
    this.litesvm = litesvm || new LiteSVM().withDefaultPrograms();
  }

  get cluster(): Cluster {
    return Cluster.Localnet;
  }

  get connection(): Connection {
    // LiteSVM doesn't have a real connection, but we need to satisfy the interface
    // Return a mock that throws errors if used directly
    throw new Error(
      "LiteSVM doesn't support direct Connection methods. Use provider methods instead."
    );
  }

  get wallet() {
    return {
      publicKey: this._wallet.publicKey,
      signTransaction: async (tx: VersionedTransaction) => {
        // LiteSVM doesn't actually need this since transactions are signed before sending
        // But we provide it for interface compatibility
        return tx;
      },
    };
  }

  getLiteSVM(): LiteSVM {
    return this.litesvm;
  }

  async sendTransaction(
    tx: Transaction | VersionedTransaction,
    _signers?: Keypair[]
  ): Promise<TransactionSignature> {
    const result = this.litesvm.sendTransaction(tx);

    if ("err" in result) {
      throw new Error(`Transaction failed: ${JSON.stringify(result.err)}`);
    }

    // Return the signature as a base58 string
    const signature =
      tx instanceof Transaction ? tx.signature : tx.signatures[0];
    if (!signature) {
      throw new Error("Transaction has no signature");
    }
    return Buffer.from(signature).toString("base64");
  }

  async confirmTransaction(_signature: TransactionSignature): Promise<void> {
    // LiteSVM processes transactions immediately, no confirmation needed
    return;
  }

  async requestAirdrop(
    publicKey: PublicKey,
    lamports: number
  ): Promise<TransactionSignature> {
    const result = this.litesvm.airdrop(publicKey, BigInt(lamports));

    if (!result || "err" in result) {
      throw new Error(
        `Airdrop failed: ${
          result ? JSON.stringify(result.err) : "Unknown error"
        }`
      );
    }

    return "airdrop_" + publicKey.toBase58();
  }

  async getTokenAccountBalance(
    tokenAccount: PublicKey
  ): Promise<[number, number]> {
    const account = this.litesvm.getAccount(tokenAccount);
    if (!account) {
      return [0, 0];
    }

    // Get the mint address from the token account (stored at offset 0)
    const mintBuffer = account.data.slice(0, 32);
    const mint = new PublicKey(mintBuffer);

    // Fetch the mint account to get decimals
    const mintAccount = this.litesvm.getAccount(mint);
    if (!mintAccount) {
      throw new Error("Mint account not found");
    }

    // Read decimals from mint account (offset 44 for both SPL Token and Token-2022)
    const decimals = mintAccount.data[44];

    // Read amount from token account (offset 64)
    const amountBuffer = account.data.slice(64, 72);
    const dataView = new DataView(
      amountBuffer.buffer,
      amountBuffer.byteOffset,
      amountBuffer.byteLength
    );
    const atomicsAmount = Number(dataView.getBigUint64(0, true));
    const uiAmount = atomicsAmount / 10 ** decimals;

    return [atomicsAmount, uiAmount];
  }

  async getCoinBalance(owner: PublicKey): Promise<number> {
    return Number(this.litesvm.getBalance(owner) || 0);
  }

  // rust
  //   TransactionMetadata {
  //     signature: 2VFTLYbN2pLidhJBRLYXDKYg9y13gYVRiyaMPwceQWBKUo1FKCgpAMUxk7rAHGQZC88rPtSxBrJ3EC4iMR8b1E8V,
  //     logs: [
  //         "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [1]",
  //         "Program log: Instruction: TransferChecked",
  //         "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 6255 of 10000000 compute units",
  //         "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success",
  //     ],
  //     inner_instructions: [
  //         [],
  //     ],
  //     compute_units_consumed: 6255,
  //     return_data: TransactionReturnData {
  //         program_id: TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA,
  //         data: [],
  //     },
  // }

  // ts
  // {
  //   slot: 0,
  //   transaction: {
  //     message: {
  //       accountKeys: [],
  //       instructions: [ [] ],
  //       recentBlockhash: 'CmpNeggWJ4JaWJeJ8YKN1Zypmk7uvQq3PECGUCAEMbky'
  //     },
  //     signatures: []
  //   },
  //   meta: {
  //     err: null,
  //     fee: 0,
  //     logMessages: [
  //       'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [1]',
  //       'Program log: Instruction: TransferChecked',
  //       'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 6199 of 200000 compute units',
  //       'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success'
  //     ]
  //   },
  //   blockTime: null,
  //   version: 0
  // }
  async getTransaction(
    signature: string,
    isDisplayed: boolean = false
  ): Promise<ParsedTransactionWithMeta | null> {
    // Convert signature back to Uint8Array
    const sigBytes = Buffer.from(signature, "base64");
    const result = this.litesvm.getTransaction(sigBytes);
    if (!result) {
      return null;
    }

    const transaction = result as TransactionMetadata;
    const clock = this.litesvm.getClock();
    const slot = Number(clock.slot);
    const blockTime = Number(clock.unixTimestamp);

    // Return mock ParsedTransactionWithMeta
    const mockTx: ParsedTransactionWithMeta = {
      slot,
      transaction: {
        message: {
          accountKeys: [],
          instructions: transaction.innerInstructions(),
          recentBlockhash: this.litesvm.latestBlockhash(),
        },
        signatures: [],
      } as any,
      meta: {
        err: null,
        fee: 0,
        logMessages: transaction.logs() || [],
      } as any,
      blockTime,
      version: 0,
    };

    return logAndReturn(mockTx, isDisplayed);
  }

  async getLatestBlockhash(): Promise<{
    blockhash: string;
    lastValidBlockHeight: number;
  }> {
    return {
      blockhash: this.litesvm.latestBlockhash(),
      lastValidBlockHeight: 999_999,
    };
  }

  async getSlot(): Promise<number> {
    const { slot } = this.litesvm.getClock();
    return Number(slot);
  }

  async getClockTime(): Promise<number> {
    const { unixTimestamp } = this.litesvm.getClock();
    return Number(unixTimestamp);
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
      const accountInfo = this.litesvm.getAccount(address);
      if (!accountInfo) {
        throw new Error(
          `${accountName} account not found at ${address.toBase58()}`
        );
      }

      return program.coder.accounts.decode(
        accountName,
        Buffer.from(accountInfo.data)
      );
    });
  }

  async getAccountInfo(
    address: PublicKey
  ): Promise<AccountInfo<Buffer> | null> {
    const liteSvmAccount = this.litesvm.getAccount(address);
    if (!liteSvmAccount) {
      return null;
    }

    return {
      data: Buffer.from(liteSvmAccount.data),
      executable: liteSvmAccount.executable,
      lamports: Number(liteSvmAccount.lamports),
      owner: new PublicKey(liteSvmAccount.owner),
      rentEpoch: Number(liteSvmAccount.rentEpoch),
    };
  }

  async wait(delayS: number): Promise<void> {
    let clock = this.litesvm.getClock();
    clock.unixTimestamp += BigInt(delayS);
    clock.slot += BigInt(Math.floor(delayS / 0.4));
    this.litesvm.setClock(clock);
  }

  // Additional LiteSVM-specific methods

  getWalletKeypair(): Keypair {
    return this._wallet;
  }

  setAccount(address: PublicKey, account: any): void {
    this.litesvm.setAccount(address, account);
  }

  addProgramFromFile(
    programId: PublicKey,
    programPath: string,
    dumpsPath: string
  ): void {
    try {
      this.litesvm.addProgramFromFile(programId, programPath);
    } catch (_) {
      this.litesvm.addProgramFromFile(programId, dumpsPath);
    }
  }

  // Bincode layout of UpgradeableLoaderState::ProgramData:
  // [0..4]   u32 LE  variant index = 3
  // [4..12]  u64 LE  slot
  // [12]     u8      Option discriminant: 1 = Some, 0 = None
  // [13..45] [u8;32] upgrade_authority_address (only when discriminant = 1)
  setProgramUpgradeAuthority(programId: PublicKey, authority: PublicKey): void {
    const [programDataAddress] = PublicKey.findProgramAddressSync(
      [programId.toBuffer()],
      BPF_LOADER_UPGRADEABLE
    );

    const existing = this.litesvm.getAccount(programDataAddress);
    if (!existing) {
      throw new Error(
        `ProgramData account not found for ${programId.toBase58()} — call addProgramFromFile first`
      );
    }

    const data = Buffer.from(existing.data); // copy
    data.writeUInt32LE(3, 0); // variant = ProgramData
    data.writeBigUInt64LE(BigInt(0), 4); // slot
    data[12] = 1; // Some(authority)
    authority.toBuffer().copy(data, 13); // 32-byte pubkey

    this.setAccount(programDataAddress, { ...existing, data });
  }
}

/**
 * Factory function to create the appropriate provider
 */
export function createProvider(
  config:
    | { type: "real"; provider: anchor.AnchorProvider }
    | { type: "litesvm"; wallet: Keypair; litesvm?: LiteSVM }
): IBlockchainProvider {
  if (config.type === "real") {
    return new RealBlockchainProvider(config.provider);
  } else {
    return new LiteSvmProvider(config.wallet, config.litesvm);
  }
}
