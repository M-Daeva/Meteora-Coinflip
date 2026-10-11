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
    damm_program: &UncheckedAccount<'info>,
    pool_authority: &UncheckedAccount<'info>,
    pool: &UncheckedAccount<'info>,
    input_token_account: &AccountInfo<'info>,
    output_token_account: &AccountInfo<'info>,
    token_a_vault: &UncheckedAccount<'info>,
    token_b_vault: &UncheckedAccount<'info>,
    token_a_mint: &AccountInfo<'info>,
    token_b_mint: &AccountInfo<'info>,
    payer: &Signer<'info>,
    token_a_program: &AccountInfo<'info>,
    token_b_program: &AccountInfo<'info>,
    event_authority: &UncheckedAccount<'info>,
    args: Swap2Args,
) -> Result<()> {
    let cpi_accounts = Swap2Accs {
        pool_authority: pool_authority.to_account_info(),
        pool: pool.to_account_info(),
        input_token_account: input_token_account.clone(),
        output_token_account: output_token_account.clone(),
        token_a_vault: token_a_vault.to_account_info(),
        token_b_vault: token_b_vault.to_account_info(),
        token_a_mint: token_a_mint.clone(),
        token_b_mint: token_b_mint.clone(),
        payer: payer.to_account_info(),
        token_a_program: token_a_program.clone(),
        token_b_program: token_b_program.clone(),
        // Anchor optional account = None -> pass the callee program id
        referral_token_account: damm_program.to_account_info(),
        event_authority: event_authority.to_account_info(),
        program: damm_program.to_account_info(),
    };

    let cpi_ix = Instruction {
        program_id: damm_program.key(),
        accounts: cpi_accounts.to_account_metas(None),
        data: args.data(),
    };

    // user already signed the outer tx, no PDA seeds needed
    invoke(&cpi_ix, &cpi_accounts.to_account_infos()).map_err(Into::into)
}

#[derive(Accounts)]
struct Swap2Accs<'info> {
    /// CHECK: damm
    pub pool_authority: AccountInfo<'info>,
    /// CHECK: damm
    pub pool: AccountInfo<'info>,
    /// CHECK: damm
    pub input_token_account: AccountInfo<'info>,
    /// CHECK: damm
    pub output_token_account: AccountInfo<'info>,
    /// CHECK: damm
    pub token_a_vault: AccountInfo<'info>,
    /// CHECK: damm
    pub token_b_vault: AccountInfo<'info>,
    /// CHECK: damm
    pub token_a_mint: AccountInfo<'info>,
    /// CHECK: damm
    pub token_b_mint: AccountInfo<'info>,
    /// CHECK: damm
    pub payer: AccountInfo<'info>,
    /// CHECK: damm
    pub token_a_program: AccountInfo<'info>,
    /// CHECK: damm
    pub token_b_program: AccountInfo<'info>,
    /// CHECK: damm
    pub referral_token_account: AccountInfo<'info>,
    /// CHECK: damm
    pub event_authority: AccountInfo<'info>,
    /// CHECK: damm
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
