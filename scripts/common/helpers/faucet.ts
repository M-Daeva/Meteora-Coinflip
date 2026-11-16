import * as spl from "@solana/spl-token";
import { type Faucet } from "../schema/types/faucet";
import type { TxSettings } from "../interfaces";
import type { TxResult } from "../tx";
import { logAndReturn } from "../utils/log";
import { ProgramHelpers } from "./base";
import type { IdlAccounts } from "@coral-xyz/anchor";
import { getAta, getOrCreateAtaIxs } from "../utils";
import { PublicKey, SystemProgram } from "@solana/web3.js";

import * as IFaucet from "../interfaces/faucet";
import * as IAFaucet from "../interfaces/faucet.anchor";

const ACCOUNT_CONFIG = "config";
const ACCOUNT_USER = "user";

const SEED_CONFIG = "config";
const SEED_USER = "user";

type FaucetAccount<T extends keyof IdlAccounts<Faucet>> =
  IdlAccounts<Faucet>[T];
export type FaucetConfigAccount = FaucetAccount<typeof ACCOUNT_CONFIG>;
export type UserAccount = FaucetAccount<typeof ACCOUNT_USER>;

export class FaucetHelpers extends ProgramHelpers<Faucet> {
  async tryInit(
    mint: PublicKey,
    args: IFaucet.InitArgs,
    txSettings: TxSettings = {}
  ): Promise<TxResult> {
    const tokenProgram = await this.getTokenProgram(mint);

    // PDA
    const [config] = this.pdaConfig();

    // ATA
    const appAta = getAta({
      mint,
      owner: config,
      tokenProgram,
    });

    const ix = await this.program.methods
      .init(...IAFaucet.convertInitArgs(args))
      .accountsStrict({
        systemProgram: SystemProgram.programId,
        tokenProgram,
        associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
        admin: this.senderKey(txSettings),
        config,
        mint,
        appAta,
      })
      .instruction();

    return this.send([ix], txSettings);
  }

  async tryClaim(txSettings: TxSettings = {}): Promise<TxResult> {
    const sender = this.senderKey(txSettings);

    const { mint } = await this.queryConfig();
    const tokenProgram = await this.getTokenProgram(mint);

    // PDA
    const [config] = this.pdaConfig();
    const [user] = this.pdaUser(sender);

    // ATA
    const { ixs: ataIxs, ata: userTa } = await getOrCreateAtaIxs(
      this.provider,
      sender,
      mint,
      sender,
      tokenProgram
    );
    const appAta = getAta({
      mint,
      owner: config,
      tokenProgram,
    });

    const ix = await this.program.methods
      .claim(...IAFaucet.convertClaimArgs({}))
      .accountsStrict({
        systemProgram: SystemProgram.programId,
        tokenProgram,
        associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
        sender,
        config,
        user,
        mint,
        userTa,
        appAta,
      })
      .instruction();

    return this.send([...ataIxs, ix], txSettings);
  }

  async queryConfig(
    isDisplayed: boolean = false
  ): Promise<FaucetConfigAccount> {
    const [pda] = this.pdaConfig();
    const [res] = await this.fetchAccounts(ACCOUNT_CONFIG, [pda]);
    return logAndReturn(res, isDisplayed);
  }

  async queryUser(
    user: PublicKey,
    isDisplayed: boolean = false
  ): Promise<UserAccount> {
    const [pda] = this.pdaUser(user);
    const [res] = await this.fetchAccounts(ACCOUNT_USER, [pda]);
    return logAndReturn(res, isDisplayed);
  }

  pdaConfig(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(SEED_CONFIG)],
      this.program.programId
    );
  }

  pdaUser(user: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(SEED_USER), user.toBuffer()],
      this.program.programId
    );
  }
}
