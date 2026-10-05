import * as anchor from "@coral-xyz/anchor";
import * as spl from "@solana/spl-token";
import { DynamicBondingCurve } from "../schema/dbc/dynamic_bonding_curve";
import { IHelpers, ResultType, TxSettings } from "../interfaces";
import { BPF_LOADER_UPGRADEABLE, IBlockchainProvider } from "./provider";
import { IdlAccounts } from "@coral-xyz/anchor";
import {
  AppToken,
  Cluster,
  getAppTokenByMint,
  getMintByAppToken,
  PROGRAM,
} from "../config";
import {
  PublicKey,
  TransactionInstruction as Ix,
  ParsedTransactionWithMeta,
  Keypair,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
} from "@solana/web3.js";
import {
  dedupPubkey,
  fetchMultipleAccountsFactory,
  getActorsFactory,
  getAta,
  getOrCreateAtaIxs,
  getSignersFactory,
  getTokenProgramFactory,
  handleTxFactory,
  li,
  logAndReturn,
  numberFrom,
  numberToRustBuffer,
  withSenderFactory,
} from "../utils";

import * as IDbc from "../interfaces/dbc";
import * as IADbc from "../interfaces/dbc.anchor";

const { BN } = anchor;

type DbcAccount<T extends keyof IdlAccounts<DynamicBondingCurve>> =
  IdlAccounts<DynamicBondingCurve>[T];
export type ClaimFeeOperatorAccount = DbcAccount<"claimFeeOperator">;
export type PoolConfigAccount = DbcAccount<"poolConfig">;

export class DbcHelpers implements IHelpers {
  private RENT_PROGRAM: PublicKey = anchor.web3.SYSVAR_RENT_PUBKEY;
  private SYSTEM_PROGRAM: PublicKey = anchor.web3.SystemProgram.programId;
  private ASSOCIATED_TOKEN_PROGRAM: PublicKey = spl.ASSOCIATED_TOKEN_PROGRAM_ID;

  public defaultWallet: PublicKey;
  public temporarySender?: Keypair;

  public fetchMultipleAccounts: <
    T extends keyof IdlAccounts<DynamicBondingCurve>
  >(
    accountName: T,
    addresses: PublicKey[]
  ) => Promise<IdlAccounts<DynamicBondingCurve>[T][]>;

  private handleTx: (
    signerList: Keypair[],
    instructions: Ix[],
    txSettings: TxSettings
  ) => Promise<ParsedTransactionWithMeta | Ix[] | string>;

  private getTokenProgram: (
    mint: PublicKey,
    isToken2022?: boolean
  ) => Promise<PublicKey>;

  public withSender: (sender: Keypair) => this;
  private getActors: (txSettings: TxSettings) => [PublicKey, PublicKey];
  private getSigners: (...additionalSigners: Keypair[]) => Keypair[];

  constructor(
    private provider: IBlockchainProvider,
    private program: anchor.Program<DynamicBondingCurve>
  ) {
    this.defaultWallet = provider.wallet.publicKey;
    this.program = program;
    this.provider = provider;
    this.fetchMultipleAccounts = fetchMultipleAccountsFactory(
      provider,
      program
    );
    this.handleTx = handleTxFactory(provider);
    this.getTokenProgram = getTokenProgramFactory(provider);
    this.withSender = withSenderFactory();
    this.getActors = getActorsFactory();
    this.getSigners = getSignersFactory();
  }

  async tryCreateConfig(
    configKp: Keypair,
    args: IDbc.CreateConfigArgs,
    txSettings: TxSettings = {}
  ): Promise<ParsedTransactionWithMeta | Ix[] | string> {
    const [_payer, sender] = this.getActors(txSettings);
    const signerList = this.getSigners(configKp);

    const usdc = getMintByAppToken(this.provider.cluster, AppToken.USDC);

    const ix = await this.program.methods
      .createConfig(...IADbc.convertCreateConfigArgs(args))
      .accountsPartial({
        config: configKp.publicKey,
        feeClaimer: sender,
        leftoverReceiver: sender,
        quoteMint: usdc,
        payer: sender,
        systemProgram: this.SYSTEM_PROGRAM,
        program: this.program.programId,
      })
      .instruction();

    return this.handleTx(signerList, [ix], txSettings);
  }

  async tryCreatePoolWithToken2022(
    baseMintKP: Keypair,
    config: PublicKey,
    args: IDbc.CreatePoolWithToken2022Args,
    txSettings: TxSettings = {}
  ): Promise<ParsedTransactionWithMeta | Ix[] | string> {
    const [_payer, sender] = this.getActors(txSettings);
    const signerList = this.getSigners(baseMintKP);

    const quoteMint = getMintByAppToken(this.provider.cluster, AppToken.USDC);
    const tokenQuoteProgram = await this.getTokenProgram(quoteMint, false);

    // PDA
    const [pool] = this.pdaPoolAddress(config, quoteMint, baseMintKP.publicKey);
    const [baseVault] = this.pdaTokenVaultAddress(baseMintKP.publicKey, pool);
    const [quoteVault] = this.pdaTokenVaultAddress(quoteMint, pool);
    const [poolAuthority] = this.pdaPoolAuthority();

    const ix = await this.program.methods
      .initializeVirtualPoolWithToken2022(
        ...IADbc.convertCreatePoolWithToken2022Args(args)
      )
      .accountsPartial({
        config,
        baseMint: baseMintKP.publicKey,
        quoteMint,
        pool,
        payer: sender,
        creator: sender,
        poolAuthority,
        baseVault,
        quoteVault,
        tokenQuoteProgram,
        tokenProgram: spl.TOKEN_2022_PROGRAM_ID,
      })
      .instruction();

    return this.handleTx(signerList, [ix], txSettings);
  }

  async queryPoolConfig(
    config: PublicKey,
    isDisplayed: boolean = false
  ): Promise<PoolConfigAccount> {
    const [res] = await this.fetchMultipleAccounts("poolConfig", [config]);
    return logAndReturn(res, isDisplayed);
  }

  pdaProgramData() {
    return PublicKey.findProgramAddressSync(
      [this.program.programId.toBuffer()],
      BPF_LOADER_UPGRADEABLE
    );
  }

  pdaPoolAddress(
    config: PublicKey,
    tokenAMint: PublicKey,
    tokenBMint: PublicKey
  ) {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("pool"),
        config.toBuffer(),
        getFirstKey(tokenAMint, tokenBMint),
        getSecondKey(tokenAMint, tokenBMint),
      ],
      PROGRAM.DBC.PROGRAM_ID
    );
  }

  pdaTokenVaultAddress(tokenMint: PublicKey, pool: PublicKey) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("token_vault"), tokenMint.toBuffer(), pool.toBuffer()],
      PROGRAM.DBC.PROGRAM_ID
    );
  }

  pdaPoolAuthority() {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("pool_authority")],
      PROGRAM.DBC.PROGRAM_ID
    );
  }
}

export function getFirstKey(key1: PublicKey, key2: PublicKey) {
  const buf1 = key1.toBuffer();
  const buf2 = key2.toBuffer();
  // Buf1 > buf2
  if (Buffer.compare(buf1, buf2) === 1) {
    return buf1;
  }
  return buf2;
}

export function getSecondKey(key1: PublicKey, key2: PublicKey) {
  const buf1 = key1.toBuffer();
  const buf2 = key2.toBuffer();
  // Buf1 > buf2
  if (Buffer.compare(buf1, buf2) === 1) {
    return buf2;
  }
  return buf1;
}
