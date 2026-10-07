import * as anchor from "@coral-xyz/anchor";
import * as spl from "@solana/spl-token";
import { DynamicBondingCurve } from "../schema/dbc/dynamic_bonding_curve";
import { IHelpers, TxSettings } from "../interfaces";
import { BPF_LOADER_UPGRADEABLE, IBlockchainProvider } from "./provider";
import { IdlAccounts } from "@coral-xyz/anchor";
import { AppToken, getMintByAppToken, PROGRAM } from "../config";
import { getFirstKey, getSecondKey } from "./utils";
import { DammV2Helpers } from "./damm-v2";
import {
  PublicKey,
  TransactionInstruction as Ix,
  ParsedTransactionWithMeta,
  Keypair,
  AccountMeta,
} from "@solana/web3.js";
import {
  fetchMultipleAccountsFactory,
  getActorsFactory,
  getOrCreateAtaIxs,
  getSignersFactory,
  getTokenProgramFactory,
  handleTxFactory,
  logAndReturn,
  withSenderFactory,
} from "../utils";

import * as IDbc from "../interfaces/dbc";
import * as IADbc from "../interfaces/dbc.anchor";

type DbcAccount<T extends keyof IdlAccounts<DynamicBondingCurve>> =
  IdlAccounts<DynamicBondingCurve>[T];
export type PoolConfigAccount = DbcAccount<"poolConfig">;
export type VirtualPoolAccount = DbcAccount<"virtualPool">;
export type DammMigrationMetadataAccount =
  DbcAccount<"meteoraDammMigrationMetadata">;

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
    quoteMint: PublicKey,
    config: PublicKey,
    args: IDbc.CreatePoolWithToken2022Args,
    txSettings: TxSettings = {}
  ): Promise<ParsedTransactionWithMeta | Ix[] | string> {
    const [_payer, sender] = this.getActors(txSettings);
    const signerList = this.getSigners(baseMintKP);

    const tokenQuoteProgram = await this.getTokenProgram(quoteMint);

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

  async trySwap(
    baseMint: PublicKey,
    quoteMint: PublicKey,
    config: PublicKey,
    args: IDbc.SwapArgs,
    txSettings: TxSettings = {}
  ): Promise<ParsedTransactionWithMeta | Ix[] | string> {
    const [_payer, sender] = this.getActors(txSettings);
    const signerList = this.getSigners();

    const [inputTokenProgram, outputTokenProgram] = await Promise.all([
      this.getTokenProgram(quoteMint),
      this.getTokenProgram(baseMint),
    ]);

    // PDA
    const [pool] = this.pdaPoolAddress(config, quoteMint, baseMint);
    const [baseVault] = this.pdaTokenVaultAddress(baseMint, pool);
    const [quoteVault] = this.pdaTokenVaultAddress(quoteMint, pool);
    const [poolAuthority] = this.pdaPoolAuthority();

    // ATA
    const { ixs: inputAtaIxs, ata: inputTokenAccount } =
      await getOrCreateAtaIxs(
        this.provider,
        sender,
        quoteMint,
        sender,
        inputTokenProgram
      );
    const { ixs: outputAtaIxs, ata: outputTokenAccount } =
      await getOrCreateAtaIxs(
        this.provider,
        sender,
        baseMint,
        sender,
        outputTokenProgram
      );

    const ix = await this.program.methods
      .swap2(...IADbc.convertSwapArgs(args))
      .accountsPartial({
        pool,
        poolAuthority,
        payer: sender,
        inputTokenAccount,
        outputTokenAccount,
        baseVault,
        quoteVault,
        config,
        baseMint,
        quoteMint,
        tokenBaseProgram: outputTokenProgram,
        tokenQuoteProgram: inputTokenProgram,
        referralTokenAccount: null,
      })
      .instruction();

    return this.handleTx(
      signerList,
      [...inputAtaIxs, ...outputAtaIxs, ix],
      txSettings
    );
  }

  async tryCreateMeteoraDammV2Metadata(
    baseMint: PublicKey,
    quoteMint: PublicKey,
    config: PublicKey,
    txSettings: TxSettings = {}
  ): Promise<ParsedTransactionWithMeta | Ix[] | string> {
    const [_payer, sender] = this.getActors(txSettings);
    const signerList = this.getSigners();

    // PDA
    const [virtualPool] = this.pdaPoolAddress(config, quoteMint, baseMint);
    const [migrationMetadata] =
      this.pdaMigrationDammV2MetadataAddress(virtualPool);

    const ix = await this.program.methods
      .migrationDammV2CreateMetadata()
      .accountsPartial({
        virtualPool,
        config,
        migrationMetadata,
        payer: sender,
        systemProgram: this.SYSTEM_PROGRAM,
      })
      .instruction();

    return this.handleTx(signerList, [ix], txSettings);
  }

  async tryMigrateToDammV2(
    dammV2Helpers: DammV2Helpers,
    firstPositionNftKP: Keypair,
    secondPositionNftKP: Keypair,
    baseMint: PublicKey,
    quoteMint: PublicKey,
    config: PublicKey,
    dammConfig: PublicKey,
    txSettings: TxSettings = {}
  ): Promise<ParsedTransactionWithMeta | Ix[] | string> {
    const [_payer, sender] = this.getActors(txSettings);
    const signerList = this.getSigners(firstPositionNftKP, secondPositionNftKP);

    // DBC state
    const [virtualPool] = this.pdaPoolAddress(config, quoteMint, baseMint);
    const [virtualPoolState, configState] = await Promise.all([
      this.queryVirtualPool(config, baseMint, quoteMint),
      this.queryPoolConfig(config),
    ]);

    const [poolAuthority] = this.pdaPoolAuthority();
    const [migrationMetadata] =
      this.pdaMigrationDammV2MetadataAddress(virtualPool);

    // DAMM v2 PDAs
    const [dammPool] = dammV2Helpers.pdaDammV2PoolAddress(
      dammConfig,
      virtualPoolState.poolState.baseMint,
      configState.quoteMint
    );
    const [firstPosition] = dammV2Helpers.pdaDammV2Position(
      firstPositionNftKP.publicKey
    );
    const [firstPositionNftAccount] = dammV2Helpers.pdaDammV2PositionNftAccount(
      firstPositionNftKP.publicKey
    );
    const [secondPosition] = dammV2Helpers.pdaDammV2Position(
      secondPositionNftKP.publicKey
    );
    const [secondPositionNftAccount] =
      dammV2Helpers.pdaDammV2PositionNftAccount(secondPositionNftKP.publicKey);
    const [dammPoolAuthority] = dammV2Helpers.pdaDammV2PoolAuthority();
    const [dammEventAuthority] = dammV2Helpers.pdaDammV2EventAuthority();
    const [tokenAVault] = dammV2Helpers.pdaDammV2TokenVault(
      virtualPoolState.poolState.baseMint,
      dammPool
    );
    const [tokenBVault] = dammV2Helpers.pdaDammV2TokenVault(
      configState.quoteMint,
      dammPool
    );

    const tokenBaseProgram =
      configState.tokenType === 0
        ? spl.TOKEN_PROGRAM_ID
        : spl.TOKEN_2022_PROGRAM_ID;
    const tokenQuoteProgram =
      configState.quoteTokenFlag === 0
        ? spl.TOKEN_PROGRAM_ID
        : spl.TOKEN_2022_PROGRAM_ID;

    const remainingAccounts: AccountMeta[] = [
      { pubkey: dammConfig, isSigner: false, isWritable: false },
    ];

    const ix = await this.program.methods
      .migrationDammV2()
      .accountsStrict({
        virtualPool,
        migrationMetadata,
        config,
        poolAuthority,
        pool: dammPool,
        firstPositionNftMint: firstPositionNftKP.publicKey,
        firstPosition,
        firstPositionNftAccount,
        secondPositionNftMint: secondPositionNftKP.publicKey,
        secondPosition,
        secondPositionNftAccount,
        dammPoolAuthority,
        ammProgram: PROGRAM.DAMM_V2.PROGRAM_ID,
        baseMint: virtualPoolState.poolState.baseMint,
        quoteMint: configState.quoteMint,
        tokenAVault,
        tokenBVault,
        baseVault: virtualPoolState.poolState.baseVault,
        quoteVault: virtualPoolState.poolState.quoteVault,
        payer: sender,
        tokenBaseProgram,
        tokenQuoteProgram,
        token2022Program: spl.TOKEN_2022_PROGRAM_ID,
        systemProgram: this.SYSTEM_PROGRAM,
        dammEventAuthority,
      })
      .remainingAccounts(remainingAccounts)
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

  async queryVirtualPool(
    config: PublicKey,
    tokenAMint: PublicKey,
    tokenBMint: PublicKey,
    isDisplayed: boolean = false
  ): Promise<VirtualPoolAccount> {
    const [pda] = this.pdaPoolAddress(config, tokenAMint, tokenBMint);
    const [res] = await this.fetchMultipleAccounts("virtualPool", [pda]);
    return logAndReturn(res, isDisplayed);
  }

  async queryDammMigrationMetadata(
    config: PublicKey,
    tokenAMint: PublicKey,
    tokenBMint: PublicKey,
    isDisplayed: boolean = false
  ): Promise<DammMigrationMetadataAccount> {
    const [virtualPool] = this.pdaPoolAddress(config, tokenAMint, tokenBMint);
    const [pda] = this.pdaMigrationDammV2MetadataAddress(virtualPool);
    const [res] = await this.fetchMultipleAccounts(
      "meteoraDammMigrationMetadata",
      [pda]
    );
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

  pdaMigrationDammV2MetadataAddress(virtualPool: PublicKey) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("damm_v2"), virtualPool.toBuffer()],
      PROGRAM.DBC.PROGRAM_ID
    );
  }
}
