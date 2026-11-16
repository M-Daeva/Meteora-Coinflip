import * as spl from "@solana/spl-token";
import { type Coinflip } from "../schema/types/coinflip";
import type { TxSettings } from "../interfaces";
import type { TxResult } from "../tx";
import { logAndReturn } from "../utils/log";
import { ProgramHelpers } from "./base";
import type { IdlAccounts } from "@coral-xyz/anchor";
import { getAta, getOrCreateAtaIxs, numberToRustBuffer } from "../utils";
import { AppToken, getMintByAppToken } from "../config";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import type { OraoVrfHelpers } from "./orao-vrf";
import type { DbcHelpers } from "./dbc";
import type { DammV2Helpers } from "./damm-v2";

import * as ICoinflip from "../interfaces/coinflip";
import * as IACoinflip from "../interfaces/coinflip.anchor";

const ACCOUNT_CONFIG = "config";
const ACCOUNT_BET = "bet";

const SEED_CONFIG = "config";
const SEED_STATS = "stats";
const SEED_BET = "bet";

type CoinflipAccount<T extends keyof IdlAccounts<Coinflip>> =
  IdlAccounts<Coinflip>[T];
export type ConfigAccount = CoinflipAccount<typeof ACCOUNT_CONFIG>;
export type BetAccount = CoinflipAccount<typeof ACCOUNT_BET>;

export class CoinflipHelpers extends ProgramHelpers<Coinflip> {
  async tryInit(
    args: ICoinflip.InitArgs,
    txSettings: TxSettings = {}
  ): Promise<TxResult> {
    const quoteMint = getMintByAppToken(this.provider.cluster, AppToken.USDC);
    const tokenProgram = await this.getTokenProgram(quoteMint);

    // PDA
    const [config] = this.pdaConfig();
    const [stats] = this.pdaStats();

    // ATA
    const appQuoteAta = getAta({
      mint: quoteMint,
      owner: config,
      tokenProgram,
    });

    const ix = await this.program.methods
      .init(...IACoinflip.convertInitArgs(args))
      .accountsStrict({
        systemProgram: SystemProgram.programId,
        tokenProgram,
        associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
        admin: this.senderKey(txSettings),
        config,
        stats,
        quoteMint,
        appQuoteAta,
      })
      .instruction();

    return this.send([ix], txSettings);
  }

  async tryPlaceBet(
    dbcHelpers: DbcHelpers,
    dammV2Helpers: DammV2Helpers,
    oraoVrfHelpers: OraoVrfHelpers,
    args: ICoinflip.PlaceBetArgs,
    txSettings: TxSettings = {}
  ): Promise<TxResult> {
    const configState = await this.queryConfig();
    const { baseMint, quoteMint, dbcConfig } = configState;

    const { poolState } = await dbcHelpers.queryVirtualPool(
      dbcConfig,
      quoteMint,
      baseMint
    );

    // migrated -> liquidity lives in DAMM v2
    if (poolState.isMigrated) {
      return this.tryPlaceBetDamm(
        dammV2Helpers,
        oraoVrfHelpers,
        configState,
        args,
        txSettings
      );
    }

    // curve is complete but migration hasn't run yet:
    // DBC rejects swaps and the DAMM pool doesn't exist
    if (poolState.migrationProgress !== 0) {
      throw new Error("Pool is migrating, try again later");
    }

    return this.tryPlaceBetDbc(
      dbcHelpers,
      oraoVrfHelpers,
      configState,
      args,
      txSettings
    );
  }

  private async tryPlaceBetDbc(
    dbcHelpers: DbcHelpers,
    oraoVrfHelpers: OraoVrfHelpers,
    configState: ConfigAccount,
    args: ICoinflip.PlaceBetArgs,
    txSettings: TxSettings = {}
  ): Promise<TxResult> {
    const sender = this.senderKey(txSettings);
    const { baseMint, quoteMint, dbcProgram, vrfProgram, dbcConfig } =
      configState;

    const [
      {
        config: { treasury: vrfTreasury },
      },
      tokenBaseProgram,
      tokenQuoteProgram,
    ] = await Promise.all([
      oraoVrfHelpers.queryNetworkState(),
      this.getTokenProgram(baseMint),
      this.getTokenProgram(quoteMint),
    ]);

    // PDA
    const [config] = this.pdaConfig();
    const [stats] = this.pdaStats();
    const [bet] = this.pdaBet(sender, args.betNonce);
    const [vrfNetworkState] = oraoVrfHelpers.pdaNetworkState();
    const [vrfRequest] = oraoVrfHelpers.pdaRandomness(bet.toBuffer());
    const [dbcPool] = dbcHelpers.pdaPoolAddress(dbcConfig, quoteMint, baseMint);
    const [dbcBaseVault] = dbcHelpers.pdaTokenVaultAddress(baseMint, dbcPool);
    const [dbcQuoteVault] = dbcHelpers.pdaTokenVaultAddress(quoteMint, dbcPool);
    const [dbcPoolAuthority] = dbcHelpers.pdaPoolAuthority();
    const [dbcEventAuthority] = dbcHelpers.pdaEventAuthority();

    // ATA
    const userBaseTa = getAta({
      mint: baseMint,
      owner: sender,
      tokenProgram: tokenBaseProgram,
    });
    const appQuoteAta = getAta({
      mint: quoteMint,
      owner: config,
      tokenProgram: tokenQuoteProgram,
    });

    const ix = await this.program.methods
      .placeBetDbc(...IACoinflip.convertPlaceBetArgs(args))
      .accountsStrict({
        systemProgram: SystemProgram.programId,
        tokenBaseProgram,
        tokenQuoteProgram,
        associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
        user: sender,
        config,
        stats,
        bet,
        baseMint,
        quoteMint,
        userBaseTa,
        appQuoteAta,
        dbcProgram,
        dbcPoolAuthority,
        dbcConfig,
        dbcPool,
        dbcBaseVault,
        dbcQuoteVault,
        dbcEventAuthority,
        vrfProgram,
        vrfNetworkState,
        vrfTreasury,
        vrfRequest,
      })
      .instruction();

    return this.send([ix], txSettings);
  }

  private async tryPlaceBetDamm(
    dammV2Helpers: DammV2Helpers,
    oraoVrfHelpers: OraoVrfHelpers,
    configState: ConfigAccount,
    args: ICoinflip.PlaceBetArgs,
    txSettings: TxSettings = {}
  ): Promise<TxResult> {
    const sender = this.senderKey(txSettings);
    const { baseMint, quoteMint, dammProgram, vrfProgram, dammConfig } =
      configState;

    const [
      {
        config: { treasury: vrfTreasury },
      },
      tokenBaseProgram,
      tokenQuoteProgram,
    ] = await Promise.all([
      oraoVrfHelpers.queryNetworkState(),
      this.getTokenProgram(baseMint),
      this.getTokenProgram(quoteMint),
    ]);

    // PDA
    const [config] = this.pdaConfig();
    const [stats] = this.pdaStats();
    const [bet] = this.pdaBet(sender, args.betNonce);
    const [vrfNetworkState] = oraoVrfHelpers.pdaNetworkState();
    const [vrfRequest] = oraoVrfHelpers.pdaRandomness(bet.toBuffer());
    const [dammPool] = dammV2Helpers.pdaDammV2PoolAddress(
      dammConfig,
      baseMint,
      quoteMint
    );
    const [dammBaseVault] = dammV2Helpers.pdaDammV2TokenVault(
      baseMint,
      dammPool
    );
    const [dammQuoteVault] = dammV2Helpers.pdaDammV2TokenVault(
      quoteMint,
      dammPool
    );
    const [dammPoolAuthority] = dammV2Helpers.pdaDammV2PoolAuthority();
    const [dammEventAuthority] = dammV2Helpers.pdaDammV2EventAuthority();

    // ATA
    const userBaseTa = getAta({
      mint: baseMint,
      owner: sender,
      tokenProgram: tokenBaseProgram,
    });
    const appQuoteAta = getAta({
      mint: quoteMint,
      owner: config,
      tokenProgram: tokenQuoteProgram,
    });

    const ix = await this.program.methods
      .placeBetDamm(...IACoinflip.convertPlaceBetArgs(args))
      .accountsStrict({
        systemProgram: SystemProgram.programId,
        tokenBaseProgram,
        tokenQuoteProgram,
        associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
        user: sender,
        config,
        stats,
        bet,
        baseMint,
        quoteMint,
        userBaseTa,
        appQuoteAta,
        dammProgram,
        dammPoolAuthority,
        dammPool,
        dammBaseVault,
        dammQuoteVault,
        dammEventAuthority,
        vrfProgram,
        vrfNetworkState,
        vrfTreasury,
        vrfRequest,
      })
      .instruction();

    return this.send([ix], txSettings);
  }

  async trySettleBet(
    oraoVrfHelpers: OraoVrfHelpers,
    args: ICoinflip.SettleBetArgs,
    txSettings: TxSettings = {}
  ): Promise<TxResult> {
    const sender = this.senderKey(txSettings);

    const { quoteMint, vrfProgram } = await this.queryConfig();
    const tokenQuoteProgram = await this.getTokenProgram(quoteMint);

    // PDA
    const [config] = this.pdaConfig();
    const [stats] = this.pdaStats();
    const [bet] = this.pdaBet(args.user, args.betNonce);
    const [vrfRequest] = oraoVrfHelpers.pdaRandomness(bet.toBuffer());

    // ATA
    const { ixs: ataIxs, ata: userQuoteTa } = await getOrCreateAtaIxs(
      this.provider,
      sender,
      quoteMint,
      args.user,
      tokenQuoteProgram
    );
    const appQuoteAta = getAta({
      mint: quoteMint,
      owner: config,
      tokenProgram: tokenQuoteProgram,
    });

    const ix = await this.program.methods
      .settleBet(...IACoinflip.convertSettleBetArgs(args))
      .accountsStrict({
        systemProgram: SystemProgram.programId,
        tokenQuoteProgram,
        associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
        sender,
        config,
        stats,
        bet,
        quoteMint,
        userQuoteTa,
        appQuoteAta,
        vrfProgram,
        vrfRequest,
      })
      .instruction();

    return this.send([...ataIxs, ix], txSettings);
  }

  async queryConfig(isDisplayed: boolean = false): Promise<ConfigAccount> {
    const [pda] = this.pdaConfig();
    const [res] = await this.fetchAccounts(ACCOUNT_CONFIG, [pda]);
    return logAndReturn(res, isDisplayed);
  }

  async queryBet(
    user: PublicKey,
    betNonce: number,
    isDisplayed: boolean = false
  ): Promise<BetAccount> {
    const [pda] = this.pdaBet(user, betNonce);
    const [res] = await this.fetchAccounts(ACCOUNT_BET, [pda]);
    return logAndReturn(res, isDisplayed);
  }

  pdaConfig(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(SEED_CONFIG)],
      this.program.programId
    );
  }

  pdaStats(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(SEED_STATS)],
      this.program.programId
    );
  }

  pdaBet(user: PublicKey, betNonce: number): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from(SEED_BET),
        user.toBuffer(),
        numberToRustBuffer(betNonce, "u64"),
      ],
      this.program.programId
    );
  }
}
