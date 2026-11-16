import { Connection } from "@solana/web3.js";
import { loadAdminSigner } from "./signer.node";
import { getRpc } from "./utils";
import {
  COMMITMENT,
  getHelperSet,
  getTokenPubkeySet,
  readonlyAnchorProvider,
  RpcProvider,
  toTxSigner,
  type App,
  type Cluster,
  type SignerLike,
} from "../common";

/**
 * @param admin default signer (fee payer + default sender).
 *   If omitted: ADMIN_SIGNER or ADMIN_KEYPAIR env.
 */
export async function initApp(
  cluster: Cluster,
  admin?: SignerLike
): Promise<App> {
  // @generated:start:initApp-body
  const signer = admin ? toTxSigner(admin) : await loadAdminSigner();
  const connection = new Connection(getRpc(cluster), COMMITMENT);
  const provider = new RpcProvider(connection, signer, cluster);

  const { chain, coinflip, faucet, dbc, dammV2, oraoVrf } = getHelperSet(
    provider,
    readonlyAnchorProvider(connection, signer.publicKey)
  );

  return {
    provider,
    chain,
    coinflip,
    faucet,
    dbc,
    dammV2,
    oraoVrf,
    token: getTokenPubkeySet(cluster),
  };
  // @generated:end:initApp-body
}
