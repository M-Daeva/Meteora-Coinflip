use anchor_lang::prelude::*;

#[derive(InitSpace, AnchorSerialize, AnchorDeserialize, PartialEq, Debug, Clone)]
pub enum BetSide {
    Head,
    Tail,
}
