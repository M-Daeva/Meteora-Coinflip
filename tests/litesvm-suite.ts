import { statSync } from "fs";
import * as spl from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";
import { AccountInfoBytes, LiteSVM } from "litesvm";
import { ChainHelpers } from "../scripts/common/account/chain";
import { loadIdl } from "../scripts/backend/idl";
import { ResultType } from "../scripts/common/interfaces";
import { expect } from "vitest";
import { App, getHelperSet } from "../scripts/common/account";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  createProvider,
  IBlockchainProvider,
  LiteSvmProvider,
} from "../scripts/common/account/provider";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
} from "@solana/web3.js";
import {
  getAnchorProvider,
  getLiteSvmProvider,
  rootPath,
} from "../scripts/backend/utils";
import {
  ADDRESS,
  AppToken,
  Cluster,
  getMintByAppToken,
  getTokenPubkeySet,
  PROGRAM,
} from "../scripts/common/config";
import {
  AppUser,
  createPriceAccountsMap,
  distributeFunds,
  getPriceByAppTokenLocal,
  INITIAL_SOL_BALANCE_INCREASED,
  INITIAL_TOKEN_BALANCE_INCREASED,
  KEYPAIR_DEFAULT,
  setPriceAccount,
  TOKEN_CONFIG,
  TOKEN_KEYPAIRS,
} from "../scripts/common/config/litesvm";
import {
  getAta,
  getKeypairFromSeed,
  getOrCreateAtaIxs,
  handleTxFactory,
  li,
} from "../scripts/common/utils";

export function shouldFail(fn: () => {}, errorMessage?: string): void {
  try {
    fn();
  } catch (e) {
    if (errorMessage) {
      const message = e instanceof Error ? e.message : String(e);
      expect(message).toContain(errorMessage);
    }

    return expect(0).toBe(0);
  }

  expect(0).toBe(1);
}

export async function shouldFailAsync(
  fn: () => Promise<any>,
  errorMessage?: string
): Promise<void> {
  try {
    await fn();
  } catch (e) {
    if (errorMessage) {
      const message = e instanceof Error ? e.message : String(e);
      expect(message).toContain(errorMessage);
    }

    return expect(0).toBe(0);
  }
  expect(0).toBe(1);
}

/**
 * Initialize LiteSVM environment with balances
 */
export async function initEnvWithBalances(
  liteSvmProvider: LiteSvmProvider,
  chain: ChainHelpers,
  programsToMigrate: string[] = []
): Promise<void> {
  // Create WSOL mint
  await createWSOL(liteSvmProvider);

  const user = new AppUser();
  const userList = [user.getAdmin(), user.getWorker(), user.getPayer()];

  // Airdrop SOL to all users
  for (const keypair of userList) {
    const amount = INITIAL_SOL_BALANCE_INCREASED;
    await chain.requestAirdrop(amount, keypair.publicKey);
  }

  // Create token mints
  for (const [tokenName, mintKeypair] of Object.entries(TOKEN_KEYPAIRS)) {
    if (mintKeypair.publicKey.equals(KEYPAIR_DEFAULT.publicKey)) {
      continue;
    }

    const token = tokenName as AppToken;

    // Skip WSOL (it's native)
    if (token === AppToken.WSOL) {
      continue;
    }

    const config = TOKEN_CONFIG[token];
    await chain.createMint(mintKeypair as Keypair, config.decimals, [], {
      isToken2022: config.isToken2022,
    });
  }

  await distributeFunds(chain, userList);

  // upload programs
  for (const [_k, v] of Object.entries(PROGRAM)) {
    const programName = programsToMigrate.includes(v.NAME)
      ? `${v.NAME}_pre`
      : v.NAME;

    liteSvmProvider.addProgramFromFile(
      v.PROGRAM_ID,
      getProgramPath(programName),
      getDumpsPath(v.NAME)
    );

    // Patch upgrade authority
    liteSvmProvider.setProgramUpgradeAuthority(
      v.PROGRAM_ID,
      userList[0].publicKey // admin
    );
  }

  const tokenList: PublicKey[] = [
    AppToken.USDC,
    AppToken.wBTC,
    AppToken.PYTH,
    AppToken.WSOL,
    AppToken.wETH,
    AppToken.PUMP,
  ].map((x) => getMintByAppToken(Cluster.Localnet, x));

  const programIdList: PublicKey[] = [
    PROGRAM.COINFLIP.PROGRAM_ID,
    PROGRAM.DBC.PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    SystemProgram.programId,
    SYSVAR_INSTRUCTIONS_PUBKEY,
  ];

  const altList: PublicKey[] = [...tokenList, ...programIdList];

  const { altAddress } = await chain.createOrExtendAlt(
    altList,
    undefined,
    undefined,
    {
      resultType: ResultType.BroadcastedTx,
    }
  );

  if (!altAddress.equals(ADDRESS.LOCALNET_ALT)) {
    throw new Error(
      `Generated localnet ALT address ${altAddress} isn't equal config ALT address ${ADDRESS.LOCALNET_ALT}`
    );
  }

  // update slot to activate alt
  liteSvmProvider.wait(10);
}

export function getDeploymentCost(
  litesvm: LiteSVM,
  programSize: number
): number {
  const K = 100;
  const rentExemption = litesvm.minimumBalanceForRentExemption(
    BigInt(programSize)
  );
  const deploymentCost = Number(rentExemption) / LAMPORTS_PER_SOL;
  return Math.ceil(deploymentCost * K) / K;
}

export function getProgramSize(programName: string): number {
  const programPath = getProgramPath(programName);

  try {
    return statSync(programPath).size;
  } catch {
    throw new Error(`${programPath} program isn't found!`);
  }
}

export function getProgramPath(programName: string): string {
  return rootPath(`./target/deploy/${programName}.so`);
}

function getDumpsPath(programName: string): string {
  return rootPath(`./tests/dumps/${programName}.so`);
}

/**
 * Creates a WSOL (Wrapped SOL) mint account in LiteSVM
 * This is needed because WSOL is a special token that wraps native SOL
 */
async function createWSOL(provider: LiteSvmProvider): Promise<void> {
  const MINT_SIZE = 82; // Size of SPL Token Mint account
  // Get minimum balance for rent exemption
  const lamports = await provider.getRentExempt(MINT_SIZE);

  // Create account data buffer
  const data = Buffer.alloc(MINT_SIZE);

  // Pack mint data according to SPL Token Mint layout
  // Layout (as packed by spl_token::state::Mint):
  // - mint_authority (COption<Pubkey>): 4 + 32 bytes (1 byte discriminant + 3 padding + 32 bytes key)
  // - supply: 8 bytes (u64)
  // - decimals: 1 byte (u8)
  // - is_initialized: 1 byte (bool)
  // - freeze_authority (COption<Pubkey>): 4 + 32 bytes

  let offset = 0;

  // mint_authority: Some(unique pubkey)
  data.writeUInt32LE(1, offset); // COption::Some with padding
  offset += 4;
  const mintAuthority = PublicKey.unique();
  const authorityBytes = mintAuthority.toBytes();
  data.set(authorityBytes, offset);
  offset += 32;

  // supply: 0
  data.writeBigUInt64LE(BigInt(0), offset);
  offset += 8;

  // decimals: 9
  data.writeUInt8(9, offset);
  offset += 1;

  // is_initialized: true
  data.writeUInt8(1, offset);
  offset += 1;

  // freeze_authority: None
  data.writeUInt32LE(0, offset); // COption::None with padding
  offset += 4;

  // Create the account
  const mintAccount: AccountInfoBytes = {
    lamports,
    data,
    owner: spl.TOKEN_PROGRAM_ID,
    executable: false,
    rentEpoch: 0,
  };

  // Set the account in LiteSVM
  provider.getLiteSVM().setAccount(NATIVE_MINT, mintAccount);
}

export async function initApp(
  cluster: Cluster,
  adminKeypair?: Keypair,
  programsToMigrate: string[] = []
): Promise<App> {
  // @generated:start:initApp-body
  const { CoinflipIdl, DbcIdl } = loadIdl();
  const anchorProvider = getAnchorProvider(cluster, adminKeypair);
  const provider =
    cluster === Cluster.Localnet
      ? getLiteSvmProvider(adminKeypair)
      : createProvider({ type: "real", provider: anchorProvider });

  const { chain, coinflip, dbc } = getHelperSet(
    provider,
    anchorProvider,
    CoinflipIdl,
    DbcIdl
  );

  if (provider instanceof LiteSvmProvider) {
    try {
      await initEnvWithBalances(provider, chain, programsToMigrate);
    } catch (e) {
      li(e);
    }
  }

  return {
    provider: provider as IBlockchainProvider,
    chain,
    coinflip,
    dbc,
    token: getTokenPubkeySet(cluster),
  };
  // @generated:end:initApp-body
}
