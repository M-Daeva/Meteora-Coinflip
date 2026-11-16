#![allow(unexpected_cfgs)]

pub mod instructions;

use {
    anchor_lang::prelude::*,
    instructions::{claim::*, init::*},
};

// IDL builder doesn't see ID from cpi package, we need to duplicate it here
declare_id!("GPAWLz4LE6SxE26GQT4y8vG1iRJsEQPUmxvs52JY19pm");

#[program]
pub mod faucet {
    use super::*;

    pub fn init(ctx: Context<Init>, claimable_amount: u64, claim_cooldown: u64) -> Result<()> {
        ctx.accounts.init(claimable_amount, claim_cooldown)
    }

    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        ctx.accounts.claim(ctx.bumps)
    }
}
