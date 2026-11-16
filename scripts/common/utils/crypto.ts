/**
 * AES-256-GCM encryption with a PBKDF2-derived key, using the native
 * Web Crypto API (globalThis.crypto). Works in browsers, Node.js >= 19,
 * Deno, Bun, Cloudflare Workers and other edge runtimes.
 *
 * Output format (base64): salt (16 bytes) | iv (12 bytes) | ciphertext + auth tag
 */

const PBKDF2_ITERATIONS = 600_000; // OWASP recommendation for PBKDF2-HMAC-SHA256
const SALT_LENGTH = 16;
const IV_LENGTH = 12; // recommended IV size for AES-GCM
const TAG_LENGTH = 16; // AES-GCM auth tag appended to ciphertext

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

async function deriveKey(
  password: string,
  salt: Uint8Array<ArrayBuffer>
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  // Chunk to avoid "Maximum call stack size exceeded" on large inputs
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function fromBase64(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function encrypt(data: string, key: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const cryptoKey = await deriveKey(key, salt);

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      cryptoKey,
      encoder.encode(data)
    )
  );

  const result = new Uint8Array(SALT_LENGTH + IV_LENGTH + ciphertext.length);
  result.set(salt, 0);
  result.set(iv, SALT_LENGTH);
  result.set(ciphertext, SALT_LENGTH + IV_LENGTH);

  return toBase64(result);
}

export async function decrypt(
  encryptedData: string,
  key: string
): Promise<string | undefined> {
  // Wrong key, tampered data or malformed input all end up here
  try {
    const bytes = fromBase64(encryptedData);
    if (bytes.length < SALT_LENGTH + IV_LENGTH + TAG_LENGTH) return;

    const salt = bytes.slice(0, SALT_LENGTH);
    const iv = bytes.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const ciphertext = bytes.slice(SALT_LENGTH + IV_LENGTH);

    const cryptoKey = await deriveKey(key, salt);
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      cryptoKey,
      ciphertext
    );

    return decoder.decode(plaintext);
  } catch {
    return;
  }
}
