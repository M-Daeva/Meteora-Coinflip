import crypto from "crypto";
import { AES, enc } from "crypto-js";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import util from "util";
import { all, create } from "mathjs";
import * as anchor from "@coral-xyz/anchor";
import * as spl from "@solana/spl-token";
import { IdlAccounts } from "@coral-xyz/anchor";
import axios, {
  AxiosRequestConfig,
  AxiosInstance,
  CreateAxiosDefaults,
} from "axios";
import {
  IBlockchainProvider,
  LiteSvmProvider,
  RealBlockchainProvider,
} from "../account/provider";
import {
  ComputeConfig,
  GetAtaParams,
  IHelpers,
  ResultType,
  TxSettings,
} from "../interfaces";
import {
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  ParsedTransactionWithMeta,
  AddressLookupTableAccount,
  Keypair,
  MessageV0,
} from "@solana/web3.js";

export const DECIMAL_PLACES = 18;

export const l = console.log.bind(console);

export function li(object: any) {
  console.log(
    util.inspect(object, {
      showHidden: false,
      depth: null,
      colors: true,
    })
  );
}

export function logAndReturn<T>(object: T, isDisplayed: boolean = false): T {
  if (isDisplayed) {
    l();
    li(object);
    l();
  }
  return object;
}

export function floor(num: number, digits: number = 0): number {
  const k = 10 ** digits;
  return Math.floor(k * num) / k;
}

export function round(num: number, digits: number = 0): number {
  const k = 10 ** digits;
  return Math.round(k * num) / k;
}

export function getLast<T>(arr: T[]): T | undefined {
  return arr[arr.length - 1];
}

export function dedupVector<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export function getTimestamp(): string {
  return Date.now().toString();
}

export function getLocalBlockTime(): number {
  return floor(Date.now() / 1e3);
}

// blockTimeOffset = contractBlockTime - localBlockTime
export function getBlockTime(blockTimeOffset: number): number {
  return blockTimeOffset + getLocalBlockTime();
}

export async function wait(delayInMilliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayInMilliseconds);
  });
}

export class Request {
  private req: AxiosInstance;

  constructor(config: CreateAxiosDefaults = {}) {
    this.req = axios.create(config);
  }

  async get<T>(url: string, config?: Object): Promise<T> {
    return (await this.req.get(url, config)).data;
  }

  async post(url: string, params: Object, config?: AxiosRequestConfig) {
    return (await this.req.post(url, params, config)).data;
  }
}

export function encrypt(data: string, key: string): string {
  return AES.encrypt(data, key).toString();
}

export function decrypt(
  encryptedData: string,
  key: string
): string | undefined {
  // "Malformed UTF-8 data" workaround
  try {
    const bytes = AES.decrypt(encryptedData, key);
    return bytes.toString(enc.Utf8);
  } catch (error) {
    return;
  }
}

export function getBatchSize(maxBatchSize: number, maxCount: number): number {
  // Limit batch size to maxCount if specified
  maxBatchSize = Math.min(maxBatchSize, maxCount || maxBatchSize);

  // Balance the load across batches
  return maxCount
    ? Math.ceil(maxCount / Math.ceil(maxCount / maxBatchSize))
    : maxBatchSize;
}

// configure the default type of numbers as BigNumbers
const math = create(all, {
  // Default type of number
  // Available options: 'number' (default), 'BigNumber', or 'Fraction'
  number: "BigNumber",
  // Number of significant digits for BigNumbers
  precision: 256,
});

export function numberFrom(
  value: number | string | bigint | anchor.BN | undefined | null
): math.BigNumber {
  if (typeof value === "undefined" || value === "") {
    return math.bignumber(0);
  }

  if (anchor.BN.isBN(value)) {
    return math.bignumber("0x" + value.toString("hex"));
  }

  return typeof value === "bigint"
    ? math.bignumber(value.toString())
    : math.bignumber(value);
}

export function decimalFrom(value: math.BigNumber): string {
  return value.toPrecision(DECIMAL_PLACES);
}

export function publicKeyFromString(publicKey: PublicKey | string) {
  return typeof publicKey === "string" ? new PublicKey(publicKey) : publicKey;
}

export function getProgram<IDL extends anchor.Idl = anchor.Idl>(
  provider: anchor.AnchorProvider,
  idl: IDL
): anchor.Program<IDL> {
  // Deep clone the IDL to remove non-cloneable properties
  const cleanIdl = JSON.parse(JSON.stringify(idl)) as IDL;
  return new anchor.Program<IDL>(cleanIdl, provider);
}

export function getProvider(
  wallet: anchor.Wallet,
  rpc: string,
  commitment: anchor.web3.Commitment
): anchor.AnchorProvider {
  const connection = new Connection(rpc, commitment);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment,
  });
  anchor.setProvider(provider);

  return provider;
}

export async function getTx(
  connection: Connection,
  signature: string,
  isDisplayed: boolean = false
) {
  const tx = await connection.getParsedTransaction(signature, {
    maxSupportedTransactionVersion: 0,
  });
  return logAndReturn(tx, isDisplayed);
}

export async function getTxSize(
  connection: Connection,
  signature: string,
  isDisplayed: boolean = false
): Promise<number> {
  const txResponse = await connection.getTransaction(signature, {
    maxSupportedTransactionVersion: 0,
  });
  if (!txResponse?.transaction) {
    throw new Error("Transaction not found");
  }

  // Reconstruct as VersionedTransaction class instance
  const { message, signatures } = txResponse.transaction;
  const versionedTx = new VersionedTransaction(
    message,
    signatures.map(bs58.decode)
  );
  const serializedTx = versionedTx.serialize();

  return logAndReturn(serializedTx.length, isDisplayed);
}

export function fetchMultipleAccountsFactory<IDL extends anchor.Idl>(
  provider: IBlockchainProvider,
  program: anchor.Program<IDL>
): <T extends keyof IdlAccounts<IDL>>(
  accountName: T,
  addresses: PublicKey[]
) => Promise<IdlAccounts<IDL>[T][]> {
  return async <T extends keyof IdlAccounts<IDL>>(
    accountName: T,
    addresses: PublicKey[]
  ): Promise<IdlAccounts<IDL>[T][]> => {
    return provider.fetchMultipleAccounts<IdlAccounts<IDL>[T]>(
      program as any,
      accountName as string,
      addresses
    );
  };
}

export function handleTxFactory(
  provider: IBlockchainProvider
): (
  signerList: Keypair[],
  instructions: TransactionInstruction[],
  txSettings: TxSettings
) => Promise<ParsedTransactionWithMeta | TransactionInstruction[] | string> {
  return async (signerList, instructions, txSettings) =>
    handleTx(provider, signerList, instructions, txSettings);
}

/**
 * Handle transaction with Anchor and web3.js
 * @param payerKeypair - Optional keypair for the fee payer (for gasless transactions)
 */
export async function handleTx(
  provider: IBlockchainProvider,
  signerList: Keypair[],
  instructions: TransactionInstruction[],
  txSettings: TxSettings
): Promise<ParsedTransactionWithMeta | TransactionInstruction[] | string> {
  const resultType = txSettings.resultType ?? ResultType.BroadcastedTx;
  const isDisplayed = txSettings.isDisplayed || false;
  const payerKeypair = txSettings.payer;
  // Determine the actual payer - use payerKeypair if provided, otherwise use wallet
  const feePayer = payerKeypair?.publicKey ?? provider.wallet.publicKey;

  if (resultType === ResultType.Ixs) {
    return logAndReturn(instructions, isDisplayed);
  }

  // Route to appropriate handler
  if (provider instanceof LiteSvmProvider) {
    return handleLiteSVMTx(
      provider,
      signerList,
      instructions,
      txSettings,
      feePayer
    );
  }

  return handleRealBlockchainTx(
    provider as RealBlockchainProvider,
    signerList,
    instructions,
    txSettings,
    feePayer
  );
}

async function handleLiteSVMTx(
  provider: LiteSvmProvider,
  signerList: Keypair[],
  instructions: TransactionInstruction[],
  txSettings: TxSettings,
  feePayer: PublicKey
): Promise<ParsedTransactionWithMeta | TransactionInstruction[] | string> {
  const resultType = txSettings.resultType ?? ResultType.BroadcastedTx;
  const isDisplayed = txSettings.isDisplayed || false;
  const isSimulationDisabled = txSettings.isSimulationDisabled || false;
  const payerKeypair = txSettings.payer;
  const { addressLookupTableAddresses } = txSettings;

  if (resultType === ResultType.IxsWithCu) {
    return logAndReturn(instructions, isDisplayed);
  }

  const litesvm = provider.getLiteSVM();
  // to avoid AlreadyProcessed error
  litesvm.expireBlockhash();

  const recentBlockhash = litesvm.latestBlockhash();

  // Fetch ALT accounts if addresses are provided
  let addressLookupTableAccounts: AddressLookupTableAccount[] = [];
  if (addressLookupTableAddresses && addressLookupTableAddresses.length > 0) {
    addressLookupTableAccounts = await Promise.all(
      addressLookupTableAddresses.map(async (altAddress) => {
        const altAccount = await provider.getAccountInfo(altAddress);
        if (!altAccount) {
          throw new Error(`ALT account not found: ${altAddress.toBase58()}`);
        }
        return new AddressLookupTableAccount({
          key: altAddress,
          state: AddressLookupTableAccount.deserialize(altAccount.data),
        });
      })
    );
  }

  // Build signer list
  const buildSigners = () => {
    const signers: Keypair[] = [];

    // Add custom payer if provided
    if (payerKeypair) {
      signers.push(payerKeypair);
    } else {
      // If no custom payer, the feePayer must be the wallet, so add it
      const walletKeypair = provider.getWalletKeypair();
      if (!signers.some((s) => s.publicKey.equals(walletKeypair.publicKey))) {
        signers.push(walletKeypair);
      }
    }

    // Add additional signers
    signers.push(...signerList);

    // Add the provider's wallet keypair if needed for instructions
    const walletPubkey = provider.wallet.publicKey;
    const walletIsRequired = instructions.some((ix) =>
      ix.keys.some((key) => key?.pubkey?.equals(walletPubkey) && key.isSigner)
    );

    const walletAlreadyIncluded = signers.some((s) =>
      s.publicKey.equals(walletPubkey)
    );

    if (walletIsRequired && !walletAlreadyIncluded) {
      signers.push(provider.getWalletKeypair());
    }

    return signers;
  };

  const allSigners = buildSigners();

  // Create v0 message using MessageV0.compile
  const messageV0 = MessageV0.compile({
    payerKey: feePayer,
    instructions: instructions,
    recentBlockhash: recentBlockhash,
    addressLookupTableAccounts: addressLookupTableAccounts,
  });

  // Create versioned transaction
  const tx = new VersionedTransaction(messageV0);

  // Sign the transaction
  if (allSigners.length) {
    tx.sign(allSigners);
  }

  // Check size after signing
  const serializedTx = tx.serialize();
  if (!isSimulationDisabled) {
    checkTxSize(serializedTx, isDisplayed);
  }

  // Handle encoded transaction returns
  if (
    resultType === ResultType.EncodedTx ||
    resultType === ResultType.EncodedTxBase64
  ) {
    if (resultType === ResultType.EncodedTx) {
      return logAndReturn(bs58.encode(serializedTx), isDisplayed);
    }
    return logAndReturn(
      Buffer.from(serializedTx).toString("base64"),
      isDisplayed
    );
  }

  // Extract signature from the signed transaction
  const signatureBytes = tx.signatures[0];
  if (!signatureBytes || signatureBytes.length !== 64) {
    throw new Error(`Invalid signature length: ${signatureBytes?.length}`);
  }

  const signatureBase64 = Buffer.from(signatureBytes).toString("base64");

  // Send transaction
  const result = litesvm.sendTransaction(tx);
  if ("err" in result) {
    const logs = result.meta()?.prettyLogs() || [];
    throw new Error(`\n${result.err()}\nLogs:\n${logs}`);

    // const logs = result.meta()?.logs() || [];
    // throw new Error(`\n${result.err()}\nLogs:\n${logs.join("\n")}`);
  }

  // check if this is an ALT management transaction
  const isAltManagementTx = instructions.some(
    (ix) =>
      ix.programId.toBase58() === "AddressLookupTab1e1111111111111111111111111"
  );

  if (isAltManagementTx) {
    // wait to activate ALT changes before calling getTransaction
    provider.wait(1);
  }

  const computeUnitsConsumed = Number(result.computeUnitsConsumed());
  const mockTx = await provider.getTransaction(signatureBase64);
  if (!mockTx) {
    throw new Error(`Transaction not found: ${signatureBase64}`);
  }

  const res = {
    ...mockTx,
    meta: mockTx.meta ? { ...mockTx.meta, computeUnitsConsumed } : mockTx.meta,
  };

  return logAndReturn(res, isDisplayed);
}

async function handleRealBlockchainTx(
  provider: RealBlockchainProvider,
  signerList: Keypair[],
  instructions: TransactionInstruction[],
  txSettings: TxSettings,
  feePayer: PublicKey
): Promise<ParsedTransactionWithMeta | TransactionInstruction[] | string> {
  const CU_MULTIPLIER = 1.15;
  const MAX_COMPUTE_UNITS = 1_400_000;

  const DETERMINISTIC_PRIORITY_FEE = 1_000;
  const DETERMINISTIC_BLOCK_HASH =
    "ss6gyuJsCy7kARuKzAdHGHrPzjNXdKSXKdGquuqtGDK";

  const { connection, wallet } = provider;
  const resultType = txSettings.resultType ?? ResultType.BroadcastedTx;
  const computeConfig = txSettings.computeConfig || {};
  const isDisplayed = txSettings.isDisplayed || false;
  const isSimulationDisabled = txSettings.isSimulationDisabled || false;
  const payerKeypair = txSettings.payer;
  const addressLookupTableAddresses =
    txSettings.addressLookupTableAddresses || [];

  if (resultType === ResultType.Ixs) {
    return logAndReturn(instructions, isDisplayed);
  }

  const hasComputeBudgetIxs = instructions.some((ix) =>
    ix.programId.equals(ComputeBudgetProgram.programId)
  );

  let [{ blockhash, lastValidBlockHeight }, optimalPriorityFee] =
    await Promise.all([
      connection.getLatestBlockhash(),
      // Get optimal priority fee first
      getOptimalPriorityFee(connection, feePayer, computeConfig),
    ]);

  let optimalComputeUnits = MAX_COMPUTE_UNITS;

  // Use deterministic values for tests
  if (!isSimulationDisabled) {
    // Simulate with a high CU limit to get actual usage
    const simulationInstructions = hasComputeBudgetIxs
      ? instructions
      : [
          ComputeBudgetProgram.setComputeUnitLimit({
            units: MAX_COMPUTE_UNITS,
          }),
          ...instructions.filter(
            (ix) => !ix.programId.equals(ComputeBudgetProgram.programId)
          ),
        ];

    const simMessage = new TransactionMessage({
      instructions: simulationInstructions,
      recentBlockhash: blockhash,
      payerKey: feePayer,
    });

    const simTransaction = await getVersionedTx(
      connection,
      simMessage,
      addressLookupTableAddresses
    );
    checkTxSize(simTransaction.serialize(), isDisplayed);

    const simulationResult = await connection.simulateTransaction(
      simTransaction
    );
    checkSimulationResult(simulationResult);

    // Calculate optimal CU from the simulation
    optimalComputeUnits = simulationResult.value.unitsConsumed
      ? Math.min(
          Math.ceil(
            Number(simulationResult.value.unitsConsumed) *
              (computeConfig.cuMultiplier || CU_MULTIPLIER)
          ),
          MAX_COMPUTE_UNITS
        )
      : MAX_COMPUTE_UNITS;
  } else {
    blockhash = DETERMINISTIC_BLOCK_HASH;
    optimalPriorityFee = DETERMINISTIC_PRIORITY_FEE;
  }

  // Build final instructions
  let finalInstructions: TransactionInstruction[] = [];

  if (!hasComputeBudgetIxs) {
    finalInstructions.push(
      ComputeBudgetProgram.setComputeUnitLimit({ units: optimalComputeUnits })
    );

    if (optimalPriorityFee) {
      finalInstructions.push(
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: optimalPriorityFee,
        })
      );
    }
  }

  finalInstructions = [...finalInstructions, ...instructions];

  if (resultType === ResultType.IxsWithCu) {
    return logAndReturn(finalInstructions, isDisplayed);
  }

  // Create final transaction with the fee payer
  const message = new TransactionMessage({
    instructions: finalInstructions,
    recentBlockhash: blockhash,
    payerKey: feePayer,
  });

  const transaction = await getVersionedTx(
    connection,
    message,
    addressLookupTableAddresses
  );

  const serializedTx = transaction.serialize();

  if (resultType === ResultType.EncodedTx) {
    const base58EncodedTx = bs58.encode(serializedTx);
    return logAndReturn(base58EncodedTx, isDisplayed);
  }

  if (resultType === ResultType.EncodedTxBase64) {
    const base64EncodedTx = Buffer.from(serializedTx).toString("base64");
    return logAndReturn(base64EncodedTx, isDisplayed);
  }

  // The payer must sign first for versioned transactions
  if (payerKeypair) {
    // If using a separate payer, sign with payer first
    transaction.sign([payerKeypair]);
  }

  // Sign with additional keypair signers (if any)
  if (signerList.length) {
    transaction.sign(signerList);
  }

  // Then sign with wallet if wallet is not the payer
  // (wallet still needs to sign if it's a required signer for the instructions)
  const signedTx = await wallet.signTransaction(transaction);

  // Send and confirm transaction
  const signature = await connection.sendTransaction(signedTx);
  const {
    value: { err },
  } = await connection.confirmTransaction({
    blockhash,
    lastValidBlockHeight,
    signature,
  });

  if (err) {
    throw new Error(`Transaction failed: ${JSON.stringify(err)}`);
  }

  // Fetch the full transaction with logs
  const txResponse = await getTx(connection, signature);

  if (!txResponse) {
    throw new Error("Failed to fetch transaction details");
  }

  return logAndReturn(txResponse, isDisplayed);
}

/**
 * Get recent prioritization fees for calculating optimal priority fee
 */
async function getOptimalPriorityFee(
  connection: anchor.web3.Connection,
  payerAddress: PublicKey,
  config: ComputeConfig = {}
): Promise<number> {
  const PRIORITY_FEE_MULTIPLIER = 1.0;
  const PRIORITY_FEE_BASE = 0;
  const MAX_PRIORITY_FEE = 0.01 * 1_000_000_000; // 0.01 SOL in lamports
  const MIN_PRIORITY_FEE = 0;

  try {
    const prioritizationFees = await connection.getRecentPrioritizationFees({
      lockedWritableAccounts: [payerAddress],
    });
    let basePriorityFee = 0;
    if (prioritizationFees.length > 0) {
      const feeSum = prioritizationFees.reduce(
        (acc, cur) => acc + cur.prioritizationFee,
        0
      );
      basePriorityFee = Math.ceil(feeSum / prioritizationFees.length);
    }

    const {
      priorityFeeMultiplier = PRIORITY_FEE_MULTIPLIER,
      priorityFeeBase = PRIORITY_FEE_BASE,
      maxPriorityFee = MAX_PRIORITY_FEE,
      minPriorityFee = MIN_PRIORITY_FEE,
    } = config;

    let finalPriorityFee = Math.ceil(
      basePriorityFee * priorityFeeMultiplier + priorityFeeBase
    );
    finalPriorityFee = Math.max(minPriorityFee, finalPriorityFee);
    finalPriorityFee = Math.min(maxPriorityFee, finalPriorityFee);
    return finalPriorityFee;
  } catch (error) {
    console.warn("Failed to get recent prioritization fees:", error);
    return config.priorityFeeBase || 0;
  }
}

async function getVersionedTx(
  connection: anchor.web3.Connection,
  message: anchor.web3.TransactionMessage,
  addressLookupTableAddresses: PublicKey[]
): Promise<anchor.web3.VersionedTransaction> {
  // // Use legacy message if ALTs aren't provided
  // if (!addressLookupTableAddresses.length) {
  //   return new VersionedTransaction(message.compileToLegacyMessage());
  // }

  let promiseList: Promise<AddressLookupTableAccount | null>[] = [];

  for (const addr of addressLookupTableAddresses) {
    const fn = async () => {
      const alt = await connection.getAddressLookupTable(addr);
      return alt?.value;
    };

    promiseList.push(fn());
  }

  const rawLookupTableAddresses = await Promise.all(promiseList);
  if (rawLookupTableAddresses.some((x) => !x)) {
    throw new Error("Wrong ALT!");
  }

  const compiledMessage = message.compileToV0Message(
    rawLookupTableAddresses as AddressLookupTableAccount[]
  );

  return new VersionedTransaction(compiledMessage);
}

function checkTxSize(
  transactionSerialized: Buffer | Uint8Array,
  isDisplayed: boolean
): void {
  const MAX_TX_SIZE = 1232;
  const CU_TX_SIZE_OFFSET = 32;

  let txSize = 0;
  try {
    txSize = transactionSerialized.length + CU_TX_SIZE_OFFSET;
  } catch (_) {}

  if (!txSize) {
    throw new Error(
      `tx can't be serialized due to significant exceeding max tx size ${MAX_TX_SIZE} bytes`
    );
  }

  if (txSize > MAX_TX_SIZE) {
    throw new Error(
      `tx size ${txSize} bytes exceeded max tx size ${MAX_TX_SIZE} bytes`
    );
  }

  if (isDisplayed) {
    li(`tx size is ${txSize} of ${MAX_TX_SIZE} bytes`);
  }
}

function checkSimulationResult(
  simulationResult: anchor.web3.RpcResponseAndContext<anchor.web3.SimulatedTransactionResponse>
): void {
  if (simulationResult.value.err) {
    const logs = JSON.stringify(simulationResult.value.logs, null, 2);
    const err = JSON.stringify(simulationResult.value.err, null, 2);
    throw new Error(`Simulation failed:\n${logs}\nerr: ${err}`);
  }
}

export function getAta(args: GetAtaParams): PublicKey {
  const { mint, owner, tokenProgram } = args;
  const mintKey = typeof mint === "string" ? new PublicKey(mint) : mint;
  const ownerKey = typeof owner === "string" ? new PublicKey(owner) : owner;
  const tokenProgramKey =
    typeof tokenProgram === "string"
      ? new PublicKey(tokenProgram)
      : tokenProgram;

  return PublicKey.findProgramAddressSync(
    [ownerKey.toBuffer(), tokenProgramKey.toBuffer(), mintKey.toBuffer()],
    spl.ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
}

export async function getOrCreateAtaIxs(
  provider: IBlockchainProvider,
  payer: PublicKey,
  mintPubkey: PublicKey,
  ownerPubkey: PublicKey,
  tokenProgram: PublicKey
): Promise<{
  ata: PublicKey;
  ixs: anchor.web3.TransactionInstruction[];
}> {
  // calculate the ATA address, check the account
  const ata = getAta({ mint: mintPubkey, owner: ownerPubkey, tokenProgram });
  const account = await provider.getAccountInfo(ata);

  if (account) {
    // account exists and is properly initialized
    return {
      ata,
      ixs: [],
    };
  }

  // create the ATA creation instruction
  const ix = spl.createAssociatedTokenAccountInstruction(
    payer,
    ata,
    ownerPubkey,
    mintPubkey,
    tokenProgram,
    spl.ASSOCIATED_TOKEN_PROGRAM_ID
  );

  return {
    ata,
    ixs: [ix],
  };
}

export function getTokenProgramFactory(provider: IBlockchainProvider) {
  return async (mint: PublicKey, isToken2022?: boolean) => {
    if (isToken2022 === true) {
      return spl.TOKEN_2022_PROGRAM_ID;
    }

    if (isToken2022 === false) {
      return spl.TOKEN_PROGRAM_ID;
    }

    // check if it's SOL (represented by PublicKey.default)
    if (mint.equals(PublicKey.default)) {
      throw new Error(`Mint ${mint.toString()} represents Sol`);
    }

    // Handle LiteSVM
    if (provider instanceof LiteSvmProvider) {
      // get the account to determine which token program owns it
      const mintAccount = await provider.getAccountInfo(mint);
      if (!mintAccount) {
        throw new Error(`Mint account ${mint.toString()} not found in LiteSVM`);
      }

      if (mintAccount.owner.equals(anchor.web3.SystemProgram.programId)) {
        throw new Error(
          `Account ${mint.toString()} is owned by System Program. Not a valid mint.`
        );
      }

      // determine if it's Token Program or Token 2022
      if (mintAccount.owner.equals(spl.TOKEN_PROGRAM_ID)) {
        return spl.TOKEN_PROGRAM_ID;
      } else if (mintAccount.owner.equals(spl.TOKEN_2022_PROGRAM_ID)) {
        return spl.TOKEN_2022_PROGRAM_ID;
      } else {
        throw new Error(
          `Unknown token program: ${mintAccount.owner.toString()}`
        );
      }
    }

    // Handle real blockchain
    const connection = (provider as RealBlockchainProvider).connection;
    // get the account to determine which token program owns it
    const mintAccount = await connection.getAccountInfo(mint);
    if (!mintAccount) {
      throw new Error(
        `Mint account ${mint.toString()} not found on ${
          connection.rpcEndpoint
        }. ` + `Make sure you're connected to the correct network.`
      );
    }

    if (mintAccount.owner.equals(anchor.web3.SystemProgram.programId)) {
      throw new Error(
        `Account ${mint.toString()} exists but is owned by System Program on ${
          connection.rpcEndpoint
        }. ` +
          `This mint may not exist on this network. Are you using the correct cluster (mainnet/devnet/testnet)?`
      );
    }

    // determine if it's Token Program or Token 2022
    if (mintAccount.owner.equals(spl.TOKEN_PROGRAM_ID)) {
      return spl.TOKEN_PROGRAM_ID;
    } else if (mintAccount.owner.equals(spl.TOKEN_2022_PROGRAM_ID)) {
      return spl.TOKEN_2022_PROGRAM_ID;
    } else {
      throw (
        new Error(`Unknown token program: ${mintAccount.owner.toString()}. `) +
        `Expected TOKEN_PROGRAM_ID or TOKEN_2022_PROGRAM_ID.`
      );
    }
  };
}

export function getActorsFactory(): (
  this: IHelpers,
  txSettings: TxSettings
) => [PublicKey, PublicKey] {
  return function (
    this: IHelpers,
    txSettings: TxSettings
  ): [PublicKey, PublicKey] {
    const wallet = this.defaultWallet;
    const payer =
      txSettings?.payer?.publicKey || this.temporarySender?.publicKey || wallet;

    // Use temporary sender if set, otherwise use executor or wallet
    const sender =
      this.temporarySender?.publicKey || txSettings?.executor || wallet;

    return [payer, sender];
  };
}

export function getSignersFactory(): (
  this: IHelpers,
  ...additionalSigners: Keypair[]
) => Keypair[] {
  // Only return additional signers (PDAs, etc.), not the wallet
  return function (this: IHelpers, ...additionalSigners: Keypair[]): Keypair[] {
    const signers = [...additionalSigners];

    // Add temporary sender if it exists
    if (this.temporarySender) {
      signers.push(this.temporarySender);
    }

    return signers;
  };
}

export function withSenderFactory<T extends IHelpers>(): (
  this: T,
  sender: Keypair
) => T {
  return function (this: T, sender: Keypair): T {
    const clone = Object.create(Object.getPrototypeOf(this)) as T;
    Object.assign(clone, this);
    clone.temporarySender = sender;
    return clone;
  };
}

/**
 * Checks if a Token-2022 mint has the transfer hook extension
 * @param provider - Anchor provider with connection
 * @param mint - Public key of the mint to check
 * @returns true if the mint has transfer hook extension, false otherwise
 */
export async function hasTransferHookExtension(
  provider: IBlockchainProvider,
  mint: PublicKey
): Promise<boolean> {
  try {
    const accountInfo = await provider.getAccountInfo(mint);

    // Check if it's a Token-2022 mint
    if (!accountInfo || !accountInfo.owner.equals(spl.TOKEN_2022_PROGRAM_ID)) {
      return false;
    }

    // For Token-2022, check the extension
    const mintInfo = spl.unpackMint(
      mint,
      accountInfo,
      spl.TOKEN_2022_PROGRAM_ID
    );
    // Check for transfer hook extension
    const transferHook = spl.getTransferHook(mintInfo);
    return transferHook !== null;
  } catch (error) {
    return false;
  }
}

/**
 * Checks if a Token-2022 mint has any extensions
 * @param provider - Anchor provider with connection
 * @param mint - Public key of the mint to check
 * @returns true if the mint has any extensions, false otherwise
 */
export async function hasAnyExtension(
  provider: IBlockchainProvider,
  mint: PublicKey
): Promise<boolean> {
  try {
    // Get the mint account info
    // Token-2022 mints with extensions have tlvData
    // Check if there are any extensions by examining the account
    const accountInfo = await provider.getAccountInfo(mint);
    if (!accountInfo) {
      return false;
    }

    // Basic mint account size is 82 bytes
    // If the account is larger, it has extensions
    const MINT_SIZE = 82;
    return accountInfo.data.length > MINT_SIZE;
  } catch (error) {
    return false;
  }
}

type RustIntType = "u8" | "u16" | "u32" | "u64" | "u128";

/**
 * Converts a TypeScript number to a Buffer based on the specified Rust integer type
 * @param value - The number to convert
 * @param rustType - The Rust integer type (u8, u16, u32, u64, u128)
 * @returns Buffer representing the number in little-endian format
 * @throws Error if the value exceeds the maximum for the specified type
 */
export function numberToRustBuffer(
  value: number,
  rustType: RustIntType
): Buffer {
  // Validate input bounds for each type
  const maxValues = {
    u8: 255, // 2^8 - 1
    u16: 65535, // 2^16 - 1
    u32: 4294967295, // 2^32 - 1
    u64: BigInt("18446744073709551615"), // 2^64 - 1 (as bigint)
    u128: BigInt("340282366920938463463374607431768211455"), // 2^128 - 1 (as bigint)
  };

  // Byte sizes for each type
  const byteSizes = {
    u8: 1,
    u16: 2,
    u32: 4,
    u64: 8,
    u128: 16,
  };

  // Handle u8 specially - simple array conversion
  if (rustType === "u8") {
    if (value < 0 || value > maxValues.u8 || !Number.isInteger(value)) {
      throw new Error(
        `Value ${value} is out of range for u8 (0-${maxValues.u8})`
      );
    }
    return Buffer.from([value]);
  }

  // Handle u16, u32 with anchor.BN for consistency
  if (rustType === "u16" || rustType === "u32") {
    const maxValue = maxValues[rustType] as number;
    if (value < 0 || value > maxValue || !Number.isInteger(value)) {
      throw new Error(
        `Value ${value} is out of range for ${rustType} (0-${maxValue})`
      );
    }

    return new anchor.BN(value).toArrayLike(Buffer, "le", byteSizes[rustType]);
  }

  // Handle u64 and u128 - these require bigint for full range support
  if (rustType === "u64" || rustType === "u128") {
    // Convert number to bigint for large value handling
    let bigintValue: bigint;

    if (typeof value === "bigint") {
      bigintValue = value;
    } else {
      if (!Number.isInteger(value) || value < 0) {
        throw new Error(
          `Value ${value} must be a non-negative integer for ${rustType}`
        );
      }
      bigintValue = BigInt(value);
    }

    const maxValue = maxValues[rustType] as bigint;
    if (bigintValue < BigInt(0) || bigintValue > maxValue) {
      throw new Error(
        `Value ${bigintValue} is out of range for ${rustType} (0-${maxValue})`
      );
    }

    // For very large numbers, we need to handle them as bigint
    return new anchor.BN(bigintValue.toString()).toArrayLike(
      Buffer,
      "le",
      byteSizes[rustType]
    );
  }

  throw new Error(`Unsupported Rust type: ${rustType}`);
}

export function createFakeKeypair(pubkey: PublicKey): Keypair {
  const kp = new Keypair();

  // @ts-ignore - internal field
  kp._keypair = {
    publicKey: pubkey.toBytes(),
    secretKey: new Uint8Array(64), // dummy
  };

  // Override the getter to return correct PublicKey
  Object.defineProperty(kp, "publicKey", {
    value: pubkey,
    writable: false,
  });
  Object.defineProperty(kp, "secretKey", {
    value: new Uint8Array(64),
    writable: false,
  });

  return kp;
}

/**
 * Generates a deterministic Solana keypair from a u16 number (0-65535)
 * @param seed - A number between 0 and 65535
 * @returns A deterministic Keypair
 */
export function getKeypairFromSeed(seed: number): Keypair {
  if (seed < 0 || seed > 65535 || !Number.isInteger(seed)) {
    throw new Error("Seed number must be an integer between 0 and 65535");
  }

  const seedString = `solana-wallet-${seed}`;
  const hash = crypto.createHash("sha256").update(seedString).digest();

  return Keypair.fromSeed(new Uint8Array(hash));
}

export function getBase58FromKeypair(keyPair: Keypair): string {
  return bs58.encode(keyPair.secretKey);
}

export function getKeypairFromBase58(base58PrivateKey: string): Keypair {
  const privateKeyBytes = bs58.decode(base58PrivateKey);
  return Keypair.fromSecretKey(privateKeyBytes);
}

export function getPubkeyFromBase58(base58PrivateKey: string): PublicKey {
  return getKeypairFromBase58(base58PrivateKey).publicKey;
}

export function getAtomicsAmount(
  amount: number | bigint, // number - UI amount, bigint - atomics
  decimals?: number
): number {
  if (typeof amount === "number" && typeof decimals === "undefined") {
    throw new Error("decimals must be specified for UI amount (number)");
  }

  return typeof amount === "bigint"
    ? Number(amount.toString())
    : amount * 10 ** (decimals || 6);
}

/**
 * Extracts transaction instructions from a base58 or base64 encoded transaction
 * @param encodedTx - The encoded transaction string (base58 or base64)
 * @param encoding - The encoding format ('base58' or 'base64')
 * @param addressLookupTableAccounts - Optional array of ALT accounts for v0 transactions
 * @returns Array of TransactionInstructions
 */
export function getIxsFromEncodedTx(
  encodedTx: string,
  encoding: "base58" | "base64" = "base64",
  addressLookupTableAccounts: AddressLookupTableAccount[] = []
): TransactionInstruction[] {
  try {
    // Decode the transaction based on encoding type
    let serializedTx: Uint8Array;
    if (encoding === "base58") {
      serializedTx = bs58.decode(encodedTx);
    } else if (encoding === "base64") {
      serializedTx = Buffer.from(encodedTx, "base64");
    } else {
      throw new Error(`Unsupported encoding: ${encoding}`);
    }

    // Deserialize the versioned transaction
    const transaction = VersionedTransaction.deserialize(serializedTx);

    // For v0 messages, we need to resolve account keys with ALTs
    let accountKeys: PublicKey[];

    if (!transaction.message.version) {
      // V0 message - need to resolve with address lookup tables
      const message = transaction.message as MessageV0;
      accountKeys = message.getAccountKeys({
        addressLookupTableAccounts: addressLookupTableAccounts,
      }).staticAccountKeys;

      // If we have ALTs, also include the loaded addresses
      if (addressLookupTableAccounts.length) {
        const loadedAddresses = message.getAccountKeys({
          addressLookupTableAccounts: addressLookupTableAccounts,
        });
        accountKeys = [
          ...loadedAddresses.staticAccountKeys,
          ...(loadedAddresses.accountKeysFromLookups?.writable || []),
          ...(loadedAddresses.accountKeysFromLookups?.readonly || []),
        ];
      }
    } else {
      // Legacy message
      accountKeys = transaction.message.staticAccountKeys;
    }

    // Extract instructions from the transaction message
    const instructions = transaction.message.compiledInstructions.map((ix) => {
      const programId = accountKeys[ix.programIdIndex];

      if (!programId) {
        throw new Error(`Program ID not found at index ${ix.programIdIndex}`);
      }

      const keys = ix.accountKeyIndexes.map((keyIndex) => {
        const pubkey = accountKeys[keyIndex];

        if (!pubkey) {
          throw new Error(`Account key not found at index ${keyIndex}`);
        }

        return {
          pubkey,
          isSigner: transaction.message.isAccountSigner(keyIndex),
          isWritable: transaction.message.isAccountWritable(keyIndex),
        };
      });

      return {
        programId,
        keys,
        data: Buffer.from(ix.data),
      } as TransactionInstruction;
    });

    return instructions;
  } catch (error) {
    throw new Error(
      `Failed to decode transaction: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export async function getDecimals(
  provider: IBlockchainProvider,
  mint: PublicKey,
  tokenProgram?: PublicKey
): Promise<number> {
  if (provider instanceof LiteSvmProvider) {
    const mintAccount = await provider.getAccountInfo(mint);
    if (!mintAccount) {
      throw new Error("Mint account not found");
    }

    return mintAccount.data[44];
  }

  const tokenProg = tokenProgram
    ? tokenProgram
    : await getTokenProgramFactory(provider)(mint);

  const mintInfo = await spl.getMint(
    provider.connection,
    mint,
    undefined,
    tokenProg
  );

  return mintInfo.decimals;
}

export function mergeAlt(
  addressLookupTableAddressesA?: PublicKey[],
  addressLookupTableAddressesB?: PublicKey[]
): PublicKey[] {
  const existingAlts = new Set(
    addressLookupTableAddressesA?.map((a) => a.toBase58()) || []
  );
  const newAlts = (addressLookupTableAddressesB || []).filter(
    (a) => !existingAlts.has(a.toBase58())
  );

  return [...(addressLookupTableAddressesA || []), ...newAlts];
}

export function dedupPubkey(listIn: PublicKey[]): PublicKey[] {
  let listOut: PublicKey[] = [];

  for (const pk of listIn) {
    if (listOut.every((x) => !x.equals(pk))) {
      listOut.push(pk);
    }
  }

  return listOut;
}

export function getDiscriminator(name: string): number[] {
  return Array.from(
    crypto.createHash("sha256").update(name).digest().subarray(0, 8)
  );
}
