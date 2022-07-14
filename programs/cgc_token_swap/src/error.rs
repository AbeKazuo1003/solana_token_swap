use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Permission Error")]
    PermissionError,
    #[msg("The contract frozen")]
    FreezeProgramError,
    #[msg("The Pool not found")]
    PoolNotFoundError,
    #[msg("The Pool already Init")]
    PoolAlreadyInitError,
    #[msg("The Liquidity frozen")]
    FreezeLiquidityError,
    #[msg("The Swap frozen")]
    FreezeSwapError,
    #[msg("Not Enough Balance Error")]
    NotEnoughBalance,
    #[msg("Pool Mint Amount < 0 on LP Deposit")]
    NoPoolMintOutput,
    #[msg("Trying to burn too much")]
    BurnTooMuch,
    #[msg("Not enough out")]
    NotEnoughOutError,
}