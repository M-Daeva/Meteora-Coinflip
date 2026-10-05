import { PublicKey } from "@solana/web3.js";
import { AnchorProvider, Idl, Program } from "@coral-xyz/anchor";
import { IBlockchainProvider } from "./provider";
import { getProgram } from "../utils";
import { AppToken, getTokenPubkeySet } from "../config";
import { ChainHelpers } from "./chain";
import { CoinflipHelpers } from "./coinflip";
import { DbcHelpers } from "./dbc";
import { DammV2Helpers } from "./damm-v2";

function getProgramSet<
  IDL_COINFLIP extends Idl,
  IDL_DBC extends Idl,
  IDL_DAMM_V2 extends Idl
>(
  anchorProvider: AnchorProvider,
  CoinflipIdl: any,
  DbcIdl: any,
  DammV2Idl: any
) {
  const coinflipProgram = getProgram<IDL_COINFLIP>(anchorProvider, CoinflipIdl);
  const dbcProgram = getProgram<IDL_DBC>(anchorProvider, DbcIdl);
  const dammV2Program = getProgram<IDL_DAMM_V2>(anchorProvider, DammV2Idl);

  return { coinflipProgram, dbcProgram, dammV2Program };
}

function getHelperSetInternal<
  IDL_COINFLIP extends Idl,
  IDL_DBC extends Idl,
  IDL_DAMM_V2 extends Idl
>(
  provider: IBlockchainProvider,
  coinflipProgram: Program<IDL_COINFLIP>,
  dbcProgram: Program<IDL_DBC>,
  dammV2Program: Program<IDL_DAMM_V2>
) {
  const chain = new ChainHelpers(provider);
  const coinflip = new CoinflipHelpers(provider, coinflipProgram as any);
  const dbc = new DbcHelpers(provider, dbcProgram as any);
  const dammV2 = new DammV2Helpers(provider, dammV2Program as any);

  return {
    chain,
    coinflip,
    dbc,
    dammV2,
  };
}

export function getHelperSet<
  IDL_COINFLIP extends Idl,
  IDL_DBC extends Idl,
  IDL_DAMM_V2 extends Idl
>(
  provider: IBlockchainProvider,
  anchorProvider: AnchorProvider,
  CoinflipIdl: any,
  DbcIdl: any,
  DammV2Idl: any
) {
  const { coinflipProgram, dbcProgram, dammV2Program } = getProgramSet<IDL_COINFLIP, IDL_DBC, IDL_DAMM_V2>(
    anchorProvider,
    CoinflipIdl,
    DbcIdl,
    DammV2Idl
  );

  return getHelperSetInternal(
    provider,
    coinflipProgram,
    dbcProgram,
    dammV2Program
  );
}

export interface App {
  provider: IBlockchainProvider;
  chain: ChainHelpers;
  coinflip: CoinflipHelpers;
  dbc: DbcHelpers;
  dammV2: DammV2Helpers;
  token: ReturnType<typeof getTokenPubkeySet>;
}
