import { getFirstKey, getSecondKey } from "./utils";
import { type CpAmm as DammV2 } from "../schema/damm-v2/damm_v2";
import type { TxSettings } from "../interfaces";
import type { TxResult } from "../tx";
import { logAndReturn } from "../utils/log";
import { ProgramHelpers } from "./base";
import type { IdlAccounts } from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { getOrCreateAtaIxs } from "../utils";
import { PublicKey, SystemProgram } from "@solana/web3.js";

import * as IDammV2 from "../interfaces/damm-v2";
import * as IADammV2 from "../interfaces/damm-v2.anchor";

const ACCOUNT_CONFIG = "config";
const ACCOUNT_POOL = "pool";
const ACCOUNT_FEE_TIME_SCHEDULER = "podAlignedFeeTimeScheduler";

const SEED_CONFIG = "config";
const SEED_OPERATOR = "operator";
const SEED_POOL = "pool";
const SEED_POSITION = "position";
const SEED_POSITION_NFT_ACCOUNT = "position_nft_account";
const SEED_POOL_AUTHORITY = "pool_authority";
const SEED_TOKEN_VAULT = "token_vault";
const SEED_EVENT_AUTHORITY = "__event_authority";

type BNType = InstanceType<typeof BN>;

type DammV2Account<T extends keyof IdlAccounts<DammV2>> =
  IdlAccounts<DammV2>[T];
export type DammV2ConfigAccount = DammV2Account<typeof ACCOUNT_CONFIG>;
export type BorshFeeTimeSchedulerAccount = DammV2Account<
  typeof ACCOUNT_FEE_TIME_SCHEDULER
>;
export type PoolAccount = DammV2Account<typeof ACCOUNT_POOL>;

export class DammV2Helpers extends ProgramHelpers<DammV2> {
  async tryCreateOperatorAccount(
    whitelistedAddress: PublicKey,
    permission: BNType,
    txSettings: TxSettings = {}
  ): Promise<TxResult> {
    // PDA
    const [operator] = this.pdaOperatorAddress(whitelistedAddress);

    const ix = await this.program.methods
      .createOperatorAccount(permission)
      .accountsPartial({
        operator,
        whitelistedAddress,
        signer: this.senderKey(txSettings),
        payer: this.rentPayerKey(txSettings),
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    return this.send([ix], txSettings);
  }

  async tryCreateConfig(
    index: BNType,
    args: IDammV2.CreateConfigArgs,
    txSettings: TxSettings = {}
  ): Promise<TxResult> {
    const sender = this.senderKey(txSettings);

    // PDA
    const [config] = this.pdaConfig(index);
    const [operator] = this.pdaOperatorAddress(sender);

    const ix = await this.program.methods
      .createConfig(...IADammV2.convertCreateConfigArgs(args))
      .accountsPartial({
        config,
        operator,
        signer: sender,
        payer: this.rentPayerKey(txSettings),
      })
      .instruction();

    return this.send([ix], txSettings);
  }

  async tryCreateDynamicConfig(
    index: BNType,
    args: IDammV2.CreateDynamicConfigArgs,
    txSettings: TxSettings = {}
  ): Promise<TxResult> {
    const sender = this.senderKey(txSettings);

    // PDA
    const [config] = this.pdaConfig(index);
    const [operator] = this.pdaOperatorAddress(sender);

    const ix = await this.program.methods
      .createDynamicConfig(...IADammV2.convertCreateDynamicConfigArgs(args))
      .accountsPartial({
        config,
        operator,
        signer: sender,
        payer: this.rentPayerKey(txSettings),
      })
      .instruction();

    return this.send([ix], txSettings);
  }

  async trySwap(
    pool: PublicKey,
    inputMint: PublicKey,
    args: IDammV2.SwapV2Args,
    txSettings: TxSettings = {}
  ): Promise<TxResult> {
    const sender = this.senderKey(txSettings);

    const { tokenAMint, tokenBMint, tokenAVault, tokenBVault } =
      await this.queryPool(pool);

    const isAToB = inputMint.equals(tokenAMint);
    if (!isAToB && !inputMint.equals(tokenBMint)) {
      throw new Error("inputMint is not part of the pool");
    }
    const outputMint = isAToB ? tokenBMint : tokenAMint;

    const [tokenAProgram, tokenBProgram] = await Promise.all([
      this.getTokenProgram(tokenAMint),
      this.getTokenProgram(tokenBMint),
    ]);
    const inputTokenProgram = isAToB ? tokenAProgram : tokenBProgram;
    const outputTokenProgram = isAToB ? tokenBProgram : tokenAProgram;

    // PDA
    const [poolAuthority] = this.pdaDammV2PoolAuthority();

    // ATA
    const { ixs: inputAtaIxs, ata: inputTokenAccount } =
      await getOrCreateAtaIxs(
        this.provider,
        sender,
        inputMint,
        sender,
        inputTokenProgram
      );
    const { ixs: outputAtaIxs, ata: outputTokenAccount } =
      await getOrCreateAtaIxs(
        this.provider,
        sender,
        outputMint,
        sender,
        outputTokenProgram
      );

    const ix = await this.program.methods
      .swap2(...IADammV2.convertSwapV2Args(args))
      .accountsPartial({
        poolAuthority,
        pool,
        inputTokenAccount,
        outputTokenAccount,
        tokenAVault,
        tokenBVault,
        tokenAMint,
        tokenBMint,
        payer: sender,
        tokenAProgram,
        tokenBProgram,
        referralTokenAccount: null,
      })
      .instruction();

    return this.send([...inputAtaIxs, ...outputAtaIxs, ix], txSettings);
  }

  async queryConfig(
    index: BNType,
    isDisplayed: boolean = false
  ): Promise<DammV2ConfigAccount> {
    const [pda] = this.pdaConfig(index);
    const [res] = await this.fetchAccounts(ACCOUNT_CONFIG, [pda]);
    return logAndReturn(res, isDisplayed);
  }

  async queryPool(
    pool: PublicKey,
    isDisplayed: boolean = false
  ): Promise<PoolAccount> {
    const [res] = await this.fetchAccounts(ACCOUNT_POOL, [pool]);
    return logAndReturn(res, isDisplayed);
  }

  pdaConfig(index: BNType): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(SEED_CONFIG), index.toArrayLike(Buffer, "le", 8)],
      this.program.programId
    );
  }

  pdaOperatorAddress(whitelistedAddress: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(SEED_OPERATOR), whitelistedAddress.toBuffer()],
      this.program.programId
    );
  }

  pdaDammV2PoolAddress(
    dammConfig: PublicKey,
    tokenAMint: PublicKey,
    tokenBMint: PublicKey
  ): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from(SEED_POOL),
        dammConfig.toBuffer(),
        getFirstKey(tokenAMint, tokenBMint),
        getSecondKey(tokenAMint, tokenBMint),
      ],
      this.program.programId
    );
  }

  pdaDammV2Position(positionNftMint: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(SEED_POSITION), positionNftMint.toBuffer()],
      this.program.programId
    );
  }

  pdaDammV2PositionNftAccount(positionNftMint: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(SEED_POSITION_NFT_ACCOUNT), positionNftMint.toBuffer()],
      this.program.programId
    );
  }

  pdaDammV2PoolAuthority(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(SEED_POOL_AUTHORITY)],
      this.program.programId
    );
  }

  pdaDammV2TokenVault(
    tokenMint: PublicKey,
    pool: PublicKey
  ): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(SEED_TOKEN_VAULT), tokenMint.toBuffer(), pool.toBuffer()],
      this.program.programId
    );
  }

  pdaDammV2EventAuthority(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(SEED_EVENT_AUTHORITY)],
      this.program.programId
    );
  }
}
