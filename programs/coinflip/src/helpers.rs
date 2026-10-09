use {
    anchor_lang::prelude::*,
    base::error::AuthError,
    coinflip_api::state::{BetSide, Config},
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
