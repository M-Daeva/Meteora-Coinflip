import * as spl from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { AppToken, Cluster, TOKEN_MINTS } from "./constants";

export function getTokenPubkeySet(
  cluster: Cluster
): Record<AppToken, PublicKey> {
  const entries = Object.entries(TOKEN_MINTS[cluster]) as [AppToken, string][];
  return Object.fromEntries(
    entries.map(([token, mint]) => [token, new PublicKey(mint)])
  ) as Record<AppToken, PublicKey>;
}

function getTokenListByCluster(cluster: Cluster): Record<AppToken, string> {
  if (cluster === Cluster.Mainnet) {
    return TOKEN_MINTS.Mainnet;
  }

  if (cluster === Cluster.Devnet) {
    return TOKEN_MINTS.Devnet;
  }

  return TOKEN_MINTS.Localnet;
}

export function getAppTokenByMint(cluster: Cluster, mint: PublicKey): AppToken {
  const mintStr = mint.toString();
  const tokenList = getTokenListByCluster(cluster);
  const entry = Object.entries(tokenList).find(([_t, m]) => m === mintStr);
  if (!entry) {
    throw new Error(`${mint} app token isn't found`);
  }
  const [enumValue] = entry;

  const enumKey = Object.keys(AppToken).find(
    (key) => AppToken[key as keyof typeof AppToken] === enumValue
  );

  return enumKey as AppToken;
}

export function getMintByAppToken(
  cluster: Cluster,
  appToken: AppToken
): PublicKey {
  const tokenList = getTokenListByCluster(cluster);
  const mint = tokenList[appToken];
  if (!mint) {
    throw new Error(`${appToken} app token isn't found`);
  }

  return new PublicKey(mint);
}

export function getClusterByMint(mint: PublicKey): Cluster {
  const mintStr = mint.toString();

  if (mint.equals(spl.NATIVE_MINT)) {
    throw new Error("WSOL cluster can't be identified");
  }

  if (Object.entries(TOKEN_MINTS.Mainnet).find(([_t, m]) => m === mintStr)) {
    return Cluster.Mainnet;
  }

  if (Object.entries(TOKEN_MINTS.Devnet).find(([_t, m]) => m === mintStr)) {
    return Cluster.Devnet;
  }

  if (Object.entries(TOKEN_MINTS.Localnet).find(([_t, m]) => m === mintStr)) {
    return Cluster.Localnet;
  }

  throw new Error(`${mint} cluster isn't found`);
}
