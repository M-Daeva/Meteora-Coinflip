use {crate::types::BetSide, anchor_lang::prelude::*};

pub const MAINNET_ADMIN: Pubkey =
    Pubkey::from_str_const("9qsaqMY2DKDdhtmAzCtHBnCuahCPBJuWFJx5wQDWdJeS");
pub const DEVNET_ADMIN: Pubkey =
    Pubkey::from_str_const("9qsaqMY2DKDdhtmAzCtHBnCuahCPBJuWFJx5wQDWdJeS");
pub const LOCALNET_ADMIN: Pubkey =
    Pubkey::from_str_const("2ZvHnqZEPndifTmRYFUD1Wzun5HmgwPEY3NFBmeFbYmi");

pub const MAINNET_USDC: Pubkey =
    Pubkey::from_str_const("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
pub const DEVNET_USDC: Pubkey =
    Pubkey::from_str_const("qWHehL6NjpdXxteLffxS53Nx2sjuX9cjRw9rJnbnJMc");
pub const LOCALNET_USDC: Pubkey =
    Pubkey::from_str_const("qWHehL6NjpdXxteLffxS53Nx2sjuX9cjRw9rJnbnJMc");

pub const SEED_CONFIG: &str = "config";
pub const SEED_STATS: &str = "stats";
pub const SEED_BET: &str = "bet";

pub const SEED_DAMM_POOL: &[u8] = b"pool";

#[account]
#[derive(InitSpace, PartialEq, Debug)]
pub struct Config {
    pub admin: Pubkey,
    pub worker: Pubkey,
    pub base_mint: Pubkey,
    pub quote_mint: Pubkey,
    pub vrf_program: Pubkey,
    pub dbc_program: Pubkey,
    pub damm_program: Pubkey,
    pub dbc_config: Pubkey,
    pub damm_config: Pubkey,
    pub min_quote_bet: u64,
    pub max_quote_bet: u64,
}

#[account]
#[derive(InitSpace, PartialEq, Debug, Default)]
pub struct Stats {
    pub total_sold: u64,
    pub total_bought: u64,
}

#[account]
#[derive(InitSpace, PartialEq, Debug)]
pub struct Bet {
    // base tokens sold
    pub amount: u64,
    // USDC the swap produced
    pub quote_amount: u64,
    pub side: BetSide,
}
