import { PublicKey } from "@solana/web3.js";
import { AnchorProvider, Idl, Program } from "@coral-xyz/anchor";
import { IBlockchainProvider } from "./provider";
import { getProgram } from "../utils";
import { AppToken, getTokenPubkeySet } from "../config";
import { ChainHelpers } from "./chain";
import { CoinflipHelpers } from "./coinflip";
import { DbcHelpers } from "./dbc";

function getProgramSet<
  IDL_COINFLIP extends Idl,
  IDL_DBC extends Idl
>(
  anchorProvider: AnchorProvider,
  CoinflipIdl: any,
  DbcIdl: any
) {
  const coinflipProgram = getProgram<IDL_COINFLIP>(anchorProvider, CoinflipIdl);
  const dbcProgram = getProgram<IDL_DBC>(anchorProvider, DbcIdl);

  return { coinflipProgram, dbcProgram };
}

function getHelperSetInternal<
  IDL_COINFLIP extends Idl,
  IDL_DBC extends Idl
>(
  provider: IBlockchainProvider,
  coinflipProgram: Program<IDL_COINFLIP>,
  dbcProgram: Program<IDL_DBC>
) {
  const chain = new ChainHelpers(provider);
  const coinflip = new CoinflipHelpers(provider, coinflipProgram as any);
  const dbc = new DbcHelpers(provider, dbcProgram as any);

  return {
    chain,
    coinflip,
    dbc,
  };
}

export function getHelperSet<
  IDL_COINFLIP extends Idl,
  IDL_DBC extends Idl
>(
  provider: IBlockchainProvider,
  anchorProvider: AnchorProvider,
  CoinflipIdl: any,
  DbcIdl: any
) {
  const { coinflipProgram, dbcProgram } = getProgramSet<IDL_COINFLIP, IDL_DBC>(
    anchorProvider,
    CoinflipIdl,
    DbcIdl
  );

  return getHelperSetInternal(
    provider,
    coinflipProgram,
    dbcProgram
  );
}

export interface App {
  provider: IBlockchainProvider;
  chain: ChainHelpers;
  coinflip: CoinflipHelpers;
  dbc: DbcHelpers;
  token: ReturnType<typeof getTokenPubkeySet>;
}
