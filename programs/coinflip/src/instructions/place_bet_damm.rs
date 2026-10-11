use {
    crate::{
        cpi::damm_cpi,
        helpers::{handle_common_place_bet_logic, max_key, min_key},
    },
    anchor_lang::prelude::*,
    anchor_spl::{
        associated_token::AssociatedToken,
        token_interface::{Mint, TokenAccount, TokenInterface},
    },
    base::helpers::get_space,
    coinflip_api::{
        state::{Bet, Config, Stats, SEED_BET, SEED_DAMM_POOL},
        types::BetSide,
    },
    orao_solana_vrf,
};

#[derive(Accounts)]
#[instruction(bet_nonce: u64)]
pub struct PlaceBetDamm<'info> {
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

    // === DAMM v2 ===
    /// CHECK: address-checked
    #[account(address = config.damm_program)]
    pub damm_program: UncheckedAccount<'info>,

    /// CHECK: validated by DAMM
    pub damm_pool_authority: UncheckedAccount<'info>,

    /// CHECK: must be the pool created by DBC migration (config only DBC can create pools in);
    /// layout/vaults/mints validated by DAMM
    #[account(
        mut,
        seeds = [
            SEED_DAMM_POOL,
            config.damm_config.as_ref(),
            &max_key(&config.base_mint, &config.quote_mint),
            &min_key(&config.base_mint, &config.quote_mint),
        ],
        bump,
        seeds::program = damm_program
    )]
    pub damm_pool: UncheckedAccount<'info>,

    /// CHECK: token A vault (base), validated by DAMM (pool has_one)
    #[account(mut)]
    pub damm_base_vault: UncheckedAccount<'info>,

    /// CHECK: token B vault (quote), validated by DAMM (pool has_one)
    #[account(mut)]
    pub damm_quote_vault: UncheckedAccount<'info>,

    /// CHECK: validated by DAMM
    pub damm_event_authority: UncheckedAccount<'info>,

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

impl<'info> PlaceBetDamm<'info> {
    pub fn place_bet_damm(
        &mut self,
        _bet_nonce: u64,
        bet_amount: u64,
        bet_side: BetSide,
        min_quote_out: u64,
    ) -> Result<()> {
        // swap base -> USDC straight into the app ATA
        // migrated pool: token A = base, token B = quote;
        // DAMM infers direction (A -> B) from the input token account mint
        damm_cpi::swap2(
            &self.damm_program,
            &self.damm_pool_authority,
            &self.damm_pool,
            &self.user_base_ta.to_account_info(),
            &self.app_quote_ata.to_account_info(),
            &self.damm_base_vault,
            &self.damm_quote_vault,
            &self.base_mint.to_account_info(),
            &self.quote_mint.to_account_info(),
            &self.user,
            &self.token_base_program.to_account_info(),
            &self.token_quote_program.to_account_info(),
            &self.damm_event_authority,
            damm_cpi::Swap2Args {
                amount_0: bet_amount,
                amount_1: min_quote_out,
                swap_mode: damm_cpi::swap_mode::EXACT_IN,
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
