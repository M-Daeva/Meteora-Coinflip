import { describe, it, expect, beforeAll } from "vitest";
import { ResultType } from "../scripts/common/interfaces";
import { initApp, shouldFailAsync } from "./litesvm-suite";
import { AppUser } from "../scripts/common/config/litesvm";
import { AccountInfo, Keypair, PublicKey } from "@solana/web3.js";
import { App } from "../scripts/common/account";
import { unpack as unpackTokenMetadata } from "@solana/spl-token-metadata";
import * as spl from "@solana/spl-token";
import { IBlockchainProvider } from "../scripts/common/account/provider";
import { getKeypairFromSeed, li } from "../scripts/common/utils";
import {
  ExtensionType,
  getExtensionData,
  getExtensionTypes,
  getMetadataPointerState,
  unpackMint,
} from "@solana/spl-token";
import {
  AppToken,
  Cluster,
  getMintByAppToken,
  PROGRAM,
} from "../scripts/common/config";

const CLUSTER: Cluster = Cluster.Localnet;

describe("Coinflip", () => {
  const ROUNDS_LEN = 4;

  const user = new AppUser();
  const adminKeypair = user.getAdmin();
  const _worker = user.getWorker();
  const payer = user.getPayer();

  let app: App;
  let token: Record<AppToken, PublicKey>;

  beforeAll(async () => {
    app = await initApp(CLUSTER, adminKeypair);
    ({ token } = app);
    user.setChain(app.chain);
  });

  it("create presale", async () => {
    const presaleMintKp = getKeypairFromSeed(2_000);
  });
});
