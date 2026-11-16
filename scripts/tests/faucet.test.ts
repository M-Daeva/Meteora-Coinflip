import { describe, it, expect, beforeAll } from "vitest";
import { PublicKey } from "@solana/web3.js";
import { AppUser } from "./setup/app-user";
import { initTestApp } from "./setup/app";
import { AppToken, ResultType, type App } from "../common";
import { bigint } from "mathjs";
import { shouldFailAsync } from "./setup/assertions";

describe("Faucet", () => {
  const user = new AppUser();
  const adminKeypair = user.getAdmin();
  const worker = user.getWorker();
  const payer = user.getPayer();

  let app: App;
  let token: Record<AppToken, PublicKey>;

  beforeAll(async () => {
    app = await initTestApp(adminKeypair);
    ({ token } = app);
    user.setChain(app.chain);
  });

  it("claim", async () => {
    const CLAIMABLE_AMOUNT = 1_000_000;
    const CLAIM_COOLDOWN = 3_600;

    const [alice] = await user.rotateUsers(1);
    const mint = app.token.USDC;

    await app.faucet.tryInit(
      mint,
      {
        claimableAmount: CLAIMABLE_AMOUNT,
        claimCooldown: CLAIM_COOLDOWN,
      },
      { resultType: ResultType.BroadcastedTx }
    );

    await app.chain.transferTokens(
      bigint(10 * CLAIMABLE_AMOUNT),
      mint,
      adminKeypair.publicKey,
      app.faucet.pdaConfig()[0],
      { resultType: ResultType.BroadcastedTx }
    );

    let aliceBalanceBefore = await app.chain.getAtaBalance(
      alice.publicKey,
      mint
    );

    await app.faucet
      .withSender(alice)
      .tryClaim({ resultType: ResultType.BroadcastedTx });

    let aliceBalanceAfter = await app.chain.getAtaBalance(
      alice.publicKey,
      mint
    );
    expect(aliceBalanceAfter - aliceBalanceBefore).toBe(CLAIMABLE_AMOUNT);

    await shouldFailAsync(
      () =>
        app.faucet
          .withSender(alice)
          .tryClaim({ resultType: ResultType.BroadcastedTx }),
      "ZeroAmount"
    );

    await app.provider.wait(CLAIM_COOLDOWN);

    await app.faucet
      .withSender(alice)
      .tryClaim({ resultType: ResultType.BroadcastedTx });

    aliceBalanceBefore = aliceBalanceAfter;
    aliceBalanceAfter = await app.chain.getAtaBalance(alice.publicKey, mint);
    expect(aliceBalanceAfter - aliceBalanceBefore).toBe(CLAIMABLE_AMOUNT);
  });
});
