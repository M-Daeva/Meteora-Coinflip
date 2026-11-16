import { PublicKey } from "@solana/web3.js";

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
  DAMM_V2: {
    NAME: "damm_v2",
    PROGRAM_ID: new PublicKey("cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG"),
  },
  ORAO_VRF: {
    NAME: "orao_vrf",
    PROGRAM_ID: new PublicKey("VRFzZoJdhFWL8rkvu87LpKM3RbcVezpMEc6X5GVDr7y"),
  },
};

export enum Cluster {
  Localnet = "Localnet",
  Devnet = "Devnet",
  Mainnet = "Mainnet",
}

export const COMMITMENT = "confirmed" as const;

export const BPF_LOADER_UPGRADEABLE = new PublicKey(
  "BPFLoaderUpgradeab1e11111111111111111111111"
);

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
  USDG = "USDG",
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

const DEFAULT_MINT = "11111111111111111111111111111111";

export const TOKEN_MINTS: Record<Cluster, Record<AppToken, string>> = {
  [Cluster.Localnet]: {
    // Layer-1 tokens
    [AppToken.WSOL]: "So11111111111111111111111111111111111111112",
    [AppToken.wETH]: "7GaqqZKjjv89fX4o9uQP6uck1mnLr8pxfPjseacCbbQL",
    [AppToken.wBTC]: "DzWRP5B4NhgRz65qAG1dyAX1WReT1yx6fuW7GfGokdhE",
    [AppToken.cbBTC]: "5sczgHDRS9696LLEUZqqXJFhW7r4ehBAd8bbCGqycVMH",
    [AppToken.zBTC]: "21BvrhGLE3z5ZJHtfcBuoDSwhQVawfau4q5aU3wrp3o5",
    [AppToken.LBTC]: "5BoY4Z9AC2YpkAHSUrdoWFjjPukvXo6w66Q2hgCfwmmx",

    // Stablecoins
    [AppToken.USDC]: "qWHehL6NjpdXxteLffxS53Nx2sjuX9cjRw9rJnbnJMc",
    [AppToken.USDT]: "CsZyJWttJbyw3F2kMALCTKYVaoS6RM3jQZbLssZZfLjA",
    [AppToken.USDY]: "DE91CxTQeDXvFQHUhDq6yMKS3QL18GfYG8cwzhEVhXEq",
    [AppToken.USDS]: "8iyXvGkvFSvK4un7z8CABh2hR2Uxip6gJQemJNS7eRD",
    [AppToken.PYUSD]: "45o785euMdrq4krJ8cnTWvoRzochbjYJWqxGXg9zHzNe",
    [AppToken.sUSDe]: "ArLYJUFJmdZjqZ1nHE3wrRtwA6BskPgVzGP9GBJ3RdJF",
    [AppToken.USDe]: "Bv1jF9bLP9tdhpCnFs278kMG5QYtmBUVuv7uLe2WbDWS",
    [AppToken.syrupUSDC]: "HyvbmiJ4PwxzoW1b6UQVZHWEGCmickYwAJ3GdinvGi2R",
    [AppToken.AUSD]: "CvQSPCUQcLanZWYeNs9LxRbwCAxGpc6s1v17EjHKQQJR",

    // Liquid staking tokens
    [AppToken.mSOL]: "ALtArZQmNZYr89c6j9GE4nx4piXx7PmeF5oNCSDZ2QJr",
    [AppToken.jitoSOL]: "3DgFPYfae5FQ5RYawFzdJxQrNCW5vQvQzBASejZSfs1U",
    [AppToken.bSOL]: "4oXucgGXgCCPNrXNNHofS2FjxV5H31ENo9bZxk5DoBHT",
    [AppToken.dSOL]: "CzsbyucrDFABVnCNdc15jiCoyhJ9AtAFLkHquZHwTzde",
    [AppToken.BNSOL]: "22L8vLdMwABxeToDFRc2sUVhBfhq7dfn2Hvg76RmViWo",
    [AppToken.JLP]: "9F6zpWcYShsPs1nij1y2dWfcEP9Xaj1dE5GWH9DwF81m",

    // Utility tokens
    [AppToken.PYTH]: "14D57vsZmipuW36zCtUGLBxRoTYxYUWfd8naDAcFgb6s",
    [AppToken.JUP]: "45wEBwz431H5ys4nciZCLNNBGctcRBoWBGde1an9j2J7",
    [AppToken.TNSR]: "ExxGFhmxBpZoxAgu8kRtqtMzwbKmpeXcVKQ77pdrAiyw",
    [AppToken.DRIFT]: "5HYZMeihJGN95yEvJ1h6878DWuBkrgmK3Yi7VRRcvqGm",
    [AppToken.INF]: "4CB4HTN47dF7iAwBK1iNw69zuqThzSafLFXbCt6LUYcd",
    [AppToken.JTO]: "2YDwbKQtuqWpUwq8XhYQt1XAUXrd5ZscJeJAo39N5ZVy",
    [AppToken.ME]: "Et73LSo3x6ygXzGH3sVJQjPFcbZB9bk9ieX7twhaAoR5",
    [AppToken.RENDER]: "2fUHTFNAEa15eRfks5tU9qAFxyZQtcK7yZdiHW415ixA",
    [AppToken.CLOUD]: "DjnGcyn6ccft7fSz5mJvEkDmUZoeorsBiuY9mUEbXEsn",
    [AppToken.W]: "BabHJzBkyuX8vttKnB5jXXeCWdKd4w6x13W4PMULYt8P",

    // Meme & community tokens
    [AppToken.BONK]: "5ww73sWniczsHap9ykNwuF8eBjnBNQeDZPMN6dM9QM77",
    [AppToken.WIF]: "5FvDu8MD1i5WaSXUT8Z3rL55A2c8RA7yx4KDDnJJzGUe",
    [AppToken.POPCAT]: "BdLRaNZu6ikuw3Lgwsnn8FwSbyr7JxVbS34Dn6woBphT",
    [AppToken.MOTHER]: "HkdNjWNgk3BoVdD1aVetyPWfhcFQd3fXxxzxdwB2PkER",
    [AppToken.PENGU]: "CgJJ4v8pfeWqhQMuGjKQmsQNpvZzhpVF6F723nicSRiC",
    [AppToken.TRUMP]: "7mW2CKJ2KgaV2YeVfQimQAuvVpx4RT3yqhZh9aYD7CUJ",
    [AppToken.MELANIA]: "8xs9mgmty4S8FYdCgra8VKvG4YgVDnW7ar9bEmZVHyo4",
    [AppToken.AI16Z]: "4iiK2R7nA5skwoHY5YhE2gGwRT67qRAtRK1k2ycSsXZq",
    [AppToken.FARTCOIN]: "CRH5J2S8TGiQu1pmC3k2a1ukGwdfWvrTX342FZoENZ5s",
    [AppToken.PUMP]: "A25fmvacEaz67JXujw8zUDpme7BRaqF4N6t78miu9j89",
    [AppToken.ZEUS]: "G2MDmX6DuVEuSGg6MQ2gGh5Uq1jzo8d762CBiXHus1Sf",
    [AppToken["2Z"]]: "6kA37coWmbXHBy13wXap5kkuos8VBukMHYUweEVv8Aiw",
    [AppToken.MET]: "CyjnfsANW5MqzukjFiExBqcSWqxFvPRxQFwx5nN3Xocb",
    [AppToken.dfdvSOL]: "AaMmwmYgx2v9xzAgq1pCFSmZjiXsPSCxEdq5FrQE9W1P",

    // Kamino extension
    [AppToken.jupSOL]: "7rqQK6e7qsZPUqzvjigKzX5u46gyNbgjUyNXj2TyLXE7",
    [AppToken.USDG]: "CqRWVvG3C4zr2U9WEyjFrA3VRQby4G4QfBHtkmEjEfjA",
    [AppToken.hSOL]: "Dobpy5pkuXxff2Bk3tK4ivr6zizaWVWQg31wENib6dYq",
    [AppToken.STKESOL]: "Bm83tk9hyYDzzo54weyh1eENzyh6fpvj7wHPGTPs7g7z",

    // Tokenized equities
    [AppToken.SPYx]: "2wUs7DE3FinRCKJ83NPPSByqxH4iQgCuJvRZYiRZdtzJ",
    [AppToken.TSLAx]: "9RxLmvcsh3aNyZ7X3T5MCxCvX1mTbgubDRHJiF63npMQ",
    [AppToken.QQQx]: "Bn7mxUgWuJG1dMZVghA6UFuVtGwi3Ew3imLctfDRW7WK",
    [AppToken.NVDAx]: "4j8uFwLDYBBRLjks2BLxv3QkYVBba1g1d17VrS4JD892",
    [AppToken.GOOGLx]: "Bky8ZVg62vYNbiSgYbfcHQNZgXM1WS1cjgpoStwQHYdp",
    [AppToken.MSTRx]: "GtyVMF7eAaQPyeVYA8iNGHnLeBQiEjV7sYX9sBYJNerF",
    [AppToken.AAPLx]: "8BhVV7PrA749iqKSD7f9vtG27QAyC9MFHfZ9higbt2Ny",
    [AppToken.CRCLx]: "C94moNejkzFWi7hSw4nGAypEiSiFjsh4uRxcmJVwL2du",
    [AppToken.HOODx]: "o9HBQSgV5zjB9FXPxhXrRarQfU9zy9owUbwKn6cd28k",
  },

  [Cluster.Devnet]: {
    // Layer-1 tokens
    [AppToken.WSOL]: "So11111111111111111111111111111111111111112",
    [AppToken.wETH]: "4BxPGLXVf3B8Lqt1xvdDnW7zUmqHPqSnywooB6EQgqji",
    [AppToken.wBTC]: "FJprKVEBevtHyDf4f9BqjLBSmd7jVPj6rDNMce4ntHbU",
    [AppToken.cbBTC]: DEFAULT_MINT,
    [AppToken.zBTC]: DEFAULT_MINT,
    [AppToken.LBTC]: DEFAULT_MINT,

    // Stablecoins
    [AppToken.USDC]: "qWHehL6NjpdXxteLffxS53Nx2sjuX9cjRw9rJnbnJMc",
    [AppToken.USDT]: "HNHj2QWuNWEpB2H936dmegwgVKLwFMw3GsyZ7EZTSuj9",
    [AppToken.USDY]: DEFAULT_MINT,
    [AppToken.USDS]: DEFAULT_MINT,
    [AppToken.PYUSD]: DEFAULT_MINT,
    [AppToken.sUSDe]: DEFAULT_MINT,
    [AppToken.USDe]: DEFAULT_MINT,
    [AppToken.syrupUSDC]: DEFAULT_MINT,
    [AppToken.AUSD]: DEFAULT_MINT,

    // Liquid staking tokens
    [AppToken.mSOL]: DEFAULT_MINT,
    [AppToken.jitoSOL]: DEFAULT_MINT,
    [AppToken.bSOL]: DEFAULT_MINT,
    [AppToken.dSOL]: DEFAULT_MINT,
    [AppToken.BNSOL]: DEFAULT_MINT,
    [AppToken.JLP]: DEFAULT_MINT,

    // Utility tokens
    [AppToken.PYTH]: "uMfJpLsAB3pruaWg1k8LyimkWUe9Sd7njxDaqPLCoDD",
    [AppToken.JUP]: DEFAULT_MINT,
    [AppToken.TNSR]: DEFAULT_MINT,
    [AppToken.DRIFT]: DEFAULT_MINT,
    [AppToken.INF]: DEFAULT_MINT,
    [AppToken.JTO]: DEFAULT_MINT,
    [AppToken.ME]: DEFAULT_MINT,
    [AppToken.RENDER]: DEFAULT_MINT,
    [AppToken.CLOUD]: DEFAULT_MINT,
    [AppToken.W]: DEFAULT_MINT,

    // Meme & community tokens
    [AppToken.BONK]: DEFAULT_MINT,
    [AppToken.WIF]: DEFAULT_MINT,
    [AppToken.POPCAT]: DEFAULT_MINT,
    [AppToken.MOTHER]: DEFAULT_MINT,
    [AppToken.PENGU]: DEFAULT_MINT,
    [AppToken.TRUMP]: DEFAULT_MINT,
    [AppToken.MELANIA]: DEFAULT_MINT,
    [AppToken.AI16Z]: DEFAULT_MINT,
    [AppToken.FARTCOIN]: DEFAULT_MINT,
    [AppToken.PUMP]: "Eu3KiqnikphuRwToirF8X85Wp5DFD3dxaz4PwB45GdxQ",
    [AppToken.ZEUS]: DEFAULT_MINT,
    [AppToken["2Z"]]: DEFAULT_MINT,
    [AppToken.MET]: DEFAULT_MINT,
    [AppToken.dfdvSOL]: DEFAULT_MINT,

    // Kamino extension
    [AppToken.jupSOL]: DEFAULT_MINT,
    [AppToken.USDG]: DEFAULT_MINT,
    [AppToken.hSOL]: DEFAULT_MINT,
    [AppToken.STKESOL]: DEFAULT_MINT,

    // Tokenized equities
    [AppToken.SPYx]: DEFAULT_MINT,
    [AppToken.TSLAx]: DEFAULT_MINT,
    [AppToken.QQQx]: DEFAULT_MINT,
    [AppToken.NVDAx]: DEFAULT_MINT,
    [AppToken.GOOGLx]: DEFAULT_MINT,
    [AppToken.MSTRx]: DEFAULT_MINT,
    [AppToken.AAPLx]: DEFAULT_MINT,
    [AppToken.CRCLx]: DEFAULT_MINT,
    [AppToken.HOODx]: DEFAULT_MINT,
  },

  [Cluster.Mainnet]: {
    // Layer-1 tokens
    [AppToken.WSOL]: "So11111111111111111111111111111111111111112",
    [AppToken.wETH]: "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs",
    [AppToken.wBTC]: "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh",
    [AppToken.cbBTC]: "cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij",
    [AppToken.zBTC]: "zBTCug3er3tLyffELcvDNrKkCymbPWysGcWihESYfLg",
    [AppToken.LBTC]: "LBTCgU4b3wsFKsPwBn1rRZDx5DoFutM6RPiEt1TPDsY",

    // Stablecoins
    [AppToken.USDC]: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    [AppToken.USDT]: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    [AppToken.USDY]: "A1KLoBrKBde8Ty9qtNQUtq3C2ortoC3u7twggz7sEto6",
    [AppToken.USDS]: "USDSwr9ApdHk5bvJKMjzff41FfuX8bSxdKcR81vTwcA",
    [AppToken.PYUSD]: "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo",
    [AppToken.sUSDe]: "Eh6XEPhSwoLv5wFApukmnaVSHQ6sAnoD9BmgmwQoN2sN",
    [AppToken.USDe]: "DEkqHyPN7GMRJ5cArtQFAWefqbZb33Hyf6s5iCwjEonT",
    [AppToken.syrupUSDC]: "AvZZF1YaZDziPY2RCK4oJrRVrbN3mTD9NL24hPeaZeUj",
    [AppToken.AUSD]: "AUSD1jCcCyPLybk1YnvPWsHQSrZ46dxwoMniN4N2UEB9",

    // Liquid staking tokens
    [AppToken.mSOL]: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
    [AppToken.jitoSOL]: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
    [AppToken.bSOL]: "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1",
    [AppToken.dSOL]: "Dso1bDeDjCQxTrWHqUUi63oBvV7Mdm6WaobLbQ7gnPQ",
    [AppToken.BNSOL]: "BNso1VUJnh4zcfpZa6986Ea66P6TCp59hvtNJ8b1X85",
    [AppToken.JLP]: "27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4",

    // Utility tokens
    [AppToken.PYTH]: "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
    [AppToken.JUP]: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    [AppToken.TNSR]: "TNSRxcUxoT9xBG3de7PiJyTDYu7kskLqcpddxnEJAS6",
    [AppToken.DRIFT]: "DriFtupJYLTosbwoN8koMbEYSx54aFAVLddWsbksjwg7",
    [AppToken.INF]: "5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm",
    [AppToken.JTO]: "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL",
    [AppToken.ME]: "MEFNBXixkEbait3xn9bkm8WsJzXtVsaJEn4c8Sam21u",
    [AppToken.RENDER]: "rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof",
    [AppToken.CLOUD]: "CLoUDKc4Ane7HeQcPpE3YHnznRxhMimJ4MyaUqyHFzAu",
    [AppToken.W]: "85VBFQZC9TZkfaptBWjvUw7YbZjy52A6mjtPGjstQAmQ",

    // Meme & community tokens
    [AppToken.BONK]: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    [AppToken.WIF]: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
    [AppToken.POPCAT]: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr",
    [AppToken.MOTHER]: "3S8qX1MsMqRbiwKg2cQyx7nis1oHMgaCuc9c4VfvVdPN",
    [AppToken.PENGU]: "2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv",
    [AppToken.TRUMP]: "6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN",
    [AppToken.MELANIA]: "FUAfBo2jgks6gB4Z4LfZkqSZgzNucisEHqnNebaRxM1P",
    [AppToken.AI16Z]: "HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC",
    [AppToken.FARTCOIN]: "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump",
    [AppToken.PUMP]: "pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn",
    [AppToken.ZEUS]: "ZEUS1aR7aX8DFFJf5QjWj2ftDDdNTroMNGo8YoQm3Gq",
    [AppToken["2Z"]]: "J6pQQ3FAcJQeWPPGppWRb4nM8jU3wLyYbRrLh7feMfvd",
    [AppToken.MET]: "METvsvVRapdj9cFLzq4Tr43xK4tAjQfwX76z3n6mWQL",
    [AppToken.dfdvSOL]: "sctmB7GPi5L2Q5G9tUSzXvhZ4YiDMEGcRov9KfArQpx",

    // Kamino extension
    [AppToken.jupSOL]: "jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v",
    [AppToken.USDG]: "2u1tszSeqZ3qBWF3uNGPFc8TzMk2tdiwknnRMWGWjGWH",
    [AppToken.hSOL]: "he1iusmfkpAdwvxLNGV8Y1iSbj4rUy6yMhEA3fotn9A",
    [AppToken.STKESOL]: "stke7uu3fXHsGqKVVjKnkmj65LRPVrqr4bLG2SJg7rh",

    // Tokenized equities
    [AppToken.SPYx]: "XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W",
    [AppToken.TSLAx]: "XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB",
    [AppToken.QQQx]: "Xs8S1uUs1zvS2p7iwtsG3b6fkhpvmwz4GYU3gWAmWHZ",
    [AppToken.NVDAx]: "Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh",
    [AppToken.GOOGLx]: "XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN",
    [AppToken.MSTRx]: "XsP7xzNPvEHS1m6qfanPUGjNmdnmsLKEoNAnHjdxxyZ",
    [AppToken.AAPLx]: "XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp",
    [AppToken.CRCLx]: "XsueG8BtpquVJX9LVLLEGuViXUungE6WmK5YZ3p3bd1",
    [AppToken.HOODx]: "XsvNBAYkrDRNhA7wPHQfX3ZUXZyZLdnCQDfHZ56bzpg",
  },
};

export const ALT = {
  MAINNET: new PublicKey("TtA6CjEVVjpwz3xTanKeLYvGDp2dRceHTcHDvgRPrDT"),
  DEVNET: new PublicKey("DoMgn4nCzBpNgwTVCcvKRudLz3DC6T5M3yzyfPF41KHA"),
  LOCALNET: new PublicKey("B2EKZ2e3QjRpGHRq8U6QdJzijFA9Ft9ojDRYKezRcWAV"),
};
