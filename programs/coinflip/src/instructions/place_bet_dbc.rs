use {
    crate::{cpi::dbc_cpi, helpers::handle_common_place_bet_logic},
    anchor_lang::prelude::*,
    anchor_spl::{
        associated_token::AssociatedToken,
        token_interface::{Mint, TokenAccount, TokenInterface},
    },
    base::helpers::get_space,
    coinflip_api::{
        state::{Bet, Config, Stats, SEED_BET},
        types::BetSide,
    },
    orao_solana_vrf,
};

#[derive(Accounts)]
#[instruction(bet_nonce: u64)]
pub struct PlaceBetDbc<'info> {
    pub system_program: Program<'info, System>,
    pub token_base_program: Interface<'info, TokenInterface>,
    pub token_quote_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,

    #[account(mut)]
    pub user: Signer<'info>,

    // === data storage ===
    pub config: Box<Account<'info, Config>>,

    #[account(mut)]
    pub stats: Box<Account<'info, Stats>>,

    #[account(
        init,
        payer = user,
        space = get_space(Bet::INIT_SPACE),
        seeds = [SEED_BET.as_bytes(), user.key().as_ref(), &bet_nonce.to_le_bytes()],
        bump
    )]
    pub bet: Box<Account<'info, Bet>>,

    // === token accounts ===
    #[account(address = config.base_mint)]
    pub base_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(address = config.quote_mint)]
    pub quote_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        mut,
        token::mint = base_mint,
        token::authority = user,
        token::token_program = token_base_program,
    )]
    pub user_base_ta: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = config.quote_mint,
        associated_token::authority = config,
        associated_token::token_program = token_quote_program
    )]
    pub app_quote_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    // === DBC ===
    /// CHECK: address-checked
    #[account(address = config.dbc_program)]
    pub dbc_program: UncheckedAccount<'info>,

    /// CHECK: validated by DBC
    pub dbc_pool_authority: UncheckedAccount<'info>,

    /// CHECK: validated by DBC (pool has_one config)
    pub dbc_config: UncheckedAccount<'info>,

    /// CHECK: validated by DBC
    #[account(mut)]
    pub dbc_pool: UncheckedAccount<'info>,

    /// CHECK: validated by DBC
    #[account(mut)]
    pub dbc_base_vault: UncheckedAccount<'info>,

    /// CHECK: validated by DBC
    #[account(mut)]
    pub dbc_quote_vault: UncheckedAccount<'info>,

    /// CHECK: validated by DBC
    pub dbc_event_authority: UncheckedAccount<'info>,

    // === VRF ===
    /// CHECK: config
    #[account(address = config.vrf_program)]
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

impl<'info> PlaceBetDbc<'info> {
    pub fn place_bet_dbc(
        &mut self,
        _bet_nonce: u64,
        bet_amount: u64,
        bet_side: BetSide,
        min_quote_out: u64,
    ) -> Result<()> {
        // swap base -> USDC straight into the app ATA
        dbc_cpi::swap2(
            &self.dbc_program,
            &self.dbc_pool_authority,
            &self.dbc_config,
            &self.dbc_pool,
            &self.user_base_ta.to_account_info(),
            &self.app_quote_ata.to_account_info(),
            &self.dbc_base_vault,
            &self.dbc_quote_vault,
            &self.base_mint.to_account_info(),
            &self.quote_mint.to_account_info(),
            &self.user,
            &self.token_base_program.to_account_info(),
            &self.token_quote_program.to_account_info(),
            &self.dbc_event_authority,
            dbc_cpi::Swap2Args {
                amount_0: bet_amount,
                amount_1: min_quote_out,
                swap_mode: dbc_cpi::swap_mode::EXACT_IN,
            },
        )?;

        handle_common_place_bet_logic(
            &self.system_program,
            &self.user,
            &self.vrf_program,
            &self.vrf_network_state,
            &self.vrf_treasury,
            &self.vrf_request,
            &self.config,
            &mut self.bet,
            &mut self.stats,
            &mut self.app_quote_ata,
            bet_amount,
            bet_side,
            min_quote_out,
        )
    }
}
