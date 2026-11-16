// Role/user keypairs and their funding.
import type { Keypair, TransactionInstruction } from "@solana/web3.js";
import { Cluster } from "../../common/config";
import { handleTx, ResultType, type ChainHelpers } from "../../common";
import {
  getMintKeypairs,
  getTestKeypair,
  INITIAL_SOL_BALANCE_INCREASED,
  INITIAL_TOKEN_BALANCE_INCREASED,
  SEED,
  TOKEN_CONFIG,
} from "./litesvm-config";

export { getTestKeypair, SEED } from "./litesvm-config";

/**
 * Legacy behavior: airdrop INITIAL_SOL_BALANCE_INCREASED SOL to every user, then mint
 * INITIAL_TOKEN_BALANCE_INCREASED of every localnet token (except WSOL) to every user.
 * `chain`'s sender must be the mint authority (the provider signer used in initEnvWithBalances).
 */
export async function distributeFunds(
  chain: ChainHelpers,
  userList: Keypair[]
): Promise<void> {
  if (chain.provider.cluster !== Cluster.Localnet) {
    throw new Error(
      "distributeFunds is LiteSVM-only: it airdrops SOL and mints localnet test tokens"
    );
  }

  for (const user of userList) {
    await chain.requestAirdrop(INITIAL_SOL_BALANCE_INCREASED, user.publicKey);
  }

  for (const [token, mintKeypair] of getMintKeypairs()) {
    const { isToken2022 } = TOKEN_CONFIG[token];

    const fn = async (user: Keypair) => {
      const ixs = chain.mintTokens(
        INITIAL_TOKEN_BALANCE_INCREASED,
        mintKeypair.publicKey,
        user.publicKey,
        { isToken2022, resultType: ResultType.Ixs }
      );

      return ixs as Promise<TransactionInstruction[]>;
    };

    // per user: [createAta?, mintToChecked]
    const ixsPerUser = await Promise.all(userList.map(fn));

    await handleTx(chain.provider, ixsPerUser.flat(), {
      resultType: ResultType.BroadcastedTx,
    });
  }
}

export class AppUser {
  private index: number = SEED.FIRST_USER;
  private chain: ChainHelpers | undefined;

  setChain(chain: ChainHelpers) {
    this.chain = chain;
  }

  getAdmin(): Keypair {
    return getTestKeypair(SEED.ADMIN);
  }

  getPayer(): Keypair {
    return getTestKeypair(SEED.PAYER);
  }

  getWorker(): Keypair {
    return getTestKeypair(SEED.WORKER);
  }

  /** Next `amount` users (funded), without advancing: repeated calls return the same users */
  async getUsers(amount: number): Promise<Keypair[]> {
    if (!this.chain) throw new Error("Set chain first");

    const last = this.index + amount - 1;
    if (last > SEED.MAX) {
      throw new Error(
        `Can't get users out of the list: seed ${last} > ${SEED.MAX}`
      );
    }

    const userList = Array.from({ length: amount }, (_, i) =>
      getTestKeypair(this.index + i)
    );
    await distributeFunds(this.chain, userList);
    return userList;
  }

  /** Next `amount` users (funded), then advances so the next call gets fresh ones */
  async rotateUsers(amount: number): Promise<Keypair[]> {
    const users = await this.getUsers(amount);
    this.index += amount;
    return users;
  }
}
