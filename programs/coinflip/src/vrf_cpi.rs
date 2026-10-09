use {anchor_lang::prelude::*, orao_solana_vrf};

#[allow(clippy::too_many_arguments)]
pub fn request_randomness<'info>(
    system_program: &Program<'info, System>,
    user: &Signer<'info>,
    vrf_program: &Program<'info, orao_solana_vrf::program::OraoVrf>,
    vrf_network_state: &UncheckedAccount<'info>,
    vrf_treasury: &AccountInfo<'info>,
    vrf_request: &AccountInfo<'info>,
    vrf_seed: [u8; 32],
) -> Result<()> {
    let cpi_program = vrf_program.to_account_info();
    let cpi_accounts = orao_solana_vrf::cpi::accounts::RequestV2 {
        payer: user.to_account_info(),
        network_state: vrf_network_state.to_account_info(),
        treasury: vrf_treasury.to_account_info(),
        request: vrf_request.to_account_info(),
        system_program: system_program.to_account_info(),
    };
    let cpi_ctx = anchor_lang::context::CpiContext::new(cpi_program, cpi_accounts);
    orao_solana_vrf::cpi::request_v2(cpi_ctx, vrf_seed)
}
