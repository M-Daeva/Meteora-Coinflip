import path from "path";
import * as anchor from "@coral-xyz/anchor";
import { Keypair } from "@solana/web3.js";
import { readFile, writeFile } from "fs/promises";
import { ComputeBudget, LiteSVM } from "litesvm";
import { AnchorProvider } from "@coral-xyz/anchor";
import { Network } from "../common/interfaces";
import { AppUser } from "../common/config/litesvm";
import { createProvider, LiteSvmProvider } from "../common/account/provider";
import { floor, getLast, getProvider } from "../common/utils";
import { ENV } from "./envs";
import {
  networks,
  ProgramName,
  UTILS,
  PATH,
  Cluster,
  COMMITMENT,
} from "../common/config";

const { ENCODING, MS_PER_SECOND } = UTILS;

export function rootPath(dir: string): string {
  return path.resolve(__dirname, "../../", dir);
}

export function parseNetwork(): Network {
  const data = (getLast(process.argv)?.trim() || "").toUpperCase();

  if ((networks as readonly string[]).includes(data)) {
    return data as Network;
  } else {
    throw new Error(`Invalid network name: ${data}`);
  }
}

export function getSnapshotPath(network: Network, fileName: string) {
  return rootPath(
    `./scripts/backend/snapshots/${network.toLocaleLowerCase()}/${fileName}`
  );
}

/**
 * Converts a Unix epoch time (in seconds) to a human-readable date string in the format "DD.MM.YYYY HH:MM:SS".
 * @param unixTimestamp Unix epoch time in seconds
 * @returns Human-readable date string in the format "DD.MM.YYYY HH:MM:SS"
 */
export function epochToDateString(unixTimestamp: number): string {
  const date = new Date(unixTimestamp * 1000);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");

  return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * Converts a human-readable date string in the format "DD.MM.YYYY HH:MM:SS" to a Unix epoch time (in seconds).
 * @param dateString Human-readable date string in the format "DD.MM.YYYY HH:MM:SS"
 * @returns Unix epoch time in seconds
 */
export function dateStringToEpoch(dateString: string): number {
  const [date, time] = dateString.split(" ");
  const [day, month, year] = date.split(".");
  const [hours, minutes, seconds] = time.split(":");
  const timestamp = new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hours),
    parseInt(minutes),
    parseInt(seconds)
  );

  return Math.floor(timestamp.getTime() / 1000);
}

/**
 * Converts a Unix epoch time (in seconds) to a human-readable date string in the format "DD.MM.YYYY HH:MM:SS" (UTC).
 * @param unixTimestamp Unix epoch time in seconds
 * @returns Human-readable date string in the format "DD.MM.YYYY HH:MM:SS" (UTC)
 */
export function epochToDateStringUTC(unixTimestamp: number): string {
  const date = new Date(unixTimestamp * 1000);
  const day = date.getUTCDate().toString().padStart(2, "0");
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const year = date.getUTCFullYear();
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  const seconds = date.getUTCSeconds().toString().padStart(2, "0");

  return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * Converts a human-readable date string in the format "DD.MM.YYYY HH:MM:SS" to a Unix epoch time (in seconds) (UTC).
 * @param dateString Human-readable date string in the format "DD.MM.YYYY HH:MM:SS"
 * @returns Unix epoch time in seconds (UTC)
 */
export function dateStringToEpochUTC(dateString: string): number {
  const [date, time] = dateString.split(" ");
  const [day, month, year] = date.split(".");
  const [hours, minutes, seconds] = time.split(":");
  const timestamp = new Date(
    Date.UTC(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hours),
      parseInt(minutes),
      parseInt(seconds)
    )
  );

  return Math.floor(timestamp.getTime() / 1000);
}

export function dateToTimestamp(date?: Date): number {
  return floor((date?.getTime() || 0) / MS_PER_SECOND);
}

export function toDate(value: Date | number): Date {
  return typeof value === "number" ? timestampToDate(value) : value;
}

function timestampToDate(timestamp: number): Date {
  return new Date(timestamp * MS_PER_SECOND);
}

export async function specifyTimeout(
  promise: Promise<any>,
  timeout: number = 5_000,
  exception: Function = () => {
    throw new Error("Timeout!");
  }
) {
  let timer: NodeJS.Timeout;

  return Promise.race([
    promise,
    new Promise((_r, rej) => (timer = setTimeout(rej, timeout, exception))),
  ]).finally(() => clearTimeout(timer));
}

export async function readKeypair(keypairPath: string): Promise<Keypair> {
  const secretKey = await readFile(keypairPath, {
    encoding: ENCODING as BufferEncoding,
  }).then(JSON.parse);

  return Keypair.fromSecretKey(new Uint8Array(secretKey));
}

export async function writeKeypair(
  keypairPath: string,
  keypair: anchor.web3.Keypair
): Promise<void> {
  await writeFile(keypairPath, JSON.stringify(Array.from(keypair.secretKey)), {
    encoding: ENCODING as BufferEncoding,
  });
}

export function getKeypairPath(program: ProgramName): string {
  return rootPath(
    `./target/deploy/${program.toLowerCase()}-data-account-keypair.json`
  );
}

export function getRpc(networkOrCluster: Network | Cluster): string {
  let rpc: string | undefined = ENV.LOCALNET_RPC_URL;

  if (networkOrCluster === "MAINNET" || networkOrCluster === Cluster.Mainnet) {
    rpc = ENV.MAINNET_RPC_URL;
  }

  if (networkOrCluster === "DEVNET" || networkOrCluster === Cluster.Devnet) {
    rpc = ENV.DEVNET_RPC_URL;
  }

  if (rpc === undefined) {
    throw new Error("RPC env isn't found");
  }

  return rpc;
}

export function getWallet(ownerKeypair: Keypair): anchor.Wallet {
  return new anchor.Wallet(ownerKeypair);
}

export function getAnchorProvider(
  cluster: Cluster,
  keypair?: Keypair
): AnchorProvider {
  const rpc = getRpc(cluster);
  const kp = keypair || new Keypair();
  const wallet = getWallet(kp);
  return getProvider(wallet, rpc, COMMITMENT);
}

export function getLiteSvmProvider(keypair?: Keypair): LiteSvmProvider {
  const kp = keypair || new Keypair();

  // .withComputeBudget({
  //   computeUnitLimit: BigInt(10_000_000),
  //   heapSize: 256 * 1024,
  //   loaded_accounts_data_size_limit: BigInt(64 * 1024 * 1024),
  // }
  let budget = new ComputeBudget();
  budget.computeUnitLimit = BigInt(10_000_000);
  budget.heapSize = 256 * 1_024;

  const litesvm = new LiteSVM().withDefaultPrograms().withComputeBudget(budget);

  return new LiteSvmProvider(kp, litesvm);
}

export function getProviderSet(cluster: Cluster, keypair?: Keypair) {
  const kp = keypair || new Keypair();
  const anchorProvider = getAnchorProvider(cluster, kp);
  const liteSvmProvider = getLiteSvmProvider(kp);

  const targetProvider =
    cluster === Cluster.Localnet
      ? liteSvmProvider
      : createProvider({
          type: "real",
          provider: anchorProvider,
        });

  return { targetProvider, anchorProvider };
}

export async function updateAddresses(
  keypairList: [ProgramName, anchor.web3.Keypair][]
): Promise<void> {
  const filePath = rootPath(PATH.TO_CONFIG);

  // Read the file content
  let content = await readFile(filePath, ENCODING as BufferEncoding);

  // For each key-value pair, update the corresponding PROGRAM_ADDRESS field
  for (const [key, newValue] of keypairList) {
    const regex = new RegExp(`(\\b${key}\\b\\s*:\\s*")[^"]*(")`, "g");
    content = content.replace(regex, `$1${newValue.publicKey.toString()}$2`);
  }

  // Write the updated content back to the file
  await writeFile(filePath, content, ENCODING as BufferEncoding);
}

export async function getAdminKeypair(cluster: Cluster): Promise<Keypair> {
  return cluster === Cluster.Localnet
    ? new AppUser().getAdmin()
    : await readKeypair(rootPath(PATH.OWNER_KEYPAIR));
}
