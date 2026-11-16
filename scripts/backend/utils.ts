// backend/utils.ts — NODE ONLY. File system, CLI args, env, secrets.
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { Cluster } from "../common";
import { ENV } from "./envs";

const ENCODING = "utf8" as BufferEncoding;

// --- paths / CLI ---

export function rootPath(dir: string): string {
  return path.resolve(__dirname, "../../", dir);
}

export function getSnapshotPath(cluster: Cluster, fileName: string): string {
  return rootPath(
    `./scripts/backend/snapshots/${cluster.toLowerCase()}/${fileName}`
  );
}

export function getRpc(cluster: Cluster): string {
  if (cluster === Cluster.Mainnet) {
    return ENV.MAINNET_RPC_URL;
  }
  if (cluster === Cluster.Devnet) {
    return ENV.DEVNET_RPC_URL;
  }
  return ENV.LOCALNET_RPC_URL;
}

// --- keypair files (program / data-account keypairs, dev admin key) ---

export async function readKeypair(keypairPath: string): Promise<Keypair> {
  const secretKey = JSON.parse(await readFile(keypairPath, ENCODING));
  return Keypair.fromSecretKey(new Uint8Array(secretKey));
}

export async function writeKeypair(
  keypairPath: string,
  keypair: Keypair
): Promise<void> {
  await writeFile(
    keypairPath,
    JSON.stringify(Array.from(keypair.secretKey)),
    ENCODING
  );
}

// --- keypair encoding (secrets: never in common/) ---

/** Deterministic keypair from a u16 seed (0-65535) */
export function getKeypairFromSeed(seed: number): Keypair {
  if (seed < 0 || seed > 65535 || !Number.isInteger(seed)) {
    throw new Error("Seed number must be an integer between 0 and 65535");
  }

  const hash = createHash("sha256").update(`solana-wallet-${seed}`).digest();
  return Keypair.fromSeed(new Uint8Array(hash));
}

export function getBase58FromKeypair(keyPair: Keypair): string {
  return bs58.encode(keyPair.secretKey);
}

export function getKeypairFromBase58(base58PrivateKey: string): Keypair {
  return Keypair.fromSecretKey(bs58.decode(base58PrivateKey));
}

export function getPubkeyFromBase58(base58PrivateKey: string): PublicKey {
  return getKeypairFromBase58(base58PrivateKey).publicKey;
}

// --- codegen ---

/** First 8 bytes of sha256(name), e.g. "global:update_record" or "account:Config" */
export function getDiscriminator(name: string): number[] {
  return Array.from(createHash("sha256").update(name).digest().subarray(0, 8));
}
