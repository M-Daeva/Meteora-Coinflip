import CoinflipIdl from "../common/schema/idl/coinflip.json";
import DbcIdl from "../common/schema/dbc/dynamic_bonding_curve.json";
import DammV2Idl from "../common/schema/damm-v2/damm_v2.json";
import OraoVrfIdl from "../common/schema/orao-vrf/orao_vrf.json";

export function loadIdl() {
  return { CoinflipIdl, DbcIdl, DammV2Idl, OraoVrfIdl };
}
