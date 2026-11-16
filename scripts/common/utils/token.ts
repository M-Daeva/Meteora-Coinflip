import * as spl from "@solana/spl-token";
import type { GetAtaParams } from "../interfaces";
import type { IBlockchainProvider } from "../provider/interface";
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";

export function getAta({ mint, owner, tokenProgram }: GetAtaParams): PublicKey {
  return PublicKey.findProgramAddressSync(
    [
      new PublicKey(owner).toBuffer(),
      new PublicKey(tokenProgram).toBuffer(),
      new PublicKey(mint).toBuffer(),
    ],
    spl.ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
}

export async function getOrCreateAtaIxs(
  provider: IBlockchainProvider,
  payer: PublicKey,
  mint: PublicKey,
  owner: PublicKey,
  tokenProgram: PublicKey
): Promise<{ ata: PublicKey; ixs: TransactionInstruction[] }> {
  const ata = getAta({ mint, owner, tokenProgram });

  if (await provider.getAccountInfo(ata)) {
    return { ata, ixs: [] };
  }

  const ix = spl.createAssociatedTokenAccountInstruction(
    payer,
    ata,
    owner,
    mint,
    tokenProgram,
    spl.ASSOCIATED_TOKEN_PROGRAM_ID
  );

  return { ata, ixs: [ix] };
}

export function getTokenProgramFactory(provider: IBlockchainProvider) {
  return async (mint: PublicKey, isToken2022?: boolean): Promise<PublicKey> => {
    if (isToken2022 === true) return spl.TOKEN_2022_PROGRAM_ID;
    if (isToken2022 === false) return spl.TOKEN_PROGRAM_ID;

    // SOL is represented by PublicKey.default
    if (mint.equals(PublicKey.default)) {
      throw new Error(`Mint ${mint.toBase58()} represents Sol`);
    }

    const mintAccount = await provider.getAccountInfo(mint);
    if (!mintAccount) {
      throw new Error(
        `Mint account ${mint.toBase58()} not found on ${provider.cluster}. ` +
          `Make sure you're connected to the correct cluster.`
      );
    }

    const { owner } = mintAccount;
    if (owner.equals(spl.TOKEN_PROGRAM_ID)) return spl.TOKEN_PROGRAM_ID;
    if (owner.equals(spl.TOKEN_2022_PROGRAM_ID))
      return spl.TOKEN_2022_PROGRAM_ID;

    if (owner.equals(SystemProgram.programId)) {
      throw new Error(
        `Account ${mint.toBase58()} is owned by System Program on ${
          provider.cluster
        }. ` + `This mint may not exist on this cluster.`
      );
    }

    throw new Error(
      `Unknown token program: ${owner.toBase58()}. Expected TOKEN_PROGRAM_ID or TOKEN_2022_PROGRAM_ID.`
    );
  };
}

/** Reads decimals from the mint account; validates it's owned by a token program. */
export async function getDecimals(
  provider: IBlockchainProvider,
  mint: PublicKey,
  tokenProgram?: PublicKey
): Promise<number> {
  const mintAccount = await provider.getAccountInfo(mint);
  if (!mintAccount) {
    throw new Error(`Mint account ${mint.toBase58()} not found`);
  }

  return spl.unpackMint(mint, mintAccount, tokenProgram ?? mintAccount.owner)
    .decimals;
}

/** true if a Token-2022 mint has the transfer hook extension */
export async function hasTransferHookExtension(
  provider: IBlockchainProvider,
  mint: PublicKey
): Promise<boolean> {
  try {
    const accountInfo = await provider.getAccountInfo(mint);
    if (!accountInfo?.owner.equals(spl.TOKEN_2022_PROGRAM_ID)) {
      return false;
    }

    const mintInfo = spl.unpackMint(
      mint,
      accountInfo,
      spl.TOKEN_2022_PROGRAM_ID
    );
    return spl.getTransferHook(mintInfo) !== null;
  } catch {
    return false;
  }
}

/** true if a mint has any Token-2022 extensions (account larger than a basic mint) */
export async function hasAnyExtension(
  provider: IBlockchainProvider,
  mint: PublicKey
): Promise<boolean> {
  try {
    const accountInfo = await provider.getAccountInfo(mint);
    return !!accountInfo && accountInfo.data.length > spl.MINT_SIZE;
  } catch {
    return false;
  }
}
