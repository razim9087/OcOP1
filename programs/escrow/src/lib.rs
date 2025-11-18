use anchor_lang::prelude::*;

declare_id!("FX3EgWWVrVCzgtntijpgfCT22C7HXpq6Py9DrYmDjR3E");

// Constants for margin management
const MARGIN_CALL_THRESHOLD: u64 = 20; // 20% of initial margin
const SECONDS_PER_DAY: i64 = 24 * 60 * 60;

#[program]
pub mod escrow {
    use super::*;

    /// Initialize a new options contract with margin accounts
    /// option_type: 0 for Call, 1 for Put
    /// strike: The strike price in lamports (ratio of asset price to SOL price)
    /// is_test: true for test contracts (allows past dates), false for production
    pub fn initialize_option(
        ctx: Context<InitializeOption>,
        option_type: u8,
        underlying: String,
        initiation_date: i64,
        price: u64,
        strike: u64,
        initial_margin: u64,
        is_test: bool,
    ) -> Result<()> {
        require!(option_type <= 1, ErrorCode::InvalidOptionType);
        require!(price > 0, ErrorCode::PriceMustBeNonZero);
        require!(strike > 0, ErrorCode::StrikeMustBeNonZero);
        require!(initial_margin > 0, ErrorCode::MarginMustBeNonZero);
        require!(underlying.len() <= 32, ErrorCode::UnderlyingTooLong);
        
        let clock = Clock::get()?;
        
        // Real contracts cannot be initiated with past dates
        if !is_test {
            require!(
                initiation_date >= clock.unix_timestamp,
                ErrorCode::InvalidInitiationDate
            );
        }
        
        let option = &mut ctx.accounts.option;
        
        option.option_type = option_type;
        option.underlying = underlying;
        option.seller = ctx.accounts.seller.key();
        option.initiation_date = initiation_date;
        option.expiry_date = initiation_date + (30 * SECONDS_PER_DAY); // 30 days in seconds
        option.status = OptionStatus::Listed;
        option.price = price;
        option.strike = strike;
        option.owner = Pubkey::default(); // No owner initially
        option.bump = ctx.bumps.option;
        option.is_test = is_test;
        
        // Margin account initialization
        option.initial_margin = initial_margin;
        option.seller_margin = 0; // Set when purchased
        option.buyer_margin = 0; // Set when purchased
        option.last_settlement_date = 0;
        option.last_settlement_price = 0;
        
        Ok(())
    }

    /// Purchase an option contract with margin deposit
    pub fn purchase_option(ctx: Context<PurchaseOption>) -> Result<()> {
        let clock = Clock::get()?;
        
        // Read values we need before mutable operations
        let price = ctx.accounts.option.price;
        let margin_amount = ctx.accounts.option.initial_margin;
        let expiry = ctx.accounts.option.expiry_date;
        let status = ctx.accounts.option.status.clone();
        let is_test = ctx.accounts.option.is_test;
        
        require!(
            status == OptionStatus::Listed,
            ErrorCode::OptionNotAvailable
        );
        
        // Only check expiry for production contracts
        if !is_test {
            require!(
                clock.unix_timestamp < expiry,
                ErrorCode::OptionExpired
            );
        }
        
        // Transfer option price from buyer to seller
        let price_transfer_ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.buyer.key(),
            &ctx.accounts.seller.key(),
            price,
        );
        
        anchor_lang::solana_program::program::invoke(
            &price_transfer_ix,
            &[
                ctx.accounts.buyer.to_account_info(),
                ctx.accounts.seller.to_account_info(),
            ],
        )?;
        
        // Transfer margin from buyer to program (option account)
        let buyer_margin_ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.buyer.key(),
            &ctx.accounts.option.to_account_info().key(),
            margin_amount,
        );
        
        anchor_lang::solana_program::program::invoke(
            &buyer_margin_ix,
            &[
                ctx.accounts.buyer.to_account_info(),
                ctx.accounts.option.to_account_info(),
            ],
        )?;
        
        // Transfer margin from seller to program (option account)
        let seller_margin_ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.seller.key(),
            &ctx.accounts.option.to_account_info().key(),
            margin_amount,
        );
        
        anchor_lang::solana_program::program::invoke(
            &seller_margin_ix,
            &[
                ctx.accounts.seller.to_account_info(),
                ctx.accounts.option.to_account_info(),
            ],
        )?;
        
        // Now update option state
        let option = &mut ctx.accounts.option;
        option.status = OptionStatus::Owned;
        option.owner = ctx.accounts.buyer.key();
        option.seller_margin = margin_amount;
        option.buyer_margin = margin_amount;
        option.last_settlement_date = clock.unix_timestamp;
        
        Ok(())
    }

    /// Daily settlement - calculates P&L and adjusts margins
    /// asset_price_usd: Current price of underlying asset in USD (with 6 decimals)
    /// sol_price_usd: Current price of SOL in USD (with 6 decimals)
    pub fn daily_settlement(
        ctx: Context<DailySettlement>,
        asset_price_usd: u64,
        sol_price_usd: u64,
    ) -> Result<()> {
        let option = &mut ctx.accounts.option;
        let clock = Clock::get()?;
        
        require!(
            option.status == OptionStatus::Owned,
            ErrorCode::OptionNotOwned
        );
        
        // Only check expiry and timing for production contracts
        if !option.is_test {
            require!(
                clock.unix_timestamp < option.expiry_date,
                ErrorCode::OptionExpired
            );
            
            // Ensure at least one day has passed since last settlement
            require!(
                clock.unix_timestamp >= option.last_settlement_date + SECONDS_PER_DAY,
                ErrorCode::SettlementTooSoon
            );
        }
        
        // Calculate current asset value in SOL terms
        // asset_value_in_sol = (asset_price_usd * 10^9) / sol_price_usd
        require!(sol_price_usd > 0, ErrorCode::InvalidPrice);
        let current_ratio = (asset_price_usd as u128)
            .checked_mul(1_000_000_000) // Scale to lamports
            .ok_or(ErrorCode::CalculationOverflow)?
            .checked_div(sol_price_usd as u128)
            .ok_or(ErrorCode::CalculationOverflow)? as u64;
        
        // Calculate P&L based on movement from strike price
        let strike = option.strike;
        
        // For first settlement, use strike as reference
        let reference_price = if option.last_settlement_price == 0 {
            strike
        } else {
            option.last_settlement_price
        };
        
        let price_diff = if current_ratio > reference_price {
            current_ratio - reference_price
        } else {
            reference_price - current_ratio
        };
        
        // Determine who gains/loses based on option type and price movement
        let (buyer_gain, seller_gain) = calculate_pnl(
            option.option_type,
            current_ratio,
            reference_price,
            price_diff,
        );
        
        // Calculate margin call threshold (20% of initial margin)
        let margin_threshold = option.initial_margin
            .checked_mul(MARGIN_CALL_THRESHOLD)
            .ok_or(ErrorCode::CalculationOverflow)?
            .checked_div(100)
            .ok_or(ErrorCode::CalculationOverflow)?;
        
        // Adjust margins with margin call protection
        if buyer_gain > 0 {
            // Check if seller would fall below threshold
            if buyer_gain >= option.seller_margin || option.seller_margin.saturating_sub(buyer_gain) <= margin_threshold {
                // Cap the transfer to avoid negative or threshold breach
                let max_transfer = option.seller_margin.saturating_sub(margin_threshold);
                option.buyer_margin = option.buyer_margin.checked_add(max_transfer)
                    .ok_or(ErrorCode::CalculationOverflow)?;
                option.seller_margin = margin_threshold;
                option.status = OptionStatus::MarginCalled;
                msg!("Margin call triggered - seller margin exhausted at {}%, positions forcibly settled", 
                     (margin_threshold * 100) / option.initial_margin);
            } else {
                option.buyer_margin = option.buyer_margin.checked_add(buyer_gain)
                    .ok_or(ErrorCode::CalculationOverflow)?;
                option.seller_margin = option.seller_margin.checked_sub(buyer_gain)
                    .ok_or(ErrorCode::InsufficientMargin)?;
            }
        } else if seller_gain > 0 {
            // Check if buyer would fall below threshold
            if seller_gain >= option.buyer_margin || option.buyer_margin.saturating_sub(seller_gain) <= margin_threshold {
                // Cap the transfer to avoid negative or threshold breach
                let max_transfer = option.buyer_margin.saturating_sub(margin_threshold);
                option.seller_margin = option.seller_margin.checked_add(max_transfer)
                    .ok_or(ErrorCode::CalculationOverflow)?;
                option.buyer_margin = margin_threshold;
                option.status = OptionStatus::MarginCalled;
                msg!("Margin call triggered - buyer margin exhausted at {}%, positions forcibly settled",
                     (margin_threshold * 100) / option.initial_margin);
            } else {
                option.seller_margin = option.seller_margin.checked_add(seller_gain)
                    .ok_or(ErrorCode::CalculationOverflow)?;
                option.buyer_margin = option.buyer_margin.checked_sub(seller_gain)
                    .ok_or(ErrorCode::InsufficientMargin)?;
            }
        }
        
        // Update settlement tracking
        option.last_settlement_date = clock.unix_timestamp;
        option.last_settlement_price = current_ratio;
        
        Ok(())
    }

    /// Exercise an option contract (only on expiration date)
    /// Final settlement with reference price check
    pub fn exercise_option(
        ctx: Context<ExerciseOption>,
        asset_price_usd: u64,
        sol_price_usd: u64,
    ) -> Result<()> {
        let option = &mut ctx.accounts.option;
        let clock = Clock::get()?;
        
        require!(
            option.status == OptionStatus::Owned,
            ErrorCode::OptionNotOwned
        );
        
        require!(
            ctx.accounts.owner.key() == option.owner,
            ErrorCode::Unauthorized
        );
        
        // European option: Can only exercise ON or AFTER expiry date
        // Skip this check for test mode contracts
        if !option.is_test {
            require!(
                clock.unix_timestamp >= option.expiry_date,
                ErrorCode::CannotExerciseBeforeExpiry
            );
        }
        
        // Calculate final settlement value
        require!(sol_price_usd > 0, ErrorCode::InvalidPrice);
        let final_ratio = (asset_price_usd as u128)
            .checked_mul(1_000_000_000)
            .ok_or(ErrorCode::CalculationOverflow)?
            .checked_div(sol_price_usd as u128)
            .ok_or(ErrorCode::CalculationOverflow)? as u64;
        
        // Calculate final P&L
        let strike = option.strike;
        let settlement_value = calculate_settlement_value(
            option.option_type,
            final_ratio,
            strike,
        );
        
        msg!("Exercise settlement - Asset/SOL ratio: {}, Strike: {}, Settlement: {}", 
            final_ratio, strike, settlement_value);
        
        // Mark as exercised/expired
        option.status = OptionStatus::Expired;
        option.last_settlement_price = final_ratio;
        
        Ok(())
    }

    /// Mark expired options
    pub fn expire_option(ctx: Context<ExpireOption>) -> Result<()> {
        let option = &mut ctx.accounts.option;
        let clock = Clock::get()?;
        
        require!(
            clock.unix_timestamp >= option.expiry_date,
            ErrorCode::OptionNotExpired
        );
        
        option.status = OptionStatus::Expired;
        
        Ok(())
    }

    /// Delist an option (seller can cancel if not owned)
    pub fn delist_option(ctx: Context<DelistOption>) -> Result<()> {
        let option = &mut ctx.accounts.option;
        
        require!(
            ctx.accounts.seller.key() == option.seller,
            ErrorCode::Unauthorized
        );
        
        require!(
            option.status == OptionStatus::Listed,
            ErrorCode::CannotDelistOwnedOption
        );
        
        option.status = OptionStatus::Delisted;
        
        Ok(())
    }

    /// Resell an option to a new buyer
    /// Current owner sells to new buyer at a new price
    pub fn resell_option(ctx: Context<ResellOption>, resell_price: u64) -> Result<()> {
        let clock = Clock::get()?;
        
        // Read values before mutable operations
        let status = ctx.accounts.option.status.clone();
        let owner = ctx.accounts.option.owner;
        let expiry_date = ctx.accounts.option.expiry_date;
        let old_buyer_margin = ctx.accounts.option.buyer_margin;
        let is_test = ctx.accounts.option.is_test;
        
        require!(
            status == OptionStatus::Owned,
            ErrorCode::OptionNotAvailable
        );
        
        require!(
            ctx.accounts.current_owner.key() == owner,
            ErrorCode::Unauthorized
        );
        
        // Only check expiry for production contracts
        if !is_test {
            require!(
                clock.unix_timestamp < expiry_date,
                ErrorCode::OptionExpired
            );
        }
        
        require!(resell_price > 0, ErrorCode::PriceMustBeNonZero);
        
        // Transfer resell price from new buyer to current owner
        let resell_transfer_ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.new_buyer.key(),
            &ctx.accounts.current_owner.key(),
            resell_price,
        );
        
        anchor_lang::solana_program::program::invoke(
            &resell_transfer_ix,
            &[
                ctx.accounts.new_buyer.to_account_info(),
                ctx.accounts.current_owner.to_account_info(),
            ],
        )?;
        
        // Transfer new buyer's margin to option account first
        let new_margin_ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.new_buyer.key(),
            &ctx.accounts.option.to_account_info().key(),
            old_buyer_margin,
        );
        
        anchor_lang::solana_program::program::invoke(
            &new_margin_ix,
            &[
                ctx.accounts.new_buyer.to_account_info(),
                ctx.accounts.option.to_account_info(),
            ],
        )?;
        
        // Transfer old buyer's margin from option account to old owner
        // We need to adjust lamports directly since option account is a PDA
        **ctx.accounts.option.to_account_info().try_borrow_mut_lamports()? -= old_buyer_margin;
        **ctx.accounts.current_owner.to_account_info().try_borrow_mut_lamports()? += old_buyer_margin;
        
        // Update owner
        let option = &mut ctx.accounts.option;
        option.owner = ctx.accounts.new_buyer.key();
        
        Ok(())
    }
}

// Helper function to calculate P&L for daily settlement
fn calculate_pnl(
    option_type: u8,
    current_price: u64,
    reference_price: u64,
    price_diff: u64,
) -> (u64, u64) {
    // Returns (buyer_gain, seller_gain)
    
    if option_type == 0 {
        // Call option: Buyer gains when price increases
        if current_price > reference_price {
            (price_diff, 0)
        } else {
            (0, price_diff)
        }
    } else {
        // Put option: Buyer gains when price decreases
        if current_price < reference_price {
            (price_diff, 0)
        } else {
            (0, price_diff)
        }
    }
}

// Helper function to calculate final settlement value
fn calculate_settlement_value(
    option_type: u8,
    final_price: u64,
    strike_price: u64,
) -> i64 {
    if option_type == 0 {
        // Call option: max(final_price - strike, 0)
        if final_price > strike_price {
            (final_price - strike_price) as i64
        } else {
            0
        }
    } else {
        // Put option: max(strike - final_price, 0)
        if strike_price > final_price {
            (strike_price - final_price) as i64
        } else {
            0
        }
    }
}

#[derive(Accounts)]
#[instruction(option_type: u8, underlying: String)]
pub struct InitializeOption<'info> {
    #[account(
        init,
        payer = seller,
        space = 8 + OptionContract::INIT_SPACE,
        seeds = [b"option", seller.key().as_ref(), underlying.as_bytes()],
        bump
    )]
    pub option: Account<'info, OptionContract>,
    #[account(mut)]
    pub seller: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PurchaseOption<'info> {
    #[account(mut)]
    pub option: Account<'info, OptionContract>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(mut)]
    pub seller: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExerciseOption<'info> {
    #[account(mut)]
    pub option: Account<'info, OptionContract>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct ExpireOption<'info> {
    #[account(mut)]
    pub option: Account<'info, OptionContract>,
}

#[derive(Accounts)]
pub struct DelistOption<'info> {
    #[account(mut)]
    pub option: Account<'info, OptionContract>,
    pub seller: Signer<'info>,
}

#[derive(Accounts)]
pub struct ResellOption<'info> {
    #[account(mut)]
    pub option: Account<'info, OptionContract>,
    #[account(mut)]
    pub current_owner: Signer<'info>,
    #[account(mut)]
    pub new_buyer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DailySettlement<'info> {
    #[account(mut)]
    pub option: Account<'info, OptionContract>,
    /// CHECK: Can be called by anyone to trigger settlement
    pub settler: Signer<'info>,
}

#[account]
pub struct OptionContract {
    pub option_type: u8,           // 1 byte - 0: Call, 1: Put
    pub underlying: String,        // 4 + 32 bytes (max 32 chars)
    pub seller: Pubkey,            // 32 bytes
    pub initiation_date: i64,      // 8 bytes - immutable after initialization
    pub expiry_date: i64,          // 8 bytes - immutable after initialization (30 days from initiation)
    pub status: OptionStatus,      // 1 byte
    pub price: u64,                // 8 bytes - Option premium
    pub strike: u64,               // 8 bytes - Strike price (asset/SOL ratio in lamports)
    pub owner: Pubkey,             // 32 bytes - Buyer's public key
    pub bump: u8,                  // 1 byte
    pub is_test: bool,             // 1 byte - Test mode allows past dates
    
    // Margin management fields
    pub initial_margin: u64,       // 8 bytes - Required margin per party
    pub seller_margin: u64,        // 8 bytes - Current seller margin balance
    pub buyer_margin: u64,         // 8 bytes - Current buyer margin balance
    pub last_settlement_date: i64, // 8 bytes - Last daily settlement timestamp
    pub last_settlement_price: u64,// 8 bytes - Last settled asset/SOL ratio
}

impl OptionContract {
    pub const INIT_SPACE: usize = 1 + (4 + 32) + 32 + 8 + 8 + 1 + 8 + 8 + 32 + 1 + 1 + 8 + 8 + 8 + 8 + 8;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum OptionStatus {
    Listed,      // Available for purchase
    Owned,       // Purchased by a buyer
    Expired,     // Past expiry date or exercised
    Delisted,    // Cancelled by seller
    MarginCalled, // Forcibly settled due to margin call (< 20% threshold)
}

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized to perform this action")]
    Unauthorized,
    #[msg("Invalid option type (must be 0 for Call or 1 for Put)")]
    InvalidOptionType,
    #[msg("Price must be greater than zero")]
    PriceMustBeNonZero,
    #[msg("Strike must be greater than zero")]
    StrikeMustBeNonZero,
    #[msg("Underlying symbol too long (max 32 characters)")]
    UnderlyingTooLong,
    #[msg("Option is not available for purchase")]
    OptionNotAvailable,
    #[msg("Option has expired")]
    OptionExpired,
    #[msg("Option is not owned")]
    OptionNotOwned,
    #[msg("Option has not expired yet")]
    OptionNotExpired,
    #[msg("Cannot delist an owned option")]
    CannotDelistOwnedOption,
    #[msg("Cannot exercise option before expiry date (European option)")]
    CannotExerciseBeforeExpiry,
    #[msg("Margin must be greater than zero")]
    MarginMustBeNonZero,
    #[msg("Settlement can only occur once per day")]
    SettlementTooSoon,
    #[msg("Invalid price provided")]
    InvalidPrice,
    #[msg("Calculation overflow occurred")]
    CalculationOverflow,
    #[msg("Insufficient margin for settlement")]
    InsufficientMargin,
    #[msg("Initiation date cannot be in the past for production contracts")]
    InvalidInitiationDate,
}