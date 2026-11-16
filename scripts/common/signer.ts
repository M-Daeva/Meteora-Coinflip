import { ed25519 } from "@noble/curves/ed25519";
import {
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";

/**
 * The only signer abstraction the rest of the code knows about.
 *
 * Same shape as Anchor's `Wallet` and wallet-adapter's `AnchorWallet`
 * (`useAnchorWallet()`), so browser wallets plug in with no adapter.
 */
export interface TxSigner {
  readonly publicKey: PublicKey;
  signAllTransactions<T extends Transaction | VersionedTransaction>(
    txs: T[]
  ): Promise<T[]>;
}

/**
 * Structural subset of Kit's `TransactionPartialSigner`.
 * Every solana-keychain backend except the managed-broadcast ones
 * (Crossmint, Fordefi native) matches it. Declared structurally so this
 * file doesn't depend on a specific @solana/kit version.
 */
export interface KitPartialSigner {
  readonly address: string;
  signTransactions(
    transactions: readonly {
      messageBytes: Uint8Array;
      signatures: Record<string, Uint8Array | null>;
    }[]
  ): Promise<readonly Record<string, Uint8Array>[]>;
}

/** Whatever callers may pass where a signer is expected. */
export type SignerLike = TxSigner | Keypair | KitPartialSigner;

/**
 * An account that acts in a tx (sender, payer, executor).
 * A bare PublicKey means "this key signs elsewhere" — e.g. the user's
 * wallet on the frontend signs an EncodedTx built by the backend.
 */
export type Actor = SignerLike | PublicKey;

function isPublicKey(actor: Actor): actor is PublicKey {
  // `in` instead of `instanceof` survives duplicate web3.js copies in a bundle
  return "toBase58" in actor;
}

export function actorKey(actor: Actor): PublicKey {
  return isPublicKey(actor) ? actor : toTxSigner(actor).publicKey;
}

/** undefined for a bare PublicKey */
export function actorSigner(actor: Actor | undefined): TxSigner | undefined {
  return !actor || isPublicKey(actor) ? undefined : toTxSigner(actor);
}

export function fromKeypair(keypair: Keypair): TxSigner {
  return {
    publicKey: keypair.publicKey,
    async signAllTransactions(txs) {
      for (const tx of txs) {
        if (tx instanceof VersionedTransaction) tx.sign([keypair]);
        else tx.partialSign(keypair);
      }
      return txs;
    },
  };
}

export function fromKitSigner(signer: KitPartialSigner): TxSigner {
  return {
    publicKey: new PublicKey(signer.address),
    async signAllTransactions(txs) {
      const kitTxs = txs.map((tx) => {
        if (!(tx instanceof VersionedTransaction)) {
          throw new Error("Kit signers only support versioned transactions");
        }
        const signatures: Record<string, Uint8Array | null> = {};
        requiredSigners(tx).forEach((key, i) => {
          const sig = tx.signatures[i];
          signatures[key.toBase58()] = isEmptySig(sig) ? null : sig;
        });
        return { messageBytes: tx.message.serialize(), signatures };
      });

      const dictionaries = await signer.signTransactions(kitTxs);

      dictionaries.forEach((dict, i) => {
        const tx = txs[i] as VersionedTransaction;
        for (const [address, sig] of Object.entries(dict)) {
          tx.addSignature(new PublicKey(address), sig);
        }
      });
      return txs;
    },
  };
}

export function toTxSigner(signer: SignerLike): TxSigner {
  if ("secretKey" in signer) return fromKeypair(signer as Keypair);
  if ("signTransactions" in signer && "address" in signer) {
    return fromKitSigner(signer);
  }
  return signer as TxSigner;
}

export class MissingSignersError extends Error {
  constructor(public readonly missing: PublicKey[]) {
    super(
      `Missing signatures for: ${missing.map((k) => k.toBase58()).join(", ")}`
    );
    this.name = "MissingSignersError";
  }
}

export function requiredSigners(tx: VersionedTransaction): PublicKey[] {
  return tx.message.staticAccountKeys.slice(
    0,
    tx.message.header.numRequiredSignatures
  );
}

/**
 * Signs `tx` with every candidate whose key the message actually requires.
 * Candidates that aren't required are ignored, duplicates are collapsed,
 * already-present signatures are kept.
 *
 * - `requireAll: true`  → throws MissingSignersError if any slot stays empty
 * - `requireAll: false` → partial signing (e.g. backend co-signs, user signs later)
 */
export async function signTransaction(
  tx: VersionedTransaction,
  candidates: (Actor | undefined)[],
  { requireAll }: { requireAll: boolean }
): Promise<VersionedTransaction> {
  const byKey = new Map<string, TxSigner>();
  for (const candidate of candidates) {
    const signer = actorSigner(candidate);
    if (!signer) continue;
    const key = signer.publicKey.toBase58();
    if (!byKey.has(key)) byKey.set(key, signer);
  }

  let current = tx;
  for (const [i, key] of requiredSigners(current).entries()) {
    if (!isEmptySig(current.signatures[i])) continue;
    const signer = byKey.get(key.toBase58());
    if (!signer) continue;

    const before = current.message.serialize();
    const hadSignatures = current.signatures.some((s) => !isEmptySig(s));

    // Always continue from what the signer returns: some wallets return a new object
    [current] = await signer.signAllTransactions([current]);

    if (hadSignatures && !bytesEqual(before, current.message.serialize())) {
      throw new Error(
        `Signer ${key.toBase58()} modified the transaction after other signers had signed it`
      );
    }
  }

  if (requireAll) {
    const missing = requiredSigners(current).filter((_, i) =>
      isEmptySig(current.signatures[i])
    );
    if (missing.length) throw new MissingSignersError(missing);
  }

  return current;
}

/** Signs arbitrary bytes (Ed25519). wallet-adapter's `signMessage` fits this shape. */
export interface MessageSigner {
  readonly publicKey: PublicKey;
  signMessage(message: Uint8Array): Promise<Uint8Array>;
}

/** Structural subset of Kit's `MessagePartialSigner`. */
export interface KitMessageSigner {
  readonly address: string;
  signMessages(
    messages: readonly {
      content: Uint8Array;
      signatures: Record<string, Uint8Array>;
    }[]
  ): Promise<readonly Record<string, Uint8Array>[]>;
}

export type MessageSignerLike = MessageSigner | Keypair | KitMessageSigner;

export function toMessageSigner(signer: MessageSignerLike): MessageSigner {
  if ("secretKey" in signer) {
    const kp = signer as Keypair;
    return {
      publicKey: kp.publicKey,
      // web3.js secretKey = 32-byte seed || 32-byte pubkey
      signMessage: async (msg) => ed25519.sign(msg, kp.secretKey.slice(0, 32)),
    };
  }
  if ("signMessages" in signer && "address" in signer) {
    const kit = signer as KitMessageSigner;
    return {
      publicKey: new PublicKey(kit.address),
      async signMessage(msg) {
        const [dict] = await kit.signMessages([
          { content: msg, signatures: {} },
        ]);
        const sig = dict[kit.address];
        if (!sig)
          throw new Error(`Kit signer ${kit.address} returned no signature`);
        return sig;
      },
    };
  }
  return signer as MessageSigner;
}

function isEmptySig(sig?: Uint8Array): boolean {
  return !sig || sig.every((b) => b === 0);
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
