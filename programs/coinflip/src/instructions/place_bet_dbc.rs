use {
    crate::{dbc_cpi, vrf_cpi::request_randomness},
    anchor_lang::prelude::*,
    anchor_spl::{
        associated_token::AssociatedToken,
        token_interface::{Mint, TokenAccount, TokenInterface},
    },
    base::helpers::{get_clock_time, get_space},
    coinflip_api::{
        error::CustomError,
        state::{Bet, Config, Stats, SEED_BET, SEED_EVENT_AUTHORITY},
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

    /// CHECK: DBC event authority PDA
    #[account(
        seeds = [SEED_EVENT_AUTHORITY],
        bump,
        seeds::program = dbc_program
    )]
    pub dbc_event_authority: UncheckedAccount<'info>,

    // === VRF ===
    #[account(address = config.vrf_program)]
    pub vrf_program: Program<'info, orao_solana_vrf::program::OraoVrf>,

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
        let Self {
            system_program,
            token_base_program,
            token_quote_program,
            user,
            config,
            stats,
            bet,
            base_mint,
            quote_mint,
            user_base_ta,
            app_quote_ata,
            dbc_program,
            dbc_pool_authority,
            dbc_config,
            dbc_pool,
            dbc_base_vault,
            dbc_quote_vault,
            dbc_event_authority,
            vrf_program,
            vrf_network_state,
            vrf_treasury,
            vrf_request,
            ..
        } = self;

        if bet_amount == 0 {
            Err(CustomError::ZeroAmount)?;
        }

        // swap base -> USDC straight into the app ATA
        let app_quote_balance_before = app_quote_ata.amount;

        dbc_cpi::swap2(
            &dbc_program,
            &dbc_pool_authority,
            &dbc_config,
            &dbc_pool,
            &user_base_ta.to_account_info(),
            &app_quote_ata.to_account_info(),
            &dbc_base_vault,
            &dbc_quote_vault,
            &base_mint.to_account_info(),
            &quote_mint.to_account_info(),
            &user,
            &token_base_program.to_account_info(),
            &token_quote_program.to_account_info(),
            &dbc_event_authority,
            dbc_cpi::Swap2Args {
                amount_0: bet_amount,
                amount_1: min_quote_out,
                swap_mode: dbc_cpi::swap_mode::EXACT_IN,
            },
        )?;

        // measure the USDC balance difference
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
            side: bet_side,
            created_at: get_clock_time()?,
        });

        // update stats to calculate user's prize later
        stats.total_sold += bet_amount;
        stats.total_bought += app_quote_balance_diff;

        // request randomness seeded by the bet address
        request_randomness(
            system_program,
            user,
            vrf_program,
            vrf_network_state,
            vrf_treasury,
            vrf_request,
            bet.key().to_bytes(),
        )
    }
}
