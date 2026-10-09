use {
    crate::helpers::{check_if_user_won, is_user_or_worker},
    anchor_lang::prelude::*,
    base::helpers::{get_clock_time, get_space, show},
    coinflip_api::{
        error::CustomError,
        state::{Bet, BetSide, Config, SEED_BET},
    },
    orao_solana_vrf,
};

#[derive(Accounts)]
#[instruction(bet_nonce: u64, user: Pubkey)]
pub struct SettleBet<'info> {
    pub system_program: Program<'info, System>,

    /// The sender signing the transaction (worker or user)
    #[account(
        mut,
        constraint = is_user_or_worker(&sender, &config, &user)?
    )]
    pub sender: Signer<'info>,

    // === data storage ===
    pub config: Account<'info, Config>,

    #[account(
        mut,
        seeds = [SEED_BET.as_bytes(), user.key().as_ref(), &bet_nonce.to_le_bytes()],
        bump
    )]
    pub bet: Account<'info, Bet>,

    pub vrf_program: Program<'info, orao_solana_vrf::program::OraoVrf>,

    #[account(
        seeds = [orao_solana_vrf::RANDOMNESS_ACCOUNT_SEED, bet.key().as_ref()],
        bump,
        seeds::program = vrf_program
    )]
    pub vrf_request: Account<'info, orao_solana_vrf::state::RandomnessV2>,
}

impl<'info> SettleBet<'info> {
    pub fn settle_bet(&mut self, _bet_nonce: u64, _user: Pubkey) -> Result<()> {
        let Self {
            system_program,
            sender,
            config,
            bet,
            vrf_program,
            vrf_request,
        } = self;

        let fulfilled_request = vrf_request
            .request
            .fulfilled()
            .ok_or(CustomError::RandomnessNotFulfilled)?;

        let is_user_won = check_if_user_won(&bet.side, fulfilled_request.randomness);

        show("randomness", fulfilled_request.randomness);
        show("is_user_won", is_user_won);

        Ok(())
    }
}
