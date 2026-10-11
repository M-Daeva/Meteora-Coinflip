use {
    crate::helpers::{calc_prize, check_if_user_won, is_user_or_worker},
    anchor_lang::prelude::*,
    anchor_spl::{
        associated_token::AssociatedToken,
        token_interface::{Mint, TokenAccount, TokenInterface},
    },
    base::helpers::transfer_token_from_program,
    coinflip_api::{
        error::CustomError,
        state::{Bet, Config, Stats, SEED_BET, SEED_CONFIG},
    },
    orao_solana_vrf,
};

#[derive(Accounts)]
#[instruction(bet_nonce: u64, user: Pubkey)]
pub struct SettleBet<'info> {
    pub system_program: Program<'info, System>,
    pub token_quote_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,

    /// The sender signing the transaction (worker or user)
    #[account(
        mut,
        constraint = is_user_or_worker(&sender, &config, &user)?
    )]
    pub sender: Signer<'info>,

    // === data storage ===
    #[account(
        seeds = [SEED_CONFIG.as_bytes()],
        bump
    )]
    pub config: Account<'info, Config>,

    pub stats: Account<'info, Stats>,

    #[account(
        mut,
        close = sender,
        seeds = [SEED_BET.as_bytes(), user.key().as_ref(), &bet_nonce.to_le_bytes()],
        bump
    )]
    pub bet: Account<'info, Bet>,

    // === token accounts ===
    #[account(address = config.quote_mint)]
    pub quote_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        mut,
        token::mint = quote_mint,
        token::authority = user,
        token::token_program = token_quote_program
    )]
    pub user_quote_ta: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = config.quote_mint,
        associated_token::authority = config,
        associated_token::token_program = token_quote_program
    )]
    pub app_quote_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    pub vrf_program: Program<'info, orao_solana_vrf::program::OraoVrf>,

    #[account(
        seeds = [orao_solana_vrf::RANDOMNESS_ACCOUNT_SEED, bet.key().as_ref()],
        bump,
        seeds::program = vrf_program
    )]
    pub vrf_request: Account<'info, orao_solana_vrf::state::RandomnessV2>,
}

impl<'info> SettleBet<'info> {
    pub fn settle_bet(
        &mut self,
        bet_nonce: u64,
        user: Pubkey,
        bumps: SettleBetBumps,
    ) -> Result<()> {
        let fulfilled_request = self
            .vrf_request
            .request
            .fulfilled()
            .ok_or(CustomError::RandomnessNotFulfilled)?;

        let is_user_won = check_if_user_won(&self.bet.side, fulfilled_request.randomness);
        let prize = if is_user_won {
            calc_prize(self.bet.quote_amount)
        } else {
            0
        };

        msg!(
            "player {}, nonce {}, bet_amount {}, bet_side {:#?}, prize {}",
            user,
            bet_nonce,
            self.bet.amount,
            self.bet.side,
            prize
        );

        if is_user_won {
            transfer_token_from_program(
                prize,
                &self.quote_mint,
                &self.app_quote_ata,
                &self.user_quote_ta,
                &[SEED_CONFIG.as_bytes()],
                bumps.config,
                &self.config,
                &self.token_quote_program,
            )?;
        }

        Ok(())
    }
}
