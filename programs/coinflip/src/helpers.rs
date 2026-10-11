use {
    crate::cpi::vrf_cpi,
    anchor_lang::prelude::*,
    anchor_spl::token_interface::TokenAccount,
    base::error::AuthError,
    coinflip_api::{
        error::CustomError,
        state::{Bet, Config, Stats},
        types::BetSide,
    },
};

pub fn is_user_or_worker<'info>(
    sender: &Signer<'info>,
    config: &Account<'info, Config>,
    user: &Pubkey,
) -> anchor_lang::Result<bool> {
    if !(sender.key() == *user || sender.key() == config.worker) {
        Err(AuthError::Unauthorized)?;
    }

    Ok(true)
}

pub fn check_if_user_won(bet_side: &BetSide, randomness: [u8; 64]) -> bool {
    let outcome = if randomness[0] & 1 == 0 {
        BetSide::Head
    } else {
        BetSide::Tail
    };

    &outcome == bet_side
}

pub fn calc_prize(quote_amount: u64) -> u64 {
    2 * quote_amount
}

pub fn max_key(a: &Pubkey, b: &Pubkey) -> [u8; 32] {
    std::cmp::max(a, b).to_bytes()
}

pub fn min_key(a: &Pubkey, b: &Pubkey) -> [u8; 32] {
    std::cmp::min(a, b).to_bytes()
}

pub fn handle_common_place_bet_logic<'info>(
    system_program: &Program<'info, System>,
    user: &Signer<'info>,
    vrf_program: &UncheckedAccount<'info>,
    vrf_network_state: &UncheckedAccount<'info>,
    vrf_treasury: &AccountInfo<'info>,
    vrf_request: &AccountInfo<'info>,
    config: &Account<'info, Config>,
    bet: &mut Account<'info, Bet>,
    stats: &mut Account<'info, Stats>,
    app_quote_ata: &mut InterfaceAccount<'info, TokenAccount>,
    bet_amount: u64,
    bet_side: BetSide,
    min_quote_out: u64,
) -> Result<()> {
    // measure the USDC balance difference
    let app_quote_balance_before = app_quote_ata.amount;
    app_quote_ata.reload()?;
    let app_quote_balance_diff = app_quote_ata.amount - app_quote_balance_before;

    if app_quote_balance_diff < min_quote_out {
        Err(CustomError::SlippageExceeded)?;
    }

    if app_quote_balance_diff < config.min_quote_bet {
        Err(CustomError::BetIsTooSmall)?;
    }

    if app_quote_balance_diff > config.max_quote_bet {
        Err(CustomError::BetIsTooLarge)?;
    }

    // store the bet
    bet.set_inner(Bet {
        amount: bet_amount,
        quote_amount: app_quote_balance_diff,
        side: bet_side,
    });

    // update stats
    stats.total_sold += bet_amount;
    stats.total_bought += app_quote_balance_diff;

    // request randomness seeded by the bet address
    vrf_cpi::request_randomness(
        system_program,
        user,
        vrf_program,
        vrf_network_state,
        vrf_treasury,
        vrf_request,
        bet.key().to_bytes(),
    )
}
