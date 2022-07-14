// Access control modifier
use anchor_lang::prelude::*;
use crate::{LiquidityContext, SwapContext};
use crate::error::ErrorCode;

pub fn liquidity_available(accounts: &LiquidityContext) -> Result<()> {
    if accounts.config.freeze_program {
        return err!(ErrorCode::FreezeProgramError);
    }

    if accounts.config.freeze_liquidity {
        return err!(ErrorCode::FreezeLiquidityError);
    }

    if !accounts.config.pool_init {
        return err!(ErrorCode::PoolNotFoundError);
    }

    Ok(())
}

pub fn swap_available(accounts: &SwapContext) -> Result<()> {
    if accounts.config.freeze_program {
        return err!(ErrorCode::FreezeProgramError);
    }

    if accounts.config.freeze_swap {
        return err!(ErrorCode::FreezeSwapError);
    }

    if !accounts.config.pool_init {
        return err!(ErrorCode::PoolNotFoundError);
    }
    Ok(())
}