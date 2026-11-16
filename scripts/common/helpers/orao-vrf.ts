import { type OraoVrf } from "../schema/orao-vrf/orao_vrf";
import type { TxSettings } from "../interfaces";
import type { TxResult } from "../tx";
import { logAndReturn } from "../utils/log";
import { ProgramHelpers } from "./base";
import type { IdlAccounts } from "@coral-xyz/anchor";
import { toMessageSigner, type MessageSignerLike } from "../signer";
import {
  PublicKey,
  Ed25519Program,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SystemProgram,
} from "@solana/web3.js";

import * as IOraoVrf from "../interfaces/orao-vrf";
import * as IAOraoVrf from "../interfaces/orao-vrf.anchor";

const ACCOUNT_NETWORK_STATE = "networkState";
const ACCOUNT_RANDOMNESS = "randomnessV2";

const SEED_NETWORK_CONFIG = "orao-vrf-network-configuration";
const SEED_RANDOMNESS_REQUEST = "orao-vrf-randomness-request";

type OraoVrfAccount<T extends keyof IdlAccounts<OraoVrf>> =
  IdlAccounts<OraoVrf>[T];
export type NetworkStateAccount = OraoVrfAccount<typeof ACCOUNT_NETWORK_STATE>;
export type RandomnessAccount = OraoVrfAccount<typeof ACCOUNT_RANDOMNESS>;

export class OraoVrfHelpers extends ProgramHelpers<OraoVrf> {
  async tryInitNetwork(
    args: IOraoVrf.InitNetworkArgs,
    txSettings: TxSettings = {}
  ): Promise<TxResult> {
    // PDA
    const [networkState] = this.pdaNetworkState();

    const ix = await this.program.methods
      .initNetwork(...IAOraoVrf.convertInitNetworkArgs(args))
      .accountsPartial({
        systemProgram: SystemProgram.programId,
        payer: this.senderKey(txSettings),
        networkState,
        treasury: this.senderKey(txSettings),
      })
      .instruction();

    return this.send([ix], txSettings);
  }

  async tryRequest(seed: Uint8Array, txSettings: TxSettings = {}) {
    const {
      config: { treasury },
    } = await this.queryNetworkState();

    // PDA
    const [networkState] = this.pdaNetworkState();
    const [request] = this.pdaRandomness(seed);

    const ix = await this.program.methods
      .requestV2(Array.from(seed))
      .accountsPartial({
        payer: this.senderKey(txSettings),
        networkState,
        treasury,
        request,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    return this.send([ix], txSettings);
  }

  async tryFulfill(
    seed: Uint8Array,
    fulfillmentAuthority: MessageSignerLike,
    txSettings: TxSettings = {}
  ) {
    const [networkState] = this.pdaNetworkState();
    const [request] = this.pdaRandomness(seed);
    const client = await this.queryRequestClient(seed);

    // ORAO’s own authorities fulfill the request automatically on mainnet/devnet
    const authority = toMessageSigner(fulfillmentAuthority);
    const signature = await authority.signMessage(seed);

    const edIx = Ed25519Program.createInstructionWithPublicKey({
      publicKey: authority.publicKey.toBytes(),
      message: seed,
      signature,
    });

    const ix = await this.program.methods
      .fulfillV2()
      .accountsPartial({
        payer: this.senderKey(txSettings),
        instructionAcc: SYSVAR_INSTRUCTIONS_PUBKEY,
        networkState,
        request,
        client,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    return this.send([edIx, ix], txSettings);
  }

  async queryNetworkState(
    isDisplayed: boolean = false
  ): Promise<NetworkStateAccount> {
    const [pda] = this.pdaNetworkState();
    const [res] = await this.fetchAccounts(ACCOUNT_NETWORK_STATE, [pda]);
    return logAndReturn(res, isDisplayed);
  }

  async queryRequest(
    seed: Uint8Array,
    isDisplayed = false
  ): Promise<RandomnessAccount> {
    const [pda] = this.pdaRandomness(seed);
    const [res] = await this.fetchAccounts(ACCOUNT_RANDOMNESS, [pda]);
    return logAndReturn(res, isDisplayed);
  }

  async queryRequestClient(seed: Uint8Array): Promise<PublicKey> {
    const acc = await this.queryRequest(seed);
    const variant = Object.values(acc.request)[0]; // pending or fulfilled
    const inner = variant?.["0"] ?? variant; // tuple variants decode as { 0: ... }
    return inner.client;
  }

  pdaNetworkState(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(SEED_NETWORK_CONFIG)],
      this.program.programId
    );
  }

  pdaRandomness(seed: Uint8Array): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(SEED_RANDOMNESS_REQUEST), Buffer.from(seed)],
      this.program.programId
    );
  }
}
