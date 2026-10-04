import { AppToken } from ".";
import { Keypair, PublicKey } from "@solana/web3.js";
import { TokenConfig } from "../interfaces";
import { getKeypairFromBase58, getKeypairFromSeed } from "../utils";
import { ChainHelpers } from "../account/chain";

export const KEYPAIR_DEFAULT: Keypair = getKeypairFromSeed(999);
export const TOKEN_CONFIG_DEFAULT: TokenConfig = {
  decimals: 0,
  isToken2022: false,
};
export const MARKET_INDEX_DEFAULT = 999;
export const PRICE_DEFAULT = 0;

export class AppUser {
  private index: number = 3;
  private chain: ChainHelpers | undefined;

  setChain(chain: ChainHelpers) {
    this.chain = chain;
  }

  getAdmin(): Keypair {
    return getKeypairFromBase58(USER_KEYPAIR_LIST[0]);
  }

  getPayer(): Keypair {
    return getKeypairFromBase58(USER_KEYPAIR_LIST[1]);
  }

  getWorker(): Keypair {
    return getKeypairFromBase58(USER_KEYPAIR_LIST[2]);
  }

  async getUsers(amount: number): Promise<Keypair[]> {
    const from = this.index;
    const to = from + amount;

    if (!this.chain) {
      throw new Error("Set chain first");
    }

    const userList = USER_KEYPAIR_LIST.slice(from, to).map(
      getKeypairFromBase58
    );
    if (userList.length !== amount) {
      throw new Error("Can't get users out of the list");
    }

    await distributeFunds(this.chain, userList);
    return userList;
  }

  async rotateUsers(amount: number): Promise<Keypair[]> {
    const users = await this.getUsers(amount);
    this.index += amount;
    return users;
  }
}

export const USER_KEYPAIR_LIST: string[] = [
  "3SKiuW2cbAJH8KDAuhB5cdJnAGU8Y9a95gRWMFB6zPy8XH45HTNebRALhL1EqPv2QkBytb8iTu577TcmLutkzC9g",
  "4zsyCjxiHFXws2HssDaF1KZqunkigFGk7oPothX55Tsi7J8c2svePCqXgsgMZMbrYg7Y6T6JhBWaA9fnLQEUAud1",
  "5TkYw4zWQ6bYghikqeKgtUF5Jz1hqtVjquWKRhsogcFbMGatz1upnw5Qdc6FS25ZjrqM6gQB9C7uz5GuBHeXAbx4",
  "3WZHp3xH9cy2jRswpk6445AYgy8k1W7DPH3k3AAotVc3AmFK8K21wVKB83VkaWrcDeQhqGJNmFN22bnq12cG3oGr",
  "52Gep6ab2PbC6jTTGzJfHXDMnrJc8nTYMiUA5ag4vknDma3Emo4ZioN2XSCGPZqhDCUr9oRSai38kzFQQgfxZYxy",
  "39mYPmMpPz2hdMfyFxCP1xL9MzwcbPP1FFWRu8P2M69Fmuu829DmtJeqa5AVd9mEQFofU8SxEM2HKjQkvp5BqJJ1",
  "5Ma4UJiaeYse2aP4uLjA2JKj9PbsGs7nFy3YFvieEVJPDb1fARUbicHLFJzM9eNaqTcmvjQrM9C9q5agRnsypsig",
  "tthURADpsaDFM7AoyikejHoKpHkbU11wWuQLkkFSS68hfeUL2An2C7KtJcYtDHgpz8itkWGxjnMKWNMtkGMGMfy",
  "5yn4g1NkK9tTjoN7QHuj1u8rNu6onxTsNxRAERm8wazixWcmU1yyLDjtkn6wQtasK3UxnhEv4u7Mh2x26dhkGhLm",
  "3dSPLfiyuZ1GRc4KicEnPK9uQrM7Sw6wfJrqfmTARx5qSPH6ky1BW6h8mE19Ybw9wLwunJJ3sy1RSUm8YzAwWBXq",
  "3215BqEEdLu7rL4M5e9Zy1oogoKavsqQz8e8RUt9Py8f86AWGDaBQ9yhWbupmmLPGHoTg4MY5ndpjSnZgDYeZpqr",
  "5ouRm1vXULiCBgNXHScgL7FX2uQfnB5Vo4PhvCBJNok5uQK9VMJzP8Wf4WnKVD4fzJVPtNeHGXiLciAuJPJVy379",
  "4wXxtbcKifsXgnMZsHxJn4frJ4WJEri5ZTFpzgn9Crete4aHrRP2gsvQ9jFc1E4oKfNAnNwcEoy2j59ijttXYc5g",
  "362Peg5z1rExvTPd5JTt4f4woLaczocG64xcowbFmAifixFsHLQJec7VvN9JLS5jQucvtbhauZKKeU5bRHdLXLhj",
  "3Qr6vA8US2dBUMiYJvYRQukshDL6HeHEeW3iA3xCKiWNdJL52tUHz6hXbAMMEGyUvqSYZmdKZbhweDzCUfWmJfWN",
  "4gJ8LUJrnXMZDnVxCuLYwA4EDzn3QwhnirHAXC52s7RMZnHvjC3WDjmGjS9Dd6931z9a28HHcLmDfS9JVN2Km8fq",
  "3SrkHEB9bjeCnXBQLU5KCX8tiR4nqfha1HwndcW7cmrPTJyfJpxmjK99haAje6vcQP5YFzmYRf3imUYmjbP4UE5v",
  "4VfgqvNjve3CSBUjzgWkY3jNh59pBhzsquo7DTVLytQLGQxaFqTCmDeSxtWdq4a8wKZ1tHoVZ1ZxzUW1tGgM9tq1",
  "64ipFuP2gxR63KBKMyoaPUhCjvLQHqB42YSjnowSvxsMokZGXtKjDANF6b54bBMzLA4QLNXQGFgVrGzthWmwhmN1",
  "272WJhnTMg1WyHfxi2NJm2Frwc253Wbm1YZLE2y7UYWtstmHpKUoNnUk1XJ2TD2Eapa6arjm2s5H31RGFLAEfQEy",
  "5tCZK59vvYzAc65JgfRHWcD31Zd3iWPiigfJ5tLoRjzrAQRpn5FNNVhjSQH8MkXcPUD6yCG9feadhJpSX7DZyvmD",
  "E72Xsk3Rq8fyi76yKbyukC5QSkKDFnbhj39n94rvNb8ztHVsdwiFBrz6VMDGtvyFZJVP3KywndTvXueaeTCtP6o",
  "4WmvdqWZMvqMzpA2TFrid5PMpDHgSUw4ZCxsvuRKWhqguGv6JM6okCxF7GUisqWk1hB3H7H9DQYnAF8B2roygNDy",
  "46C8CQCY5E8QeaNT3xWV5LeufGpL23QiZCrERETBjUUtme29vT7c5ww1tfuM4zQCKQ6H2JCPbojiC7QaBy2yXccr",
  "vztCqLwPHHWN6GiSk8goHpENUGiomhSu8EqhtwrzumA3h9wqQpVVy7aUwvp4KzmNVWzReUuHcVqKrRGrpWPiWa5",
  "4eEtQtoLsJYY2EGrhrgKyjZvA13yv359t3R9Y6aKmf36eD3amyJm8H6z8cGq3ykDR6SuB4eDVhhWkibkogxEhFqB",
  "2LRKW9nd2ci8ZWjk7S8NhJGqTq4DbYr1MEZ66Vr3JcHabU11GvxdEzDHYHdkTD31UPvQEEjXGmK7tvjQoiwpaZXW",
  "5p7wokQzoQ1V3CtAEsZUDj3me9AWsuWJ8QidG71v4TnXaNuMqr73QmTu8SY3fxHC8ufxd2mfBH2TdXWnbRcjDgpm",
  "5dCYQovPcNHLgxeSWYSVi8h2KwgqE5My88KqTuzy4eskPSPAkk4jS1KmQpSGF3ViMJE6A7WapjGs2RrcCA4WvbaC",
  "4eU3cMSKD4H8tUCAwj9iaM2JSnMveKSUPsaMPbjeGmBbtarReUbkKLCzTiwyxqTCVeXBihfZ2d5XvpTTbpiTku3d",
  "42sjNr4UN3w2AgThyfv8nAwkhZ1hC8j8hpYnsmk3ufZsayd8GWKFHVUTZBKdnNqxzT8Jx6vUNxiNoBqKKJT7keiq",
  "4BCmCyBmLioeidC2kitLG8wWQqWz5qGWHeu9UqqU1apGELmVVJVEt4NeNCevGzW4kBvWAfCmDuwnzGXXt4d4E7aj",
  "37VG9g62aXFYuJShSqyXy76syNs2ZwhvMUTBLy4cnheAubAsN2GTKSLQZ3d8cDQddJcq3kGPLLsp3apjv7D98hoB",
  "5xQ8Ec2STMcYHqGbLbo4ZqgvCcchEmWHoN7RbormwzJ7q6Bepappj6vz7omk5t25ZdHHy41Ctqqta12fvJ1MpZQb",
  "q3LWiGZ4niMw7fEv996sBtg21iBsFACFhF5Zd8FzZUb9L8bJ1LbekSojpeEqAv4WHE7Jo4XUdGPzC5mYr26P5sR",
  "ypgG536wGN5aRhpaQZkEE1AprXBj8xqVWYEVg31ez4XAjDKk37NkLqtjVPMFydEi6Fqg8EAgD1HwA7yS5omE8Tq",
  "5N9Ww7Mdi8rWBYwCNKGtwjYpGKKfT1TiLKTSeZMZ3eh6zEYtpYc7S5GYH1GB3g5etr6iPCVsdZvrB6WaMroBNq5",
  "3Bz1fFUa8aWzNRD5YCF2eofwhnuNYpVz8p465jxHGepZNtGBLbthXA6wUP6RNvYBo5rzHdeA9wd68QEnFzrDsx5c",
  "5kkwi7w5NdNxYBYw1rYv3XguXuxoQixpaoyzL2SgqcagTt4d2DSxqFYEsZeeBjVr3dTYwz9pHmuTwNpkRAuZscPg",
  "3PgJuDYgo3F1xaAd8DwSYWRMQ47jnsytD3BSrefHiXFC5SHzDNsDBsekV2ZnG8HQWpsvbjcwzJa1eR9quUXEbTJk",
  "j5ZtRM3b1owxmaoH17vhZyiKRs5iXiS2ZKezjkGoeTwEGV8fPYgAoFgTanhXPE4pJGgRLhR1xrKiPZNyFLqhf3B",
  "58Fa4q5qFnqzmpJyaSS2Ai1UoP9Gxgwarwf31DhU9SFWKkXT4ArB2415Yx1iF5CguFNNL77FhcYqXKxHJtiC3qSc",
  "dmTjEnMVxBvX6RrSruCGM3FChSqaYPVp3cK9ckSNmj9t4JfPMa4VpN9EzeJ6F5KGMPgkWcc2DadtA24RmxURsaM",
  "4VqfGbfu77JAU4Q6hbGshrDSGuBJmDi5ToN9hexeDrME2JKWkFYoicCiiznamom5iPNaSD7QHPDFnaVVzCCnCdC7",
  "2p3fYcXLfykRsYTkuGKVKZrm6ZH4uPqWecVqWerxwNVavgW5LbMYZsSmdbadou8rchDxpY8ZMDVUhi7QcwUAn51Y",
  "5v2A2iBwR3TAJS61FnUmLap1bCXcRJZvkSkN3AEHjaDVEAydcvJWgr7JXZ8tsm6BEz8HUgw89DBD6C7Wut621hm1",
  "GHuGD8xvHuCEnyVVuD4A6dxM4yyVmWAo1MfVTgjxBNr1eowVdMg466WUuPqfVS9zCx9FnEP8595Wo6sxkHcnwri",
  "4U6hm8cBLaeazZcjniJqiAAG3ETTyb41FWgZqyu3WhaJQPwqTxUwni1iTkQhem1Fq94SWLJdzhCdJG9TukZ78P65",
  "ByTS3yGPV9gPRqkfRH8D1jSPXfNyjTgeGK6KG7jXHWtg7dFmEmg5EeF83LLB4q8G9LYXpnMrFfDe2TvQCME1hwh",
  "4b9RqPyLqFw6nkMbkW9Xxzs4zoYYe4sWpwH3acq5GgiSLxkX2XSNAZ9hRHDD2aRnFYuRNvyZyKwNmTG7ycJ6bSpr",
  "3TujFywvr4eLDUzzteRff9kvb5hPdf3cBW82pEX5yYi9xKZdfd6FsfxNprWKwcU6NvVspyp9Qsv83QGEXCFKh5Mf",
  "3GeYxErqvy54rLkQ9w1tgRhEYKi35JEfYWzjVYFdkvkwiox6SUtb2LVoaBqfo8GrUM54FunXX9QooAwXwsEuNfiX",
  "2wfPBT8KHno4Gj9HE87eLYiF3ry9iSgKZibN4Dbo4jUwwnmXdATU1FUpn81gxoUeKbKjqabZPBT1JaQpSCiWsygA",
  "2EaFRHg7YfrsHo9onySvPhSbjmC5u5Z7WzGYgkKwm22m1R81momRNLpUPHGegYUa6fRLb1SAfLDHBsnvGxJBiNUe",
  "5fCjaiUoP6NQ6uNQnkAfGamW3HDnmNZWFH4gmutJNiKEeqkWAtq4NAQYXoPMGffwKBix9Cd5ig1oUw2aF3P9DT1n",
  "467nFYNPGvWfPtK4hcSp7jnby9uQbB93jy5YJm577sE39zyCzVXrtKHYzGPoeNC2Us1xpxt1H6jAgE1HNy8uKp3",
  "HknXWMDVvWCs5giJhNKHCa5CP9mRE2GiXJrJ8Zkrq6tFBhyFQcgZar1ki5dnrEts4AeHZpdp9eD1SUT4iqfoPLe",
  "2U8VrnG3SywgoZTm5CJqgEZKqo6yzPVNFvUzYc73fzhnN4mgMqXkVjT6K67wx7w9ZrTk6tzWVCxHCxeGka8fNUJL",
  "wGCMs1KCD4BBE43hyQLAE4S4Ys1KqQTKLoQ1n7rrnsHaPKjya7s96X9fAtVmU5xSRfnBBLsSDFEZXAjoXxkfePv",
  "2wptHf153cvb72cwyNCJ1Y1THzqnsRLiBSA85asfSa27rvxaf2ShDFn6UFdi7zqrArcL7H59KzASpg56ZVqMRTyj",
  "3pJivdaUfbUJXw93yC6rwqX8KHoPtUsMCz72pDR6DQUPgQestBFo4kosiB7Sy7UchTx5c1NJGBfz7n98SYcqtpRW",
  "53eK8MU4k3ANfs7GJW1cKjQLRnKYeBu5y2Rqb12rCWoFT7mViXazvYsX66zPFATJKj8ver1AVEUYQRHbqo7JXqfa",
  "4o7S7Wh9noVo8u9vKRpbQ8gyxAyh3ucyJ97xd75eSKCzHe7zr7mCEAzjQNEfFgEj4s2WsaV4HPVhHhMca65ZipNj",
  "3GLFjnhSJxt6FN4tJ8TktiXmGzZjDgEFxr1Fg7yZAGCizy68wceWT7XNqxGZUckWKzUNYrvFhRgTGvav3zvaEDWs",
  "37wkuQGQgk4so7wBLZnjfqVahgJeDaziDbTwrDUctyAMXkqC3jhQFwZDFiKcuyuaJC1V7HKSwT5mntWsEdrqhZSi",
  "42RTxGxJHsBBPCRnJXek7Da3idpUVppPrFggjiAeS3AaYEm389zEzNpHA3eFLKoUz9NgEkznaBUXm6GvBF7ndKnK",
  "3UzvJ3Pb1MLQYvw2mbPCdvBYkkdDG1fcfPGH7u7qCdhTM62dfAxKtK3wBvHUrb3fcwJPLpYbe19HDzGfS66KetWv",
  "4DFUxdDaP3dX4UjiL8hj4CBNTjrkSdYedfvq3So896fyYGQm96qMEWxBkDQVX73BSv3Eyw9cSPyWFPoeuctTccAY",
  "3LNcJRWpCpEt1Qw6zcZVC9TpZeUZDR7UAfT5v9cddn88njWFgEtJJDzuCDCXVDTYQ2ezstDDQ93xF8wrvoPWvDeM",
  "2uKhAq2wfsBukftFBZVwPHJEK5Y89fhUP61uZH94QdyaSSsHcnPLwTaGqaWGeuJuvBufFcAK2x2AHYbGRWWaTCkq",
  "5BL9dynPnpXJSeHEg51tvRb5rJAz4iQdreQXibGxVuJcLcfdfR4WMNqmdUBzqX9QTBEgVgPRjmh61maTSKgHESqd",
  "aRpr4wk4CZqE99AZMUyaAs7fDFyGPpuosw93e2ZBzE2movL6SXaqXuj2fiJH2kV677Ufz9pZNj7eRNNZHZSTLHh",
  "5SQNTvG7pDtT8xkSZM7ZXyUUNrcDfW9YW9mHeR5iDdNscUBGeqpuZEmVzoMxAipDpJqc1TgvtGZZ2x5rSwDSCD3X",
  "4uZxMBwHQ1LY3VGwP28KPNyYpv7SZnNACUEm7mh8C3G8e3zc6QqGMLkYC4ppFGu8PKJWySjnQGXM1g3WQMrN5ZEs",
  "4yGxEo6yqYgNrXmgfW5vfkWyx9HMSXrQvvXUApnR2r5iN8Zrkpo3Mw9x7zCPzDeijrgHFmKEKLmEuhCXmj5KkYmW",
  "2W3XpUuKh5HFbhNtMPiXQMvFZqTDPXa8HdmpMBLd1Xq5EnPLL1dt54SHHq5BM5WPTHvhQdDZV3qBhAwmwVwDanV1",
  "4Yf7CiWPj8trQCYh1jR3E4tysTHQajy5uFJ9vEY2Kt9x791LU7LDJuGWsteakhfesqizj981k2EAjrwckZaBX2yi",
  "55HUeAbQfvtDHxf1WEoL5LwvMGEU3i1692JV2xxGZ741CBC2iMy14hhGS3dE4NBan3YMnFD1EdwuvBx5aWudmjz8",
  "2crUJKpQEYGBMiqwJqSSfpXVMZAYydaoEUo9zVkjP3exJdPsRuBzbwNWHfhxHYqqPyqnEuW54kHEEuYZUZR9omzK",
  "7kb4AjGgjExHSEkmSdBNTV34YAmnBvjiVyULaX85SX1DLYvZidcsB5iEouHHpv8WkvEvBRsyMaG7VvNQaFqWG8u",
  "4nhcmRPzoAMtxeAZbDcgT7u5Ndu5BdSryPumrMRAkCR7ykKzgToMdiGrCjFnptE21SV1un9UVSUzSwkacxhpT1iR",
  "5WcQ8FQz2b2eZ4SnxMxJQCHU7RqargqJjJpmW8kdgNYe6QR5qYJzjU9Rv8SX5tuZhRq7s8ervak38gg2XmAGf1oe",
  "2zEVW5Q8atwkW6iUc2ovzWapqGYDpSibWu2knHfG2EChBzU2AJUyv1uzRKWa3NpEvHbrJskiZwta7SMZti4VFqjR",
  "4XyDYqshr6knY1ijWrkpBMKEqp41KJdJPye3gFAMx16JX36FDpm8wWxaxVxCnEH9S2nJiQQ161X39h9uec55qcPF",
  "4SvArdK37WQrm2N4efG7Kf7GGSKGmWbPFFgnPbHYwY7GJAHM4qQFYvuX4hskXmBZxbipB7awA2Zm9691TAVniqZm",
  "3tTeULah9prtyZ3Yw2JkB7r9TS1yGCKmnp8RtkcnQqCLdrtVmMFnPSVUyedL9syerPMJxSyXUX98caPLh6jKFcaL",
  "3AvDNVMx6FSJRoaXFSTRWhk2oeS4EDdPY45jNKjr1bVjSi9UtNyZdBvX2Ej9dmqZuZG7fR4r5MAUxWsS9z2sSDFC",
  "2Ddhf3bwctfz9K4WFxQA3sNgJeWRV2s5YY62mtSpSPAWTU9XhY1QkLdQRC51t1Cwdd3XwQmG3ZVge5RWuPqxW2Ej",
  "ehnJs7g8HpvN1NJXQCbFDa9ceGNNcajdR2nrR1NiTT1ra8Zr3eCzzrqWbTFRc2tBqpkTw9oi2JCRsehFJJqbmfx",
  "pPTDWBMEVhe5o4pepREDPSZkuRm7bZ6JiimMWEyowKcnBEfrFCyBqcwL3aqKN32ymNJGmUtW94mnitn6YKEc78x",
  "4qS4dD8PLzVydiawcvUw5sB31AEgR4VZrfbRkj5TuVoNfaWcoLLS2rkAP94ZfD6TLAhjetMTveGLMENXm6y8kaMC",
  "3Rn8CYEoTM5E1gSBTNbJLXFpmbCc7RbKbwGUeHx4dQihMe8VBJJg9WN8c2ESBZQ7NnoGTja6A5BKGpXZPkQPgb8J",
  "3BAR3xURXoriph6P3KTjRByC9ao63SNkZB9n7wu7vHc5LKcUYye3gVVokekofWEDhTfbbtncWeZKkNvV8ipS8p47",
  "3GtdCi5FBz3nb7YYLCz8zAAvM5et7yXzbfiPc4RJJFYV8P5QcfHWeBNrAYLUfJYfY3G8Gv1EEcKmUTd6tZDMC31u",
  "5MRKBxShrDJP8isoorYNtU7rmHx8oLrU2i1wiEVqMy7pmjPLr6CCxswQewfQ8KSZNWwGWTo79ULmwZVmcaiTqSZ2",
  "9iuaFoVPK3yHDzEceRBDbG7xA8DoWQicuMvjbGE2baQutPTj8jtMwCeiwdeAwcVUZZ6zVuuuWSXUS8KHaAKbteC",
  "3miU7FUfPUc93PaNNGUfSRQbmSA4WRWCfsQ9VKotxp6GoULfja7UrWD1mpd4jruqMqbEBMszxo4cdjCrqemAJxr3",
  "465eZ5AaYxspNmyFt1SbVMemoYUbzJ82aPNQTWhHxDgofX3TjHKgCVeaoJQH5ZdgTbA9fR1564UnxPfWF3MochEv",
  "3AKy6hqiMfykj7AfAeZr9sUzJedaqNATcn9onEUKPKvgEwMyUXwihujfmMLXpXF7CfLW9RPYxx39rcRkZGb46aHi",
  "24TZ32WhtuCSKR75TjjdQmFTpmEVdykLgbFXoUMQXqytGyxQUBdYKHJhScWeycipWpr4b6D6aSNER66icotKmTtM",
];

export const INITIAL_SOL_BALANCE_DEFAULT = 10;
export const INITIAL_SOL_BALANCE_INCREASED = 1_000;

export const INITIAL_TOKEN_BALANCE_DEFAULT = 10_000;
export const INITIAL_TOKEN_BALANCE_INCREASED = 1_000_000;

export const TOKEN_CONFIG: Record<AppToken, TokenConfig> = {
  // Layer-1 tokens
  [AppToken.WSOL]: { decimals: 9, isToken2022: false },
  [AppToken.wETH]: { decimals: 9, isToken2022: false },
  [AppToken.wBTC]: { decimals: 8, isToken2022: false },
  [AppToken.cbBTC]: { decimals: 8, isToken2022: false },
  [AppToken.zBTC]: { decimals: 8, isToken2022: false },
  [AppToken.LBTC]: { decimals: 8, isToken2022: false },
  // Stablecoins
  [AppToken.USDC]: { decimals: 6, isToken2022: false },
  [AppToken.USDT]: { decimals: 6, isToken2022: false },
  [AppToken.USDY]: { decimals: 6, isToken2022: false },
  [AppToken.USDS]: { decimals: 6, isToken2022: false },
  [AppToken.PYUSD]: { decimals: 6, isToken2022: false },
  [AppToken.sUSDe]: { decimals: 6, isToken2022: false },
  [AppToken.USDe]: { decimals: 6, isToken2022: false },
  [AppToken.syrupUSDC]: { decimals: 6, isToken2022: false },
  [AppToken.AUSD]: { decimals: 6, isToken2022: false },
  // Liquid staking tokens
  [AppToken.mSOL]: { decimals: 9, isToken2022: false },
  [AppToken.jitoSOL]: { decimals: 9, isToken2022: false },
  [AppToken.bSOL]: { decimals: 9, isToken2022: false },
  [AppToken.dSOL]: { decimals: 9, isToken2022: false },
  [AppToken.BNSOL]: { decimals: 9, isToken2022: false },
  [AppToken.JLP]: { decimals: 6, isToken2022: false },
  // Utility tokens
  [AppToken.PYTH]: { decimals: 6, isToken2022: false },
  [AppToken.JUP]: { decimals: 6, isToken2022: false },
  [AppToken.TNSR]: { decimals: 6, isToken2022: false },
  [AppToken.DRIFT]: { decimals: 6, isToken2022: false },
  [AppToken.INF]: { decimals: 9, isToken2022: false },
  [AppToken.JTO]: { decimals: 9, isToken2022: false },
  [AppToken.ME]: { decimals: 6, isToken2022: false },
  [AppToken.RENDER]: { decimals: 8, isToken2022: false },
  [AppToken.CLOUD]: { decimals: 9, isToken2022: false },
  [AppToken.W]: { decimals: 6, isToken2022: false },
  // Meme & community tokens
  [AppToken.BONK]: { decimals: 5, isToken2022: false },
  [AppToken.WIF]: { decimals: 6, isToken2022: false },
  [AppToken.POPCAT]: { decimals: 9, isToken2022: false },
  [AppToken.MOTHER]: { decimals: 6, isToken2022: false },
  [AppToken.PENGU]: { decimals: 6, isToken2022: false },
  [AppToken.TRUMP]: { decimals: 6, isToken2022: false },
  [AppToken.MELANIA]: { decimals: 9, isToken2022: false },
  [AppToken.AI16Z]: { decimals: 6, isToken2022: false },
  [AppToken.FARTCOIN]: { decimals: 9, isToken2022: false },
  [AppToken.PUMP]: { decimals: 9, isToken2022: true },
  [AppToken.ZEUS]: { decimals: 6, isToken2022: false },
  [AppToken["2Z"]]: { decimals: 6, isToken2022: false },
  [AppToken.MET]: { decimals: 9, isToken2022: false },
  [AppToken.dfdvSOL]: { decimals: 9, isToken2022: false },

  // Kamino extension
  [AppToken.jupSOL]: { decimals: 9, isToken2022: false },
  [AppToken.USDG]: { decimals: 6, isToken2022: true },
  [AppToken.hSOL]: { decimals: 9, isToken2022: false },
  [AppToken.STKESOL]: { decimals: 9, isToken2022: false },
  // Tokenized equities (xStocks)
  [AppToken.SPYx]: { decimals: 8, isToken2022: true },
  [AppToken.TSLAx]: { decimals: 8, isToken2022: true },
  [AppToken.QQQx]: { decimals: 8, isToken2022: true },
  [AppToken.NVDAx]: { decimals: 8, isToken2022: true },
  [AppToken.GOOGLx]: { decimals: 8, isToken2022: true },
  [AppToken.MSTRx]: { decimals: 8, isToken2022: true },
  [AppToken.AAPLx]: { decimals: 8, isToken2022: true },
  [AppToken.CRCLx]: { decimals: 8, isToken2022: true },
  [AppToken.HOODx]: { decimals: 8, isToken2022: true },
};

export const TOKEN_KEYPAIRS: Record<AppToken, Keypair> = {
  // Layer-1 tokens
  [AppToken.WSOL]: getKeypairFromBase58(
    "26wdCeVrJteZcmy6DiNk24V9ECdannvcxSCgLJwi4PVApbgbT9cjDLQDAZakmoCzb55zm81SBkcFGzncJ1kddGD5"
  ),
  [AppToken.wETH]: getKeypairFromBase58(
    "2HUNMEcF4hTYtpWKzpfc7ZDd3vM3ziPLDYe9FbDNsrJ1qByYqfEB3S2S66sUj6JopFMrYWbR8xoDX3AbgZZr4fZJ"
  ),
  [AppToken.wBTC]: getKeypairFromBase58(
    "2RyN2wrHo8fDrvqULn61ThcSeMyBE3eQ35ADxk5bvjkMrtZRKZwYNRQgxS33UkTrw3udySYMeoJxapbLbyz3aDiZ"
  ),
  [AppToken.cbBTC]: getKeypairFromBase58(
    "GKscfks1wsKvvzMmgbuPbMJRDZwByDY8oy9n2R9vi5uaAMC4VmvgnrmqV1dPJsebbhWPd1PHysLD7GFzGp6xdEw"
  ),
  [AppToken.zBTC]: getKeypairFromBase58(
    "3UocV9V8fBshMhaia8mJyzW2gtWpVdFpYtKkh4ub3KDLLHKv1kL5hMCs2tFnnHqZmfE1s9aizdGDVykdN6qciBAP"
  ),
  [AppToken.LBTC]: getKeypairFromBase58(
    "3RPX8FcVi1ehRAsGbvBYSc4p7JT1vvz4fAs9utEN4U27twJcRQF43Cq8L9AjxtLMNhhwUGL3xUfSrHF4FfDuvsw4"
  ),
  // Stablecoins
  [AppToken.USDC]: getKeypairFromBase58(
    "5gi185z4U57MEkJJTzweNrJQJQftaQH2onL8ZGRyXKWA3zspJWyQfF1J8ZRV7zd3D8aZyZxtaw8MsPZpMLMGh6L2"
  ),
  [AppToken.USDT]: getKeypairFromBase58(
    "4pX2qXNAvdsE87ay4yh7xjGGgN1fK22pgnApEPF2o4hs8A9Uz1CuPCRA8tbon8vg3GWTus7ku2KaAhHdV97yA2C"
  ),
  [AppToken.USDY]: getKeypairFromBase58(
    "oLCWJJ9BCn9YnKgSLL4s3MDyRYmAV97mTr6LispRzpMYPwPRioLFKmJUSkvPrnyETCnWn2xgBNPTj3ADevSMqUD"
  ),
  [AppToken.USDS]: getKeypairFromBase58(
    "3vW1Kqhv1VKswkQCVxNAvgSYAuj18VHDH3ywN18vbV747DcMSoekrkAQuLgrov2UEVVy1dC9a9956TFynzAbHWRD"
  ),
  [AppToken.PYUSD]: getKeypairFromBase58(
    "2y8YM3DG9ZRpb7Bbp7KPawseFmj6QTgkTX4tx6Gh2oN5zPCk3G3vcygAg4UkJaFyP7y3NK3Lan7YgYJEeQQ3Pgqp"
  ),
  [AppToken.sUSDe]: getKeypairFromBase58(
    "4fv4PsePhQ1bCMudhmfqxnodFzQLa6eSNELXJCtm31tH3pJjuLxZ6RE3FpqrmP2QUTyK6EnUe2iZRDRaDiK13Luu"
  ),
  [AppToken.USDe]: getKeypairFromBase58(
    "65suV1HwfXGMPodgJ4fdvLdcfafc6QtUPUkGQxPJLEWhxyhizgXUobcoM2eJo8M5HNLcnQAM7PUQnWYRrkcwU29p"
  ),
  [AppToken.syrupUSDC]: getKeypairFromBase58(
    "2tYtoFiAJtniAFJes91MNVrxrbJT5reyEWr9dmAR3AECVUedMC9jdF41T1GCgpBhp57fAChN4zM4x2DdAqS2qbtR"
  ),
  [AppToken.AUSD]: getKeypairFromBase58(
    "5R7pi9d6L38Ap7JfTowTa84ww38jP53njcCvfhd2ffLPq8w639MVUV8TkBRgLqcmfavda4CrYMEuHvZw32pwXDxH"
  ),
  // Liquid staking tokens
  [AppToken.mSOL]: getKeypairFromBase58(
    "roBiWQBPQt4gEKbGfyVG2jedHz2evrCrhKoDzbPFWTYSrrce7awKtyvfCE8YoJudvSXWfUiacrAoCUHWtNtUw6n"
  ),
  [AppToken.jitoSOL]: getKeypairFromBase58(
    "4qZ1J8JVYdREqTQ2k3U8jXYGNQJf4abEfvZVFQKVPWSYtnTPdY1AF79aLS27LERQJfpiQB4gR5Df1SufjDmL1fCW"
  ),
  [AppToken.bSOL]: getKeypairFromBase58(
    "36fGDTKVDpmNUKzFSNkUucKuHMqj6z9GhiqEsaYxQFrNxhEZUHz6T8iQkF2q4U4smrmWMzSqy9oNPUcagvzMTC81"
  ),
  [AppToken.dSOL]: getKeypairFromBase58(
    "2jhmZ69seuEpAE7cdLvaKy5FLY3frFgpiLgK9Cmp6swYmd9uHbpZ9uU5DD2gaVaYUPKJkpbHJCoNvZoqEk4UrZSY"
  ),
  [AppToken.BNSOL]: getKeypairFromBase58(
    "68RbRGKXPMuKeN7xtvCVdT4KKsHGUYoXxVuvKFQ4RCnrMAzhb8ypTaexkXewpoospPaCZVay29J2FoitMP3TSDy"
  ),
  [AppToken.JLP]: getKeypairFromBase58(
    "4NZ1QX8sxfQvutyt9SXonHYU5zC2SdMrVy7yZUv3NaPpcgTUMNpMiNdvp72ew7fone6NRgJKyM4PdHfgk2DhE7W7"
  ),
  // Utility tokens
  [AppToken.PYTH]: getKeypairFromBase58(
    "5fbcPBxRADG5oxsK3K7PtM5A2CXFSErQ7bWoTXA1qeZsngyFYzWKUm4R7pBtD9fazVA9FgFC4h4WschCTQ7xjeJG"
  ),
  [AppToken.JUP]: getKeypairFromBase58(
    "LpD3SmRN8RatD6y1N7SHEd28mKSQEhgxqrCBaBDCoR3svbBmumx5wGYeEuRvwfoXbA6Uia6FMDKaJSoPah517r3"
  ),
  [AppToken.TNSR]: getKeypairFromBase58(
    "268rJPYVtEZenSt8XduTuyijJ8vq5sbbDEP1jxZPJTw5Cg43J4iwSTVKDUomgfAkppnbau2xNaC83BB9uu1MpBQm"
  ),
  [AppToken.DRIFT]: getKeypairFromBase58(
    "4EjVfksEqb5JdQabgFrDwRRDV2c731RuJBKVrU1aNFnukeZfH3YGs1HwVDznwNrvxtZ43rmDaH5PHRW3CqydRjwf"
  ),
  [AppToken.INF]: getKeypairFromBase58(
    "2wYRY7u2foxBg53wXRX6mHuj5dEvDqWUyDGJVTZBW2DvduTZpaAzH2gWE7UK4rz98kpq6EcPujtBroWdxcoUyizR"
  ),
  [AppToken.JTO]: getKeypairFromBase58(
    "4mowNv55ijCV1E4fverAnRmvN9duvQ1d7VKr6Hpt3NVgesM8u1CzjodYNGcypoyqiPGAjuF5k9rDvNVwo9mAAhwm"
  ),
  [AppToken.ME]: getKeypairFromBase58(
    "2B5UV8ZWYM9YLgVNxwtYGbptaRSYgEXdgPuBhwE9ZkuFNTHHnqCNZkAnq2qGgR2N7kXM6zMoY7WT9RV26gwV2kVR"
  ),
  [AppToken.RENDER]: getKeypairFromBase58(
    "5JSZQjov8XDrPVAFC2MX5azxheL38bdqYKMsmcgCqcQqcRr1s48Rkc9Cqv4MPUBdroYGkwut85aUU5vEkhSkcsaz"
  ),
  [AppToken.CLOUD]: getKeypairFromBase58(
    "61MmzdjuVFgnWDjtDdvgZkC1KU2v73Kj9f2KzEP8RpTxVvfketyKPqJEfDMhfCi11oT6LndTnHKJ6YXEYice8xKn"
  ),
  [AppToken.W]: getKeypairFromBase58(
    "2F2oA5Tssenipq9n8Rrwkvdxr5B3qsYkrxZst96PYaYBQr91Mn6gnsQN5T2KgTrMh1VBu3NZagGBT64pyRJ7QiVD"
  ),
  // Meme & community tokens
  [AppToken.BONK]: getKeypairFromBase58(
    "4rmVt8UHMkgbBuBFa23jbcTMNT9oowUfhnQDuWAfu6Ud8FK9Nc8KXmTiGRT94kWVMtk95U1S1t2H51CYWeJQhLM7"
  ),
  [AppToken.WIF]: getKeypairFromBase58(
    "TYmj6VCZPGU99vMTBS3NsJeCgjSwmt77W7i6YzFtSHSeDvVvDpQFWA2yc8rrW11M6SXyma3vevCV23KLGmv4ZhY"
  ),
  [AppToken.POPCAT]: getKeypairFromBase58(
    "3ZYUb3qv576NoVYD6hh7EHMbh6qqGyePptoyq29UH3L3g7rj128fwSe2oYrvrHjv8VU3S6VSU7q1XEoDa21NPN29"
  ),
  [AppToken.MOTHER]: getKeypairFromBase58(
    "5o6SkH9BT7LY1BnzbsyKgxPpcLPwnZutSzFF4bbYjNd9m6qisQw5DMMxRSiWcA9HWphZzikeRTTFijzJE1aLxS53"
  ),
  [AppToken.PENGU]: getKeypairFromBase58(
    "xjDURAgrJ9btdoLWUbPqBL6WtDFnDsXKwQ1M9jqMBNU2pjcU45ngwAPV1HVM75xyecSuefCxcKEhWqRpUaAnzUL"
  ),
  [AppToken.TRUMP]: getKeypairFromBase58(
    "5bJhFYMiC99xL37cWZcgLL5b7Cve6TcKzXEHMNRmnqSQHbpCQbCvj55yZNRtkRrqmUY1YQQKZMToi4RBLsgGip8a"
  ),
  [AppToken.MELANIA]: getKeypairFromBase58(
    "TXHsTYogFnz83gdvTAL2sNvfM21FWrkNMCJnqLnxMxQSUcEEUSKrHoUjvDnALidnSJQ19fbAr9FuUfEV7TptfTk"
  ),
  [AppToken.AI16Z]: getKeypairFromBase58(
    "54k8Wa6AGiAV1ZqYaabcC7xJV29Fpq69SvtoqapE27fRKzb3nsKaduG6WqXmnXccgn6x7TYarhnwUpsQ2KWvaueX"
  ),
  [AppToken.FARTCOIN]: getKeypairFromBase58(
    "3rQpz59654JfKGmbswrXS9tLxUJKxoH4NYtE2uJ7DJR5FZzwhCGBZTMK5htBJeNVdZcbnpciAJD84Qzca32MX7Y5"
  ),
  [AppToken.PUMP]: getKeypairFromBase58(
    "5yPUQ6rzzcsPe1rMFnyWtcQFR8K9XMGq9cG41wh33LNkmZpzL8YgA4rY6CuTfvn4xm8cZvo3AqREFXwoC8qjm2Z1"
  ),
  [AppToken.ZEUS]: getKeypairFromBase58(
    "2wePgPE7SSpD8xo3gcUFHHdeP3zqKTikB5gofKav1FdDiTp59eojT2hXt8MNDKujvYs3A92HaXLHAbN246vKfe8f"
  ),
  [AppToken["2Z"]]: getKeypairFromBase58(
    "3LiJtpfaxb6kWZ6jKbSUvqifAv5gXmVK4Pm9Hk6G81tx2hmEZd6XPcxUeKjoUE94TfqN3Yexmr4LADFfwsUaZmX1"
  ),
  [AppToken.MET]: getKeypairFromBase58(
    "2EvzHU6fKQS3vakBo4SCC7DkaM6W5MrHCzziCTrWdNJRNxKbsWnL9bvsr1V4kmE6Az7cxdMJgSgBiNDqxURzbQV5"
  ),
  [AppToken.dfdvSOL]: getKeypairFromBase58(
    "2u5Gq9niCZVV2d7GwBge8QqKcr56hNmQQ9TXaKZsmy63ybUgU4uRnaStUVfCmQHKGPj1Lz5oZt71xTqCcuncsMBf"
  ),

  // Kamino extension
  [AppToken.jupSOL]: getKeypairFromBase58(
    "uA7eAUSFbjLaLbtZcwwkFYBqEvzw3VZQxaAieNr6jZB55jJ2wsveF9vN38w1HfUU7GVK5K5dgcRZzqM3dNBtaNB"
  ),
  [AppToken.USDG]: getKeypairFromBase58(
    "2AawafCpuneRg1SjATJbmWQbzCYHcp2QsjipDSmAAiC2iGFmaDZE89uLqn8qC7wr5i5MSebL3LqZZCjD9n4Zx54x"
  ),
  [AppToken.hSOL]: getKeypairFromBase58(
    "3RY5LnDzUBNR9E6tYnLrYQH9eqTWRmg8o1qjdjABSe6287HhzF4wmRjdEzGk82oPQAxymH8hsKLg3Bab1bZhuksF"
  ),
  [AppToken.STKESOL]: getKeypairFromBase58(
    "gzyTpHP1Aj4jeRyAEChnY1n24CVnhJngGu9PrjEMUhoH3Nvw4gZuPcMKUf3QAK7AHAUWuYpAcMUU2DHzifb9uy2"
  ),
  // Tokenized equities (xStocks)
  [AppToken.SPYx]: getKeypairFromBase58(
    "5tt5aDxGXfpaL9ydzRcbs5sPM81cntC3ZrAENX7GAHmL2rcQSyM25Xdj3hdPaMm4bDzqyiUMu2CvUzm5Sw82oTUa"
  ),
  [AppToken.TSLAx]: getKeypairFromBase58(
    "3nbkjh7RP5E6q93U1KzruiSCeR8fDczLaf64uReoE7BKpbtSubhwu36giTkveYm99SiFosw3zoieLzKrXhRu6mrr"
  ),
  [AppToken.QQQx]: getKeypairFromBase58(
    "5ZCJA3qtZJLPPKngZRUWoK5BSwoY7ELr999fE4t1ZBTUcEwYPmN8NGvhGoG9KMV6UUrdAT2aRE5Zv2sRZk9qpprw"
  ),
  [AppToken.NVDAx]: getKeypairFromBase58(
    "3k81bjK4RcfQa9DMQyfRRQkD3WwXJYhRePn1Jn7t6hTyk8UuqwQHhX1RG4AoNzKGGuPWkHmNdoE35abvWmB9vnC4"
  ),
  [AppToken.GOOGLx]: getKeypairFromBase58(
    "4ZvuTNqJBraaeiYm8GsNxtwhLiyBS6wNS5FvoMT1PqhjeWrvtzcTua3ckFaHHY1bZT8TmPnmYN19gvezavHSvVvS"
  ),
  [AppToken.MSTRx]: getKeypairFromBase58(
    "5zCbcxZqyKhPn4ue5M63JD7H1EhEo4G8jE5zbcpy1wa6tVFWc1kDfaTwQUSwvWJtiV9mptt4gW8sMc7JZuJX91bZ"
  ),
  [AppToken.AAPLx]: getKeypairFromBase58(
    "2uHDaM81BtSL9Z13rHeWFDrGDMQ6cpeA3yF1FoxPb7KzGyizhBsugUj6xtCfchon9hXpdNab4XiSLNwCT43qfc5K"
  ),
  [AppToken.CRCLx]: getKeypairFromBase58(
    "28mBVT7Z5RTBXkcbRtx1TR86EsSRAGjKfHpDSAS7ERyME4sMGvkteuYyLyJEbifsRLcc6ansfYJDAQXLScj3aqTm"
  ),
  [AppToken.HOODx]: getKeypairFromBase58(
    "4TYsJAdxZ3NBaYsEviVykA2LWpuwyZz16vGaJhbdVybzsee5QMYN9tA3JJ1MqchXTMKShFAb1JQrbs7v9Nx1GhBz"
  ),
};

// Drift
export const TOKEN_AND_MARKET_INDEX_LIST: Record<AppToken, number> = {
  // Layer-1 tokens
  [AppToken.WSOL]: 1,
  [AppToken.wETH]: 2,
  [AppToken.wBTC]: 3,
  [AppToken.cbBTC]: 4,
  [AppToken.zBTC]: 5,
  [AppToken.LBTC]: 6,

  // Stablecoins
  [AppToken.USDC]: 0,
  [AppToken.USDT]: 7,
  [AppToken.USDY]: 8,
  [AppToken.USDS]: 9,
  [AppToken.PYUSD]: 10,
  [AppToken.sUSDe]: 11,
  [AppToken.USDe]: 12,
  [AppToken.syrupUSDC]: 13,
  [AppToken.AUSD]: 14,

  // Liquid staking tokens
  [AppToken.mSOL]: 15,
  [AppToken.jitoSOL]: 16,
  [AppToken.bSOL]: 17,
  [AppToken.dSOL]: 18,
  [AppToken.BNSOL]: 19,
  [AppToken.JLP]: 20,

  // Utility tokens
  [AppToken.PYTH]: 21,
  [AppToken.JUP]: 22,
  [AppToken.TNSR]: 23,
  [AppToken.DRIFT]: 24,
  [AppToken.INF]: 25,
  [AppToken.JTO]: 26,
  [AppToken.ME]: 27,
  [AppToken.RENDER]: 28,
  [AppToken.CLOUD]: 29,
  [AppToken.W]: 30,

  // Meme & community tokens
  [AppToken.BONK]: 31,
  [AppToken.WIF]: 32,
  [AppToken.POPCAT]: 33,
  [AppToken.MOTHER]: 34,
  [AppToken.PENGU]: 35,
  [AppToken.TRUMP]: 36,
  [AppToken.MELANIA]: 37,
  [AppToken.AI16Z]: 38,
  [AppToken.FARTCOIN]: 39,
  [AppToken.PUMP]: 40,
  [AppToken.ZEUS]: 41,
  [AppToken["2Z"]]: 42,
  [AppToken.MET]: 43,
  [AppToken.dfdvSOL]: 44,

  // Kamino extension
  [AppToken.jupSOL]: 45,
  [AppToken.USDG]: 46,
  [AppToken.hSOL]: 47,
  [AppToken.STKESOL]: 48,
  // Tokenized equities (xStocks)
  [AppToken.SPYx]: 49,
  [AppToken.TSLAx]: 50,
  [AppToken.QQQx]: 51,
  [AppToken.NVDAx]: 52,
  [AppToken.GOOGLx]: 53,
  [AppToken.MSTRx]: 54,
  [AppToken.AAPLx]: 55,
  [AppToken.CRCLx]: 56,
  [AppToken.HOODx]: 57,
};

export const TOKEN_AND_PRICE_LIST: Record<AppToken, number> = {
  // Layer-1 tokens
  [AppToken.WSOL]: 200,
  [AppToken.wETH]: 3_300,
  [AppToken.wBTC]: 100_000,
  [AppToken.cbBTC]: 100_000,
  [AppToken.zBTC]: 100_000,
  [AppToken.LBTC]: 100_000,

  // Stablecoins
  [AppToken.USDC]: 1,
  [AppToken.USDT]: 1,
  [AppToken.USDY]: 1,
  [AppToken.USDS]: 1,
  [AppToken.PYUSD]: 1,
  [AppToken.sUSDe]: 1,
  [AppToken.USDe]: 1,
  [AppToken.syrupUSDC]: 1,
  [AppToken.AUSD]: 1,

  // Liquid staking tokens
  [AppToken.mSOL]: 155,
  [AppToken.jitoSOL]: 180,
  [AppToken.bSOL]: 155,
  [AppToken.dSOL]: 155,
  [AppToken.BNSOL]: 155,
  [AppToken.JLP]: 4.5,

  // Utility tokens
  [AppToken.PYTH]: 0.1,
  [AppToken.JUP]: 0.22,
  [AppToken.TNSR]: 0.3,
  [AppToken.DRIFT]: 0.5,
  [AppToken.INF]: 1.1,
  [AppToken.JTO]: 1.5,
  [AppToken.ME]: 2,
  [AppToken.RENDER]: 5,
  [AppToken.CLOUD]: 0.8,
  [AppToken.W]: 0.15,

  // Meme & community tokens
  [AppToken.BONK]: 0.000019,
  [AppToken.WIF]: 1.05,
  [AppToken.POPCAT]: 0.35,
  [AppToken.MOTHER]: 0.04,
  [AppToken.PENGU]: 0.013,
  [AppToken.TRUMP]: 8,
  [AppToken.MELANIA]: 1.2,
  [AppToken.AI16Z]: 0.9,
  [AppToken.FARTCOIN]: 1.3,
  [AppToken.PUMP]: 0.005,
  [AppToken.ZEUS]: 0.25,
  [AppToken["2Z"]]: 0.08,
  [AppToken.MET]: 0.12,
  [AppToken.dfdvSOL]: 155,

  // Kamino extension
  [AppToken.jupSOL]: 250,
  [AppToken.USDG]: 1,
  [AppToken.hSOL]: 250,
  [AppToken.STKESOL]: 80,
  // Tokenized equities (xStocks)
  [AppToken.SPYx]: 750,
  [AppToken.TSLAx]: 415,
  [AppToken.QQQx]: 730,
  [AppToken.NVDAx]: 200,
  [AppToken.GOOGLx]: 360,
  [AppToken.MSTRx]: 100,
  [AppToken.AAPLx]: 315,
  [AppToken.CRCLx]: 70,
  [AppToken.HOODx]: 120,
};

export const PRICE_ACCOUNTS: Record<AppToken, PublicKey | null> = {
  // Layer-1 tokens
  [AppToken.WSOL]: null,
  [AppToken.wETH]: null,
  [AppToken.wBTC]: null,
  [AppToken.cbBTC]: null,
  [AppToken.zBTC]: null,
  [AppToken.LBTC]: null,

  // Stablecoins
  [AppToken.USDC]: null,
  [AppToken.USDT]: null,
  [AppToken.USDY]: null,
  [AppToken.USDS]: null,
  [AppToken.PYUSD]: null,
  [AppToken.sUSDe]: null,
  [AppToken.USDe]: null,
  [AppToken.syrupUSDC]: null,
  [AppToken.AUSD]: null,

  // Liquid staking tokens
  [AppToken.mSOL]: null,
  [AppToken.jitoSOL]: null,
  [AppToken.bSOL]: null,
  [AppToken.dSOL]: null,
  [AppToken.BNSOL]: null,
  [AppToken.JLP]: null,

  // Utility tokens
  [AppToken.PYTH]: null,
  [AppToken.JUP]: null,
  [AppToken.TNSR]: null,
  [AppToken.DRIFT]: null,
  [AppToken.INF]: null,
  [AppToken.JTO]: null,
  [AppToken.ME]: null,
  [AppToken.RENDER]: null,
  [AppToken.CLOUD]: null,
  [AppToken.W]: null,

  // Meme & community tokens
  [AppToken.BONK]: null,
  [AppToken.WIF]: null,
  [AppToken.POPCAT]: null,
  [AppToken.MOTHER]: null,
  [AppToken.PENGU]: null,
  [AppToken.TRUMP]: null,
  [AppToken.MELANIA]: null,
  [AppToken.AI16Z]: null,
  [AppToken.FARTCOIN]: null,
  [AppToken.PUMP]: null,
  [AppToken.ZEUS]: null,
  [AppToken["2Z"]]: null,
  [AppToken.MET]: null,
  [AppToken.dfdvSOL]: null,

  // Kamino extension
  [AppToken.jupSOL]: null,
  [AppToken.USDG]: null,
  [AppToken.hSOL]: null,
  [AppToken.STKESOL]: null,
  // Tokenized equities (xStocks)
  [AppToken.SPYx]: null,
  [AppToken.TSLAx]: null,
  [AppToken.QQQx]: null,
  [AppToken.NVDAx]: null,
  [AppToken.GOOGLx]: null,
  [AppToken.MSTRx]: null,
  [AppToken.AAPLx]: null,
  [AppToken.CRCLx]: null,
  [AppToken.HOODx]: null,
};

// Helper functions that work with a map instance
export function createPriceAccountsMap(): Map<AppToken, PublicKey> {
  return new Map<AppToken, PublicKey>();
}

export function setPriceAccount(
  priceAccounts: Map<AppToken, PublicKey>,
  token: AppToken,
  priceAccount: PublicKey
): void {
  priceAccounts.set(token, priceAccount);
}

export function getPriceAccount(
  priceAccounts: Map<AppToken, PublicKey>,
  token: AppToken
): PublicKey {
  const priceAccount = priceAccounts.get(token);
  if (!priceAccount) {
    throw new Error(`Price account for ${token} is not initialized`);
  }
  return priceAccount;
}

export function tryGetPriceAccount(
  priceAccounts: Map<AppToken, PublicKey>,
  token: AppToken
): PublicKey | null {
  return priceAccounts.get(token) ?? null;
}

export function getKeypairForAddress(address: PublicKey): Keypair {
  const match = Object.values(USER_KEYPAIR_LIST).find((kp) =>
    getKeypairFromBase58(kp).publicKey.equals(address)
  );
  if (!match) {
    throw new Error(`No keypair found for address ${address.toBase58()}`);
  }

  return getKeypairFromBase58(match);
}

export function getPriceByAppTokenLocal(appToken: AppToken): number {
  const price = TOKEN_AND_PRICE_LIST[appToken];
  if (price === MARKET_INDEX_DEFAULT) {
    throw new Error(`${appToken} market index isn't found`);
  }

  return price;
}

export async function distributeFunds(
  chain: ChainHelpers,
  userList: Keypair[]
) {
  // Airdrop SOL to all users
  for (const keypair of userList) {
    const amount = INITIAL_SOL_BALANCE_INCREASED;
    await chain.requestAirdrop(amount, keypair.publicKey);
  }

  // Mint tokens to users
  for (const [_, token] of Object.entries(AppToken)) {
    // Skip WSOL
    if (token === AppToken.WSOL) {
      continue;
    }

    const config = TOKEN_CONFIG[token];
    const mintPubkey =
      TOKEN_KEYPAIRS[token] instanceof PublicKey
        ? (TOKEN_KEYPAIRS[token] as PublicKey)
        : (TOKEN_KEYPAIRS[token] as Keypair).publicKey;

    for (const user of userList) {
      const userPubkey = user.publicKey;

      // TODO: use 1 tx with multiple mint ixs
      await chain.mintTokens(
        INITIAL_TOKEN_BALANCE_INCREASED,
        mintPubkey,
        userPubkey,
        {
          isToken2022: config.isToken2022,
        }
      );
    }
  }
}
