// One pipeline for every provider: build → (CU) → sign → send.
import bs58 from "bs58";
import { Buffer } from "buffer";
import type { IBlockchainProvider, TxLifetime } from "./provider/interface";
import { actorKey, signTransaction, type Actor } from "./signer";
import { ResultType, type TxSettings } from "./interfaces";
import { li, logAndReturn } from "./utils/log";
import {
  type ParsedTransactionWithMeta,
  AddressLookupTableAccount,
  ComputeBudgetProgram,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

export type TxResult =
  | ParsedTransactionWithMeta
  | TransactionInstruction[]
  | string;

const CU_MULTIPLIER = 1.15;
const MAX_COMPUTE_UNITS = 1_400_000;
const MAX_TX_SIZE = 1232;
const DETERMINISTIC_PRIORITY_FEE = 1_000;
const DETERMINISTIC_LIFETIME: TxLifetime = {
  blockhash: "ss6gyuJsCy7kARuKzAdHGHrPzjNXdKSXKdGquuqtGDK",
  lastValidBlockHeight: 0,
};

/**
 * @param contextSigners actors implied by the caller (a helper's sender).
 *
 * Candidates offered to the tx, in priority order: payer, executor,
 * contextSigners, settings.signers, provider.signer. Only keys the message
 * actually requires are asked to sign; bare PublicKeys are skipped.
 *
 * BroadcastedTx: every required signature must be present, otherwise
 * MissingSignersError lists the missing keys.
 * EncodedTx*: unsigned, or partially signed with `partialSigning: true`.
 */
export async function handleTx(
  provider: IBlockchainProvider,
  instructions: TransactionInstruction[],
  settings: TxSettings = {},
  contextSigners: Actor[] = []
): Promise<TxResult> {
  const {
    resultType = ResultType.BroadcastedTx,
    isDisplayed = false,
    isSimulationDisabled = false,
    addressLookupTableAddresses = [],
  } = settings;

  if (resultType === ResultType.Ixs)
    return logAndReturn(instructions, isDisplayed);

  const payer = settings.payer ?? provider.signer;
  const payerKey = actorKey(payer);
  const deterministic = isSimulationDisabled && provider.applyComputeBudget;

  const [lifetime, alts] = await Promise.all([
    deterministic ? DETERMINISTIC_LIFETIME : provider.getLatestBlockhash(),
    provider.getAddressLookupTables(addressLookupTableAddresses),
  ]);

  const compile = (ixs: TransactionInstruction[]) =>
    compileTx(ixs, payerKey, lifetime.blockhash, alts);

  const finalIxs = provider.applyComputeBudget
    ? await withComputeBudget(
        provider,
        instructions,
        payerKey,
        compile,
        settings
      )
    : instructions;

  if (resultType === ResultType.IxsWithCu)
    return logAndReturn(finalIxs, isDisplayed);

  let tx = compile(finalIxs);
  if (!isSimulationDisabled) checkTxSize(tx, isDisplayed);

  const candidates = [
    payer,
    settings.executor,
    ...contextSigners,
    ...(settings.signers ?? []),
    provider.signer,
  ];

  if (
    resultType === ResultType.EncodedTxBase58 ||
    resultType === ResultType.EncodedTxBase64
  ) {
    if (settings.partialSigning) {
      tx = await signTransaction(tx, candidates, { requireAll: false });
    }
    const bytes = tx.serialize();
    return logAndReturn(
      resultType === ResultType.EncodedTxBase58
        ? bs58.encode(bytes)
        : Buffer.from(bytes).toString("base64"),
      isDisplayed
    );
  }

  tx = await signTransaction(tx, candidates, { requireAll: true });
  const signature = await provider.sendAndConfirm(tx, lifetime);

  const result = await provider.getTransaction(signature);
  if (!result) throw new Error(`Transaction not found: ${signature}`);
  return logAndReturn(result, isDisplayed);
}

/** The only place that knows the tx format — swap here when moving to v1. */
function compileTx(
  instructions: TransactionInstruction[],
  payerKey: PublicKey,
  recentBlockhash: string,
  alts: AddressLookupTableAccount[]
): VersionedTransaction {
  return new VersionedTransaction(
    new TransactionMessage({
      payerKey,
      recentBlockhash,
      instructions,
    }).compileToV0Message(alts)
  );
}

async function withComputeBudget(
  provider: IBlockchainProvider,
  instructions: TransactionInstruction[],
  payer: PublicKey,
  compile: (ixs: TransactionInstruction[]) => VersionedTransaction,
  { isSimulationDisabled, computeConfig = {} }: TxSettings
): Promise<TransactionInstruction[]> {
  const hasComputeBudget = instructions.some((ix) =>
    ix.programId.equals(ComputeBudgetProgram.programId)
  );
  if (hasComputeBudget) return instructions;

  let units = MAX_COMPUTE_UNITS;
  let priorityFee = DETERMINISTIC_PRIORITY_FEE;

  if (!isSimulationDisabled) {
    const simTx = compile([
      ComputeBudgetProgram.setComputeUnitLimit({ units: MAX_COMPUTE_UNITS }),
      ...instructions,
    ]);
    const [consumed, fee] = await Promise.all([
      provider.simulate(simTx),
      provider.getPriorityFee(payer, computeConfig),
    ]);
    priorityFee = fee;
    if (consumed) {
      const { cuMultiplier = CU_MULTIPLIER, cuBase = 0 } = computeConfig;
      units = Math.min(
        Math.ceil(consumed * cuMultiplier + cuBase),
        MAX_COMPUTE_UNITS
      );
    }
  }

  return [
    ComputeBudgetProgram.setComputeUnitLimit({ units }),
    ...(priorityFee
      ? [
          ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: priorityFee,
          }),
        ]
      : []),
    ...instructions,
  ];
}

function checkTxSize(tx: VersionedTransaction, isDisplayed: boolean): void {
  let size: number;
  try {
    // unsigned v0 txs serialize with zeroed signature slots → exact final size
    size = tx.serialize().length;
  } catch {
    throw new Error(
      `tx can't be serialized: far above max tx size ${MAX_TX_SIZE} bytes`
    );
  }
  if (size > MAX_TX_SIZE) {
    throw new Error(
      `tx size ${size} bytes exceeded max tx size ${MAX_TX_SIZE} bytes`
    );
  }
  if (isDisplayed) li(`tx size is ${size} of ${MAX_TX_SIZE} bytes`);
}
