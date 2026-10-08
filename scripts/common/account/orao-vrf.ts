import * as anchor from "@coral-xyz/anchor";
import * as spl from "@solana/spl-token";
import { OraoVrf } from "../schema/orao-vrf/orao_vrf";
import { IHelpers, TxSettings } from "../interfaces";
import { IBlockchainProvider } from "./provider";
import { IdlAccounts } from "@coral-xyz/anchor";
import { PROGRAM } from "../config";
import {
  PublicKey,
  TransactionInstruction as Ix,
  ParsedTransactionWithMeta,
  Keypair,
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

import * as IOraoVrf from "../interfaces/orao-vrf";
import * as IAOraoVrf from "../interfaces/orao-vrf.anchor";

const { BN } = anchor;
type BNType = InstanceType<typeof BN>;

type OraoVrfAccount<T extends keyof IdlAccounts<OraoVrf>> =
  IdlAccounts<OraoVrf>[T];
export type NetworkStateAccount = OraoVrfAccount<"networkState">;

export class OraoVrfHelpers implements IHelpers {
  private RENT_PROGRAM: PublicKey = anchor.web3.SYSVAR_RENT_PUBKEY;
  private SYSTEM_PROGRAM: PublicKey = anchor.web3.SystemProgram.programId;
  private ASSOCIATED_TOKEN_PROGRAM: PublicKey = spl.ASSOCIATED_TOKEN_PROGRAM_ID;

  public defaultWallet: PublicKey;
  public temporarySender?: Keypair;

  public fetchMultipleAccounts: <T extends keyof IdlAccounts<OraoVrf>>(
    accountName: T,
    addresses: PublicKey[]
  ) => Promise<IdlAccounts<OraoVrf>[T][]>;

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
    public program: anchor.Program<OraoVrf>
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

  async tryInitNetwork(
    args: IOraoVrf.InitNetworkArgs,
    txSettings: TxSettings = {}
  ): Promise<ParsedTransactionWithMeta | Ix[] | string> {
    const [_payer, sender] = this.getActors(txSettings);
    const signerList = this.getSigners();

    // PDA
    const [networkState] = this.pdaNetworkState();

    const ix = await this.program.methods
      .initNetwork(...IAOraoVrf.convertInitNetworkArgs(args))
      .accountsPartial({
        systemProgram: this.SYSTEM_PROGRAM,
        payer: sender,
        networkState,
        treasury: sender,
      })
      .instruction();

    return this.handleTx(signerList, [ix], txSettings);
  }

  async queryNetworkState(
    isDisplayed: boolean = false
  ): Promise<NetworkStateAccount> {
    const [pda] = this.pdaNetworkState();
    const [res] = await this.fetchMultipleAccounts("networkState", [pda]);
    return logAndReturn(res, isDisplayed);
  }

  pdaNetworkState() {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("orao-vrf-network-configuration")],
      PROGRAM.ORAO_VRF.PROGRAM_ID
    );
  }
}
