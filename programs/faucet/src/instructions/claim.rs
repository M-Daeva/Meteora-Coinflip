use {
    anchor_lang::prelude::*,
    anchor_spl::{
        associated_token::AssociatedToken,
        token_interface::{Mint, TokenAccount, TokenInterface},
    },
    base::helpers::{get_clock_time, get_space, transfer_token_from_program},
    faucet_api::{
        error::CustomError,
        state::{Config, User, SEED_CONFIG, SEED_USER},
    },
};

#[derive(Accounts)]
pub struct Claim<'info> {
    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,

    #[account(mut)]
    pub sender: Signer<'info>,

    // === data storage ===
    #[account(
        seeds = [SEED_CONFIG.as_bytes()],
        bump
    )]
    pub config: Account<'info, Config>,

    #[account(
        init_if_needed,
        payer = sender,
        space = get_space(User::INIT_SPACE),
        seeds = [SEED_USER.as_bytes(), sender.key().as_ref()],
        bump
    )]
    pub user: Account<'info, User>,

    // === token accounts ===
    #[account(address = config.mint)]
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        token::mint = config.mint,
        token::authority = sender,
        token::token_program = token_program
    )]
    pub user_ta: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = config.mint,
        associated_token::authority = config,
        associated_token::token_program = token_program
    )]
    pub app_ata: Box<InterfaceAccount<'info, TokenAccount>>,
}

impl<'info> Claim<'info> {
    pub fn claim(&mut self, bumps: ClaimBumps) -> Result<()> {
        let clock_time = get_clock_time()?;
        let Self {
            token_program,
            config,
            user,
            mint,
            user_ta,
            app_ata,
            ..
        } = self;

        if user.claimed_at != 0 && (clock_time < user.claimed_at + config.claim_cooldown) {
            Err(CustomError::ZeroAmount)?;
        }

        user.claimed_at = clock_time;

        transfer_token_from_program(
            config.claimable_amount,
            mint,
            app_ata,
            user_ta,
            &[SEED_CONFIG.as_bytes()],
            bumps.config,
            config,
            token_program,
        )
    }
}
