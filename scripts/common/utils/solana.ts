import bs58 from "bs58";
import { Buffer } from "buffer";
import { type Idl, AnchorProvider, BN, Program } from "@coral-xyz/anchor";
import {
  AddressLookupTableAccount,
  MessageAccountKeys,
  MessageV0,
  PublicKey,
  TransactionInstruction,
  VersionedTransaction,
} from "@solana/web3.js";

export function getLast<T>(arr: T[]): T | undefined {
  return arr[arr.length - 1];
}

export function dedupVector<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export function dedupPubkey(listIn: PublicKey[]): PublicKey[] {
  const listOut: PublicKey[] = [];
  for (const pk of listIn) {
    if (listOut.every((x) => !x.equals(pk))) listOut.push(pk);
  }
  return listOut;
}

export function mergeAlt(
  addressLookupTableAddressesA: PublicKey[] = [],
  addressLookupTableAddressesB: PublicKey[] = []
): PublicKey[] {
  return dedupPubkey([
    ...addressLookupTableAddressesA,
    ...addressLookupTableAddressesB,
  ]);
}

export function getProgram<IDL extends Idl = Idl>(
  provider: AnchorProvider,
  idl: IDL
): Program<IDL> {
  // Deep clone: Program mutates the IDL, and the imported JSON module must stay untouched
  const cleanIdl = JSON.parse(JSON.stringify(idl)) as IDL;
  return new Program<IDL>(cleanIdl, provider);
}

type RustIntType = "u8" | "u16" | "u32" | "u64" | "u128";

const RUST_INT_BYTES: Record<RustIntType, number> = {
  u8: 1,
  u16: 2,
  u32: 4,
  u64: 8,
  u128: 16,
};

/**
 * Little-endian bytes of an unsigned Rust integer (e.g. for PDA seeds).
 * @throws if the value isn't a non-negative integer that fits the type
 */
export function numberToRustBuffer(
  value: number | bigint,
  rustType: RustIntType
): Buffer {
  const bytes = RUST_INT_BYTES[rustType];
  if (!bytes) throw new Error(`Unsupported Rust type: ${rustType}`);

  if (typeof value === "number" && !Number.isInteger(value)) {
    throw new Error(
      `Value ${value} must be a non-negative integer for ${rustType}`
    );
  }

  const bigintValue = BigInt(value);
  const maxValue = (1n << BigInt(bytes * 8)) - 1n;
  if (bigintValue < 0n || bigintValue > maxValue) {
    throw new Error(
      `Value ${bigintValue} is out of range for ${rustType} (0-${maxValue})`
    );
  }

  return new BN(bigintValue.toString()).toArrayLike(Buffer, "le", bytes);
}

/**
 * Extracts instructions from a base58 / base64 encoded transaction.
 * v0 txs that use lookup tables need `addressLookupTableAccounts` to resolve their keys.
 */
export function getIxsFromEncodedTx(
  encodedTx: string,
  encoding: "base58" | "base64" = "base64",
  addressLookupTableAccounts: AddressLookupTableAccount[] = []
): TransactionInstruction[] {
  try {
    const bytes =
      encoding === "base58"
        ? bs58.decode(encodedTx)
        : Buffer.from(encodedTx, "base64");
    const { message } = VersionedTransaction.deserialize(bytes);

    const accountKeys =
      message.version === "legacy"
        ? new MessageAccountKeys(message.staticAccountKeys)
        : (message as MessageV0).getAccountKeys({ addressLookupTableAccounts });

    const keyAt = (index: number): PublicKey => {
      const key = accountKeys.get(index);
      if (!key) throw new Error(`Account key not found at index ${index}`);
      return key;
    };

    return message.compiledInstructions.map(
      (ix) =>
        new TransactionInstruction({
          programId: keyAt(ix.programIdIndex),
          keys: ix.accountKeyIndexes.map((index) => ({
            pubkey: keyAt(index),
            isSigner: message.isAccountSigner(index),
            isWritable: message.isAccountWritable(index),
          })),
          data: Buffer.from(ix.data),
        })
    );
  } catch (error) {
    throw new Error(
      `Failed to decode transaction: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
