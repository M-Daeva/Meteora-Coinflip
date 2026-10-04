import * as spl from "@solana/spl-token";
import { IHelpers, QuerySettings, TxSettings } from "../interfaces";
import { ADDRESS, Cluster } from "../config";
import {
  IBlockchainProvider,
  LiteSvmProvider,
  RealBlockchainProvider,
} from "./provider";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction as Ix,
  TransactionSignature,
  ParsedTransactionWithMeta,
  LAMPORTS_PER_SOL,
  AddressLookupTableProgram,
  AddressLookupTableAccount,
  AccountInfo,
} from "@solana/web3.js";
import {
  getAta,
  getOrCreateAtaIxs,
  getAtomicsAmount,
  getTokenProgramFactory,
  getTx,
  handleTxFactory,
  logAndReturn,
  numberFrom,
  withSenderFactory,
  getActorsFactory,
  getSignersFactory,
  getDecimals,
  li,
} from "../utils";

const BPF_LOADER_UPGRADEABLE_PROGRAM_ID = new PublicKey(
  "BPFLoaderUpgradeab1e11111111111111111111111"
);

const SOL_DECIMALS = 9;

export class ChainHelpers implements IHelpers {
  public defaultWallet: PublicKey;
  public temporarySender?: Keypair;

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

  constructor(private provider: IBlockchainProvider) {
    this.defaultWallet = provider.wallet.publicKey;
    this.provider = provider;
    this.handleTx = handleTxFactory(provider);
    this.getTokenProgram = getTokenProgramFactory(provider);
    this.withSender = withSenderFactory();
    this.getActors = getActorsFactory();
    this.getSigners = getSignersFactory();
  }

  async requestAirdrop(
    amount: number | bigint,
    publicKey: PublicKey
  ): Promise<TransactionSignature> {
    return this.provider.requestAirdrop(
      publicKey,
      getAtomicsAmount(amount, SOL_DECIMALS)
    );
  }

  async createMint(
    mintKeypair: Keypair,
    decimals: number,
    extensions: spl.ExtensionType[],
    txSettings: TxSettings = {}
  ): Promise<ParsedTransactionWithMeta | Ix[] | string> {
    const [_payer, sender] = this.getActors(txSettings);
    const signerList = this.getSigners(mintKeypair);

    // Validate token program
    if (typeof txSettings?.isToken2022 === "undefined") {
      throw new Error("Token program isn't specified");
    }

    // Calculate mint account size based on extensions for Token-2022
    const space = txSettings?.isToken2022
      ? spl.getMintLen(extensions)
      : spl.MINT_SIZE;

    // Calculate rent-exempt balance
    const rent = await this.provider.getRentExempt(space);

    const tokenProgram = txSettings?.isToken2022
      ? spl.TOKEN_2022_PROGRAM_ID
      : spl.TOKEN_PROGRAM_ID;

    const ixs: Ix[] = [
      // Create mint account
      SystemProgram.createAccount({
        fromPubkey: sender,
        newAccountPubkey: mintKeypair.publicKey,
        space,
        lamports: rent,
        programId: tokenProgram,
      }),
    ];

    // Initialize mint based on token program
    if (txSettings?.isToken2022) {
      // Use createInitializeMint2Instruction for Token-2022 (supports immutable ownership)
      ixs.push(
        spl.createInitializeMint2Instruction(
          mintKeypair.publicKey,
          decimals,
          sender, // mint authority
          sender, // freeze authority (null to disable)
          tokenProgram
        )
      );
    } else {
      // Use createInitializeMintInstruction for SPL Token
      ixs.push(
        spl.createInitializeMintInstruction(
          mintKeypair.publicKey,
          decimals,
          sender, // mint authority
          sender, // freeze authority (null to disable)
          tokenProgram
        )
      );
    }

    // Add extension initialization instructions for Token-2022
    if (txSettings?.isToken2022 && extensions.length > 0) {
      for (const extension of extensions) {
        // Handle specific extensions
        if (extension === spl.ExtensionType.TransferFeeConfig) {
          ixs.push(
            spl.createInitializeTransferFeeConfigInstruction(
              mintKeypair.publicKey,
              sender, // transfer fee admin
              sender, // withdraw authority
              100, // 1% fee (100 basis points)
              BigInt(1000000 * 10 ** decimals), // max fee
              tokenProgram
            )
          );
        }
        // TODO: Add more extension cases as needed (e.g., MetadataPointer, GroupConfig)
      }
    }

    return this.handleTx(signerList, ixs, txSettings);
  }

  async getOrCreateAta(
    mintPubkey: PublicKey,
    ownerPubkey: PublicKey,
    txSettings: TxSettings = {}
  ) {
    const [payer, _sender] = this.getActors(txSettings);
    const signerList = this.getSigners();

    const tokenProgram = await this.getTokenProgram(
      mintPubkey,
      txSettings?.isToken2022
    );

    const { ata, ixs } = await getOrCreateAtaIxs(
      this.provider,
      payer,
      mintPubkey,
      ownerPubkey,
      tokenProgram
    );

    if (ixs.length) {
      return this.handleTx(signerList, ixs, txSettings);
    }

    return logAndReturn(ata, txSettings.isDisplayed);
  }

  async mintTokens(
    amount: number | bigint,
    mint: PublicKey,
    recipient: PublicKey,
    txSettings: TxSettings = {}
  ): Promise<ParsedTransactionWithMeta | Ix[] | string> {
    const [payer, sender] = this.getActors(txSettings);
    const signerList = this.getSigners();

    const tokenProgram = await this.getTokenProgram(
      mint,
      txSettings?.isToken2022
    );

    let { ata, ixs } = await getOrCreateAtaIxs(
      this.provider,
      payer,
      mint,
      recipient,
      tokenProgram
    );

    // Get decimals
    let decimals: number;
    if (this.provider instanceof LiteSvmProvider) {
      const account = await this.provider.getAccountInfo(mint);
      if (!account) {
        throw new Error("Mint account not found");
      }
      // Parse mint data to get decimals (simplified)
      decimals = account.data[44]; // Decimals is at offset 44 in mint account
    } else {
      const mintInfo = await spl.getMint(
        this.provider.connection,
        mint,
        undefined,
        tokenProgram
      );
      decimals = mintInfo.decimals;
    }

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

    return this.handleTx(signerList, ixs, txSettings);
  }

  async transferSol(
    amount: number | bigint,
    to: PublicKey,
    txSettings: TxSettings = {}
  ): Promise<ParsedTransactionWithMeta | Ix[] | string> {
    const [_payer, sender] = this.getActors(txSettings);
    const signerList = this.getSigners();

    const ixs: Ix[] = [
      SystemProgram.transfer({
        fromPubkey: sender,
        toPubkey: to,
        lamports: getAtomicsAmount(amount, SOL_DECIMALS),
      }),
    ];

    return this.handleTx(signerList, ixs, txSettings);
  }

  async transferTokens(
    amount: number | bigint,
    mint: PublicKey,
    from: PublicKey,
    to: PublicKey,
    txSettings: TxSettings = {}
  ): Promise<ParsedTransactionWithMeta | Ix[] | string> {
    const [payer, sender] = this.getActors(txSettings);
    const signerList = this.getSigners();

    const tokenProgram = await this.getTokenProgram(
      mint,
      txSettings?.isToken2022
    );

    let ixs: Ix[] = [];

    const [infoFrom, infoTo] = await Promise.all(
      [from, to].map((owner) =>
        getOrCreateAtaIxs(this.provider, payer, mint, owner, tokenProgram)
      )
    );
    ixs.push(...infoFrom.ixs, ...infoTo.ixs);

    // Get decimals
    let decimals: number;
    if (this.provider instanceof LiteSvmProvider) {
      const account = await this.provider.getAccountInfo(mint);
      decimals = account!.data[44];
    } else {
      const mintInfo = await spl.getMint(
        this.provider.connection,
        mint,
        undefined,
        tokenProgram
      );
      decimals = mintInfo.decimals;
    }

    // Determine the authority: if sender is different from 'from', sender is a delegate
    const authority = sender.equals(from) ? from : sender;

    ixs.push(
      spl.createTransferCheckedInstruction(
        infoFrom.ata,
        mint,
        infoTo.ata,
        authority,
        getAtomicsAmount(amount, decimals),
        decimals,
        undefined,
        tokenProgram
      )
    );

    return this.handleTx(signerList, ixs, txSettings);
  }

  async approveToken(
    amount: number | bigint,
    mint: PublicKey,
    spender: PublicKey,
    txSettings: TxSettings = {}
  ): Promise<ParsedTransactionWithMeta | Ix[] | string> {
    const [payer, sender] = this.getActors(txSettings);
    const signerList = this.getSigners();

    const tokenProgram = await this.getTokenProgram(
      mint,
      txSettings?.isToken2022
    );

    const [{ ata: ownerAta, ixs: createAtaIxs }, decimals] = await Promise.all([
      getOrCreateAtaIxs(this.provider, payer, mint, sender, tokenProgram),
      (async () => {
        if (this.provider instanceof LiteSvmProvider) {
          const mintAccount = await this.provider.getAccountInfo(mint);
          return mintAccount!.data[44];
        } else {
          const mintInfo = await spl.getMint(
            this.provider.connection,
            mint,
            undefined,
            tokenProgram
          );
          return mintInfo.decimals;
        }
      })(),
    ]);

    const ixs: Ix[] = [
      ...createAtaIxs,
      spl.createApproveCheckedInstruction(
        ownerAta,
        mint,
        spender,
        sender,
        getAtomicsAmount(amount, decimals),
        decimals,
        undefined,
        tokenProgram
      ),
    ];

    return this.handleTx(signerList, ixs, txSettings);
  }

  async revokeTokenApproval(
    mint: PublicKey,
    txSettings: TxSettings = {}
  ): Promise<ParsedTransactionWithMeta | Ix[] | string> {
    const [payer, sender] = this.getActors(txSettings);
    const signerList = this.getSigners();

    const tokenProgram = await this.getTokenProgram(
      mint,
      txSettings?.isToken2022
    );

    let { ata, ixs } = await getOrCreateAtaIxs(
      this.provider,
      payer,
      mint,
      sender,
      tokenProgram
    );

    ixs.push(spl.createRevokeInstruction(ata, sender, undefined, tokenProgram));

    return this.handleTx(signerList, ixs, txSettings);
  }

  async wrapSol(
    amount: number | bigint,
    txSettings: TxSettings = {}
  ): Promise<ParsedTransactionWithMeta | Ix[] | string> {
    const [payer, sender] = this.getActors(txSettings);
    const signerList = this.getSigners();

    const amountInLamports = getAtomicsAmount(amount, SOL_DECIMALS);

    // Get or create ATA for WSOL (native mint)
    const { ata: wsolAta, ixs: createAtaIxs } = await getOrCreateAtaIxs(
      this.provider,
      payer,
      spl.NATIVE_MINT,
      sender,
      spl.TOKEN_PROGRAM_ID
    );

    const ixs: Ix[] = [
      ...createAtaIxs,
      // Transfer SOL to the WSOL token account
      SystemProgram.transfer({
        fromPubkey: sender,
        toPubkey: wsolAta,
        lamports: amountInLamports,
      }),
      // Sync native instruction to convert SOL to WSOL tokens
      spl.createSyncNativeInstruction(wsolAta, spl.TOKEN_PROGRAM_ID),
    ];

    return this.handleTx(signerList, ixs, txSettings);
  }

  async unwrapSol(
    amount?: number | bigint,
    txSettings: TxSettings = {}
  ): Promise<ParsedTransactionWithMeta | Ix[] | string> {
    const [_payer, sender] = this.getActors(txSettings);
    const signerList = this.getSigners();

    const wsolAta = getAta({
      mint: spl.NATIVE_MINT,
      owner: sender,
      tokenProgram: spl.TOKEN_PROGRAM_ID,
    });

    // Check if WSOL ATA exists
    if (this.provider instanceof LiteSvmProvider) {
      const account = await this.provider.getAccountInfo(wsolAta);
      if (!account) {
        throw new Error("No WSOL account found to unwrap");
      }
    } else {
      const accountInfo = await this.provider.connection.getAccountInfo(
        wsolAta
      );
      if (!accountInfo) {
        throw new Error("No WSOL account found to unwrap");
      }
    }

    // Get current WSOL balance if amount not specified
    let amountToUnwrap = amount;
    if (!amountToUnwrap) {
      const balance = await this.getAtaBalance(sender, spl.NATIVE_MINT, {
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        isAtomic: true,
      });
      amountToUnwrap = balance;
    }

    if (amountToUnwrap <= 0) {
      throw new Error("No WSOL balance to unwrap");
    }

    const ixs: Ix[] = [];

    // If unwrapping specific amount (not all), transfer to a temporary account first
    // then close that account. Otherwise, just close the main account.
    if (amount) {
      // For partial unwrap: create temp account, transfer amount, close temp account
      const tempAccount = Keypair.generate();

      const rentLamports = await this.provider.getRentExempt(spl.ACCOUNT_SIZE);

      ixs.push(
        // Create temporary WSOL account
        SystemProgram.createAccount({
          fromPubkey: sender,
          newAccountPubkey: tempAccount.publicKey,
          space: spl.ACCOUNT_SIZE,
          lamports: rentLamports,
          programId: spl.TOKEN_PROGRAM_ID,
        }),
        // Initialize the account
        spl.createInitializeAccountInstruction(
          tempAccount.publicKey,
          spl.NATIVE_MINT,
          sender,
          spl.TOKEN_PROGRAM_ID
        ),
        // Transfer specific amount to temp account
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
        // Close temp account to unwrap
        spl.createCloseAccountInstruction(
          tempAccount.publicKey,
          sender,
          sender,
          undefined,
          spl.TOKEN_PROGRAM_ID
        )
      );

      // Add temp account as signer
      signerList.push(tempAccount);
    } else {
      // Full unwrap: just close the account
      ixs.push(
        spl.createCloseAccountInstruction(
          wsolAta,
          sender,
          sender,
          undefined,
          spl.TOKEN_PROGRAM_ID
        )
      );
    }

    return this.handleTx(signerList, ixs, txSettings);
  }

  async closeAta(
    ata: PublicKey,
    balance: number,
    tokenProgram: PublicKey,
    mint: PublicKey,
    owner: PublicKey, // The owner of the ATA to close
    recipient: PublicKey, // Where to send the lamports/SOL
    txSettings: TxSettings = {}
  ): Promise<ParsedTransactionWithMeta | Ix[] | string> {
    const signerList = this.getSigners();

    let ixs: Ix[] = [];

    // Special handling for WSOL
    if (mint.equals(spl.NATIVE_MINT)) {
      // Close WSOL ATA (owner must sign, lamports go to owner first)
      ixs.push(
        spl.createCloseAccountInstruction(
          ata,
          owner, // Unwrapped SOL goes to owner
          owner, // Owner must be the authority
          undefined,
          tokenProgram
        )
      );

      // If recipient is different from owner, transfer SOL to recipient
      if (!recipient.equals(owner)) {
        ixs.push(
          SystemProgram.transfer({
            fromPubkey: owner, // Owner must sign this transfer too
            toPubkey: recipient,
            lamports: balance,
          })
        );
      }
    } else {
      if (!balance) {
        // For regular tokens, close the ATA
        // Owner must sign, lamports (rent) go to recipient
        ixs.push(
          spl.createCloseAccountInstruction(
            ata,
            recipient, // Rent refund goes to recipient
            owner, // Owner must be the authority and must sign
            undefined,
            tokenProgram
          )
        );
      }
    }

    return this.handleTx(signerList, ixs, txSettings);
  }

  /**
   * BPF Loader Upgradeable "Close" instruction (tag = 5)
   * Accounts:
   *   0. [writable] buffer account to close
   *   1. [writable] recipient of reclaimed lamports
   *   2. [signer]   buffer authority
   */
  private createCloseBufferInstruction(
    bufferAddress: PublicKey,
    recipientAddress: PublicKey,
    bufferAuthority: PublicKey
  ): Ix {
    const data = Buffer.from(new Uint32Array([5]).buffer); // 4-byte LE instruction tag

    return new Ix({
      programId: BPF_LOADER_UPGRADEABLE_PROGRAM_ID,
      keys: [
        { pubkey: bufferAddress, isSigner: false, isWritable: true },
        { pubkey: recipientAddress, isSigner: false, isWritable: true },
        { pubkey: bufferAuthority, isSigner: true, isWritable: false },
      ],
      data,
    });
  }

  async tryCloseBuffer(
    bufferAddress: PublicKey,
    recipientAddress: PublicKey,
    bufferAuthority: PublicKey,
    txSettings: TxSettings = {}
  ): Promise<ParsedTransactionWithMeta | Ix[] | string> {
    const signerList = this.getSigners();

    const ix = this.createCloseBufferInstruction(
      bufferAddress,
      recipientAddress,
      bufferAuthority
    );

    return this.handleTx(signerList, [ix], txSettings);
  }

  async getBalance(
    owner: PublicKey,
    querySettings?: QuerySettings
  ): Promise<number> {
    let { isAtomic, isDisplayed } = querySettings || {};
    isAtomic = typeof isAtomic === "undefined" ? true : isAtomic;

    const balance = await this.provider.getCoinBalance(owner);
    const res = isAtomic ? balance : balance / LAMPORTS_PER_SOL;

    return logAndReturn(res, isDisplayed);
  }

  async getAtaBalance(
    owner: PublicKey,
    mint: PublicKey,
    querySettings?: QuerySettings
  ): Promise<number> {
    const tokenProgram = querySettings?.tokenProgram
      ? new PublicKey(querySettings?.tokenProgram)
      : await this.getTokenProgram(mint);

    const ata = getAta({ mint, owner, tokenProgram });
    return await this.getTokenAccountBalance(ata, querySettings);
  }

  async getTokenAccountBalance(
    tokenAccount: PublicKey,
    querySettings?: QuerySettings
  ): Promise<number> {
    let { isAtomic, isDisplayed } = querySettings || {};
    isAtomic = typeof isAtomic === "undefined" ? true : isAtomic;

    const [atomicsAmount, uiAmount] =
      await this.provider.getTokenAccountBalance(tokenAccount);

    return logAndReturn(isAtomic ? atomicsAmount : uiAmount, isDisplayed);
  }

  async getTokenApproval(
    owner: PublicKey,
    mint: PublicKey,
    querySettings?: QuerySettings
  ): Promise<{ spender: PublicKey; amount: number }> {
    let { isAtomic, isDisplayed } = querySettings || {};
    isAtomic = typeof isAtomic === "undefined" ? true : isAtomic;

    const tokenProgram = querySettings?.tokenProgram
      ? new PublicKey(querySettings?.tokenProgram)
      : await this.getTokenProgram(mint);

    const ata = getAta({ mint, owner, tokenProgram });
    const account = await this.provider.getAccountInfo(ata);

    if (!account) {
      return {
        spender: PublicKey.default,
        amount: 0,
      };
    }

    let delegate: PublicKey | null;
    let delegatedAmount: bigint;

    if (tokenProgram.equals(spl.TOKEN_PROGRAM_ID)) {
      const tokenAccount = spl.unpackAccount(
        ata,
        account,
        spl.TOKEN_PROGRAM_ID
      );
      delegate = tokenAccount.delegate;
      delegatedAmount = tokenAccount.delegatedAmount;
    } else {
      const tokenAccount = spl.unpackAccount(
        ata,
        account,
        spl.TOKEN_2022_PROGRAM_ID
      );
      delegate = tokenAccount.delegate;
      delegatedAmount = tokenAccount.delegatedAmount;
    }

    // Get decimals
    const decimals = await getDecimals(this.provider, mint, tokenProgram);

    // Convert amount based on isAtomic
    const amount = isAtomic
      ? numberFrom(delegatedAmount).toDecimalPlaces(decimals).toNumber()
      : numberFrom(delegatedAmount)
          .div(10 ** decimals)
          .toDecimalPlaces(decimals)
          .toNumber();

    const result = {
      spender: delegate || PublicKey.default,
      amount: amount,
    };

    return logAndReturn(result, isDisplayed);
  }

  async getTx(signature: string, isDisplayed: boolean = false) {
    return this.provider instanceof LiteSvmProvider
      ? this.provider.getTransaction(signature, isDisplayed)
      : getTx(this.provider.connection, signature, isDisplayed);
  }

  async createOrExtendAlt(
    addresses: PublicKey[],
    altAddress?: PublicKey,
    authority?: PublicKey,
    txSettings: TxSettings = {}
  ): Promise<{
    altAddress: PublicKey;
    result: ParsedTransactionWithMeta | Ix[] | string;
  }> {
    const [payer, sender] = this.getActors(txSettings);
    const signerList = this.getSigners();
    const altAuthority = authority || sender;
    const ixs: Ix[] = [];

    const accountInfo = altAddress
      ? await this.provider.getAccountInfo(altAddress)
      : null;

    let finalAltAddress: PublicKey = altAddress || PublicKey.default;
    if (!accountInfo) {
      // ALT address provided but doesn't exist - treat as new
      const slot =
        this.provider instanceof LiteSvmProvider
          ? Number(this.provider.getLiteSVM().getClock().slot)
          : await this.provider.connection.getSlot();

      const [createAltIx, newAltAddress] =
        AddressLookupTableProgram.createLookupTable({
          authority: altAuthority,
          payer,
          recentSlot: slot,
        });

      ixs.push(createAltIx);
      finalAltAddress = newAltAddress;
    }

    // Add extend instructions for addresses
    if (addresses.length) {
      const MAX_ADDRESSES_PER_EXTEND = 30;

      for (let i = 0; i < addresses.length; i += MAX_ADDRESSES_PER_EXTEND) {
        const batch = addresses.slice(i, i + MAX_ADDRESSES_PER_EXTEND);

        const extendIx = AddressLookupTableProgram.extendLookupTable({
          lookupTable: finalAltAddress,
          authority: altAuthority,
          payer,
          addresses: batch,
        });

        ixs.push(extendIx);
      }
    }

    const result = await this.handleTx(signerList, ixs, txSettings);
    logAndReturn(
      { altAddress: finalAltAddress.toString() },
      txSettings.isDisplayed
    );

    return { altAddress: finalAltAddress, result };
  }

  async getAlt(
    altAddress: PublicKey,
    isDisplayed?: boolean
  ): Promise<AddressLookupTableAccount | null> {
    // For real blockchain, use the built-in method
    if (this.provider instanceof RealBlockchainProvider) {
      const result = await this.provider.connection.getAddressLookupTable(
        altAddress
      );
      return logAndReturn(result?.value || null, isDisplayed);
    }

    // For LiteSVM, manually parse the ALT account
    const accountInfo = await this.provider.getAccountInfo(altAddress);
    if (!accountInfo) {
      return logAndReturn(null, isDisplayed);
    }

    const data = accountInfo.data;

    // Parse ALT account structure:
    // Offset 0-3: Discriminator (4 bytes)
    // Offset 4-11: Deactivation slot (8 bytes, u64)
    // Offset 12-19: Last extended slot (8 bytes, u64)
    // Offset 20: Last extended slot start index (1 byte, u8)
    // Offset 21: Authority option (1 byte, 0 = None, 1 = Some)
    // Offset 22-53: Authority pubkey (32 bytes, if option = 1)
    // Offset 54-55: Padding (2 bytes)
    // Offset 56+: Addresses (32 bytes each)

    // Read deactivation slot (u64 little-endian)
    const deactivationSlot = data.readBigUInt64LE(4);

    // Read last extended slot (u64 little-endian)
    const lastExtendedSlot = Number(data.readBigUInt64LE(12));

    // Read last extended slot start index (u8)
    const lastExtendedSlotStartIndex = data[20];

    // Read authority option byte
    const hasAuthority = data[21] === 1;

    // Read authority pubkey if present
    let authority: PublicKey | undefined = undefined;
    if (hasAuthority) {
      const authorityBytes = data.slice(22, 54);
      authority = new PublicKey(authorityBytes);
    }

    // Parse addresses starting from offset 56
    const addresses: PublicKey[] = [];
    const addressSize = 32;
    const headerSize = 56;

    if (data.length > headerSize) {
      const numAddresses = Math.floor((data.length - headerSize) / addressSize);

      for (let i = 0; i < numAddresses; i++) {
        const offset = headerSize + i * addressSize;
        const addressBytes = data.slice(offset, offset + addressSize);
        addresses.push(new PublicKey(addressBytes));
      }
    }

    return logAndReturn(
      {
        key: altAddress,
        state: {
          addresses,
          authority: authority || null,
          deactivationSlot,
          lastExtendedSlot,
          lastExtendedSlotStartIndex,
        },
      } as AddressLookupTableAccount,
      isDisplayed
    );
  }

  async getAccountInfo(
    address: PublicKey
  ): Promise<AccountInfo<Buffer<ArrayBufferLike>> | null> {
    return this.provider.getAccountInfo(address);
  }
}

export function getAltKeys(cluster: Cluster): PublicKey[] {
  if (cluster === Cluster.Mainnet) {
    return [ADDRESS.CUSTOM_ALT.MAINNET];
  }

  if (cluster === Cluster.Devnet) {
    return [ADDRESS.CUSTOM_ALT.DEVNET];
  }

  return [ADDRESS.LOCALNET_ALT];
}

export async function getAltData(chain: ChainHelpers, cluster: Cluster) {
  const altAddressList = getAltKeys(cluster);
  const res = await Promise.all(altAddressList.map((x) => chain.getAlt(x)));
  const altAccountList = res.filter((x) => !!x);

  return {
    altAddressList,
    altAccountList,
  };
}
