use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};
use crate::{ErrorCode};
use crate::model::*;
use crate::constants::*;
use crate::utils::*;

#[derive(Accounts)]
#[instruction(_pool_token_pair: String)]
pub struct Setup<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
    init,
    payer = owner,
    seeds = [
    CONFIG_PDA_SEED.as_ref(),
    name_seed(& _pool_token_pair),
    token_x_mint.key().as_ref(),
    token_y_mint.key().as_ref(),
    ],
    bump,
    space = 8 + Config::LEN
    )]
    pub config: Box<Account<'info, Config>>,

    pub token_x_mint: Box<Account<'info, Mint>>,
    pub token_y_mint: Box<Account<'info, Mint>>,

    #[account(
    seeds = [
    POOL_AUTHORITY_SEED.as_ref(),
    name_seed(& _pool_token_pair),
    config.key().as_ref(),
    ],
    bump,
    )]
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub pool_authority: AccountInfo<'info>,

    #[account(
    init,
    payer = owner,
    token::mint = token_x_mint,
    token::authority = pool_authority,
    seeds = [
    TOKEN_VAULT_PDA_SEED.as_ref(),
    name_seed(& _pool_token_pair),
    token_x_mint.key().as_ref(),
    config.key().as_ref(),
    ],
    bump,
    )]
    pub token_x_vault: Box<Account<'info, TokenAccount>>,

    #[account(
    init,
    payer = owner,
    token::mint = token_y_mint,
    token::authority = pool_authority,
    seeds = [
    TOKEN_VAULT_PDA_SEED.as_ref(),
    name_seed(& _pool_token_pair),
    token_y_mint.key().as_ref(),
    config.key().as_ref(),
    ],
    bump,
    )]
    pub token_y_vault: Box<Account<'info, TokenAccount>>,

    #[account(
    init,
    payer = owner,
    mint::decimals = 9,
    mint::authority = pool_authority,
    seeds = [
    POOL_MINT_SEED.as_ref(),
    name_seed(& _pool_token_pair),
    config.key().as_ref(),
    ],
    bump,
    )]
    pub pool_mint: Box<Account<'info, Mint>>,

    ///used by anchor for init of the token
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(_pool_token_pair: String)]
pub struct ConfigContext<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    pub token_x_mint: Box<Account<'info, Mint>>,
    pub token_y_mint: Box<Account<'info, Mint>>,

    #[account(
    mut,
    seeds = [
    CONFIG_PDA_SEED.as_ref(),
    name_seed(& _pool_token_pair),
    token_x_mint.key().as_ref(),
    token_y_mint.key().as_ref(),
    ],
    bump,
    has_one = token_x_mint,
    has_one = token_y_mint,
    constraint = config.owner == owner.key() @ ErrorCode::PermissionError
    )]
    pub config: Box<Account<'info, Config>>,
}

#[derive(Accounts)]
#[instruction(_pool_token_pair: String)]
pub struct InitPoolContext<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
    mut,
    seeds = [
    CONFIG_PDA_SEED.as_ref(),
    name_seed(& _pool_token_pair),
    token_x_mint.key().as_ref(),
    token_y_mint.key().as_ref(),
    ],
    has_one = token_x_mint,
    has_one = token_y_mint,
    has_one = token_x_vault,
    has_one = token_y_vault,
    has_one = pool_mint,
    constraint = config.owner == owner.key() @ ErrorCode::PermissionError,
    bump = config.nonce
    )]
    pub config: Box<Account<'info, Config>>,

    pub token_x_mint: Box<Account<'info, Mint>>,
    pub token_y_mint: Box<Account<'info, Mint>>,

    #[account(
    seeds = [
    POOL_AUTHORITY_SEED.as_ref(),
    name_seed(& _pool_token_pair),
    config.key().as_ref(),
    ],
    bump,
    )]
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub pool_authority: AccountInfo<'info>,

    #[account(
    mut,
    token::mint = token_x_mint,
    token::authority = pool_authority,
    seeds = [
    TOKEN_VAULT_PDA_SEED.as_ref(),
    name_seed(& _pool_token_pair),
    token_x_mint.key().as_ref(),
    config.key().as_ref(),
    ],
    bump,
    )]
    pub token_x_vault: Box<Account<'info, TokenAccount>>,

    #[account(
    mut,
    token::mint = token_y_mint,
    token::authority = pool_authority,
    seeds = [
    TOKEN_VAULT_PDA_SEED.as_ref(),
    name_seed(& _pool_token_pair),
    token_y_mint.key().as_ref(),
    config.key().as_ref(),
    ],
    bump,
    )]
    pub token_y_vault: Box<Account<'info, TokenAccount>>,

    #[account(
    mut,
    mint::decimals = 9,
    mint::authority = pool_authority,
    seeds = [
    POOL_MINT_SEED.as_ref(),
    name_seed(& _pool_token_pair),
    config.key().as_ref(),
    ],
    bump,
    )]
    pub pool_mint: Box<Account<'info, Mint>>,

    /// user token account
    #[account(
    mut,
    constraint = user_token_x_vault.mint == token_x_mint.key(),
    constraint = user_token_x_vault.owner == owner.key()
    )]
    pub user_token_x_vault: Box<Account<'info, TokenAccount>>,

    #[account(
    mut,
    constraint = user_token_y_vault.mint == token_y_mint.key(),
    constraint = user_token_y_vault.owner == owner.key()
    )]
    pub user_token_y_vault: Box<Account<'info, TokenAccount>>,

    #[account(
    mut,
    constraint = user_lp_vault.mint == pool_mint.key(),
    constraint = user_lp_vault.owner == owner.key()
    )]
    pub user_lp_vault: Box<Account<'info, TokenAccount>>,

    ///used by anchor for init of the token
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(_pool_token_pair: String)]
pub struct LiquidityContext<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
    mut,
    seeds = [
    CONFIG_PDA_SEED.as_ref(),
    name_seed(& _pool_token_pair),
    token_x_mint.key().as_ref(),
    token_y_mint.key().as_ref(),
    ],
    has_one = token_x_mint,
    has_one = token_y_mint,
    has_one = token_x_vault,
    has_one = token_y_vault,
    has_one = pool_mint,
    bump = config.nonce
    )]
    pub config: Box<Account<'info, Config>>,

    pub token_x_mint: Box<Account<'info, Mint>>,
    pub token_y_mint: Box<Account<'info, Mint>>,

    #[account(
    seeds = [
    POOL_AUTHORITY_SEED.as_ref(),
    name_seed(& _pool_token_pair),
    config.key().as_ref(),
    ],
    bump,
    )]
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub pool_authority: AccountInfo<'info>,

    #[account(
    mut,
    token::mint = token_x_mint,
    token::authority = pool_authority,
    seeds = [
    TOKEN_VAULT_PDA_SEED.as_ref(),
    name_seed(& _pool_token_pair),
    token_x_mint.key().as_ref(),
    config.key().as_ref(),
    ],
    bump,
    )]
    pub token_x_vault: Box<Account<'info, TokenAccount>>,

    #[account(
    mut,
    token::mint = token_y_mint,
    token::authority = pool_authority,
    seeds = [
    TOKEN_VAULT_PDA_SEED.as_ref(),
    name_seed(& _pool_token_pair),
    token_y_mint.key().as_ref(),
    config.key().as_ref(),
    ],
    bump,
    )]
    pub token_y_vault: Box<Account<'info, TokenAccount>>,

    #[account(
    mut,
    mint::decimals = 9,
    mint::authority = pool_authority,
    seeds = [
    POOL_MINT_SEED.as_ref(),
    name_seed(& _pool_token_pair),
    config.key().as_ref(),
    ],
    bump,
    )]
    pub pool_mint: Box<Account<'info, Mint>>,

    /// user token account
    #[account(
    mut,
    constraint = user_token_x_vault.mint == token_x_mint.key(),
    constraint = user_token_x_vault.owner == owner.key()
    )]
    pub user_token_x_vault: Box<Account<'info, TokenAccount>>,

    #[account(
    mut,
    constraint = user_token_y_vault.mint == token_y_mint.key(),
    constraint = user_token_y_vault.owner == owner.key()
    )]
    pub user_token_y_vault: Box<Account<'info, TokenAccount>>,

    #[account(
    mut,
    constraint = user_lp_vault.mint == pool_mint.key(),
    constraint = user_lp_vault.owner == owner.key()
    )]
    pub user_lp_vault: Box<Account<'info, TokenAccount>>,

    ///used by anchor for init of the token
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(_pool_token_pair: String)]
pub struct SwapContext<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
    mut,
    seeds = [
    CONFIG_PDA_SEED.as_ref(),
    name_seed(& _pool_token_pair),
    token_x_mint.key().as_ref(),
    token_y_mint.key().as_ref(),
    ],
    has_one = token_x_mint,
    has_one = token_y_mint,
    has_one = token_x_vault,
    has_one = token_y_vault,
    bump = config.nonce
    )]
    pub config: Box<Account<'info, Config>>,

    pub token_x_mint: Box<Account<'info, Mint>>,
    pub token_y_mint: Box<Account<'info, Mint>>,

    #[account(
    seeds = [
    POOL_AUTHORITY_SEED.as_ref(),
    name_seed(& _pool_token_pair),
    config.key().as_ref(),
    ],
    bump,
    )]
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub pool_authority: AccountInfo<'info>,

    #[account(
    mut,
    token::mint = token_x_mint,
    token::authority = pool_authority,
    seeds = [
    TOKEN_VAULT_PDA_SEED.as_ref(),
    name_seed(& _pool_token_pair),
    token_x_mint.key().as_ref(),
    config.key().as_ref(),
    ],
    bump,
    )]
    pub token_x_vault: Box<Account<'info, TokenAccount>>,

    #[account(
    mut,
    token::mint = token_y_mint,
    token::authority = pool_authority,
    seeds = [
    TOKEN_VAULT_PDA_SEED.as_ref(),
    name_seed(& _pool_token_pair),
    token_y_mint.key().as_ref(),
    config.key().as_ref(),
    ],
    bump,
    )]
    pub token_y_vault: Box<Account<'info, TokenAccount>>,

    /// user token account
    #[account(
    mut,
    constraint = user_token_x_vault.mint == token_x_mint.key(),
    constraint = user_token_x_vault.owner == owner.key()
    )]
    pub user_token_x_vault: Box<Account<'info, TokenAccount>>,

    #[account(
    mut,
    constraint = user_token_y_vault.mint == token_y_mint.key(),
    constraint = user_token_y_vault.owner == owner.key()
    )]
    pub user_token_y_vault: Box<Account<'info, TokenAccount>>,

    ///used by anchor for init of the token
    pub token_program: Program<'info, Token>,
}

