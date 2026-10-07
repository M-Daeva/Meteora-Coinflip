import * as anchor from "@coral-xyz/anchor";
import * as spl from "@solana/spl-token";
import { CpAmm as DammV2 } from "../schema/damm-v2/damm_v2";
import { IHelpers, TxSettings } from "../interfaces";
import { IBlockchainProvider } from "./provider";
import { IdlAccounts } from "@coral-xyz/anchor";
import { PROGRAM } from "../config";
import { getFirstKey, getSecondKey } from "./utils";
import {
  PublicKey,
  TransactionInstruction as Ix,
  ParsedTransactionWithMeta,
  Keypair,
} from "@solana/web3.js";
import {
  fetchMultipleAccountsFactory,
  getActorsFactory,
  getSignersFactory,
  getTokenProgramFactory,
  handleTxFactory,
  logAndReturn,
  withSenderFactory,
} from "../utils";

import * as IDammV2 from "../interfaces/damm-v2";
import * as IADammV2 from "../interfaces/damm-v2.anchor";

const { BN } = anchor;
type BNType = InstanceType<typeof BN>;

type DammV2Account<T extends keyof IdlAccounts<DammV2>> =
  IdlAccounts<DammV2>[T];
export type ConfigAccount = DammV2Account<"config">;
export type BorshFeeTimeSchedulerAccount =
  DammV2Account<"podAlignedFeeTimeScheduler">;

export class DammV2Helpers implements IHelpers {
  private RENT_PROGRAM: PublicKey = anchor.web3.SYSVAR_RENT_PUBKEY;
  private SYSTEM_PROGRAM: PublicKey = anchor.web3.SystemProgram.programId;
  private ASSOCIATED_TOKEN_PROGRAM: PublicKey = spl.ASSOCIATED_TOKEN_PROGRAM_ID;

  public defaultWallet: PublicKey;
  public temporarySender?: Keypair;

  public fetchMultipleAccounts: <T extends keyof IdlAccounts<DammV2>>(
    accountName: T,
    addresses: PublicKey[]
  ) => Promise<IdlAccounts<DammV2>[T][]>;

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
    public program: anchor.Program<DammV2>
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

  async tryCreateOperatorAccount(
    whitelistedAddress: PublicKey,
    permission: BNType,
    txSettings: TxSettings = {}
  ) {
    const [_payer, sender] = this.getActors(txSettings);
    const signerList = this.getSigners();

    // PDA
    const [operator] = this.pdaOperatorAddress(whitelistedAddress);

    const ix = await this.program.methods
      .createOperatorAccount(permission)
      .accountsPartial({
        operator,
        whitelistedAddress,
        signer: sender,
        payer: sender,
        systemProgram: this.SYSTEM_PROGRAM,
      })
      .instruction();

    return this.handleTx(signerList, [ix], txSettings);
  }

  async tryCreateConfig(
    index: BNType,
    args: IDammV2.CreateConfigArgs,
    txSettings: TxSettings = {}
  ): Promise<ParsedTransactionWithMeta | Ix[] | string> {
    const [_payer, sender] = this.getActors(txSettings);
    const signerList = this.getSigners();

    // PDA
    const [config] = this.pdaConfig(index);
    const [operatorPda] = this.pdaOperatorAddress(sender);

    const ix = await this.program.methods
      .createConfig(...IADammV2.convertCreateConfigArgs(args))
      .accountsPartial({
        config,
        operator: operatorPda,
        payer: sender,
        signer: sender,
      })
      .instruction();

    return this.handleTx(signerList, [ix], txSettings);
  }

  async tryCreateDynamicConfig(
    index: BNType,
    args: IDammV2.CreateDynamicConfigArgs,
    txSettings: TxSettings = {}
  ): Promise<ParsedTransactionWithMeta | Ix[] | string> {
    const [_payer, sender] = this.getActors(txSettings);
    const signerList = this.getSigners();

    const [config] = this.pdaConfig(index);
    const [operator] = this.pdaOperatorAddress(sender);

    const ix = await this.program.methods
      .createDynamicConfig(...IADammV2.convertCreateDynamicConfigArgs(args))
      .accountsPartial({
        config,
        operator,
        payer: sender,
        signer: sender,
      })
      .instruction();

    return this.handleTx(signerList, [ix], txSettings);
  }

  async queryConfig(
    index: BNType,
    isDisplayed: boolean = false
  ): Promise<ConfigAccount> {
    const [pda] = this.pdaConfig(index);
    const [res] = await this.fetchMultipleAccounts("config", [pda]);
    return logAndReturn(res, isDisplayed);
  }

  pdaConfig(index: BNType) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("config"), index.toBuffer("le", 8)],
      PROGRAM.DAMM_V2.PROGRAM_ID
    );
  }

  pdaOperatorAddress(whitelistedAddress: PublicKey) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("operator"), whitelistedAddress.toBuffer()],
      PROGRAM.DAMM_V2.PROGRAM_ID
    );
  }

  pdaDammV2PoolAddress(
    dammConfig: PublicKey,
    tokenAMint: PublicKey,
    tokenBMint: PublicKey
  ) {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("pool"),
        dammConfig.toBuffer(),
        getFirstKey(tokenAMint, tokenBMint),
        getSecondKey(tokenAMint, tokenBMint),
      ],
      PROGRAM.DAMM_V2.PROGRAM_ID
    );
  }

  pdaDammV2Position(positionNftMint: PublicKey) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("position"), positionNftMint.toBuffer()],
      PROGRAM.DAMM_V2.PROGRAM_ID
    );
  }

  pdaDammV2PositionNftAccount(positionNftMint: PublicKey) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("position_nft_account"), positionNftMint.toBuffer()],
      PROGRAM.DAMM_V2.PROGRAM_ID
    );
  }

  pdaDammV2PoolAuthority() {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("pool_authority")],
      PROGRAM.DAMM_V2.PROGRAM_ID
    );
  }

  pdaDammV2TokenVault(tokenMint: PublicKey, pool: PublicKey) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("token_vault"), tokenMint.toBuffer(), pool.toBuffer()],
      PROGRAM.DAMM_V2.PROGRAM_ID
    );
  }

  pdaDammV2EventAuthority() {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("__event_authority")],
      PROGRAM.DAMM_V2.PROGRAM_ID
    );
  }
}
