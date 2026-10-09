#![allow(unexpected_cfgs)]

pub mod helpers;
pub mod instructions;
pub mod vrf_cpi;

use {
    anchor_lang::prelude::*,
    coinflip_api::state::BetSide,
    instructions::{init::*, place_bet::*},
};

// IDL builder doesn't see ID from cpi package, we need to duplicate it here
declare_id!("5u3XjrkcUyRqn1Qs8fpNJSxBwohE4ARZJJBukNUMJKsQ");

#[program]
pub mod coinflip {
    use super::*;

    pub fn init(ctx: Context<Init>) -> Result<()> {
        ctx.accounts.init()
    }

    pub fn place_bet(
        ctx: Context<PlaceBet>,
        bet_nonce: u64,
        bet_amount: u64,
        bet_side: BetSide,
    ) -> Result<()> {
        ctx.accounts.place_bet(bet_nonce, bet_amount, bet_side)
    }
}
