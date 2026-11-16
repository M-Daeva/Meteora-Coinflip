use anchor_lang::prelude::*;

pub const MAINNET_ADMIN: Pubkey =
    Pubkey::from_str_const("9qsaqMY2DKDdhtmAzCtHBnCuahCPBJuWFJx5wQDWdJeS");
pub const DEVNET_ADMIN: Pubkey =
    Pubkey::from_str_const("9qsaqMY2DKDdhtmAzCtHBnCuahCPBJuWFJx5wQDWdJeS");
pub const LOCALNET_ADMIN: Pubkey =
    Pubkey::from_str_const("2ZvHnqZEPndifTmRYFUD1Wzun5HmgwPEY3NFBmeFbYmi");

pub const SEED_CONFIG: &str = "config";
pub const SEED_USER: &str = "user";

#[account]
#[derive(InitSpace, PartialEq, Debug)]
pub struct Config {
    pub admin: Pubkey,
    pub mint: Pubkey,
    pub claimable_amount: u64,
    /// in seconds
    pub claim_cooldown: u64,
}

#[account]
#[derive(InitSpace, PartialEq, Debug)]
pub struct User {
    pub claimed_at: u64,
}
