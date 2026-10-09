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
        }
      ],
      "args": []
    },
    {
      "name": "placeBet",
      "discriminator": [
        222,
        62,
        67,
        220,
        63,
        166,
        126,
        33
      ],
      "accounts": [
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
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
          "name": "vrfProgram",
          "address": "VRFzZoJdhFWL8rkvu87LpKM3RbcVezpMEc6X5GVDr7y"
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
          }
        ]
      }
    }
  ]
};
