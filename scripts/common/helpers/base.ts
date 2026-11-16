// Base classes for every helper.
import type * as anchor from "@coral-xyz/anchor";
import type { IdlAccounts } from "@coral-xyz/anchor";
import type { PublicKey, TransactionInstruction } from "@solana/web3.js";
import type { TxSettings } from "../interfaces";
import type { IBlockchainProvider } from "../provider/interface";
import { actorKey, type Actor, type SignerLike } from "../signer";
import { handleTx, type TxResult } from "../tx";
import { getTokenProgramFactory } from "../utils";

/** Base for every helper that sends txs. */
export abstract class TxHelpers {
  /** Default authority (admin / worker / user). A PublicKey = signs elsewhere. */
  protected sender: Actor;
  readonly getTokenProgram: (
    mint: PublicKey,
    isToken2022?: boolean
  ) => Promise<PublicKey>;

  constructor(readonly provider: IBlockchainProvider) {
    this.sender = provider.signer;
    this.getTokenProgram = getTokenProgramFactory(provider);
  }

  /** Returns a copy acting as `sender`; the original is untouched. */
  withSender(sender: Actor): this {
    const clone = Object.create(Object.getPrototypeOf(this)) as this;
    return Object.assign(clone, this, { sender });
  }

  /** Authority for one call: settings.executor wins over withSender / default. */
  protected senderKey(settings?: TxSettings): PublicKey {
    return actorKey(settings?.executor ?? this.sender);
  }

  /**
   * Who funds accounts created inside a tx (ATA rent, ALT rent):
   * settings.payer, else the current sender. Same rule as the legacy getActors.
   * Not the fee payer — that's settings.payer ?? provider.signer (see handleTx).
   */
  protected rentPayerKey(settings?: TxSettings): PublicKey {
    return actorKey(settings?.payer ?? this.sender);
  }

  /**
   * @param extraSigners signers this method itself creates (new mint / temp account keypairs).
   * Callers can still add their own via settings.signers.
   */
  protected send(
    instructions: TransactionInstruction[],
    settings: TxSettings = {},
    extraSigners: SignerLike[] = []
  ): Promise<TxResult> {
    return handleTx(this.provider, instructions, settings, [
      this.sender,
      ...extraSigners,
    ]);
  }
}

/** Base for Anchor program helpers. */
export abstract class ProgramHelpers<IDL extends anchor.Idl> extends TxHelpers {
  constructor(
    provider: IBlockchainProvider,
    readonly program: anchor.Program<IDL>
  ) {
    super(provider);
  }

  protected fetchAccounts<T extends keyof IdlAccounts<IDL>>(
    accountName: T,
    addresses: PublicKey[]
  ): Promise<IdlAccounts<IDL>[T][]> {
    return this.provider.fetchMultipleAccounts(
      this.program,
      accountName as string,
      addresses
    );
  }
}
