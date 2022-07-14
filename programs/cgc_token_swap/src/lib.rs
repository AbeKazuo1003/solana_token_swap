use anchor_lang::prelude::*;
use anchor_spl::{
    token,
    token::{MintTo, Transfer, Burn},
};

pub mod error;
pub mod model;
pub mod context;
pub mod constants;
pub mod utils;
pub mod validate;

use crate::context::*;
use crate::utils::*;
use crate::validate::*;
use crate::constants::*;
use crate::error::ErrorCode;

declare_id!("2db6jK7S2fNpHNCAF6vgnQyiNuUyhLCD2cWMis5pk9rs");

#[program]
pub mod cgc_token_swap {
    use super::*;

    pub fn setup(
        ctx: Context<Setup>,
        _pool_token_pair: String,
        _nonce_config: u8,
        fee_numerator: u64,
        fee_denominator: u64,
    ) -> Result<()> {
        msg!("Set up");
        let config = &mut ctx.accounts.config;
        config.pool_token_pair = _pool_token_pair;
        config.owner = ctx.accounts.owner.key();
        config.pool_mint = ctx.accounts.pool_mint.key();
        config.token_x_mint = ctx.accounts.token_x_mint.key();
        config.token_x_vault = ctx.accounts.token_x_vault.key();
        config.token_y_mint = ctx.accounts.token_y_mint.key();
        config.token_y_vault = ctx.accounts.token_y_vault.key();
        config.fee_numerator = fee_numerator;
        config.fee_denominator = fee_denominator;
        config.nonce = _nonce_config;
        Ok(())
    }

    pub fn toggle_freeze_program(
        ctx: Context<ConfigContext>,
        _pool_token_pair: String,
    ) -> Result<()> {
        msg!("Toggle Freeze Program");
        let config = &mut ctx.accounts.config;
        config.freeze_program = !config.freeze_program;
        Ok(())
    }

    pub fn toggle_freeze_liquidity(
        ctx: Context<ConfigContext>,
        _pool_token_pair: String,
    ) -> Result<()> {
        msg!("Toggle Freeze Liquidity");
        let config = &mut ctx.accounts.config;
        config.freeze_liquidity = !config.freeze_liquidity;
        Ok(())
    }

    pub fn toggle_freeze_swap(
        ctx: Context<ConfigContext>,
        _pool_token_pair: String,
    ) -> Result<()> {
        msg!("Toggle Freeze Swap");
        let config = &mut ctx.accounts.config;
        config.freeze_swap = !config.freeze_swap;
        Ok(())
    }

    pub fn init_pool(
        ctx: Context<InitPoolContext>,
        _pool_token_pair: String,
        token_x_amount: u64,
        token_y_amount: u64,
    ) -> Result<()> {
        msg!("Init Pool");
        let config = &mut ctx.accounts.config;
        let user_x_token_balance = ctx.accounts.user_token_x_vault.amount;
        let user_y_token_balance = ctx.accounts.user_token_y_vault.amount;

        // ensure config init flag
        require!(!config.pool_init, ErrorCode::PoolAlreadyInitError);

        // ensure enough balance
        require!(token_x_amount <= user_x_token_balance, ErrorCode::NotEnoughBalance);
        require!(token_y_amount <= user_y_token_balance, ErrorCode::NotEnoughBalance);

        let token_x_vault_balance = ctx.accounts.token_x_vault.amount;
        let token_y_vault_balance = ctx.accounts.token_y_vault.amount;

        let deposit_x = token_x_amount;
        let deposit_y;
        let amount_to_mint;

        // initial Deposit
        msg!("vaults: {} {}", token_x_vault_balance, token_y_vault_balance);
        msg!("init deposits: {} {}", token_x_amount, token_y_amount);

        if token_x_vault_balance == 0 && token_y_vault_balance == 0 {
            // bit shift (a + b)/2
            amount_to_mint = (token_x_amount + token_y_amount) >> 1;
            deposit_y = token_y_amount;
        } else {
            amount_to_mint = 0;
            deposit_y = 0;
            require!(false, ErrorCode::PoolAlreadyInitError);
        }
        // safety checks
        require!(amount_to_mint > 0, ErrorCode::NoPoolMintOutput);

        // give pool_mints
        config.total_amount_minted += amount_to_mint;
        config.pool_init = true;
        let mint_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                to: ctx.accounts.user_lp_vault.to_account_info(),
                mint: ctx.accounts.pool_mint.to_account_info(),
                authority: ctx.accounts.pool_authority.to_account_info(),
            },
        );

        let bump = *ctx.bumps.get("pool_authority").unwrap();
        let config_key = ctx.accounts.config.key();
        let pda_sign = &[
            POOL_AUTHORITY_SEED.as_ref(),
            name_seed(&_pool_token_pair),
            config_key.as_ref(),
            &[bump]
        ];

        token::mint_to(
            mint_ctx.with_signer(&[pda_sign]),
            amount_to_mint,
        )?;

        // deposit user funds into vaults
        // 1. Token x
        token::transfer(CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_token_x_vault.to_account_info(),
                to: ctx.accounts.token_x_vault.to_account_info(),
                authority: ctx.accounts.owner.to_account_info(),
            },
        ), deposit_x)?;

        // 2. Token y
        token::transfer(CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_token_y_vault.to_account_info(),
                to: ctx.accounts.token_y_vault.to_account_info(),
                authority: ctx.accounts.owner.to_account_info(),
            },
        ), deposit_y)?;

        Ok(())
    }

    #[access_control(liquidity_available(& ctx.accounts))]
    pub fn deposit_liquidity(
        ctx: Context<LiquidityContext>,
        _pool_token_pair: String,
        token_x_amount: u64,
        token_y_amount: u64,
        _slippage: u8,
    ) -> Result<()> {
        msg!("Deposit Liquidity");
        let config = &mut ctx.accounts.config;
        let user_x_token_balance = ctx.accounts.user_token_x_vault.amount;
        let user_y_token_balance = ctx.accounts.user_token_y_vault.amount;

        // ensure enough balance
        require!(token_x_amount <= user_x_token_balance, ErrorCode::NotEnoughBalance);
        require!(token_y_amount <= user_y_token_balance, ErrorCode::NotEnoughBalance);

        let token_x_vault_balance = ctx.accounts.token_x_vault.amount;
        let token_y_vault_balance = ctx.accounts.token_y_vault.amount;

        let deposit_x = token_x_amount;
        let deposit_y;
        let amount_to_mint;

        // initial Deposit
        msg!("vaults: {} {}", token_x_vault_balance, token_y_vault_balance);
        msg!("init deposits: {} {}", token_x_amount, token_y_amount);

        if token_x_vault_balance == 0 && token_y_vault_balance == 0 {
            // bit shift (a + b)/2
            amount_to_mint = (token_x_amount + token_y_amount) >> 1;
            deposit_y = token_y_amount;
        } else {
            // require equal amount deposit based on pool exchange rate
            let exchange = token_y_vault_balance.checked_div(token_x_vault_balance).unwrap();
            let amount_deposit_y = token_x_amount.checked_mul(exchange).unwrap();
            msg!("new deposits: {} {} {}", exchange, token_x_amount, amount_deposit_y);

            // enough funds + user is ok with it in single check
            require!(amount_deposit_y <= token_y_amount, ErrorCode::NotEnoughBalance);
            deposit_y = amount_deposit_y;

            // mint = relative to the entire pool + total amount minted
            // u128 so we can do multiply first without overflow
            // then div and recast back
            amount_to_mint = ((deposit_y as u128)
                .checked_mul(config.total_amount_minted as u128)
                .unwrap()
                .checked_div(token_y_vault_balance as u128)
                .unwrap()
            ) as u64;
            msg!("Mint Amount: {}", amount_to_mint);
        }

        // safety checks
        require!(amount_to_mint > 0, ErrorCode::NoPoolMintOutput);

        //check slippage

        // give pool_mints
        config.total_amount_minted += amount_to_mint;
        let mint_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                to: ctx.accounts.user_lp_vault.to_account_info(),
                mint: ctx.accounts.pool_mint.to_account_info(),
                authority: ctx.accounts.pool_authority.to_account_info(),
            },
        );

        let bump = *ctx.bumps.get("pool_authority").unwrap();
        let config_key = ctx.accounts.config.key();
        let pda_sign = &[
            POOL_AUTHORITY_SEED.as_ref(),
            name_seed(&_pool_token_pair),
            config_key.as_ref(),
            &[bump]
        ];

        token::mint_to(
            mint_ctx.with_signer(&[pda_sign]),
            amount_to_mint,
        )?;

        // deposit user funds into vaults
        // 1. Token x
        token::transfer(CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_token_x_vault.to_account_info(),
                to: ctx.accounts.token_x_vault.to_account_info(),
                authority: ctx.accounts.owner.to_account_info(),
            },
        ), deposit_x)?;

        // 2. Token y
        token::transfer(CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_token_y_vault.to_account_info(),
                to: ctx.accounts.token_y_vault.to_account_info(),
                authority: ctx.accounts.owner.to_account_info(),
            },
        ), deposit_y)?;

        Ok(())
    }

    #[access_control(liquidity_available(& ctx.accounts))]
    pub fn withdraw_liquidity(
        ctx: Context<LiquidityContext>,
        _pool_token_pair: String,
        burn_amount: u64,
    ) -> Result<()> {
        msg!("WithDraw Liquidity");
        let pool_mint_balance = ctx.accounts.user_lp_vault.amount;
        require!(burn_amount <= pool_mint_balance, ErrorCode::NotEnoughBalance);

        let config_key = ctx.accounts.config.key();
        let config = &mut ctx.accounts.config;

        require!(config.total_amount_minted >= burn_amount, ErrorCode::BurnTooMuch);

        let token_x_vault_balance = ctx.accounts.token_x_vault.amount as u128;
        let token_y_vault_balance = ctx.accounts.token_y_vault.amount as u128;
        let u128_burn_amount = burn_amount as u128;

        // compute how much to give back
        let [token_x_amount, token_y_amount] = [
            u128_burn_amount
                .checked_mul(token_x_vault_balance)
                .unwrap()
                .checked_div(config.total_amount_minted as u128)
                .unwrap() as u64,
            u128_burn_amount
                .checked_mul(token_y_vault_balance)
                .unwrap()
                .checked_div(config.total_amount_minted as u128)
                .unwrap() as u64
        ];

        // deposit user funds into vaults
        let bump = *ctx.bumps.get("pool_authority").unwrap();
        let pda_sign = &[
            POOL_AUTHORITY_SEED.as_ref(),
            name_seed(&_pool_token_pair),
            config_key.as_ref(),
            &[bump]
        ];

        // 1. Token x
        token::transfer(CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.token_x_vault.to_account_info(),
                to: ctx.accounts.user_token_x_vault.to_account_info(),
                authority: ctx.accounts.pool_authority.to_account_info(),
            },
        ).with_signer(&[pda_sign]), token_x_amount)?;

        // 2. Token y
        token::transfer(CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.token_y_vault.to_account_info(),
                to: ctx.accounts.user_token_y_vault.to_account_info(),
                authority: ctx.accounts.pool_authority.to_account_info(),
            },
        ).with_signer(&[pda_sign]), token_y_amount)?;

        // burn LP Token
        token::burn(CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.pool_mint.to_account_info(),
                from: ctx.accounts.user_lp_vault.to_account_info(),
                authority: ctx.accounts.owner.to_account_info(),
            },
        ).with_signer(&[pda_sign]), burn_amount)?;

        config.total_amount_minted -= burn_amount;

        Ok(())
    }

    #[access_control(swap_available(& ctx.accounts))]
    pub fn swap(
        ctx: Context<SwapContext>,
        _pool_token_pair: String,
        amount_in: u64,
        min_amount_out: u64,
        direct: u8, // 0: token_x -> token_y, 1: token_y -> token_x
    ) -> Result<()> {
        msg!("Swap");
        let config = &mut ctx.accounts.config;
        let vault_src;
        let vault_dst;
        let user_src;
        let user_dst;
        if direct == 0 {
            vault_src = &ctx.accounts.token_x_vault;
            vault_dst = &ctx.accounts.token_y_vault;
            user_src = &ctx.accounts.user_token_x_vault;
            user_dst = &ctx.accounts.user_token_y_vault;
        } else {
            vault_src = &ctx.accounts.token_y_vault;
            vault_dst = &ctx.accounts.token_x_vault;
            user_src = &ctx.accounts.user_token_y_vault;
            user_dst = &ctx.accounts.user_token_x_vault;
        }

        let src_balance = user_src.amount;
        require!(src_balance >= amount_in, ErrorCode::NotEnoughBalance);

        let u128_amount_in = amount_in as u128;

        let src_vault_amount = vault_src.amount as u128;
        let dst_vault_amount = vault_dst.amount as u128;

        // minus fees
        let fee_amount = u128_amount_in
            .checked_mul(config.fee_numerator as u128).unwrap()
            .checked_div(config.fee_denominator as u128).unwrap();
        let amount_in_minus_fees = u128_amount_in - fee_amount;

        // compute output amount using constant product equation
        let invariant = src_vault_amount.checked_mul(dst_vault_amount).unwrap();
        let new_src_vault = src_vault_amount + amount_in_minus_fees;
        let new_dst_vault = invariant.checked_div(new_src_vault).unwrap();
        let output_amount = dst_vault_amount.checked_sub(new_dst_vault).unwrap();

        // revert if not enough out
        require!(output_amount >= min_amount_out as u128, ErrorCode::NotEnoughOutError);

        // output_amount -> user_dst
        let bump = *ctx.bumps.get("pool_authority").unwrap();
        let config_key = ctx.accounts.config.key();
        let pda_sign = &[
            POOL_AUTHORITY_SEED.as_ref(),
            name_seed(&_pool_token_pair),
            config_key.as_ref(),
            &[bump]
        ];

        token::transfer(CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: vault_dst.to_account_info(),
                to: user_dst.to_account_info(),
                authority: ctx.accounts.pool_authority.to_account_info(),
            },
        ).with_signer(&[pda_sign]), output_amount as u64)?;

        // amount_in -> vault (including fees for LPs)
        token::transfer(CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: user_src.to_account_info(),
                to: vault_src.to_account_info(),
                authority: ctx.accounts.owner.to_account_info(),
            },
        ), amount_in)?;

        Ok(())
    }
}

