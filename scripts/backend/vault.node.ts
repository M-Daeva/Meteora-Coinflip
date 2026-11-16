// NODE ONLY. HashiCorp Vault signer with AppRole auth and automatic re-login.
//
// The private key never leaves Vault: this module only sends message bytes to
// `transit/sign/<key>` (through the signing-guard) and gets a signature back.
//
// Why not just put a token in <NAME>_SIGNER? A static Vault token is a
// long-lived bearer secret. AppRole gives short-lived tokens (1h, bound to the
// backend IP) that are re-issued here from role_id + secret_id.
import { readFile } from "node:fs/promises";
import { createKeychainSigner } from "@solana/keychain";
import { PublicKey } from "@solana/web3.js";
import { fromKitSigner, type KitPartialSigner, type TxSigner } from "../common";

export interface VaultAppRoleConfig {
  /** signing-guard URL, e.g. https://vault.example.com:8443 (HTTPS is mandatory) */
  addr: string;
  /** transit key name */
  keyName: string;
  /** Expected Solana address of the key. Pinned: a different key is refused. */
  publicKey: string;
  roleId?: string;
  roleIdFile?: string;
  secretId?: string;
  secretIdFile?: string;
  /** Re-login this many seconds before the token expires (default 300) */
  refreshMarginS?: number;
}

interface Session {
  signer: TxSigner;
  expiresAt: number; // ms epoch
}

async function secret(
  inline: string | undefined,
  file: string | undefined,
  name: string
): Promise<string> {
  if (inline) return inline.trim();
  if (file) return (await readFile(file, "utf8")).trim();
  throw new Error(`Vault config: ${name} or ${name}File is required`);
}

/** Vault/guard HTTP status from a keychain SignerError, if any */
function remoteError(e: unknown): { status?: number; response?: string } {
  const ctx = (e as { context?: { status?: unknown; response?: unknown } })
    ?.context;
  return {
    status: typeof ctx?.status === "number" ? ctx.status : undefined,
    response: typeof ctx?.response === "string" ? ctx.response : undefined,
  };
}

/** Token expired / revoked → worth one re-login. Policy rejections are NOT retried. */
function isTokenError(e: unknown): boolean {
  const { status, response = "" } = remoteError(e);
  return (
    status === 403 &&
    !response.includes("signing-guard") &&
    /permission denied|missing client token|invalid token/i.test(response)
  );
}

export async function loadVaultSigner(
  cfg: VaultAppRoleConfig
): Promise<TxSigner> {
  const addr = cfg.addr.replace(/\/+$/, "");
  const roleId = await secret(cfg.roleId, cfg.roleIdFile, "roleId");
  const secretId = await secret(cfg.secretId, cfg.secretIdFile, "secretId");
  const marginMs = (cfg.refreshMarginS ?? 300) * 1000;
  const publicKey = new PublicKey(cfg.publicKey);

  async function login(): Promise<Session> {
    const res = await fetch(`${addr}/v1/auth/approle/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role_id: roleId, secret_id: secretId }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await res.json().catch(() => ({}))) as {
      auth?: { client_token: string; lease_duration: number };
      errors?: string[];
    };
    if (!res.ok || !body.auth) {
      throw new Error(
        `Vault AppRole login failed (${res.status}): ${
          body.errors?.join("; ") ?? "no auth in response"
        }`
      );
    }

    const kit = await createKeychainSigner({
      backend: "vault",
      vaultAddr: addr,
      vaultToken: body.auth.client_token,
      keyName: cfg.keyName,
      publicKey: cfg.publicKey,
    });
    // Checks the key is ed25519, can sign, and its latest version == publicKey
    if (!(await kit.isAvailable())) {
      throw new Error(
        `Vault key "${cfg.keyName}" is unavailable or does not match ${cfg.publicKey}`
      );
    }

    return {
      // see signer.node.ts: the cast only drops Kit's compile-time brands
      signer: fromKitSigner(kit as unknown as KitPartialSigner),
      expiresAt: Date.now() + body.auth.lease_duration * 1000,
    };
  }

  let session = await login();
  let pending: Promise<Session> | undefined;

  /** Single-flight refresh: concurrent signers share one login */
  function refresh(): Promise<Session> {
    pending ??= login()
      .then((s) => (session = s))
      .finally(() => (pending = undefined));
    return pending;
  }

  async function current(): Promise<Session> {
    return Date.now() < session.expiresAt - marginMs ? session : refresh();
  }

  return {
    publicKey,
    async signAllTransactions(txs) {
      const s = await current();
      try {
        return await s.signer.signAllTransactions(txs);
      } catch (e) {
        if (!isTokenError(e)) throw describe(e);
        // ed25519 signing is deterministic, so retrying the same message is safe
        const fresh = await refresh();
        return fresh.signer.signAllTransactions(txs);
      }
    },
  };
}

/** Surface the guard's / Vault's reason instead of a bare "API error: 403" */
function describe(e: unknown): Error {
  const { status, response } = remoteError(e);
  if (status && response) {
    return new Error(`Vault signing refused (${status}): ${response}`, {
      cause: e,
    });
  }
  return e instanceof Error ? e : new Error(String(e));
}
