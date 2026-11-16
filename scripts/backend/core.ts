import { loadAdminSigner } from "./signer.node";
import { Cluster, ResultType } from "../common";
import { initApp } from "./app";

const CLUSTER: Cluster = Cluster.Mainnet;

async function main() {
  const adminSigner = await loadAdminSigner();
  const app = await initApp(CLUSTER, adminSigner);

  await app.oraoVrf.queryNetworkState(true);
}

main();
