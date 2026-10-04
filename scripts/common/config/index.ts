import * as anchor from "@coral-xyz/anchor";
import * as spl from "@solana/spl-token";
import { NetworkConfig, TokenWeight } from "../interfaces";
import { PublicKey } from "@solana/web3.js";

export enum Cluster {
  Mainnet,
  Devnet,
  Localnet,
}
export const CLUSTER: Cluster = Cluster.Mainnet;

export type ProgramName = "COINFLIP" | "DBC";
export const networks = ["LOCALNET", "DEVNET", "MAINNET"] as const;

// mainnet
export const PROGRAM = {
  COINFLIP: {
    NAME: "coinflip",
    PROGRAM_ID: new PublicKey("5u3XjrkcUyRqn1Qs8fpNJSxBwohE4ARZJJBukNUMJKsQ"),
  },
  DBC: {
    NAME: "dbc",
    PROGRAM_ID: new PublicKey("dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN"),
  },
};

export const COMMITMENT: anchor.web3.Commitment = "confirmed";

export const PATH = {
  TO_CONFIG: "./scripts/common/config/index.ts",
  OWNER_KEYPAIR: "../.test-wallets/solana/dev-keypair.json",
};

export const UTILS = {
  MS_PER_SECOND: 1_000,
  ENCODING: "utf8",
};

export const DECIMALS_DEFAULT = 6;

export const ADDRESS = {
  CUSTOM_ALT: {
    MAINNET: new PublicKey("TtA6CjEVVjpwz3xTanKeLYvGDp2dRceHTcHDvgRPrDT"),
    DEVNET: new PublicKey("DoMgn4nCzBpNgwTVCcvKRudLz3DC6T5M3yzyfPF41KHA"),
  },
  LOCALNET_ALT: new PublicKey("BTLzHgFXTZJ1AnYHeNVDKkPZ4SokCx4wqPY8Pu27imDk"),
};

export const ADDRESS_DEVNET = {
  COLLATERAL: new PublicKey("E9z1AubeczC29gYn7Mn9mfdKgJ1dF141aD5pN3Qv6qyC"),
  TAX_WALLET: new PublicKey("4Y1H2afUBzMZaUv3KAvkdBNFPNS87zbEkU9RpDi8UYjx"),
  WORKER: new PublicKey("9qsaqMY2DKDdhtmAzCtHBnCuahCPBJuWFJx5wQDWdJeS"),
};

export enum AppToken {
  // Layer-1 tokens
  WSOL = "WSOL",
  wETH = "wETH",
  wBTC = "wBTC",
  cbBTC = "cbBTC",
  zBTC = "zBTC",
  LBTC = "LBTC",
  // Stablecoins
  USDC = "USDC",
  USDT = "USDT",
  USDY = "USDY",
  USDS = "USDS",
  PYUSD = "PYUSD",
  sUSDe = "sUSDe",
  USDe = "USDe",
  syrupUSDC = "syrupUSDC",
  AUSD = "AUSD",
  // Liquid staking tokens
  mSOL = "mSOL",
  jitoSOL = "jitoSOL",
  bSOL = "bSOL",
  dSOL = "dSOL",
  BNSOL = "BNSOL",
  JLP = "JLP",
  // Utility tokens
  PYTH = "PYTH",
  JUP = "JUP",
  TNSR = "TNSR",
  DRIFT = "DRIFT",
  INF = "INF",
  JTO = "JTO",
  ME = "ME",
  RENDER = "RENDER",
  CLOUD = "CLOUD",
  W = "W",
  // Meme & community tokens
  BONK = "BONK",
  WIF = "WIF",
  POPCAT = "POPCAT",
  MOTHER = "MOTHER",
  PENGU = "PENGU",
  TRUMP = "TRUMP",
  MELANIA = "MELANIA",
  AI16Z = "AI16Z",
  FARTCOIN = "FARTCOIN",
  PUMP = "PUMP",
  ZEUS = "ZEUS",
  "2Z" = "2Z",
  MET = "MET",
  dfdvSOL = "dfdvSOL",

  // Kamino extension
  jupSOL = "jupSOL",
  USDG = "USDG", // stablecoin
  hSOL = "hSOL",
  STKESOL = "STKESOL",
  // Tokenized equities (xStocks)
  SPYx = "SPYx",
  TSLAx = "TSLAx",
  QQQx = "QQQx",
  NVDAx = "NVDAx",
  GOOGLx = "GOOGLx",
  MSTRx = "MSTRx",
  AAPLx = "AAPLx",
  CRCLx = "CRCLx",
  HOODx = "HOODx",
}

export const TOKEN_MAINNET: Record<AppToken, PublicKey> = {
  // Layer-1 tokens
  [AppToken.WSOL]: new PublicKey("So11111111111111111111111111111111111111112"),
  [AppToken.wETH]: new PublicKey(
    "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs"
  ),
  [AppToken.wBTC]: new PublicKey(
    "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh"
  ),
  [AppToken.cbBTC]: new PublicKey(
    "cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij"
  ),
  [AppToken.zBTC]: new PublicKey("zBTCug3er3tLyffELcvDNrKkCymbPWysGcWihESYfLg"),
  [AppToken.LBTC]: new PublicKey("LBTCgU4b3wsFKsPwBn1rRZDx5DoFutM6RPiEt1TPDsY"),
  // Stablecoins
  [AppToken.USDC]: new PublicKey(
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
  ),
  [AppToken.USDT]: new PublicKey(
    "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
  ),
  [AppToken.USDY]: new PublicKey(
    "A1KLoBrKBde8Ty9qtNQUtq3C2ortoC3u7twggz7sEto6"
  ),
  [AppToken.USDS]: new PublicKey("USDSwr9ApdHk5bvJKMjzff41FfuX8bSxdKcR81vTwcA"),
  [AppToken.PYUSD]: new PublicKey(
    "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo"
  ),
  [AppToken.sUSDe]: new PublicKey(
    "Eh6XEPhSwoLv5wFApukmnaVSHQ6sAnoD9BmgmwQoN2sN"
  ),
  [AppToken.USDe]: new PublicKey(
    "DEkqHyPN7GMRJ5cArtQFAWefqbZb33Hyf6s5iCwjEonT"
  ),
  [AppToken.syrupUSDC]: new PublicKey(
    "AvZZF1YaZDziPY2RCK4oJrRVrbN3mTD9NL24hPeaZeUj"
  ),
  [AppToken.AUSD]: new PublicKey(
    "AUSD1jCcCyPLybk1YnvPWsHQSrZ46dxwoMniN4N2UEB9"
  ),
  // Liquid staking tokens
  [AppToken.mSOL]: new PublicKey("mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So"),
  [AppToken.jitoSOL]: new PublicKey(
    "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn"
  ),
  [AppToken.bSOL]: new PublicKey("bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1"),
  [AppToken.dSOL]: new PublicKey("Dso1bDeDjCQxTrWHqUUi63oBvV7Mdm6WaobLbQ7gnPQ"),
  [AppToken.BNSOL]: new PublicKey(
    "BNso1VUJnh4zcfpZa6986Ea66P6TCp59hvtNJ8b1X85"
  ),
  [AppToken.JLP]: new PublicKey("27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4"),
  // Utility tokens
  [AppToken.PYTH]: new PublicKey(
    "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3"
  ),
  [AppToken.JUP]: new PublicKey("JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN"),
  [AppToken.TNSR]: new PublicKey("TNSRxcUxoT9xBG3de7PiJyTDYu7kskLqcpddxnEJAS6"),
  [AppToken.DRIFT]: new PublicKey(
    "DriFtupJYLTosbwoN8koMbEYSx54aFAVLddWsbksjwg7"
  ),
  [AppToken.INF]: new PublicKey("5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm"),
  [AppToken.JTO]: new PublicKey("jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL"),
  [AppToken.ME]: new PublicKey("MEFNBXixkEbait3xn9bkm8WsJzXtVsaJEn4c8Sam21u"),
  [AppToken.RENDER]: new PublicKey(
    "rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof"
  ),
  [AppToken.CLOUD]: new PublicKey(
    "CLoUDKc4Ane7HeQcPpE3YHnznRxhMimJ4MyaUqyHFzAu"
  ),
  [AppToken.W]: new PublicKey("85VBFQZC9TZkfaptBWjvUw7YbZjy52A6mjtPGjstQAmQ"),
  // Meme & community tokens
  [AppToken.BONK]: new PublicKey(
    "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"
  ),
  [AppToken.WIF]: new PublicKey("EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm"),
  [AppToken.POPCAT]: new PublicKey(
    "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr"
  ),
  [AppToken.MOTHER]: new PublicKey(
    "3S8qX1MsMqRbiwKg2cQyx7nis1oHMgaCuc9c4VfvVdPN"
  ),
  [AppToken.PENGU]: new PublicKey(
    "2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv"
  ),
  [AppToken.TRUMP]: new PublicKey(
    "6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN"
  ),
  [AppToken.MELANIA]: new PublicKey(
    "FUAfBo2jgks6gB4Z4LfZkqSZgzNucisEHqnNebaRxM1P"
  ),
  [AppToken.AI16Z]: new PublicKey(
    "HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC"
  ),
  [AppToken.FARTCOIN]: new PublicKey(
    "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump"
  ),
  [AppToken.PUMP]: new PublicKey("pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn"),
  [AppToken.ZEUS]: new PublicKey("ZEUS1aR7aX8DFFJf5QjWj2ftDDdNTroMNGo8YoQm3Gq"),
  [AppToken["2Z"]]: new PublicKey(
    "J6pQQ3FAcJQeWPPGppWRb4nM8jU3wLyYbRrLh7feMfvd"
  ),
  [AppToken.MET]: new PublicKey("METvsvVRapdj9cFLzq4Tr43xK4tAjQfwX76z3n6mWQL"),
  [AppToken.dfdvSOL]: new PublicKey(
    "sctmB7GPi5L2Q5G9tUSzXvhZ4YiDMEGcRov9KfArQpx"
  ),

  // Kamino extension
  [AppToken.jupSOL]: new PublicKey(
    "jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v"
  ),
  [AppToken.USDG]: new PublicKey(
    "2u1tszSeqZ3qBWF3uNGPFc8TzMk2tdiwknnRMWGWjGWH"
  ),
  [AppToken.hSOL]: new PublicKey("he1iusmfkpAdwvxLNGV8Y1iSbj4rUy6yMhEA3fotn9A"),
  [AppToken.STKESOL]: new PublicKey(
    "stke7uu3fXHsGqKVVjKnkmj65LRPVrqr4bLG2SJg7rh"
  ),
  // Tokenized equities (xStocks)
  [AppToken.SPYx]: new PublicKey("XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W"),
  [AppToken.TSLAx]: new PublicKey(
    "XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB"
  ),
  [AppToken.QQQx]: new PublicKey("Xs8S1uUs1zvS2p7iwtsG3b6fkhpvmwz4GYU3gWAmWHZ"),
  [AppToken.NVDAx]: new PublicKey(
    "Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh"
  ),
  [AppToken.GOOGLx]: new PublicKey(
    "XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN"
  ),
  [AppToken.MSTRx]: new PublicKey(
    "XsP7xzNPvEHS1m6qfanPUGjNmdnmsLKEoNAnHjdxxyZ"
  ),
  [AppToken.AAPLx]: new PublicKey(
    "XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp"
  ),
  [AppToken.CRCLx]: new PublicKey(
    "XsueG8BtpquVJX9LVLLEGuViXUungE6WmK5YZ3p3bd1"
  ),
  [AppToken.HOODx]: new PublicKey(
    "XsvNBAYkrDRNhA7wPHQfX3ZUXZyZLdnCQDfHZ56bzpg"
  ),
};

// devnet kamino tokens
export const TOKEN_DEVNET: Record<AppToken, PublicKey> = {
  // Layer-1 tokens
  [AppToken.WSOL]: new PublicKey("So11111111111111111111111111111111111111112"),
  [AppToken.wETH]: new PublicKey(
    "4BxPGLXVf3B8Lqt1xvdDnW7zUmqHPqSnywooB6EQgqji"
  ),
  [AppToken.wBTC]: new PublicKey(
    "FJprKVEBevtHyDf4f9BqjLBSmd7jVPj6rDNMce4ntHbU"
  ),
  [AppToken.cbBTC]: PublicKey.default,
  [AppToken.zBTC]: PublicKey.default,
  [AppToken.LBTC]: PublicKey.default,
  // Stablecoins
  [AppToken.USDC]: new PublicKey("CcuoBwMZJgupcdx81m3vYqBongw2PhhZ4yiYA2jo3K5"),
  [AppToken.USDT]: new PublicKey(
    "HNHj2QWuNWEpB2H936dmegwgVKLwFMw3GsyZ7EZTSuj9"
  ),
  [AppToken.USDY]: PublicKey.default,
  [AppToken.USDS]: PublicKey.default,
  [AppToken.PYUSD]: PublicKey.default,
  [AppToken.sUSDe]: PublicKey.default,
  [AppToken.USDe]: PublicKey.default,
  [AppToken.syrupUSDC]: PublicKey.default,
  [AppToken.AUSD]: PublicKey.default,
  // Liquid staking tokens
  [AppToken.mSOL]: PublicKey.default,
  [AppToken.jitoSOL]: PublicKey.default,
  [AppToken.bSOL]: PublicKey.default,
  [AppToken.dSOL]: PublicKey.default,
  [AppToken.BNSOL]: PublicKey.default,
  [AppToken.JLP]: PublicKey.default,
  // Utility tokens
  [AppToken.PYTH]: new PublicKey("uMfJpLsAB3pruaWg1k8LyimkWUe9Sd7njxDaqPLCoDD"),
  [AppToken.JUP]: PublicKey.default,
  [AppToken.TNSR]: PublicKey.default,
  [AppToken.DRIFT]: PublicKey.default,
  [AppToken.INF]: PublicKey.default,
  [AppToken.JTO]: PublicKey.default,
  [AppToken.ME]: PublicKey.default,
  [AppToken.RENDER]: PublicKey.default,
  [AppToken.CLOUD]: PublicKey.default,
  [AppToken.W]: PublicKey.default,
  // Meme & community tokens
  [AppToken.BONK]: PublicKey.default,
  [AppToken.WIF]: PublicKey.default,
  [AppToken.POPCAT]: PublicKey.default,
  [AppToken.MOTHER]: PublicKey.default,
  [AppToken.PENGU]: PublicKey.default,
  [AppToken.TRUMP]: PublicKey.default,
  [AppToken.MELANIA]: PublicKey.default,
  [AppToken.AI16Z]: PublicKey.default,
  [AppToken.FARTCOIN]: PublicKey.default,
  [AppToken.PUMP]: new PublicKey(
    "Eu3KiqnikphuRwToirF8X85Wp5DFD3dxaz4PwB45GdxQ"
  ),
  [AppToken.ZEUS]: PublicKey.default,
  [AppToken["2Z"]]: PublicKey.default,
  [AppToken.MET]: PublicKey.default,
  [AppToken.dfdvSOL]: PublicKey.default,

  // Kamino extension
  [AppToken.jupSOL]: PublicKey.default,
  [AppToken.USDG]: PublicKey.default,
  [AppToken.hSOL]: PublicKey.default,
  [AppToken.STKESOL]: PublicKey.default,
  // Tokenized equities (xStocks)
  [AppToken.SPYx]: PublicKey.default,
  [AppToken.TSLAx]: PublicKey.default,
  [AppToken.QQQx]: PublicKey.default,
  [AppToken.NVDAx]: PublicKey.default,
  [AppToken.GOOGLx]: PublicKey.default,
  [AppToken.MSTRx]: PublicKey.default,
  [AppToken.AAPLx]: PublicKey.default,
  [AppToken.CRCLx]: PublicKey.default,
  [AppToken.HOODx]: PublicKey.default,
};

export const TOKEN_LOCALNET: Record<AppToken, PublicKey> = {
  // Layer-1 tokens
  [AppToken.WSOL]: new PublicKey("So11111111111111111111111111111111111111112"),
  [AppToken.wETH]: new PublicKey(
    "7GaqqZKjjv89fX4o9uQP6uck1mnLr8pxfPjseacCbbQL"
  ),
  [AppToken.wBTC]: new PublicKey(
    "An6eCPnnsspFAy5bUrgnNkU4hkedv9ZDRUJazUTG1ewb"
  ),
  [AppToken.cbBTC]: new PublicKey(
    "5sczgHDRS9696LLEUZqqXJFhW7r4ehBAd8bbCGqycVMH"
  ),
  [AppToken.zBTC]: new PublicKey(
    "21BvrhGLE3z5ZJHtfcBuoDSwhQVawfau4q5aU3wrp3o5"
  ),
  [AppToken.LBTC]: new PublicKey(
    "5BoY4Z9AC2YpkAHSUrdoWFjjPukvXo6w66Q2hgCfwmmx"
  ),
  // Stablecoins
  [AppToken.USDC]: new PublicKey(
    "8XdLEJXrM3yYfFg5EpMqcCKmXXSQeBKfTjvNP619LbE2"
  ),
  [AppToken.USDT]: new PublicKey(
    "CsZyJWttJbyw3F2kMALCTKYVaoS6RM3jQZbLssZZfLjA"
  ),
  [AppToken.USDY]: new PublicKey(
    "DE91CxTQeDXvFQHUhDq6yMKS3QL18GfYG8cwzhEVhXEq"
  ),
  [AppToken.USDS]: new PublicKey("8iyXvGkvFSvK4un7z8CABh2hR2Uxip6gJQemJNS7eRD"),
  [AppToken.PYUSD]: new PublicKey(
    "45o785euMdrq4krJ8cnTWvoRzochbjYJWqxGXg9zHzNe"
  ),
  [AppToken.sUSDe]: new PublicKey(
    "ArLYJUFJmdZjqZ1nHE3wrRtwA6BskPgVzGP9GBJ3RdJF"
  ),
  [AppToken.USDe]: new PublicKey(
    "Bv1jF9bLP9tdhpCnFs278kMG5QYtmBUVuv7uLe2WbDWS"
  ),
  [AppToken.syrupUSDC]: new PublicKey(
    "HyvbmiJ4PwxzoW1b6UQVZHWEGCmickYwAJ3GdinvGi2R"
  ),
  [AppToken.AUSD]: new PublicKey(
    "CvQSPCUQcLanZWYeNs9LxRbwCAxGpc6s1v17EjHKQQJR"
  ),
  // Liquid staking tokens
  [AppToken.mSOL]: new PublicKey(
    "ALtArZQmNZYr89c6j9GE4nx4piXx7PmeF5oNCSDZ2QJr"
  ),
  [AppToken.jitoSOL]: new PublicKey(
    "3DgFPYfae5FQ5RYawFzdJxQrNCW5vQvQzBASejZSfs1U"
  ),
  [AppToken.bSOL]: new PublicKey(
    "4oXucgGXgCCPNrXNNHofS2FjxV5H31ENo9bZxk5DoBHT"
  ),
  [AppToken.dSOL]: new PublicKey(
    "CzsbyucrDFABVnCNdc15jiCoyhJ9AtAFLkHquZHwTzde"
  ),
  [AppToken.BNSOL]: new PublicKey(
    "22L8vLdMwABxeToDFRc2sUVhBfhq7dfn2Hvg76RmViWo"
  ),
  [AppToken.JLP]: new PublicKey("9F6zpWcYShsPs1nij1y2dWfcEP9Xaj1dE5GWH9DwF81m"),
  // Utility tokens
  [AppToken.PYTH]: new PublicKey(
    "HBtzyBH14hR6t5UfYT3ptL6d1pMnVCep2RY8vUgHmaRA"
  ),
  [AppToken.JUP]: new PublicKey("45wEBwz431H5ys4nciZCLNNBGctcRBoWBGde1an9j2J7"),
  [AppToken.TNSR]: new PublicKey(
    "ExxGFhmxBpZoxAgu8kRtqtMzwbKmpeXcVKQ77pdrAiyw"
  ),
  [AppToken.DRIFT]: new PublicKey(
    "5HYZMeihJGN95yEvJ1h6878DWuBkrgmK3Yi7VRRcvqGm"
  ),
  [AppToken.INF]: new PublicKey("4CB4HTN47dF7iAwBK1iNw69zuqThzSafLFXbCt6LUYcd"),
  [AppToken.JTO]: new PublicKey("2YDwbKQtuqWpUwq8XhYQt1XAUXrd5ZscJeJAo39N5ZVy"),
  [AppToken.ME]: new PublicKey("Et73LSo3x6ygXzGH3sVJQjPFcbZB9bk9ieX7twhaAoR5"),
  [AppToken.RENDER]: new PublicKey(
    "2fUHTFNAEa15eRfks5tU9qAFxyZQtcK7yZdiHW415ixA"
  ),
  [AppToken.CLOUD]: new PublicKey(
    "DjnGcyn6ccft7fSz5mJvEkDmUZoeorsBiuY9mUEbXEsn"
  ),
  [AppToken.W]: new PublicKey("BabHJzBkyuX8vttKnB5jXXeCWdKd4w6x13W4PMULYt8P"),
  // Meme & community tokens
  [AppToken.BONK]: new PublicKey(
    "5ww73sWniczsHap9ykNwuF8eBjnBNQeDZPMN6dM9QM77"
  ),
  [AppToken.WIF]: new PublicKey("5FvDu8MD1i5WaSXUT8Z3rL55A2c8RA7yx4KDDnJJzGUe"),
  [AppToken.POPCAT]: new PublicKey(
    "BdLRaNZu6ikuw3Lgwsnn8FwSbyr7JxVbS34Dn6woBphT"
  ),
  [AppToken.MOTHER]: new PublicKey(
    "HkdNjWNgk3BoVdD1aVetyPWfhcFQd3fXxxzxdwB2PkER"
  ),
  [AppToken.PENGU]: new PublicKey(
    "CgJJ4v8pfeWqhQMuGjKQmsQNpvZzhpVF6F723nicSRiC"
  ),
  [AppToken.TRUMP]: new PublicKey(
    "7mW2CKJ2KgaV2YeVfQimQAuvVpx4RT3yqhZh9aYD7CUJ"
  ),
  [AppToken.MELANIA]: new PublicKey(
    "8xs9mgmty4S8FYdCgra8VKvG4YgVDnW7ar9bEmZVHyo4"
  ),
  [AppToken.AI16Z]: new PublicKey(
    "4iiK2R7nA5skwoHY5YhE2gGwRT67qRAtRK1k2ycSsXZq"
  ),
  [AppToken.FARTCOIN]: new PublicKey(
    "CRH5J2S8TGiQu1pmC3k2a1ukGwdfWvrTX342FZoENZ5s"
  ),
  [AppToken.PUMP]: new PublicKey(
    "H3bPbQXue9wSq4PL41mGKE1r5KpaXfCZAuUYxK6Ni4kb"
  ),
  [AppToken.ZEUS]: new PublicKey(
    "G2MDmX6DuVEuSGg6MQ2gGh5Uq1jzo8d762CBiXHus1Sf"
  ),
  [AppToken["2Z"]]: new PublicKey(
    "6kA37coWmbXHBy13wXap5kkuos8VBukMHYUweEVv8Aiw"
  ),
  [AppToken.MET]: new PublicKey("CyjnfsANW5MqzukjFiExBqcSWqxFvPRxQFwx5nN3Xocb"),
  [AppToken.dfdvSOL]: new PublicKey(
    "AaMmwmYgx2v9xzAgq1pCFSmZjiXsPSCxEdq5FrQE9W1P"
  ),

  // Kamino extension
  [AppToken.jupSOL]: new PublicKey(
    "7rqQK6e7qsZPUqzvjigKzX5u46gyNbgjUyNXj2TyLXE7"
  ),
  [AppToken.USDG]: new PublicKey(
    "CqRWVvG3C4zr2U9WEyjFrA3VRQby4G4QfBHtkmEjEfjA"
  ),
  [AppToken.hSOL]: new PublicKey(
    "Dobpy5pkuXxff2Bk3tK4ivr6zizaWVWQg31wENib6dYq"
  ),
  [AppToken.STKESOL]: new PublicKey(
    "Bm83tk9hyYDzzo54weyh1eENzyh6fpvj7wHPGTPs7g7z"
  ),
  // Tokenized equities (xStocks)
  [AppToken.SPYx]: new PublicKey(
    "2wUs7DE3FinRCKJ83NPPSByqxH4iQgCuJvRZYiRZdtzJ"
  ),
  [AppToken.TSLAx]: new PublicKey(
    "9RxLmvcsh3aNyZ7X3T5MCxCvX1mTbgubDRHJiF63npMQ"
  ),
  [AppToken.QQQx]: new PublicKey(
    "Bn7mxUgWuJG1dMZVghA6UFuVtGwi3Ew3imLctfDRW7WK"
  ),
  [AppToken.NVDAx]: new PublicKey(
    "4j8uFwLDYBBRLjks2BLxv3QkYVBba1g1d17VrS4JD892"
  ),
  [AppToken.GOOGLx]: new PublicKey(
    "Bky8ZVg62vYNbiSgYbfcHQNZgXM1WS1cjgpoStwQHYdp"
  ),
  [AppToken.MSTRx]: new PublicKey(
    "GtyVMF7eAaQPyeVYA8iNGHnLeBQiEjV7sYX9sBYJNerF"
  ),
  [AppToken.AAPLx]: new PublicKey(
    "8BhVV7PrA749iqKSD7f9vtG27QAyC9MFHfZ9higbt2Ny"
  ),
  [AppToken.CRCLx]: new PublicKey(
    "C94moNejkzFWi7hSw4nGAypEiSiFjsh4uRxcmJVwL2du"
  ),
  [AppToken.HOODx]: new PublicKey(
    "o9HBQSgV5zjB9FXPxhXrRarQfU9zy9owUbwKn6cd28k"
  ),
};

export function getTokenPubkeySet(
  cluster: Cluster
): Record<AppToken, PublicKey> {
  return {
    [AppToken.WSOL]: getMintByAppToken(cluster, AppToken.WSOL),
    [AppToken.wETH]: getMintByAppToken(cluster, AppToken.wETH),
    [AppToken.wBTC]: getMintByAppToken(cluster, AppToken.wBTC),
    [AppToken.cbBTC]: getMintByAppToken(cluster, AppToken.cbBTC),
    [AppToken.zBTC]: getMintByAppToken(cluster, AppToken.zBTC),
    [AppToken.LBTC]: getMintByAppToken(cluster, AppToken.LBTC),
    [AppToken.USDC]: getMintByAppToken(cluster, AppToken.USDC),
    [AppToken.USDT]: getMintByAppToken(cluster, AppToken.USDT),
    [AppToken.USDY]: getMintByAppToken(cluster, AppToken.USDY),
    [AppToken.USDS]: getMintByAppToken(cluster, AppToken.USDS),
    [AppToken.PYUSD]: getMintByAppToken(cluster, AppToken.PYUSD),
    [AppToken.sUSDe]: getMintByAppToken(cluster, AppToken.sUSDe),
    [AppToken.USDe]: getMintByAppToken(cluster, AppToken.USDe),
    [AppToken.syrupUSDC]: getMintByAppToken(cluster, AppToken.syrupUSDC),
    [AppToken.AUSD]: getMintByAppToken(cluster, AppToken.AUSD),
    [AppToken.mSOL]: getMintByAppToken(cluster, AppToken.mSOL),
    [AppToken.jitoSOL]: getMintByAppToken(cluster, AppToken.jitoSOL),
    [AppToken.bSOL]: getMintByAppToken(cluster, AppToken.bSOL),
    [AppToken.dSOL]: getMintByAppToken(cluster, AppToken.dSOL),
    [AppToken.BNSOL]: getMintByAppToken(cluster, AppToken.BNSOL),
    [AppToken.JLP]: getMintByAppToken(cluster, AppToken.JLP),
    [AppToken.PYTH]: getMintByAppToken(cluster, AppToken.PYTH),
    [AppToken.JUP]: getMintByAppToken(cluster, AppToken.JUP),
    [AppToken.TNSR]: getMintByAppToken(cluster, AppToken.TNSR),
    [AppToken.DRIFT]: getMintByAppToken(cluster, AppToken.DRIFT),
    [AppToken.INF]: getMintByAppToken(cluster, AppToken.INF),
    [AppToken.JTO]: getMintByAppToken(cluster, AppToken.JTO),
    [AppToken.ME]: getMintByAppToken(cluster, AppToken.ME),
    [AppToken.RENDER]: getMintByAppToken(cluster, AppToken.RENDER),
    [AppToken.CLOUD]: getMintByAppToken(cluster, AppToken.CLOUD),
    [AppToken.W]: getMintByAppToken(cluster, AppToken.W),
    [AppToken.BONK]: getMintByAppToken(cluster, AppToken.BONK),
    [AppToken.WIF]: getMintByAppToken(cluster, AppToken.WIF),
    [AppToken.POPCAT]: getMintByAppToken(cluster, AppToken.POPCAT),
    [AppToken.MOTHER]: getMintByAppToken(cluster, AppToken.MOTHER),
    [AppToken.PENGU]: getMintByAppToken(cluster, AppToken.PENGU),
    [AppToken.TRUMP]: getMintByAppToken(cluster, AppToken.TRUMP),
    [AppToken.MELANIA]: getMintByAppToken(cluster, AppToken.MELANIA),
    [AppToken.AI16Z]: getMintByAppToken(cluster, AppToken.AI16Z),
    [AppToken.FARTCOIN]: getMintByAppToken(cluster, AppToken.FARTCOIN),
    [AppToken.PUMP]: getMintByAppToken(cluster, AppToken.PUMP),
    [AppToken.ZEUS]: getMintByAppToken(cluster, AppToken.ZEUS),
    [AppToken["2Z"]]: getMintByAppToken(cluster, AppToken["2Z"]),
    [AppToken.MET]: getMintByAppToken(cluster, AppToken.MET),
    [AppToken.dfdvSOL]: getMintByAppToken(cluster, AppToken.dfdvSOL),

    // Kamino extension
    [AppToken.jupSOL]: getMintByAppToken(cluster, AppToken.jupSOL),
    [AppToken.USDG]: getMintByAppToken(cluster, AppToken.USDG),
    [AppToken.hSOL]: getMintByAppToken(cluster, AppToken.hSOL),
    [AppToken.STKESOL]: getMintByAppToken(cluster, AppToken.STKESOL),
    // Tokenized equities (xStocks)
    [AppToken.SPYx]: getMintByAppToken(cluster, AppToken.SPYx),
    [AppToken.TSLAx]: getMintByAppToken(cluster, AppToken.TSLAx),
    [AppToken.QQQx]: getMintByAppToken(cluster, AppToken.QQQx),
    [AppToken.NVDAx]: getMintByAppToken(cluster, AppToken.NVDAx),
    [AppToken.GOOGLx]: getMintByAppToken(cluster, AppToken.GOOGLx),
    [AppToken.MSTRx]: getMintByAppToken(cluster, AppToken.MSTRx),
    [AppToken.AAPLx]: getMintByAppToken(cluster, AppToken.AAPLx),
    [AppToken.CRCLx]: getMintByAppToken(cluster, AppToken.CRCLx),
    [AppToken.HOODx]: getMintByAppToken(cluster, AppToken.HOODx),
  };
}

function getTokenListByCluster(cluster: Cluster): Record<AppToken, PublicKey> {
  if (cluster === Cluster.Mainnet) {
    return TOKEN_MAINNET;
  }

  if (cluster === Cluster.Devnet) {
    return TOKEN_DEVNET;
  }

  return TOKEN_LOCALNET;
}

export function getAppTokenByMint(cluster: Cluster, mint: PublicKey): AppToken {
  const tokenList = getTokenListByCluster(cluster);
  const entry = Object.entries(tokenList).find(([_t, m]) => m.equals(mint));
  if (!entry) {
    throw new Error(`${mint} app token isn't found`);
  }
  const [enumValue] = entry;

  const enumKey = Object.keys(AppToken).find(
    (key) => AppToken[key as keyof typeof AppToken] === enumValue
  );

  return enumKey as AppToken;
}

export function getMintByAppToken(
  cluster: Cluster,
  appToken: AppToken
): PublicKey {
  const tokenList = getTokenListByCluster(cluster);
  const mint = tokenList[appToken];
  if (!mint) {
    throw new Error(`${appToken} app token isn't found`);
  }

  return mint;
}

export function getClusterByMint(mint: PublicKey): Cluster {
  if (mint.equals(spl.NATIVE_MINT)) {
    throw new Error("WSOL cluster can't be identified");
  }

  if (Object.entries(TOKEN_MAINNET).find(([_t, m]) => m.equals(mint))) {
    return Cluster.Mainnet;
  }

  if (Object.entries(TOKEN_DEVNET).find(([_t, m]) => m.equals(mint))) {
    return Cluster.Devnet;
  }

  if (Object.entries(TOKEN_LOCALNET).find(([_t, m]) => m.equals(mint))) {
    return Cluster.Localnet;
  }

  throw new Error(`${mint} cluster isn't found`);
}

// Stablecoins (9)
export const STABLES: AppToken[] = [
  AppToken.USDC,
  AppToken.USDT,
  AppToken.USDY,
  AppToken.USDS,
  AppToken.PYUSD,
  AppToken.sUSDe,
  AppToken.USDe,
  AppToken.syrupUSDC,
  AppToken.AUSD,
];

export const NON_STABLES: AppToken[] = [
  // Layer-1 tokens (6)
  AppToken.WSOL,
  AppToken.wETH,
  AppToken.wBTC,
  AppToken.cbBTC,
  AppToken.zBTC,
  AppToken.LBTC,

  // Liquid staking tokens (6)
  AppToken.mSOL,
  AppToken.jitoSOL,
  AppToken.bSOL,
  AppToken.dSOL,
  AppToken.BNSOL,
  AppToken.JLP,

  // Utility tokens (10)
  AppToken.PYTH,
  AppToken.JUP,
  AppToken.TNSR,
  AppToken.DRIFT,
  AppToken.INF,
  AppToken.JTO,
  AppToken.ME,
  AppToken.RENDER,
  AppToken.CLOUD,
  AppToken.W,

  // Meme & community tokens (14)
  AppToken.BONK,
  AppToken.WIF,
  AppToken.POPCAT,
  AppToken.MOTHER,
  AppToken.PENGU,
  AppToken.TRUMP,
  AppToken.MELANIA,
  AppToken.AI16Z,
  AppToken.FARTCOIN,
  AppToken.PUMP,
  AppToken.ZEUS,
  AppToken["2Z"],
  AppToken.MET,
  AppToken.dfdvSOL,
];

// maintenance_asset_weight for collateral, maintenance_liability_weight for loan (Drift)
export const TOKEN_WEIGHT: Record<AppToken, TokenWeight> = {
  // Layer-1 tokens
  [AppToken.WSOL]: {
    collateralWeight: 9000,
    loanWeight: 11000,
  },
  [AppToken.wETH]: {
    collateralWeight: 9000,
    loanWeight: 11000,
  },
  [AppToken.wBTC]: {
    collateralWeight: 9000,
    loanWeight: 11000,
  },
  [AppToken.cbBTC]: {
    collateralWeight: 9000,
    loanWeight: 11000,
  },
  [AppToken.zBTC]: {
    collateralWeight: 8500,
    loanWeight: 11500,
  },
  [AppToken.LBTC]: {
    collateralWeight: 9000,
    loanWeight: 11000,
  },
  // Stablecoins
  [AppToken.USDC]: {
    collateralWeight: 10000,
    loanWeight: 10000,
  },
  [AppToken.USDT]: {
    collateralWeight: 9750,
    loanWeight: 10250,
  },
  [AppToken.USDY]: {
    collateralWeight: 9500,
    loanWeight: 10500,
  },
  [AppToken.USDS]: {
    collateralWeight: 9500,
    loanWeight: 10500,
  },
  [AppToken.PYUSD]: {
    collateralWeight: 9500,
    loanWeight: 10500,
  },
  [AppToken.sUSDe]: {
    collateralWeight: 7500,
    loanWeight: 12500,
  },
  [AppToken.USDe]: {
    collateralWeight: 7500,
    loanWeight: 12500,
  },
  [AppToken.syrupUSDC]: {
    collateralWeight: 9500,
    loanWeight: 10500,
  },
  [AppToken.AUSD]: {
    collateralWeight: 9500,
    loanWeight: 10500,
  },
  // Liquid staking tokens
  [AppToken.mSOL]: {
    collateralWeight: 9000,
    loanWeight: 11000,
  },
  [AppToken.jitoSOL]: {
    collateralWeight: 9000,
    loanWeight: 11000,
  },
  [AppToken.bSOL]: {
    collateralWeight: 9000,
    loanWeight: 11000,
  },
  [AppToken.dSOL]: {
    collateralWeight: 9000,
    loanWeight: 11000,
  },
  [AppToken.BNSOL]: {
    collateralWeight: 9000,
    loanWeight: 11000,
  },
  [AppToken.JLP]: {
    collateralWeight: 9000,
    loanWeight: 11000,
  },
  // Utility tokens
  [AppToken.PYTH]: {
    collateralWeight: 7500,
    loanWeight: 12500,
  },
  [AppToken.JUP]: {
    collateralWeight: 7500,
    loanWeight: 12500,
  },
  [AppToken.TNSR]: {
    collateralWeight: 5000,
    loanWeight: 15000,
  },
  [AppToken.DRIFT]: {
    collateralWeight: 6000,
    loanWeight: 14000,
  },
  [AppToken.INF]: {
    collateralWeight: 9000,
    loanWeight: 11000,
  },
  [AppToken.JTO]: {
    collateralWeight: 7500,
    loanWeight: 12500,
  },
  [AppToken.ME]: {
    collateralWeight: 7500,
    loanWeight: 12500,
  },
  [AppToken.RENDER]: {
    collateralWeight: 7500,
    loanWeight: 12500,
  },
  [AppToken.CLOUD]: {
    collateralWeight: 5000,
    loanWeight: 15000,
  },
  [AppToken.W]: {
    collateralWeight: 7500,
    loanWeight: 12500,
  },
  // Meme & community tokens
  [AppToken.BONK]: {
    collateralWeight: 6000,
    loanWeight: 14000,
  },
  [AppToken.WIF]: {
    collateralWeight: 6000,
    loanWeight: 14000,
  },
  [AppToken.POPCAT]: {
    collateralWeight: 5000,
    loanWeight: 15000,
  },
  [AppToken.MOTHER]: {
    collateralWeight: 5000,
    loanWeight: 15000,
  },
  [AppToken.PENGU]: {
    collateralWeight: 6000,
    loanWeight: 14000,
  },
  [AppToken.TRUMP]: {
    collateralWeight: 5000,
    loanWeight: 15000,
  },
  [AppToken.MELANIA]: {
    collateralWeight: 5000,
    loanWeight: 15000,
  },
  [AppToken.AI16Z]: {
    collateralWeight: 1,
    loanWeight: 20000,
  },
  [AppToken.FARTCOIN]: {
    collateralWeight: 6000,
    loanWeight: 14000,
  },
  [AppToken.PUMP]: {
    collateralWeight: 7000,
    loanWeight: 13000,
  },
  [AppToken.ZEUS]: {
    collateralWeight: 5000,
    loanWeight: 15000,
  },
  [AppToken["2Z"]]: {
    collateralWeight: 7000,
    loanWeight: 13000,
  },
  [AppToken.MET]: {
    collateralWeight: 7000,
    loanWeight: 13000,
  },
  [AppToken.dfdvSOL]: {
    collateralWeight: 9000,
    loanWeight: 11000,
  },

  // Kamino extension
  [AppToken.jupSOL]: {
    collateralWeight: 10000,
    loanWeight: 10000,
  },
  [AppToken.USDG]: {
    collateralWeight: 10000,
    loanWeight: 10000,
  },
  [AppToken.hSOL]: {
    collateralWeight: 10000,
    loanWeight: 10000,
  },
  [AppToken.STKESOL]: {
    collateralWeight: 10000,
    loanWeight: 10000,
  },
  // Tokenized equities (xStocks)
  [AppToken.SPYx]: {
    collateralWeight: 10000,
    loanWeight: 10000,
  },
  [AppToken.TSLAx]: {
    collateralWeight: 10000,
    loanWeight: 10000,
  },
  [AppToken.QQQx]: {
    collateralWeight: 10000,
    loanWeight: 10000,
  },
  [AppToken.NVDAx]: {
    collateralWeight: 10000,
    loanWeight: 10000,
  },
  [AppToken.GOOGLx]: {
    collateralWeight: 10000,
    loanWeight: 10000,
  },
  [AppToken.MSTRx]: {
    collateralWeight: 10000,
    loanWeight: 10000,
  },
  [AppToken.AAPLx]: {
    collateralWeight: 10000,
    loanWeight: 10000,
  },
  [AppToken.CRCLx]: {
    collateralWeight: 10000,
    loanWeight: 10000,
  },
  [AppToken.HOODx]: {
    collateralWeight: 10000,
    loanWeight: 10000,
  },
};

// for (let i = 0; i < 1000; i++) {
//   const kp = getKeypairFromSeed(i);
//   const priv = getBase58FromKeypair(kp);
//   const pub = kp.publicKey;
//   l(`${i}\n${priv}\n${pub}\n`);
// }

// for (const [_, appToken] of Object.entries(AppToken)) {
//   if (appToken === AppToken.WSOL) {
//     continue;
//   }

//   const pkFromKp = TOKEN_KEYPAIRS[appToken].publicKey;
//   const pk = TOKEN_LOCALNET[appToken];
//   if (!pkFromKp.equals(pk)) {
//     throw new Error(`${appToken} ${pkFromKp} ${pk}`);
//   }
// }
