use {
    crate::uint256::U256,
    anchor_lang::prelude::*,
    base::error::AuthError,
    coinflip_api::{
        state::{Config, Stats},
        types::BetSide,
    },
    std::ops::{Div, Mul},
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

pub fn calc_prize(bet_amount: u64, stats: &Stats) -> u64 {
    U256::from(2)
        .mul(bet_amount)
        .mul(stats.total_bought)
        .div(stats.total_sold)
        .as_u64()
}

pub fn max_key(a: &Pubkey, b: &Pubkey) -> [u8; 32] {
    std::cmp::max(a, b).to_bytes()
}

pub fn min_key(a: &Pubkey, b: &Pubkey) -> [u8; 32] {
    std::cmp::min(a, b).to_bytes()
}
