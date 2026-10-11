/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/coinflip.json`.
 */
export type Coinflip = {
  "address": "5u3XjrkcUyRqn1Qs8fpNJSxBwohE4ARZJJBukNUMJKsQ",
  "metadata": {
    "name": "coinflip",
    "version": "1.0.0",
    "spec": "0.1.0",
    "description": "Created with Anchor",
    "repository": "https://github.com/M-Daeva/dbc-coinflip"
  },
  "instructions": [
    {
      "name": "init",
      "discriminator": [
        220,
        59,
        207,
        236,
        108,
        250,
        47,
        100
      ],
      "accounts": [
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "stats",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  116,
                  115
                ]
              }
            ]
          }
        },
        {
          "name": "quoteMint"
        },
        {
          "name": "appQuoteAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "config"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "quoteMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        }
      ],
      "args": [
        {
          "name": "worker",
          "type": "pubkey"
        },
        {
          "name": "baseMint",
          "type": "pubkey"
        },
        {
          "name": "vrfProgram",
          "type": "pubkey"
        },
        {
          "name": "dbcProgram",
          "type": "pubkey"
        },
        {
          "name": "dammProgram",
          "type": "pubkey"
        },
        {
          "name": "dbcConfig",
          "type": "pubkey"
        },
        {
          "name": "dammConfig",
          "type": "pubkey"
        },
        {
          "name": "minQuoteBet",
          "type": "u64"
        },
        {
          "name": "maxQuoteBet",
          "type": "u64"
        }
      ]
    },
    {
      "name": "placeBetDamm",
      "discriminator": [
        41,
        183,
        38,
        5,
        134,
        244,
        232,
        155
      ],
      "accounts": [
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenBaseProgram"
        },
        {
          "name": "tokenQuoteProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "config"
        },
        {
          "name": "stats",
          "writable": true
        },
        {
          "name": "bet",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "arg",
                "path": "betNonce"
              }
            ]
          }
        },
        {
          "name": "baseMint"
        },
        {
          "name": "quoteMint"
        },
        {
          "name": "userBaseTa",
          "writable": true
        },
        {
          "name": "appQuoteAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "config"
              },
              {
                "kind": "account",
                "path": "tokenQuoteProgram"
              },
              {
                "kind": "account",
                "path": "config.quote_mint",
                "account": "config"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "dammProgram"
        },
        {
          "name": "dammPoolAuthority"
        },
        {
          "name": "dammPool",
          "docs": [
            "layout/vaults/mints validated by DAMM"
          ],
          "writable": true
        },
        {
          "name": "dammBaseVault",
          "writable": true
        },
        {
          "name": "dammQuoteVault",
          "writable": true
        },
        {
          "name": "dammEventAuthority"
        },
        {
          "name": "vrfProgram"
        },
        {
          "name": "vrfNetworkState",
          "writable": true
        },
        {
          "name": "vrfTreasury",
          "writable": true
        },
        {
          "name": "vrfRequest",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  97,
                  111,
                  45,
                  118,
                  114,
                  102,
                  45,
                  114,
                  97,
                  110,
                  100,
                  111,
                  109,
                  110,
                  101,
                  115,
                  115,
                  45,
                  114,
                  101,
                  113,
                  117,
                  101,
                  115,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "bet"
              }
            ],
            "program": {
              "kind": "account",
              "path": "vrfProgram"
            }
          }
        }
      ],
      "args": [
        {
          "name": "betNonce",
          "type": "u64"
        },
        {
          "name": "betAmount",
          "type": "u64"
        },
        {
          "name": "betSide",
          "type": {
            "defined": {
              "name": "betSide"
            }
          }
        },
        {
          "name": "minQuoteOut",
          "type": "u64"
        }
      ]
    },
    {
      "name": "placeBetDbc",
      "discriminator": [
        205,
        139,
        205,
        203,
        92,
        195,
        225,
        133
      ],
      "accounts": [
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenBaseProgram"
        },
        {
          "name": "tokenQuoteProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "config"
        },
        {
          "name": "stats",
          "writable": true
        },
        {
          "name": "bet",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "arg",
                "path": "betNonce"
              }
            ]
          }
        },
        {
          "name": "baseMint"
        },
        {
          "name": "quoteMint"
        },
        {
          "name": "userBaseTa",
          "writable": true
        },
        {
          "name": "appQuoteAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "config"
              },
              {
                "kind": "account",
                "path": "tokenQuoteProgram"
              },
              {
                "kind": "account",
                "path": "config.quote_mint",
                "account": "config"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "dbcProgram"
        },
        {
          "name": "dbcPoolAuthority"
        },
        {
          "name": "dbcConfig"
        },
        {
          "name": "dbcPool",
          "writable": true
        },
        {
          "name": "dbcBaseVault",
          "writable": true
        },
        {
          "name": "dbcQuoteVault",
          "writable": true
        },
        {
          "name": "dbcEventAuthority"
        },
        {
          "name": "vrfProgram"
        },
        {
          "name": "vrfNetworkState",
          "writable": true
        },
        {
          "name": "vrfTreasury",
          "writable": true
        },
        {
          "name": "vrfRequest",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  97,
                  111,
                  45,
                  118,
                  114,
                  102,
                  45,
                  114,
                  97,
                  110,
                  100,
                  111,
                  109,
                  110,
                  101,
                  115,
                  115,
                  45,
                  114,
                  101,
                  113,
                  117,
                  101,
                  115,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "bet"
              }
            ],
            "program": {
              "kind": "account",
              "path": "vrfProgram"
            }
          }
        }
      ],
      "args": [
        {
          "name": "betNonce",
          "type": "u64"
        },
        {
          "name": "betAmount",
          "type": "u64"
        },
        {
          "name": "betSide",
          "type": {
            "defined": {
              "name": "betSide"
            }
          }
        },
        {
          "name": "minQuoteOut",
          "type": "u64"
        }
      ]
    },
    {
      "name": "settleBet",
      "discriminator": [
        115,
        55,
        234,
        177,
        227,
        4,
        10,
        67
      ],
      "accounts": [
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenQuoteProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "sender",
          "docs": [
            "The sender signing the transaction (worker or user)"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "stats"
        },
        {
          "name": "bet",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  101,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "user"
              },
              {
                "kind": "arg",
                "path": "betNonce"
              }
            ]
          }
        },
        {
          "name": "quoteMint"
        },
        {
          "name": "userQuoteTa",
          "writable": true
        },
        {
          "name": "appQuoteAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "config"
              },
              {
                "kind": "account",
                "path": "tokenQuoteProgram"
              },
              {
                "kind": "account",
                "path": "config.quote_mint",
                "account": "config"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "vrfProgram",
          "address": "VRFzZoJdhFWL8rkvu87LpKM3RbcVezpMEc6X5GVDr7y"
        },
        {
          "name": "vrfRequest",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  97,
                  111,
                  45,
                  118,
                  114,
                  102,
                  45,
                  114,
                  97,
                  110,
                  100,
                  111,
                  109,
                  110,
                  101,
                  115,
                  115,
                  45,
                  114,
                  101,
                  113,
                  117,
                  101,
                  115,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "bet"
              }
            ],
            "program": {
              "kind": "account",
              "path": "vrfProgram"
            }
          }
        }
      ],
      "args": [
        {
          "name": "betNonce",
          "type": "u64"
        },
        {
          "name": "user",
          "type": "pubkey"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "bet",
      "discriminator": [
        147,
        23,
        35,
        59,
        15,
        75,
        155,
        32
      ]
    },
    {
      "name": "config",
      "discriminator": [
        155,
        12,
        170,
        224,
        30,
        250,
        204,
        130
      ]
    },
    {
      "name": "randomnessV2",
      "discriminator": [
        139,
        239,
        184,
        215,
        227,
        86,
        191,
        226
      ]
    },
    {
      "name": "stats",
      "discriminator": [
        190,
        125,
        51,
        63,
        169,
        197,
        36,
        238
      ]
    }
  ],
  "types": [
    {
      "name": "bet",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "side",
            "type": {
              "defined": {
                "name": "betSide"
              }
            }
          },
          {
            "name": "createdAt",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "betSide",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "head"
          },
          {
            "name": "tail"
          }
        ]
      }
    },
    {
      "name": "config",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "worker",
            "type": "pubkey"
          },
          {
            "name": "baseMint",
            "type": "pubkey"
          },
          {
            "name": "quoteMint",
            "type": "pubkey"
          },
          {
            "name": "vrfProgram",
            "type": "pubkey"
          },
          {
            "name": "dbcProgram",
            "type": "pubkey"
          },
          {
            "name": "dammProgram",
            "type": "pubkey"
          },
          {
            "name": "dbcConfig",
            "type": "pubkey"
          },
          {
            "name": "dammConfig",
            "type": "pubkey"
          },
          {
            "name": "minQuoteBet",
            "type": "u64"
          },
          {
            "name": "maxQuoteBet",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "fulfilledRequest",
      "docs": [
        "Fulfilled request representation."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "client",
            "type": "pubkey"
          },
          {
            "name": "seed",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "randomness",
            "docs": [
              "Generated randomness.",
              "",
              "Please look into the account history logs to observe the individual components."
            ],
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          }
        ]
      }
    },
    {
      "name": "pendingRequest",
      "docs": [
        "Pending request representation."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "client",
            "type": "pubkey"
          },
          {
            "name": "seed",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "responses",
            "docs": [
              "Responses collected so far."
            ],
            "type": {
              "vec": {
                "defined": {
                  "name": "randomnessResponse"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "randomnessResponse",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pubkey",
            "type": "pubkey"
          },
          {
            "name": "randomness",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          }
        ]
      }
    },
    {
      "name": "randomnessV2",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "request",
            "type": {
              "defined": {
                "name": "requestAccount"
              }
            }
          }
        ]
      }
    },
    {
      "name": "requestAccount",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "pending",
            "fields": [
              {
                "defined": {
                  "name": "pendingRequest"
                }
              }
            ]
          },
          {
            "name": "fulfilled",
            "fields": [
              {
                "defined": {
                  "name": "fulfilledRequest"
                }
              }
            ]
          }
        ]
      }
    },
    {
      "name": "stats",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "totalSold",
            "type": "u64"
          },
          {
            "name": "totalBought",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
