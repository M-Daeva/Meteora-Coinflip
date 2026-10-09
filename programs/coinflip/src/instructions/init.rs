use {
    anchor_lang::prelude::*,
    base::{
        cluster::CLUSTER,
        helpers::{admin_guard, get_space},
    },
    coinflip_api::state::{Config, DEVNET_ADMIN, LOCALNET_ADMIN, MAINNET_ADMIN, SEED_CONFIG},
};

#[derive(Accounts)]
pub struct Init<'info> {
    pub system_program: Program<'info, System>,

    #[account(mut)]
    pub admin: Signer<'info>,

    // === data storage ===
    #[account(
        init,
        payer = admin,
        space = get_space(Config::INIT_SPACE),
        seeds = [SEED_CONFIG.as_bytes()],
        bump
    )]
    pub config: Account<'info, Config>,
}

impl<'info> Init<'info> {
    pub fn init(&mut self, worker: Pubkey) -> Result<()> {
        let Self { admin, config, .. } = self;

        admin_guard(
            CLUSTER,
            admin,
            &MAINNET_ADMIN,
            &DEVNET_ADMIN,
            &LOCALNET_ADMIN,
        )?;

        config.set_inner(Config {
            admin: admin.key(),
            worker,
        });

        Ok(())
    }
}
