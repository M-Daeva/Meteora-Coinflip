import CoinflipIdl from "../common/schema/idl/coinflip.json";
import DbcIdl from "../common/schema/idl/dbc.json";

export function loadIdl() {
  return { CoinflipIdl, DbcIdl };
}
