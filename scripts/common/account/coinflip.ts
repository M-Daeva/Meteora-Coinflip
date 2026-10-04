import * as anchor from "@coral-xyz/anchor";
import * as spl from "@solana/spl-token";
import { IHelpers, ResultType, TxSettings } from "../interfaces";
import { IBlockchainProvider, LiteSvmProvider } from "./provider";
import { IdlAccounts } from "@coral-xyz/anchor";
import { Coinflip } from "../schema/types/coinflip";
import { AppToken, getMintByAppToken } from "../config";
import {
  PublicKey,
  TransactionInstruction as Ix,
  ParsedTransactionWithMeta,
  Keypair,
} from "@solana/web3.js";
import {
  fetchMultipleAccountsFactory,
  getActorsFactory,
  getAta,
  getOrCreateAtaIxs,
  getSignersFactory,
  getTokenProgramFactory,
  handleTxFactory,
  li,
  logAndReturn,
  withSenderFactory,
} from "../utils";

import * as ICoinflip from "../interfaces/coinflip";
import * as IACoinflip from "../interfaces/coinflip.anchor";

type CoinflipAccount<T extends keyof IdlAccounts<Coinflip>> =
  IdlAccounts<Coinflip>[T];
export type ConfigAccount = CoinflipAccount<"config">;

export class CoinflipHelpers implements IHelpers {
  private SYSTEM_PROGRAM: PublicKey = anchor.web3.SystemProgram.programId;
  private ASSOCIATED_TOKEN_PROGRAM: PublicKey = spl.ASSOCIATED_TOKEN_PROGRAM_ID;

  public defaultWallet: PublicKey;
  public temporarySender?: Keypair;

  public fetchMultipleAccounts: <T extends keyof IdlAccounts<Coinflip>>(
    accountName: T,
    addresses: PublicKey[]
  ) => Promise<IdlAccounts<Coinflip>[T][]>;

  private handleTx: (
    signerList: Keypair[],
    instructions: Ix[],
    txSettings: TxSettings
  ) => Promise<ParsedTransactionWithMeta | Ix[] | string>;

  getTokenProgram: (
    mint: PublicKey,
    isToken2022?: boolean
  ) => Promise<PublicKey>;

  public withSender: (sender: Keypair) => this;
  private getActors: (txSettings: TxSettings) => [PublicKey, PublicKey];
  private getSigners: (...additionalSigners: Keypair[]) => Keypair[];

  constructor(
    public provider: IBlockchainProvider,
    public program: anchor.Program<Coinflip>
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

  async tryInit(
    args: ICoinflip.InitArgs,
    txSettings: TxSettings = {}
  ): Promise<ParsedTransactionWithMeta | Ix[] | string> {
    const [_payer, sender] = this.getActors(txSettings);
    const signerList = this.getSigners();

    // PDA
    const [config] = this.pdaConfig();

    const ix = await this.program.methods
      .init(...IACoinflip.convertInitArgs(args))
      .accountsStrict({
        systemProgram: this.SYSTEM_PROGRAM,
        admin: sender,
        config,
      })
      .instruction();

    return this.handleTx(signerList, [ix], txSettings);
  }

  async queryConfig(isDisplayed: boolean = false): Promise<ConfigAccount> {
    const [pda] = this.pdaConfig();
    const [res] = await this.fetchMultipleAccounts("config", [pda]);
    return logAndReturn(res, isDisplayed);
  }

  pdaConfig(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      this.program.programId
    );
  }
}
