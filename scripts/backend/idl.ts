import CoinflipIdl from "../common/schema/idl/coinflip.json";
import DbcIdl from "../common/schema/dbc/dynamic_bonding_curve.json";
import DammV2Idl from "../common/schema/damm-v2/damm_v2.json";

export function loadIdl() {
  return { CoinflipIdl, DbcIdl, DammV2Idl };
}
