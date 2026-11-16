// The initTestApp body between the @generated markers is rewritten
// by scripts/backend/update-program-set.ts — edit the generator, not the body.
// `export async function prepare*(...)` functions declared in this file are called by the
// generated body when every param resolves to provider / chain / a program helper.
import { LiteSvmProvider } from "./litesvm-provider";
import { AppUser, distributeFunds } from "./app-user";
import { getRpc } from "../../backend/utils";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Connection,
  PublicKey,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
} from "@solana/web3.js";
import {
  ALT,
  Cluster,
  getMintByAppToken,
  getTokenPubkeySet,
  PROGRAM,
} from "../../common/config";
import {
  ALT_TOKENS,
  getDumpsPath,
  getMintKeypairs,
  getProgramPath,
  INITIAL_SOL_BALANCE_INCREASED,
  TOKEN_CONFIG,
} from "./litesvm-config";
import {
  dedupPubkey,
  getHelperSet,
  readonlyAnchorProvider,
  ResultType,
  toTxSigner,
  type App,
  type ChainHelpers,
  type SignerLike,
} from "../../common";

/**
 *  1. WSOL — provided by createLiteSvm().withNativeMints()
 *  2. airdrop roles (+ provider signer if it isn't one)
 *  3. create every localnet mint (authority = provider signer)
 *  4. distributeFunds(roles): +SOL and tokens. Roles end with 2× INITIAL_SOL_BALANCE_INCREASED
 *  5. load every PROGRAM (target/deploy/<name>[_pre].so, fallback dumps/<name>.so), upgrade authority = admin
 *  6. create the localnet ALT and check it matches ALT.LOCALNET
 *
 * @param programsToMigrate PROGRAM NAMEs loaded from target/deploy/<name>_pre.so
 */
export async function initEnvWithBalances(
  provider: LiteSvmProvider,
  chain: ChainHelpers,
  programsToMigrate: string[] = []
): Promise<void> {
  const resultType = ResultType.BroadcastedTx;

  const user = new AppUser();
  const admin = user.getAdmin();
  const userList = [admin, user.getWorker(), user.getPayer()];

  // provider signer pays fees and creates mints — fund it even if it isn't a role
  const owners = dedupPubkey([
    provider.signer.publicKey,
    ...userList.map((x) => x.publicKey),
  ]);
  for (const owner of owners) {
    await chain.requestAirdrop(INITIAL_SOL_BALANCE_INCREASED, owner);
  }

  for (const [token, mintKeypair] of getMintKeypairs()) {
    const { decimals, isToken2022 } = TOKEN_CONFIG[token];
    await chain.createMint(mintKeypair, decimals, [], {
      isToken2022,
      resultType,
    });
  }

  await distributeFunds(chain, userList);

  for (const { NAME, PROGRAM_ID } of Object.values(PROGRAM)) {
    const programName = programsToMigrate.includes(NAME) ? `${NAME}_pre` : NAME;
    provider.addProgramFromFile(
      PROGRAM_ID,
      [getProgramPath(programName), getDumpsPath(NAME)],
      admin.publicKey
    );
  }

  const tokenList: PublicKey[] = ALT_TOKENS.map((x) =>
    getMintByAppToken(Cluster.Localnet, x)
  );
  const programIdList: PublicKey[] = [
    ...Object.values(PROGRAM).map((x) => x.PROGRAM_ID),
    TOKEN_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    SystemProgram.programId,
    SYSVAR_INSTRUCTIONS_PUBKEY,
  ];

  const { altAddress } = await chain.createOrExtendAlt(
    [...tokenList, ...programIdList],
    undefined,
    undefined,
    { resultType }
  );

  // ALT address = f(authority = provider signer, recent slot): changes only if those do
  if (!altAddress.equals(ALT.LOCALNET)) {
    throw new Error(
      `Generated localnet ALT address ${altAddress} isn't equal config ALT address ${ALT.LOCALNET}`
    );
  }

  // update slot to activate alt
  await provider.wait(10);
}

export async function initTestApp(
  admin: SignerLike,
  programsToMigrate: string[] = []
): Promise<App> {
  // @generated:start:initTestApp-body
  const CLUSTER = Cluster.Localnet;

  const signer = toTxSigner(admin);
  const provider = new LiteSvmProvider(signer);
  const connection = new Connection(getRpc(CLUSTER));
  const { chain, coinflip, faucet, dbc, dammV2, oraoVrf } = getHelperSet(
    provider,
    readonlyAnchorProvider(connection, signer.publicKey)
  );

  await initEnvWithBalances(provider, chain, programsToMigrate);

  return {
    provider,
    chain,
    coinflip,
    faucet,
    dbc,
    dammV2,
    oraoVrf,
    token: getTokenPubkeySet(CLUSTER),
  };
  // @generated:end:initTestApp-body
}
