use anchor_lang::{
    prelude::*,
    solana_program::{instruction::Instruction, program::invoke},
    Discriminator, InstructionData,
};

// ============================================================
// === swap2 ===
// ============================================================

#[allow(clippy::too_many_arguments)]
pub fn swap2<'info>(
    dbc_program: &UncheckedAccount<'info>,
    pool_authority: &UncheckedAccount<'info>,
    config: &UncheckedAccount<'info>,
    pool: &UncheckedAccount<'info>,
    input_token_account: &AccountInfo<'info>,
    output_token_account: &AccountInfo<'info>,
    base_vault: &UncheckedAccount<'info>,
    quote_vault: &UncheckedAccount<'info>,
    base_mint: &AccountInfo<'info>,
    quote_mint: &AccountInfo<'info>,
    payer: &Signer<'info>,
    token_base_program: &AccountInfo<'info>,
    token_quote_program: &AccountInfo<'info>,
    event_authority: &UncheckedAccount<'info>,
    args: Swap2Args,
) -> Result<()> {
    let cpi_accounts = Swap2Accs {
        pool_authority: pool_authority.to_account_info(),
        config: config.to_account_info(),
        pool: pool.to_account_info(),
        input_token_account: input_token_account.clone(),
        output_token_account: output_token_account.clone(),
        base_vault: base_vault.to_account_info(),
        quote_vault: quote_vault.to_account_info(),
        base_mint: base_mint.clone(),
        quote_mint: quote_mint.clone(),
        payer: payer.to_account_info(),
        token_base_program: token_base_program.clone(),
        token_quote_program: token_quote_program.clone(),
        // Anchor optional account = None -> pass the callee program id
        referral_token_account: dbc_program.to_account_info(),
        event_authority: event_authority.to_account_info(),
        program: dbc_program.to_account_info(),
    };

    let cpi_ix = Instruction {
        program_id: dbc_program.key(),
        accounts: cpi_accounts.to_account_metas(None),
        data: args.data(),
    };

    // user already signed the outer tx, no PDA seeds needed
    invoke(&cpi_ix, &cpi_accounts.to_account_infos()).map_err(Into::into)
}

// Order must match DBC's SwapCtx exactly
#[derive(Accounts)]
struct Swap2Accs<'info> {
    /// CHECK: dbc
    pub pool_authority: AccountInfo<'info>,
    /// CHECK: dbc
    pub config: AccountInfo<'info>,
    /// CHECK: dbc
    pub pool: AccountInfo<'info>,
    /// CHECK: dbc
    pub input_token_account: AccountInfo<'info>,
    /// CHECK: dbc
    pub output_token_account: AccountInfo<'info>,
    /// CHECK: dbc
    pub base_vault: AccountInfo<'info>,
    /// CHECK: dbc
    pub quote_vault: AccountInfo<'info>,
    /// CHECK: dbc
    pub base_mint: AccountInfo<'info>,
    /// CHECK: dbc
    pub quote_mint: AccountInfo<'info>,
    /// CHECK: dbc
    pub payer: AccountInfo<'info>,
    /// CHECK: dbc
    pub token_base_program: AccountInfo<'info>,
    /// CHECK: dbc
    pub token_quote_program: AccountInfo<'info>,
    /// CHECK: dbc
    pub referral_token_account: AccountInfo<'info>,
    /// CHECK: dbc
    pub event_authority: AccountInfo<'info>,
    /// CHECK: dbc
    pub program: AccountInfo<'info>,
}

pub mod swap_mode {
    pub const EXACT_IN: u8 = 0;
    pub const PARTIAL_FILL: u8 = 1;
    pub const EXACT_OUT: u8 = 2;
}

#[derive(AnchorSerialize)]
pub struct Swap2Args {
    pub amount_0: u64, // ExactIn: amount in
    pub amount_1: u64, // ExactIn: min amount out
    pub swap_mode: u8,
}

impl Discriminator for Swap2Args {
    // sha256("global:swap2")[..8]
    const DISCRIMINATOR: &'static [u8] = &[65, 75, 63, 76, 235, 91, 91, 136];
}

impl InstructionData for Swap2Args {}
