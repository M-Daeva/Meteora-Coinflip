#![allow(unexpected_cfgs)]

pub mod dbc_cpi;
pub mod helpers;
pub mod instructions;
pub mod uint256;
pub mod vrf_cpi;

use {
    anchor_lang::prelude::*,
    coinflip_api::types::BetSide,
    instructions::{init::*, place_bet_dbc::*, settle_bet::*},
};

// IDL builder doesn't see ID from cpi package, we need to duplicate it here
declare_id!("5u3XjrkcUyRqn1Qs8fpNJSxBwohE4ARZJJBukNUMJKsQ");

#[program]
pub mod coinflip {
    use super::*;

    pub fn init(
        ctx: Context<Init>,
        worker: Pubkey,
        base_mint: Pubkey,
        vrf_program: Pubkey,
        dbc_program: Pubkey,
        damm_program: Pubkey,
        dbc_config: Pubkey,
        min_quote_bet: u64,
        max_quote_bet: u64,
    ) -> Result<()> {
        ctx.accounts.init(
            worker,
            base_mint,
            vrf_program,
            dbc_program,
            damm_program,
            dbc_config,
            min_quote_bet,
            max_quote_bet,
        )
    }

    pub fn place_bet_dbc(
        ctx: Context<PlaceBetDbc>,
        bet_nonce: u64,
        bet_amount: u64,
        bet_side: BetSide,
        min_quote_out: u64,
    ) -> Result<()> {
        ctx.accounts
            .place_bet_dbc(bet_nonce, bet_amount, bet_side, min_quote_out)
    }

    pub fn settle_bet(ctx: Context<SettleBet>, bet_nonce: u64, user: Pubkey) -> Result<()> {
        ctx.accounts.settle_bet(bet_nonce, user, ctx.bumps)
    }
}
