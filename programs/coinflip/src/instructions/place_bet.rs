use {
    crate::vrf_cpi::request_randomness,
    anchor_lang::prelude::*,
    base::helpers::{get_clock_time, get_space},
    coinflip_api::state::{Bet, BetSide, Config, SEED_BET},
    orao_solana_vrf,
};

#[derive(Accounts)]
#[instruction(bet_nonce: u64)]
pub struct PlaceBet<'info> {
    pub system_program: Program<'info, System>,

    #[account(mut)]
    pub user: Signer<'info>,

    // === data storage ===
    pub config: Account<'info, Config>,

    #[account(
        init,
        payer = user,
        space = get_space(Bet::INIT_SPACE),
        seeds = [SEED_BET.as_bytes(), user.key().as_ref(), &bet_nonce.to_le_bytes()],
        bump
    )]
    pub bet: Account<'info, Bet>,

    /// CHECK: VRF crate
    #[account(address = orao_solana_vrf::ID)]
    pub vrf_program: UncheckedAccount<'info>,

    /// CHECK: VRF program
    #[account(mut)]
    pub vrf_network_state: UncheckedAccount<'info>,

    /// CHECK: VRF program
    #[account(mut)]
    pub vrf_treasury: AccountInfo<'info>,

    /// CHECK: VRF program
    #[account(
        mut,
        seeds = [orao_solana_vrf::RANDOMNESS_ACCOUNT_SEED, bet.key().as_ref()],
        bump,
        seeds::program = vrf_program
    )]
    pub vrf_request: AccountInfo<'info>,
}

impl<'info> PlaceBet<'info> {
    pub fn place_bet(&mut self, _bet_nonce: u64, bet_amount: u64, bet_side: BetSide) -> Result<()> {
        let clock_time = get_clock_time()?;
        let Self {
            system_program,
            user,
            config,
            bet,
            vrf_program,
            vrf_network_state,
            vrf_treasury,
            vrf_request,
        } = self;

        bet.set_inner(Bet {
            amount: bet_amount,
            side: bet_side,
            created_at: clock_time,
        });

        request_randomness(
            system_program,
            user,
            vrf_program,
            vrf_network_state,
            vrf_treasury,
            vrf_request,
            bet.key().to_bytes(),
        )?;

        Ok(())
    }
}
