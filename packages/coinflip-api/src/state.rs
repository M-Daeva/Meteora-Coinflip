use anchor_lang::prelude::*;

pub const MAINNET_ADMIN: Pubkey =
    Pubkey::from_str_const("6yANiqv13yE9TFzj4y3M1zceSdMw77xHegGCnXdJzrAn");
pub const DEVNET_ADMIN: Pubkey =
    Pubkey::from_str_const("AH9JvTDAiQy2zAuFfzteNyUrW5DYoTsTLoeNjXrxTTSt");
pub const LOCALNET_ADMIN: Pubkey =
    Pubkey::from_str_const("Fk5wpZL2pV8AYkMKnEo5TAJ1p88FmUxBbKsZLwpiqWqQ");

pub const MAINNET_USDC: Pubkey =
    Pubkey::from_str_const("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
pub const DEVNET_USDC: Pubkey =
    Pubkey::from_str_const("CcuoBwMZJgupcdx81m3vYqBongw2PhhZ4yiYA2jo3K5");
pub const LOCALNET_USDC: Pubkey =
    Pubkey::from_str_const("8XdLEJXrM3yYfFg5EpMqcCKmXXSQeBKfTjvNP619LbE2");

pub const SEED_CONFIG: &str = "config";

#[account]
#[derive(InitSpace, PartialEq, Debug)]
pub struct Config {
    pub admin: Pubkey,
}
