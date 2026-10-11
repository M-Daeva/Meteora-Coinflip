use {
    anchor_lang::prelude::*,
    anchor_spl::{
        associated_token::AssociatedToken,
        token_interface::{Mint, TokenAccount, TokenInterface},
    },
    base::{
        cluster::CLUSTER,
        helpers::{admin_guard, get_option_by_cluster, get_space},
    },
    coinflip_api::state::{
        Config, Stats, DEVNET_ADMIN, DEVNET_USDC, LOCALNET_ADMIN, LOCALNET_USDC, MAINNET_ADMIN,
        MAINNET_USDC, SEED_CONFIG, SEED_STATS,
    },
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

    #[account(
        init,
        payer = admin,
        space = get_space(Stats::INIT_SPACE),
        seeds = [SEED_STATS.as_bytes()],
        bump
    )]
    pub stats: Account<'info, Stats>,

    // === token accounts ===
    #[account(address = get_option_by_cluster(
        CLUSTER,
        MAINNET_USDC,
        DEVNET_USDC,
        LOCALNET_USDC,
    ))]
    pub quote_mint: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = admin,
        associated_token::mint = quote_mint,
        associated_token::authority = config,
        associated_token::token_program = token_program
    )]
    pub app_quote_ata: InterfaceAccount<'info, TokenAccount>,
}

impl<'info> Init<'info> {
    pub fn init(
        &mut self,
        worker: Pubkey,
        base_mint: Pubkey,
        vrf_program: Pubkey,
        dbc_program: Pubkey,
        damm_program: Pubkey,
        dbc_config: Pubkey,
        damm_config: Pubkey,
        min_quote_bet: u64,
        max_quote_bet: u64,
    ) -> Result<()> {
        let Self {
            admin,
            config,
            stats,
            quote_mint,
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
            worker,
            base_mint,
            quote_mint: quote_mint.key(),
            vrf_program,
            dbc_program,
            damm_program,
            dbc_config,
            damm_config,
            min_quote_bet,
            max_quote_bet,
        });

        stats.set_inner(Stats::default());

        Ok(())
    }
}
