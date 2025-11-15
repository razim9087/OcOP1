/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/escrow.json`.
 */
export type Escrow = {
  "address": "E5ijR9ex1qWRQGXBSQ7ZiRbP72xtqzxrNXvQRB9PaTYL",
  "metadata": {
    "name": "escrow",
    "version": "0.1.0",
    "spec": "0.1.0"
  },
  "instructions": [
    {
      "name": "dailySettlement",
      "docs": [
        "Daily settlement - calculates P&L and adjusts margins",
        "asset_price_usd: Current price of underlying asset in USD (with 6 decimals)",
        "sol_price_usd: Current price of SOL in USD (with 6 decimals)"
      ],
      "discriminator": [
        125,
        60,
        100,
        119,
        126,
        243,
        240,
        27
      ],
      "accounts": [
        {
          "name": "option",
          "writable": true
        },
        {
          "name": "settler",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "assetPriceUsd",
          "type": "u64"
        },
        {
          "name": "solPriceUsd",
          "type": "u64"
        }
      ]
    },
    {
      "name": "delistOption",
      "docs": [
        "Delist an option (seller can cancel if not owned)"
      ],
      "discriminator": [
        190,
        179,
        72,
        98,
        219,
        169,
        100,
        236
      ],
      "accounts": [
        {
          "name": "option",
          "writable": true
        },
        {
          "name": "seller",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "exerciseOption",
      "docs": [
        "Exercise an option contract (only on expiration date)",
        "Final settlement with reference price check"
      ],
      "discriminator": [
        231,
        98,
        131,
        183,
        245,
        93,
        122,
        48
      ],
      "accounts": [
        {
          "name": "option",
          "writable": true
        },
        {
          "name": "owner",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "assetPriceUsd",
          "type": "u64"
        },
        {
          "name": "solPriceUsd",
          "type": "u64"
        }
      ]
    },
    {
      "name": "expireOption",
      "docs": [
        "Mark expired options"
      ],
      "discriminator": [
        38,
        144,
        3,
        237,
        125,
        177,
        141,
        229
      ],
      "accounts": [
        {
          "name": "option",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "initializeOption",
      "docs": [
        "Initialize a new options contract with margin accounts",
        "option_type: 0 for Call, 1 for Put",
        "strike: The strike price in lamports (ratio of asset price to SOL price)",
        "is_test: true for test contracts (allows past dates), false for production"
      ],
      "discriminator": [
        33,
        143,
        47,
        123,
        142,
        183,
        68,
        0
      ],
      "accounts": [
        {
          "name": "option",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  112,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "seller"
              },
              {
                "kind": "arg",
                "path": "underlying"
              }
            ]
          }
        },
        {
          "name": "seller",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "optionType",
          "type": "u8"
        },
        {
          "name": "underlying",
          "type": "string"
        },
        {
          "name": "initiationDate",
          "type": "i64"
        },
        {
          "name": "price",
          "type": "u64"
        },
        {
          "name": "strike",
          "type": "u64"
        },
        {
          "name": "initialMargin",
          "type": "u64"
        },
        {
          "name": "isTest",
          "type": "bool"
        }
      ]
    },
    {
      "name": "purchaseOption",
      "docs": [
        "Purchase an option contract with margin deposit"
      ],
      "discriminator": [
        146,
        223,
        0,
        55,
        50,
        0,
        11,
        32
      ],
      "accounts": [
        {
          "name": "option",
          "writable": true
        },
        {
          "name": "buyer",
          "writable": true,
          "signer": true
        },
        {
          "name": "seller",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "resellOption",
      "docs": [
        "Resell an option to a new buyer",
        "Current owner sells to new buyer at a new price"
      ],
      "discriminator": [
        119,
        113,
        215,
        172,
        121,
        222,
        219,
        127
      ],
      "accounts": [
        {
          "name": "option",
          "writable": true
        },
        {
          "name": "currentOwner",
          "writable": true,
          "signer": true
        },
        {
          "name": "newBuyer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "resellPrice",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "optionContract",
      "discriminator": [
        196,
        220,
        72,
        61,
        245,
        42,
        68,
        234
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unauthorized",
      "msg": "Unauthorized to perform this action"
    },
    {
      "code": 6001,
      "name": "invalidOptionType",
      "msg": "Invalid option type (must be 0 for Call or 1 for Put)"
    },
    {
      "code": 6002,
      "name": "priceMustBeNonZero",
      "msg": "Price must be greater than zero"
    },
    {
      "code": 6003,
      "name": "strikeMustBeNonZero",
      "msg": "Strike must be greater than zero"
    },
    {
      "code": 6004,
      "name": "underlyingTooLong",
      "msg": "Underlying symbol too long (max 32 characters)"
    },
    {
      "code": 6005,
      "name": "optionNotAvailable",
      "msg": "Option is not available for purchase"
    },
    {
      "code": 6006,
      "name": "optionExpired",
      "msg": "Option has expired"
    },
    {
      "code": 6007,
      "name": "optionNotOwned",
      "msg": "Option is not owned"
    },
    {
      "code": 6008,
      "name": "optionNotExpired",
      "msg": "Option has not expired yet"
    },
    {
      "code": 6009,
      "name": "cannotDelistOwnedOption",
      "msg": "Cannot delist an owned option"
    },
    {
      "code": 6010,
      "name": "cannotExerciseBeforeExpiry",
      "msg": "Cannot exercise option before expiry date (European option)"
    },
    {
      "code": 6011,
      "name": "marginMustBeNonZero",
      "msg": "Margin must be greater than zero"
    },
    {
      "code": 6012,
      "name": "settlementTooSoon",
      "msg": "Settlement can only occur once per day"
    },
    {
      "code": 6013,
      "name": "invalidPrice",
      "msg": "Invalid price provided"
    },
    {
      "code": 6014,
      "name": "calculationOverflow",
      "msg": "Calculation overflow occurred"
    },
    {
      "code": 6015,
      "name": "insufficientMargin",
      "msg": "Insufficient margin for settlement"
    },
    {
      "code": 6016,
      "name": "invalidInitiationDate",
      "msg": "Initiation date cannot be in the past for production contracts"
    }
  ],
  "types": [
    {
      "name": "optionContract",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "optionType",
            "type": "u8"
          },
          {
            "name": "underlying",
            "type": "string"
          },
          {
            "name": "seller",
            "type": "pubkey"
          },
          {
            "name": "initiationDate",
            "type": "i64"
          },
          {
            "name": "expiryDate",
            "type": "i64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "optionStatus"
              }
            }
          },
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "strike",
            "type": "u64"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "isTest",
            "type": "bool"
          },
          {
            "name": "initialMargin",
            "type": "u64"
          },
          {
            "name": "sellerMargin",
            "type": "u64"
          },
          {
            "name": "buyerMargin",
            "type": "u64"
          },
          {
            "name": "lastSettlementDate",
            "type": "i64"
          },
          {
            "name": "lastSettlementPrice",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "optionStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "listed"
          },
          {
            "name": "owned"
          },
          {
            "name": "expired"
          },
          {
            "name": "delisted"
          },
          {
            "name": "marginCalled"
          }
        ]
      }
    }
  ]
};
