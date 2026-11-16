use {
    anchor_lang::prelude::*,
    anchor_spl::{
        associated_token::AssociatedToken,
        token_interface::{Mint, TokenAccount, TokenInterface},
    },
    base::{
        cluster::CLUSTER,
        helpers::{admin_guard, get_space},
    },
    faucet_api::state::{Config, DEVNET_ADMIN, LOCALNET_ADMIN, MAINNET_ADMIN, SEED_CONFIG},
};

#[derive(Accounts)]
pub struct Init<'info> {
    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,

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

    // === token accounts ===
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = admin,
        associated_token::mint = mint,
        associated_token::authority = config,
        associated_token::token_program = token_program
    )]
    pub app_ata: InterfaceAccount<'info, TokenAccount>,
}

impl<'info> Init<'info> {
    pub fn init(&mut self, claimable_amount: u64, claim_cooldown: u64) -> Result<()> {
        let Self {
            admin,
            config,
            mint,
            ..
        } = self;

        admin_guard(
            CLUSTER,
            admin,
            &MAINNET_ADMIN,
            &DEVNET_ADMIN,
            &LOCALNET_ADMIN,
        )?;

        config.set_inner(Config {
            admin: admin.key(),
            mint: mint.key(),
            claimable_amount,
            claim_cooldown,
        });

        Ok(())
    }
}
