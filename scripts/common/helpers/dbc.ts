import * as spl from "@solana/spl-token";
import { getFirstKey, getSecondKey } from "./utils";
import { DammV2Helpers } from "./damm-v2";
import { type DynamicBondingCurve } from "../schema/dbc/dbc";
import type { TxSettings } from "../interfaces";
import type { TxResult } from "../tx";
import { logAndReturn } from "../utils/log";
import { ProgramHelpers } from "./base";
import type { IdlAccounts } from "@coral-xyz/anchor";
import { getOrCreateAtaIxs } from "../utils";
import {
  AppToken,
  BPF_LOADER_UPGRADEABLE,
  getMintByAppToken,
  PROGRAM,
} from "../config";
import {
  PublicKey,
  SystemProgram,
  Keypair,
  type AccountMeta,
} from "@solana/web3.js";

import * as IDbc from "../interfaces/dbc";
import * as IADbc from "../interfaces/dbc.anchor";

const ACCOUNT_POOL_CONFIG = "poolConfig";
const ACCOUNT_VIRTUAL_POOL = "virtualPool";
const ACCOUNT_DAMM_MIGRATION_METADATA = "meteoraDammMigrationMetadata";

const SEED_POOL = "pool";
const SEED_TOKEN_VAULT = "token_vault";
const SEED_POOL_AUTHORITY = "pool_authority";
const SEED_DAMM_V2 = "damm_v2";
const SEED_EVENT_AUTHORITY = "__event_authority";

type DbcAccount<T extends keyof IdlAccounts<DynamicBondingCurve>> =
  IdlAccounts<DynamicBondingCurve>[T];
export type PoolConfigAccount = DbcAccount<typeof ACCOUNT_POOL_CONFIG>;
export type VirtualPoolAccount = DbcAccount<typeof ACCOUNT_VIRTUAL_POOL>;
export type DammMigrationMetadataAccount = DbcAccount<
  typeof ACCOUNT_DAMM_MIGRATION_METADATA
>;

export class DbcHelpers extends ProgramHelpers<DynamicBondingCurve> {
  async tryCreateConfig(
    configKp: Keypair,
    args: IDbc.CreateConfigArgs,
    txSettings: TxSettings = {}
  ): Promise<TxResult> {
    const usdc = getMintByAppToken(this.provider.cluster, AppToken.USDC);

    const ix = await this.program.methods
      .createConfig(...IADbc.convertCreateConfigArgs(args))
      .accountsPartial({
        config: configKp.publicKey,
        feeClaimer: this.senderKey(txSettings),
        leftoverReceiver: this.senderKey(txSettings),
        quoteMint: usdc,
        payer: this.rentPayerKey(txSettings),
        systemProgram: SystemProgram.programId,
        program: this.program.programId,
      })
      .instruction();

    return this.send([ix], txSettings, [configKp]);
  }

  async tryCreatePoolWithToken2022(
    baseMintKP: Keypair,
    quoteMint: PublicKey,
    config: PublicKey,
    args: IDbc.CreatePoolWithToken2022Args,
    txSettings: TxSettings = {}
  ): Promise<TxResult> {
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
        payer: this.rentPayerKey(txSettings),
        creator: this.senderKey(txSettings),
        poolAuthority,
        baseVault,
        quoteVault,
        tokenQuoteProgram,
        tokenProgram: spl.TOKEN_2022_PROGRAM_ID,
      })
      .instruction();

    return this.send([ix], txSettings, [baseMintKP]);
  }

  async trySwap(
    baseMint: PublicKey,
    quoteMint: PublicKey,
    config: PublicKey,
    args: IDbc.SwapArgs,
    txSettings: TxSettings = {}
  ): Promise<TxResult> {
    const sender = this.senderKey(txSettings);

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

    return this.send([...inputAtaIxs, ...outputAtaIxs, ix], txSettings);
  }

  async tryCreateMeteoraDammV2Metadata(
    baseMint: PublicKey,
    quoteMint: PublicKey,
    config: PublicKey,
    txSettings: TxSettings = {}
  ): Promise<TxResult> {
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
        payer: this.senderKey(txSettings),
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    return this.send([ix], txSettings);
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
  ): Promise<TxResult> {
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
        payer: this.senderKey(txSettings),
        tokenBaseProgram,
        tokenQuoteProgram,
        token2022Program: spl.TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        dammEventAuthority,
      })
      .remainingAccounts(remainingAccounts)
      .instruction();

    return this.send([ix], txSettings, [
      firstPositionNftKP,
      secondPositionNftKP,
    ]);
  }

  async queryPoolConfig(
    config: PublicKey,
    isDisplayed: boolean = false
  ): Promise<PoolConfigAccount> {
    const [res] = await this.fetchAccounts(ACCOUNT_POOL_CONFIG, [config]);
    return logAndReturn(res, isDisplayed);
  }

  async queryVirtualPool(
    config: PublicKey,
    tokenAMint: PublicKey,
    tokenBMint: PublicKey,
    isDisplayed: boolean = false
  ): Promise<VirtualPoolAccount> {
    const [pda] = this.pdaPoolAddress(config, tokenAMint, tokenBMint);
    const [res] = await this.fetchAccounts(ACCOUNT_VIRTUAL_POOL, [pda]);
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
    const [res] = await this.fetchAccounts(ACCOUNT_DAMM_MIGRATION_METADATA, [
      pda,
    ]);
    return logAndReturn(res, isDisplayed);
  }

  pdaProgramData(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [this.program.programId.toBuffer()],
      BPF_LOADER_UPGRADEABLE
    );
  }

  pdaPoolAddress(
    config: PublicKey,
    tokenAMint: PublicKey,
    tokenBMint: PublicKey
  ): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from(SEED_POOL),
        config.toBuffer(),
        getFirstKey(tokenAMint, tokenBMint),
        getSecondKey(tokenAMint, tokenBMint),
      ],
      this.program.programId
    );
  }

  pdaTokenVaultAddress(
    tokenMint: PublicKey,
    pool: PublicKey
  ): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(SEED_TOKEN_VAULT), tokenMint.toBuffer(), pool.toBuffer()],
      this.program.programId
    );
  }

  pdaPoolAuthority(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(SEED_POOL_AUTHORITY)],
      this.program.programId
    );
  }

  pdaMigrationDammV2MetadataAddress(
    virtualPool: PublicKey
  ): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(SEED_DAMM_V2), virtualPool.toBuffer()],
      this.program.programId
    );
  }

  pdaEventAuthority(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(SEED_EVENT_AUTHORITY)],
      this.program.programId
    );
  }
}
