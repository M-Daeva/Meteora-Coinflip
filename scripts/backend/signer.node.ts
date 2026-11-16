// NODE ONLY (keychain backends hold API secrets).
import { readKeypair } from "./utils";
import { loadVaultSigner, type VaultAppRoleConfig } from "./vault.node";
import {
  createKeychainSigner,
  type KeychainSignerConfig,
} from "@solana/keychain";
import {
  fromKeypair,
  fromKitSigner,
  type KitPartialSigner,
  type TxSigner,
} from "../common";

/** Any solana-keychain backend (vault, aws-kms, turnkey, privy, memory, ...) → TxSigner */
export async function loadSigner(
  config: KeychainSignerConfig
): Promise<TxSigner> {
  const signer = await createKeychainSigner(config);

  // Kit classifies signers by method presence; managed-broadcast backends
  // (crossmint, fordefi native) have no signTransactions and can't co-sign.
  if (!("signTransactions" in signer)) {
    throw new Error(
      `Keychain backend "${config.backend}" broadcasts transactions itself and can't be used as a transaction signer here`
    );
  }

  if (!(await signer.isAvailable())) {
    throw new Error(`Keychain backend "${config.backend}" is not available`);
  }

  // Kit brands its byte types (TransactionMessageBytes, SignatureBytes, Address).
  // fromKitSigner passes real message bytes and base58 addresses, so the cast is
  // safe; it only drops the compile-time brands.
  return fromKitSigner(signer as unknown as KitPartialSigner);
}

/**
 * Resolves a named signer from env (first match wins):
 *   <NAME>_VAULT    JSON VaultAppRoleConfig — HashiCorp Vault via AppRole (production)
 *                   {"addr":"https://vault.example.com:8443","keyName":"oracle-worker",
 *                    "publicKey":"<base58>","roleIdFile":"/etc/oracle/role_id",
 *                    "secretIdFile":"/etc/oracle/secret_id"}
 *   <NAME>_SIGNER   JSON KeychainSignerConfig, e.g. {"backend":"aws-kms",...}
 *   <NAME>_KEYPAIR  path to a solana-keygen JSON file (dev / CI only)
 * Returns undefined if none is set.
 */
export async function loadSignerFromEnv(
  name: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<TxSigner | undefined> {
  const vault = env[`${name}_VAULT`];
  if (vault) {
    return loadVaultSigner(JSON.parse(vault) as VaultAppRoleConfig);
  }

  const config = env[`${name}_SIGNER`];
  if (config) {
    return loadSigner(JSON.parse(config) as KeychainSignerConfig);
  }

  const keypairPath = env[`${name}_KEYPAIR`];
  if (keypairPath) {
    return fromKeypair(await readKeypair(keypairPath));
  }

  return undefined;
}

/**
 * Admin: program authority (init / config). Keep it OFF the server —
 * a hardware wallet or offline keypair used only for rare admin txs.
 * Uses ADMIN_VAULT, ADMIN_SIGNER or ADMIN_KEYPAIR env.
 */
export function loadAdminSigner(): Promise<TxSigner> {
  return loadRequired("ADMIN");
}

/**
 * Worker: the hot key that updates prices. Lives in Vault.
 * Uses WORKER_VAULT (or WORKER_SIGNER / WORKER_KEYPAIR for local dev).
 */
export function loadWorkerSigner(): Promise<TxSigner> {
  return loadRequired("WORKER");
}

export async function loadRequired(name: string): Promise<TxSigner> {
  const fromEnv = await loadSignerFromEnv(name);
  if (!fromEnv) {
    throw new Error(
      `${name} signer not configured: set ${name}_VAULT, ${name}_SIGNER or ${name}_KEYPAIR in .env`
    );
  }
  return fromEnv;
}
