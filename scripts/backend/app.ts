import { getLiteSvmProvider, getRpc, readKeypair, rootPath } from "./utils";
import { ResultType } from "../common/interfaces";
import { initApp } from "../../tests/litesvm-suite";
import {
  ADDRESS,
  ADDRESS_DEVNET,
  AppToken,
  Cluster,
  getMintByAppToken,
  PATH,
  PROGRAM,
} from "../common/config";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  getAta,
  getIxsFromEncodedTx,
  getLast,
  getTokenProgramFactory,
  handleTx,
  li,
  Request,
} from "../common/utils";
import { getAltData } from "../common/account/chain";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { ENV } from "./envs";

const CLUSTER: Cluster = Cluster.Mainnet;

async function main() {
  const ownerKeypair = await readKeypair(rootPath(PATH.OWNER_KEYPAIR));
  const app = await initApp(CLUSTER, ownerKeypair);
}

main();
