import { PublicKey } from "@solana/web3.js";

// Node ≥ 20.16 / 22.3 and Bun support this; undefined in browsers
const util: typeof import("node:util") | undefined =
  typeof process !== "undefined"
    ? (process as any).getBuiltinModule?.("node:util")
    : undefined;

export const l = console.log.bind(console);

export function li(object: unknown): void {
  const clean = normalize(object);
  if (util) {
    console.log(util.inspect(clean, { depth: null, colors: true }));
  } else {
    console.log(clean); // browser DevTools
  }
}

export function logAndReturn<T>(object: T, isDisplayed: boolean = false): T {
  if (isDisplayed) {
    l();
    li(object);
    l();
  }
  return object;
}

function normalize(value: unknown): unknown {
  if (value instanceof PublicKey) return value.toBase58();
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    if ((value as any).constructor?.name === "BN")
      return (value as any).toString();
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, normalize(v)])
    );
  }
  return value;
}
