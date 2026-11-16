// Generic (non-program) chain actions.
// Everything goes through IBlockchainProvider: no LiteSVM / RPC branches.
import * as spl from "@solana/spl-token";
import { Buffer } from "buffer";
import { TxHelpers } from "./base";
import { ALT, BPF_LOADER_UPGRADEABLE, Cluster } from "../config";
import type { QuerySettings, TxSettings } from "../interfaces";
import type { TxResult } from "../tx";
import {
  getAta,
  getAtomicsAmount,
  getDecimals,
  getOrCreateAtaIxs,
  logAndReturn,
  numberFrom,
} from "../utils";
import {
  type AccountInfo,
  type ParsedTransactionWithMeta,
  AddressLookupTableAccount,
  AddressLookupTableProgram,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";

const SOL_DECIMALS = 9;
const MAX_ADDRESSES_PER_EXTEND = 30;

export class ChainHelpers extends TxHelpers {
  async requestAirdrop(
    amount: number | bigint,
    publicKey: PublicKey
  ): Promise<string> {
    return this.provider.requestAirdrop(
      publicKey,
      getAtomicsAmount(amount, SOL_DECIMALS)
    );
  }

  /** Requires txSettings.isToken2022. Mint + freeze authority = sender. */
  async createMint(
    mintKeypair: Keypair,
    decimals: number,
    extensions: spl.ExtensionType[],
    txSettings: TxSettings = {}
  ): Promise<TxResult> {
    const { isToken2022 } = txSettings;
    if (isToken2022 === undefined) {
      throw new Error("Token program isn't specified");
    }

    const sender = this.senderKey(txSettings);
    const mint = mintKeypair.publicKey;
    const tokenProgram = isToken2022
      ? spl.TOKEN_2022_PROGRAM_ID
      : spl.TOKEN_PROGRAM_ID;
    const space = isToken2022 ? spl.getMintLen(extensions) : spl.MINT_SIZE;
    const lamports = await this.provider.getRentExempt(space);

    const ixs: TransactionInstruction[] = [
      SystemProgram.createAccount({
        fromPubkey: sender,
        newAccountPubkey: mint,
        space,
        lamports,
        programId: tokenProgram,
      }),
    ];

    // Token-2022 extensions must be initialized BEFORE InitializeMint
    if (isToken2022) {
      for (const extension of extensions) {
        if (extension === spl.ExtensionType.TransferFeeConfig) {
          ixs.push(
            spl.createInitializeTransferFeeConfigInstruction(
              mint,
              sender, // transfer fee admin
              sender, // withdraw authority
              100, // 1% fee (100 basis points)
              BigInt(1_000_000 * 10 ** decimals), // max fee
              tokenProgram
            )
          );
        }
        // TODO: Add more extension cases as needed (e.g., MetadataPointer, GroupConfig)
      }
    }

    ixs.push(
      isToken2022
        ? spl.createInitializeMint2Instruction(
            mint,
            decimals,
            sender,
            sender,
            tokenProgram
          )
        : spl.createInitializeMintInstruction(
            mint,
            decimals,
            sender,
            sender,
            tokenProgram
          )
    );

    return this.send(ixs, txSettings, [mintKeypair]);
  }

  /** Sends a create-ATA tx if missing; otherwise returns the ATA address. */
  async getOrCreateAta(
    mint: PublicKey,
    owner: PublicKey,
    txSettings: TxSettings = {}
  ): Promise<TxResult | PublicKey> {
    const tokenProgram = await this.getTokenProgram(
      mint,
      txSettings.isToken2022
    );
    const { ata, ixs } = await getOrCreateAtaIxs(
      this.provider,
      this.rentPayerKey(txSettings),
      mint,
      owner,
      tokenProgram
    );

    if (ixs.length) {
      return this.send(ixs, txSettings);
    }

    return logAndReturn(ata, txSettings.isDisplayed);
  }

  /** Mint authority = sender. */
  async mintTokens(
    amount: number | bigint,
    mint: PublicKey,
    recipient: PublicKey,
    txSettings: TxSettings = {}
  ): Promise<TxResult> {
    const sender = this.senderKey(txSettings);
    const tokenProgram = await this.getTokenProgram(
      mint,
      txSettings.isToken2022
    );

    const [{ ata, ixs }, decimals] = await Promise.all([
      getOrCreateAtaIxs(
        this.provider,
        this.rentPayerKey(txSettings),
        mint,
        recipient,
        tokenProgram
      ),
      getDecimals(this.provider, mint, tokenProgram),
    ]);

    ixs.push(
      spl.createMintToCheckedInstruction(
        mint,
        ata,
        sender,
        getAtomicsAmount(amount, decimals),
        decimals,
        undefined,
        tokenProgram
      )
    );

    return this.send(ixs, txSettings);
  }

  async transferSol(
    amount: number | bigint,
    to: PublicKey,
    txSettings: TxSettings = {}
  ): Promise<TxResult> {
    const ix = SystemProgram.transfer({
      fromPubkey: this.senderKey(txSettings),
      toPubkey: to,
      lamports: getAtomicsAmount(amount, SOL_DECIMALS),
    });

    return this.send([ix], txSettings);
  }

  /** Authority = sender: the owner of `from`, or a delegate approved on it. */
  async transferTokens(
    amount: number | bigint,
    mint: PublicKey,
    from: PublicKey,
    to: PublicKey,
    txSettings: TxSettings = {}
  ): Promise<TxResult> {
    const sender = this.senderKey(txSettings);
    const rentPayer = this.rentPayerKey(txSettings);
    const tokenProgram = await this.getTokenProgram(
      mint,
      txSettings.isToken2022
    );

    const [infoFrom, infoTo, decimals] = await Promise.all([
      getOrCreateAtaIxs(this.provider, rentPayer, mint, from, tokenProgram),
      getOrCreateAtaIxs(this.provider, rentPayer, mint, to, tokenProgram),
      getDecimals(this.provider, mint, tokenProgram),
    ]);

    const ixs: TransactionInstruction[] = [
      ...infoFrom.ixs,
      ...infoTo.ixs,
      spl.createTransferCheckedInstruction(
        infoFrom.ata,
        mint,
        infoTo.ata,
        sender,
        getAtomicsAmount(amount, decimals),
        decimals,
        undefined,
        tokenProgram
      ),
    ];

    return this.send(ixs, txSettings);
  }

  /** Approves `spender` on the sender's ATA. */
  async approveToken(
    amount: number | bigint,
    mint: PublicKey,
    spender: PublicKey,
    txSettings: TxSettings = {}
  ): Promise<TxResult> {
    const sender = this.senderKey(txSettings);
    const tokenProgram = await this.getTokenProgram(
      mint,
      txSettings.isToken2022
    );

    const [{ ata, ixs }, decimals] = await Promise.all([
      getOrCreateAtaIxs(
        this.provider,
        this.rentPayerKey(txSettings),
        mint,
        sender,
        tokenProgram
      ),
      getDecimals(this.provider, mint, tokenProgram),
    ]);

    ixs.push(
      spl.createApproveCheckedInstruction(
        ata,
        mint,
        spender,
        sender,
        getAtomicsAmount(amount, decimals),
        decimals,
        undefined,
        tokenProgram
      )
    );

    return this.send(ixs, txSettings);
  }

  async revokeTokenApproval(
    mint: PublicKey,
    txSettings: TxSettings = {}
  ): Promise<TxResult> {
    const sender = this.senderKey(txSettings);
    const tokenProgram = await this.getTokenProgram(
      mint,
      txSettings.isToken2022
    );

    const { ata, ixs } = await getOrCreateAtaIxs(
      this.provider,
      this.rentPayerKey(txSettings),
      mint,
      sender,
      tokenProgram
    );

    ixs.push(spl.createRevokeInstruction(ata, sender, undefined, tokenProgram));

    return this.send(ixs, txSettings);
  }

  async wrapSol(
    amount: number | bigint,
    txSettings: TxSettings = {}
  ): Promise<TxResult> {
    const sender = this.senderKey(txSettings);

    const { ata: wsolAta, ixs } = await getOrCreateAtaIxs(
      this.provider,
      this.rentPayerKey(txSettings),
      spl.NATIVE_MINT,
      sender,
      spl.TOKEN_PROGRAM_ID
    );

    ixs.push(
      SystemProgram.transfer({
        fromPubkey: sender,
        toPubkey: wsolAta,
        lamports: getAtomicsAmount(amount, SOL_DECIMALS),
      }),
      spl.createSyncNativeInstruction(wsolAta, spl.TOKEN_PROGRAM_ID)
    );

    return this.send(ixs, txSettings);
  }

  /**
   * No amount → close the WSOL ATA (unwrap everything).
   * With amount → move it to a temp account and close that one.
   */
  async unwrapSol(
    amount?: number | bigint,
    txSettings: TxSettings = {}
  ): Promise<TxResult> {
    const sender = this.senderKey(txSettings);
    const wsolAta = getAta({
      mint: spl.NATIVE_MINT,
      owner: sender,
      tokenProgram: spl.TOKEN_PROGRAM_ID,
    });

    if (!(await this.provider.getAccountInfo(wsolAta))) {
      throw new Error("No WSOL account found to unwrap");
    }

    const amountToUnwrap =
      amount !== undefined
        ? getAtomicsAmount(amount, SOL_DECIMALS)
        : await this.getAtaBalance(sender, spl.NATIVE_MINT, {
            tokenProgram: spl.TOKEN_PROGRAM_ID,
            isAtomic: true,
          });

    if (amountToUnwrap <= 0) {
      throw new Error("No WSOL balance to unwrap");
    }

    if (amount === undefined) {
      const ix = spl.createCloseAccountInstruction(
        wsolAta,
        sender,
        sender,
        undefined,
        spl.TOKEN_PROGRAM_ID
      );
      return this.send([ix], txSettings);
    }

    const tempAccount = Keypair.generate();
    const rentLamports = await this.provider.getRentExempt(spl.ACCOUNT_SIZE);

    const ixs: TransactionInstruction[] = [
      SystemProgram.createAccount({
        fromPubkey: sender,
        newAccountPubkey: tempAccount.publicKey,
        space: spl.ACCOUNT_SIZE,
        lamports: rentLamports,
        programId: spl.TOKEN_PROGRAM_ID,
      }),
      spl.createInitializeAccountInstruction(
        tempAccount.publicKey,
        spl.NATIVE_MINT,
        sender,
        spl.TOKEN_PROGRAM_ID
      ),
      spl.createTransferCheckedInstruction(
        wsolAta,
        spl.NATIVE_MINT,
        tempAccount.publicKey,
        sender,
        amountToUnwrap,
        SOL_DECIMALS,
        undefined,
        spl.TOKEN_PROGRAM_ID
      ),
      spl.createCloseAccountInstruction(
        tempAccount.publicKey,
        sender,
        sender,
        undefined,
        spl.TOKEN_PROGRAM_ID
      ),
    ];

    return this.send(ixs, txSettings, [tempAccount]);
  }

  /** `owner` must sign: be the sender, or pass it in txSettings.signers. */
  async closeAta(
    ata: PublicKey,
    balance: number,
    tokenProgram: PublicKey,
    mint: PublicKey,
    owner: PublicKey, // The owner of the ATA to close
    recipient: PublicKey, // Where to send the lamports/SOL
    txSettings: TxSettings = {}
  ): Promise<TxResult> {
    const ixs: TransactionInstruction[] = [];

    if (mint.equals(spl.NATIVE_MINT)) {
      // Unwrapped SOL goes to owner first
      ixs.push(
        spl.createCloseAccountInstruction(
          ata,
          owner,
          owner,
          undefined,
          tokenProgram
        )
      );

      if (!recipient.equals(owner)) {
        ixs.push(
          SystemProgram.transfer({
            fromPubkey: owner,
            toPubkey: recipient,
            lamports: balance,
          })
        );
      }
    } else if (!balance) {
      // Rent refund goes to recipient
      ixs.push(
        spl.createCloseAccountInstruction(
          ata,
          recipient,
          owner,
          undefined,
          tokenProgram
        )
      );
    }

    return this.send(ixs, txSettings);
  }

  /** `bufferAuthority` must sign: be the sender, or pass it in txSettings.signers. */
  async tryCloseBuffer(
    bufferAddress: PublicKey,
    recipientAddress: PublicKey,
    bufferAuthority: PublicKey,
    txSettings: TxSettings = {}
  ): Promise<TxResult> {
    const ix = createCloseBufferInstruction(
      bufferAddress,
      recipientAddress,
      bufferAuthority
    );
    return this.send([ix], txSettings);
  }

  async getBalance(
    owner: PublicKey,
    querySettings: QuerySettings = {}
  ): Promise<number> {
    const { isAtomic = true, isDisplayed } = querySettings;

    const balance = await this.provider.getCoinBalance(owner);
    const res = isAtomic ? balance : balance / LAMPORTS_PER_SOL;

    return logAndReturn(res, isDisplayed);
  }

  async getAtaBalance(
    owner: PublicKey,
    mint: PublicKey,
    querySettings: QuerySettings = {}
  ): Promise<number> {
    const tokenProgram = await this.resolveTokenProgram(mint, querySettings);
    const ata = getAta({ mint, owner, tokenProgram });
    return this.getTokenAccountBalance(ata, querySettings);
  }

  async getTokenAccountBalance(
    tokenAccount: PublicKey,
    querySettings: QuerySettings = {}
  ): Promise<number> {
    const { isAtomic = true, isDisplayed } = querySettings;

    const [atomicsAmount, uiAmount] =
      await this.provider.getTokenAccountBalance(tokenAccount);

    return logAndReturn(isAtomic ? atomicsAmount : uiAmount, isDisplayed);
  }

  async getTokenApproval(
    owner: PublicKey,
    mint: PublicKey,
    querySettings: QuerySettings = {}
  ): Promise<{ spender: PublicKey; amount: number }> {
    const { isAtomic = true, isDisplayed } = querySettings;

    const tokenProgram = await this.resolveTokenProgram(mint, querySettings);
    const ata = getAta({ mint, owner, tokenProgram });
    const account = await this.provider.getAccountInfo(ata);

    if (!account) {
      return logAndReturn(
        { spender: PublicKey.default, amount: 0 },
        isDisplayed
      );
    }

    const { delegate, delegatedAmount } = spl.unpackAccount(
      ata,
      account,
      tokenProgram
    );
    const decimals = await getDecimals(this.provider, mint, tokenProgram);

    const amount = isAtomic
      ? Number(delegatedAmount)
      : numberFrom(delegatedAmount)
          .div(10 ** decimals)
          .toNumber();

    return logAndReturn(
      { spender: delegate ?? PublicKey.default, amount },
      isDisplayed
    );
  }

  async getTx(
    signature: string,
    isDisplayed = false
  ): Promise<ParsedTransactionWithMeta | null> {
    return logAndReturn(
      await this.provider.getTransaction(signature),
      isDisplayed
    );
  }

  /**
   * Creates a new ALT (if `altAddress` is missing or doesn't exist) and extends it.
   * ALT authority defaults to the sender; rent is paid by rentPayerKey.
   */
  async createOrExtendAlt(
    addresses: PublicKey[],
    altAddress?: PublicKey,
    authority?: PublicKey,
    txSettings: TxSettings = {}
  ): Promise<{ altAddress: PublicKey; result: TxResult }> {
    const payer = this.rentPayerKey(txSettings);
    const altAuthority = authority ?? this.senderKey(txSettings);
    const ixs: TransactionInstruction[] = [];

    const accountInfo = altAddress
      ? await this.provider.getAccountInfo(altAddress)
      : null;

    let finalAltAddress = altAddress ?? PublicKey.default;
    if (!accountInfo) {
      const [createAltIx, newAltAddress] =
        AddressLookupTableProgram.createLookupTable({
          authority: altAuthority,
          payer,
          recentSlot: await this.provider.getSlot(),
        });

      ixs.push(createAltIx);
      finalAltAddress = newAltAddress;
    }

    for (let i = 0; i < addresses.length; i += MAX_ADDRESSES_PER_EXTEND) {
      ixs.push(
        AddressLookupTableProgram.extendLookupTable({
          lookupTable: finalAltAddress,
          authority: altAuthority,
          payer,
          addresses: addresses.slice(i, i + MAX_ADDRESSES_PER_EXTEND),
        })
      );
    }

    const result = await this.send(ixs, txSettings);
    logAndReturn(
      { altAddress: finalAltAddress.toBase58() },
      txSettings.isDisplayed
    );

    return { altAddress: finalAltAddress, result };
  }

  async getAlt(
    altAddress: PublicKey,
    isDisplayed?: boolean
  ): Promise<AddressLookupTableAccount | null> {
    const accountInfo = await this.provider.getAccountInfo(altAddress);

    const alt = accountInfo
      ? new AddressLookupTableAccount({
          key: altAddress,
          state: AddressLookupTableAccount.deserialize(accountInfo.data),
        })
      : null;

    return logAndReturn(alt, isDisplayed);
  }

  async getAccountInfo(
    address: PublicKey
  ): Promise<AccountInfo<Buffer> | null> {
    return this.provider.getAccountInfo(address);
  }

  private resolveTokenProgram(
    mint: PublicKey,
    { tokenProgram }: QuerySettings
  ): Promise<PublicKey> {
    return tokenProgram
      ? Promise.resolve(new PublicKey(tokenProgram))
      : this.getTokenProgram(mint);
  }
}

/**
 * BPF Loader Upgradeable "Close" instruction (tag = 5)
 * Accounts:
 *   0. [writable] buffer account to close
 *   1. [writable] recipient of reclaimed lamports
 *   2. [signer]   buffer authority
 */
function createCloseBufferInstruction(
  bufferAddress: PublicKey,
  recipientAddress: PublicKey,
  bufferAuthority: PublicKey
): TransactionInstruction {
  const data = Buffer.alloc(4);
  data.writeUInt32LE(5, 0);

  return new TransactionInstruction({
    programId: BPF_LOADER_UPGRADEABLE,
    keys: [
      { pubkey: bufferAddress, isSigner: false, isWritable: true },
      { pubkey: recipientAddress, isSigner: false, isWritable: true },
      { pubkey: bufferAuthority, isSigner: true, isWritable: false },
    ],
    data,
  });
}

export function getAltKeys(cluster: Cluster): PublicKey[] {
  switch (cluster) {
    case Cluster.Mainnet:
      return [ALT.MAINNET];
    case Cluster.Devnet:
      return [ALT.DEVNET];
    default:
      return [ALT.LOCALNET];
  }
}

export async function getAltData(chain: ChainHelpers, cluster: Cluster) {
  const altAddressList = getAltKeys(cluster);
  const res = await Promise.all(altAddressList.map((x) => chain.getAlt(x)));
  const altAccountList = res.filter((x): x is AddressLookupTableAccount => !!x);

  return { altAddressList, altAccountList };
}
