use anchor_lang::prelude::*;
use crate::constants::NAME_MAX_LEN;

#[account]
#[derive(Default)]
pub struct Config {
    pub pool_token_pair: String,
    pub owner: Pubkey,
    pub pool_mint: Pubkey,
    pub token_x_mint: Pubkey,
    pub token_y_mint: Pubkey,
    pub token_x_vault: Pubkey,
    pub token_y_vault: Pubkey,
    pub total_amount_minted: u64,
    pub fee_numerator: u64,
    pub fee_denominator: u64,
    pub freeze_swap: bool,
    pub freeze_liquidity: bool,
    pub pool_init: bool,
    pub freeze_program: bool,
    pub nonce: u8,
}

impl Config {
    pub const LEN: usize = NAME_MAX_LEN + (32 * 6) + 8 + 8 + 8 + 1 + 1 + 1 + 1 + 1;
}