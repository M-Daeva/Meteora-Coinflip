#![allow(unexpected_cfgs)]

pub mod helpers;
pub mod instructions;

use {anchor_lang::prelude::*, instructions::init::*};

// IDL builder doesn't see ID from cpi package, we need to duplicate it here
declare_id!("5u3XjrkcUyRqn1Qs8fpNJSxBwohE4ARZJJBukNUMJKsQ");

#[program]
pub mod coinflip {
    use super::*;

    pub fn init(ctx: Context<Init>) -> Result<()> {
        ctx.accounts.init()
    }
}
