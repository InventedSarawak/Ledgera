#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    instruction::{AccountMeta, Instruction},
    program::{invoke, invoke_signed},
};
use anchor_spl::token::{Mint, Token, TokenAccount};

declare_id!("DeyadoL7B9j4NocYubjLa9rZL8WoehcmPoatnDJcMsYE");

#[program]
pub mod amm {
    use super::*;

    pub fn initialize_pool(ctx: Context<InitializePool>) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        pool.mint_a = ctx.accounts.mint_a.key();
        pool.mint_b = ctx.accounts.mint_b.key();
        pool.pool_account_a = ctx.accounts.pool_account_a.key();
        pool.pool_account_b = ctx.accounts.pool_account_b.key();
        pool.bump = ctx.bumps.pool;
        Ok(())
    }

    pub fn swap(ctx: Context<Swap>, amount_in: u64, min_amount_out: u64) -> Result<()> {
        let pool = &ctx.accounts.pool;
        
        // Calculate reserves
        let reserve_a = ctx.accounts.pool_account_a.amount;
        let reserve_b = ctx.accounts.pool_account_b.amount;

        require!(reserve_a > 0 && reserve_b > 0, AmmError::EmptyPool);

        let (amount_out, is_a_to_b) = if ctx.accounts.user_account_a.key() == ctx.accounts.pool_account_a.key() {
            return err!(AmmError::InvalidAccounts);
        } else if ctx.accounts.mint_a.key() == pool.mint_a {
            // Swapping A for B
            let out = get_amount_out(amount_in, reserve_a, reserve_b);
            (out, true)
        } else {
            // Swapping B for A
            let out = get_amount_out(amount_in, reserve_b, reserve_a);
            (out, false)
        };

        require!(amount_out >= min_amount_out, AmmError::SlippageExceeded);

        // Transfer tokens from user to pool
        let user_source = if is_a_to_b {
            ctx.accounts.user_account_a.to_account_info()
        } else {
            ctx.accounts.user_account_b.to_account_info()
        };
        let pool_destination = if is_a_to_b {
            ctx.accounts.pool_account_a.to_account_info()
        } else {
            ctx.accounts.pool_account_b.to_account_info()
        };
        spl_token_transfer(
            &user_source,
            &pool_destination,
            ctx.accounts.user.key(),
            &ctx.accounts.user.to_account_info(),
            &ctx.accounts.token_program.to_account_info(),
            amount_in,
            None,
        )?;

        // Transfer tokens from pool to user
        let seeds = &[
            b"pool".as_ref(),
            pool.mint_a.as_ref(),
            pool.mint_b.as_ref(),
            &[pool.bump],
        ];
        let signer = &[&seeds[..]];

        let pool_source = if is_a_to_b {
            ctx.accounts.pool_account_b.to_account_info()
        } else {
            ctx.accounts.pool_account_a.to_account_info()
        };
        let user_destination = if is_a_to_b {
            ctx.accounts.user_account_b.to_account_info()
        } else {
            ctx.accounts.user_account_a.to_account_info()
        };
        spl_token_transfer(
            &pool_source,
            &user_destination,
            pool.key(),
            &pool.to_account_info(),
            &ctx.accounts.token_program.to_account_info(),
            amount_out,
            Some(signer),
        )?;

        Ok(())
    }
}

// Basic xy=k formula with 0.3% fee
fn get_amount_out(amount_in: u64, reserve_in: u64, reserve_out: u64) -> u64 {
    let amount_in_with_fee = (amount_in as u128) * 997;
    let numerator = amount_in_with_fee * (reserve_out as u128);
    let denominator = (reserve_in as u128) * 1000 + amount_in_with_fee;
    (numerator / denominator) as u64
}

fn spl_token_transfer<'info>(
    from: &AccountInfo<'info>,
    to: &AccountInfo<'info>,
    authority: Pubkey,
    authority_info: &AccountInfo<'info>,
    token_program: &AccountInfo<'info>,
    amount: u64,
    signer_seeds: Option<&[&[&[u8]]]>,
) -> Result<()> {
    let mut data = Vec::with_capacity(9);
    data.push(3);
    data.extend_from_slice(&amount.to_le_bytes());

    let ix = Instruction {
        program_id: *token_program.key,
        accounts: vec![
            AccountMeta::new(*from.key, false),
            AccountMeta::new(*to.key, false),
            AccountMeta::new_readonly(authority, true),
        ],
        data,
    };

    let account_infos = [from.clone(), to.clone(), authority_info.clone(), token_program.clone()];

    if let Some(seeds) = signer_seeds {
        invoke_signed(&ix, &account_infos, seeds)?;
    } else {
        invoke(&ix, &account_infos)?;
    }

    Ok(())
}

#[derive(Accounts)]
pub struct InitializePool<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 32 + 32 + 1,
        seeds = [b"pool", mint_a.key().as_ref(), mint_b.key().as_ref()],
        bump
    )]
    pub pool: Account<'info, Pool>,
    pub mint_a: Account<'info, Mint>,
    pub mint_b: Account<'info, Mint>,
    #[account(
        init,
        payer = authority,
        token::mint = mint_a,
        token::authority = pool,
    )]
    pub pool_account_a: Account<'info, TokenAccount>,
    #[account(
        init,
        payer = authority,
        token::mint = mint_b,
        token::authority = pool,
    )]
    pub pool_account_b: Account<'info, TokenAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Swap<'info> {
    #[account(mut)]
    pub pool: Account<'info, Pool>,
    pub mint_a: Account<'info, Mint>,
    pub mint_b: Account<'info, Mint>,
    #[account(mut)]
    pub pool_account_a: Account<'info, TokenAccount>,
    #[account(mut)]
    pub pool_account_b: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_account_a: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user_account_b: Account<'info, TokenAccount>,
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct Pool {
    pub mint_a: Pubkey,
    pub mint_b: Pubkey,
    pub pool_account_a: Pubkey,
    pub pool_account_b: Pubkey,
    pub bump: u8,
}

#[error_code]
pub enum AmmError {
    #[msg("Pool is empty")]
    EmptyPool,
    #[msg("Invalid accounts provided")]
    InvalidAccounts,
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,
}
