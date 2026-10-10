import * as anchor from "@coral-xyz/anchor";
import * as spl from "@solana/spl-token";
import { IHelpers, ResultType, TxSettings } from "../interfaces";
import { IBlockchainProvider, LiteSvmProvider } from "./provider";
import { IdlAccounts } from "@coral-xyz/anchor";
import { Coinflip } from "../schema/types/coinflip";
import { AppToken, getMintByAppToken } from "../config";
import { OraoVrfHelpers } from "./orao-vrf";
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
  numberToRustBuffer,
  withSenderFactory,
} from "../utils";

import * as ICoinflip from "../interfaces/coinflip";
import * as IACoinflip from "../interfaces/coinflip.anchor";
import { DbcHelpers } from "./dbc";

type CoinflipAccount<T extends keyof IdlAccounts<Coinflip>> =
  IdlAccounts<Coinflip>[T];
export type ConfigAccount = CoinflipAccount<"config">;
export type BetAccount = CoinflipAccount<"bet">;

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
        systemProgram: this.SYSTEM_PROGRAM,
        tokenProgram,
        associatedTokenProgram: this.ASSOCIATED_TOKEN_PROGRAM,
        admin: sender,
        config,
        stats,
        quoteMint,
        appQuoteAta,
      })
      .instruction();

    return this.handleTx(signerList, [ix], txSettings);
  }

  async tryPlaceBetDbc(
    dbcHelpers: DbcHelpers,
    oraoVrfHelpers: OraoVrfHelpers,
    args: ICoinflip.PlaceBetArgs,
    txSettings: TxSettings = {}
  ): Promise<ParsedTransactionWithMeta | Ix[] | string> {
    const [_payer, sender] = this.getActors(txSettings);
    const signerList = this.getSigners();

    const [
      { baseMint, quoteMint, dbcProgram, vrfProgram, dbcConfig },
      {
        config: { treasury: vrfTreasury },
      },
    ] = await Promise.all([
      this.queryConfig(),
      oraoVrfHelpers.queryNetworkState(),
    ]);

    const [tokenBaseProgram, tokenQuoteProgram] = await Promise.all([
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
        systemProgram: this.SYSTEM_PROGRAM,
        tokenBaseProgram,
        tokenQuoteProgram,
        associatedTokenProgram: this.ASSOCIATED_TOKEN_PROGRAM,
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

    return this.handleTx(signerList, [ix], txSettings);
  }

  async trySettleBet(
    oraoVrfHelpers: OraoVrfHelpers,
    args: ICoinflip.SettleBetArgs,
    txSettings: TxSettings = {}
  ): Promise<ParsedTransactionWithMeta | Ix[] | string> {
    const [_payer, sender] = this.getActors(txSettings);
    const signerList = this.getSigners();

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
        systemProgram: this.SYSTEM_PROGRAM,
        tokenQuoteProgram,
        associatedTokenProgram: this.ASSOCIATED_TOKEN_PROGRAM,
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

    return this.handleTx(signerList, [...ataIxs, ix], txSettings);
  }

  async queryConfig(isDisplayed: boolean = false): Promise<ConfigAccount> {
    const [pda] = this.pdaConfig();
    const [res] = await this.fetchMultipleAccounts("config", [pda]);
    return logAndReturn(res, isDisplayed);
  }

  async queryBet(
    user: PublicKey,
    betNonce: number,
    isDisplayed: boolean = false
  ): Promise<BetAccount> {
    const [pda] = this.pdaBet(user, betNonce);
    const [res] = await this.fetchMultipleAccounts("bet", [pda]);
    return logAndReturn(res, isDisplayed);
  }

  pdaConfig(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      this.program.programId
    );
  }

  pdaStats(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("stats")],
      this.program.programId
    );
  }

  pdaBet(user: PublicKey, betNonce: number) {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("bet"),
        user.toBuffer(),
        numberToRustBuffer(betNonce, "u64"),
      ],
      this.program.programId
    );
  }
}
