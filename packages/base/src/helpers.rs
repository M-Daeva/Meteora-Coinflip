use {
    crate::error::AuthError,
    anchor_lang::{
        prelude::*,
        solana_program::{
            hash::hash,
            instruction::Instruction,
            program::{invoke, invoke_signed},
            sysvar::instructions::load_instruction_at_checked,
        },
        system_program::{self, create_account, CreateAccount},
    },
    anchor_spl::token_interface::{
        self, initialize_mint2, CloseAccount, InitializeMint2, Mint, TokenAccount, TokenInterface,
    },
    std::{collections::HashSet, hash::Hash},
};

pub enum Cluster {
    Mainnet,
    Devnet,
    Localnet,
}

pub const DISCRIMINATOR_SPACE: usize = 8;

pub fn admin_guard(
    cluster: Cluster,
    sender: &Signer,
    mainnet_admin: &Pubkey,
    devnet_admin: &Pubkey,
    localnet_admin: &Pubkey,
) -> Result<()> {
    let admin = get_option_by_cluster(cluster, mainnet_admin, devnet_admin, localnet_admin);

    if &sender.key() != admin {
        Err(AuthError::Unauthorized)?;
    }

    Ok(())
}

pub fn get_option_by_cluster<T>(
    cluster: Cluster,
    mainnet_option: T,
    devnet_option: T,
    localnet_option: T,
) -> T {
    match cluster {
        Cluster::Mainnet => mainnet_option,
        Cluster::Devnet => devnet_option,
        Cluster::Localnet => localnet_option,
    }
}

pub fn show<T: std::fmt::Debug>(label: &str, data: T) {
    let formatted = &format!("{:?}", data);

    if formatted == "\"\"" {
        msg!("✅ {}", label);
    } else {
        msg!("✅ {}: {}", label, formatted);
    }
}

/// checks if a list has duplicates
pub fn has_duplicates<T: Eq + Hash>(list: &[T]) -> bool {
    let mut set = HashSet::with_capacity(list.len());

    for item in list {
        if !set.insert(item) {
            return true;
        }
    }

    false
}

/// removes duplicates from a list
pub fn deduplicate<T: Eq + Hash + Clone>(list: &[T]) -> Vec<T> {
    let mut set = HashSet::with_capacity(list.len());

    list.iter()
        .filter_map(|item| {
            if set.insert(item) {
                Some(item.to_owned())
            } else {
                None
            }
        })
        .collect()
}

pub fn serialize_account<T>(account: &mut AccountInfo, data: &T) -> Result<()>
where
    T: AnchorSerialize + AnchorDeserialize + Discriminator,
{
    let mut account_data = account.try_borrow_mut_data()?;
    let discriminator = T::DISCRIMINATOR;

    // Write the discriminator
    account_data[0..discriminator.len()].copy_from_slice(discriminator);

    // Write the data
    data.serialize(&mut &mut account_data[discriminator.len()..])?;

    Ok(())
}

pub fn deserialize_account<T>(account: &AccountInfo) -> Result<T>
where
    T: AnchorSerialize + AnchorDeserialize + Discriminator,
{
    let data = account.try_borrow_data()?;
    let discriminator = T::DISCRIMINATOR;

    // Verify discriminator matches
    if data.len() < discriminator.len() {
        Err(ErrorCode::AccountDiscriminatorNotFound)?;
    }

    if &data[0..discriminator.len()] != discriminator {
        Err(ErrorCode::AccountDiscriminatorMismatch)?;
    }

    Ok(T::deserialize(&mut &data[discriminator.len()..])?)
}

pub fn get_discriminator(instruction_name: &str) -> [u8; DISCRIMINATOR_SPACE] {
    let mut discriminator = [0u8; DISCRIMINATOR_SPACE];
    let hash = hash(format!("global:{}", instruction_name).as_bytes());
    discriminator.copy_from_slice(&hash.to_bytes()[..DISCRIMINATOR_SPACE]);
    discriminator
}

pub fn get_space(struct_space: usize) -> usize {
    DISCRIMINATOR_SPACE + struct_space
}

/// pass args in the order to expect mint_a <= mint_b
pub fn are_mints_sorted(mint_a: &Pubkey, mint_b: &Pubkey) -> bool {
    mint_a <= mint_b
}

pub fn sort_mints(mint_a: &Pubkey, mint_b: &Pubkey) -> (Pubkey, Pubkey) {
    if are_mints_sorted(mint_a, mint_b) {
        (*mint_a, *mint_b)
    } else {
        (*mint_b, *mint_a)
    }
}

pub fn get_clock_time() -> Result<u64> {
    Ok(Clock::get()?.unix_timestamp as u64)
}

pub fn get_rent_exempt<'a, T>(account: &T) -> Result<u64>
where
    T: ToAccountInfo<'a>,
{
    Ok(Rent::get()?.minimum_balance(account.to_account_info().data_len()))
}

pub fn transfer_sol_from_user<'a>(
    amount: u64,
    from: &Signer<'a>,
    to: &AccountInfo<'a>,
    system_program: &Program<'a, System>,
) -> Result<()> {
    let cpi_program = system_program.to_account_info();
    let cpi_accounts = system_program::Transfer {
        from: from.to_account_info(),
        to: to.to_account_info(),
    };

    system_program::transfer(CpiContext::new(cpi_program, cpi_accounts), amount)
}

pub fn transfer_sol_from_program<'a>(
    amount: u64,
    from: &AccountInfo<'a>,
    to: &AccountInfo<'a>,
    seeds: &[&[u8]],
    bump: u8,
    system_program: &Program<'a, System>,
) -> Result<()> {
    let cpi_program = system_program.to_account_info();
    let cpi_accounts = system_program::Transfer {
        from: from.clone(),
        to: to.clone(),
    };

    let bump_bytes = [bump];
    let seeds_with_bump = with_bump(seeds, &bump_bytes);

    system_program::transfer(
        CpiContext::new_with_signer(cpi_program, cpi_accounts, &[&seeds_with_bump]),
        amount,
    )
}

// Manually adjust lamports instead of using system_program::transfer
// This is necessary because the system program's transfer instruction
// doesn't allow transferring from accounts that carry data
pub fn transfer_sol_from_data_account<'a>(
    amount: u64,
    from: &AccountInfo<'a>,
    to: &AccountInfo<'a>,
) -> Result<()> {
    **from.try_borrow_mut_lamports()? -= amount;
    **to.try_borrow_mut_lamports()? += amount;

    Ok(())
}

pub fn transfer_token_from_user<'a>(
    amount: u64,
    mint: &InterfaceAccount<'a, Mint>,
    from: &InterfaceAccount<'a, TokenAccount>,
    to: &InterfaceAccount<'a, TokenAccount>,
    signer: &Signer<'a>,
    token_program: &Interface<'a, TokenInterface>,
) -> Result<()> {
    let cpi_program = token_program.to_account_info();
    let cpi_accounts = token_interface::TransferChecked {
        from: from.to_account_info(),
        to: to.to_account_info(),
        mint: mint.to_account_info(),
        authority: signer.to_account_info(),
    };

    token_interface::transfer_checked(
        CpiContext::new(cpi_program, cpi_accounts),
        amount,
        mint.decimals,
    )
}

#[allow(clippy::too_many_arguments)]
pub fn transfer_token_from_program<'a, T>(
    amount: u64,
    mint: &InterfaceAccount<'a, Mint>,
    from: &InterfaceAccount<'a, TokenAccount>,
    to: &InterfaceAccount<'a, TokenAccount>,
    seeds: &[&[u8]],
    bump: u8,
    authority: &Account<'a, T>,
    token_program: &Interface<'a, TokenInterface>,
) -> Result<()>
where
    T: AccountSerialize + AccountDeserialize + Clone,
{
    let cpi_program = token_program.to_account_info();
    let cpi_accounts = token_interface::TransferChecked {
        from: from.to_account_info(),
        to: to.to_account_info(),
        mint: mint.to_account_info(),
        authority: authority.to_account_info(),
    };

    let bump_bytes = [bump];
    let seeds_with_bump = with_bump(seeds, &bump_bytes);

    token_interface::transfer_checked(
        CpiContext::new_with_signer(cpi_program, cpi_accounts, &[&seeds_with_bump]),
        amount,
        mint.decimals,
    )
}

pub fn create_mint_account<'info>(
    mint_len: usize,
    lamports: u64,
    fee_payer: &Signer<'info>,
    mint: &AccountInfo<'info>,
    system_program: &Program<'info, System>,
    token_program: &impl ToAccountInfo<'info>,
) -> Result<()> {
    create_account(
        CpiContext::new(
            system_program.to_account_info(),
            CreateAccount {
                from: fee_payer.to_account_info(),
                to: mint.clone(),
            },
        ),
        lamports,
        mint_len as u64,
        token_program.to_account_info().key,
    )
}

pub fn init_mint<'info>(
    decimals: u8,
    mint: &AccountInfo<'info>,
    mint_authority: &impl ToAccountInfo<'info>,
    freeze_authority: Option<&impl ToAccountInfo<'info>>,
    token_program: &impl ToAccountInfo<'info>,
) -> Result<()> {
    initialize_mint2(
        CpiContext::new(
            token_program.to_account_info(),
            InitializeMint2 { mint: mint.clone() },
        ),
        decimals,
        &mint_authority.to_account_info().key(),
        freeze_authority.map(|x| x.to_account_info().key()).as_ref(),
    )
}

pub fn mint_token_to<'a, T>(
    amount: u64,
    mint: &InterfaceAccount<'a, Mint>,
    to: &InterfaceAccount<'a, TokenAccount>,
    seeds: &[&[u8]],
    bump: u8,
    authority: &InterfaceAccount<'a, T>,
    token_program: &Interface<'a, TokenInterface>,
) -> Result<()>
where
    T: AccountSerialize + AccountDeserialize + Clone,
{
    let cpi_program = token_program.to_account_info();
    let cpi_accounts = token_interface::MintToChecked {
        mint: mint.to_account_info(),
        to: to.to_account_info(),
        authority: authority.to_account_info(),
    };

    let bump_bytes = [bump];
    let seeds_with_bump = with_bump(seeds, &bump_bytes);

    token_interface::mint_to_checked(
        CpiContext::new_with_signer(cpi_program, cpi_accounts, &[&seeds_with_bump]),
        amount,
        mint.decimals,
    )
}

pub fn burn_token_from<'a>(
    amount: u64,
    mint: &InterfaceAccount<'a, Mint>,
    from: &InterfaceAccount<'a, TokenAccount>,
    signer: &Signer<'a>,
    token_program: &Interface<'a, TokenInterface>,
) -> Result<()> {
    let cpi_program = token_program.to_account_info();
    let cpi_accounts = token_interface::BurnChecked {
        mint: mint.to_account_info(),
        from: from.to_account_info(),
        authority: signer.to_account_info(),
    };

    token_interface::burn_checked(
        CpiContext::new(cpi_program, cpi_accounts),
        amount,
        mint.decimals,
    )
}

pub fn close_token_account_from_program<'a, T>(
    account: &InterfaceAccount<'a, TokenAccount>,
    destination: &Signer<'a>,
    authority: &Account<'a, T>,
    seeds: &[&[u8]],
    bump: u8,
    token_program: &Interface<'a, TokenInterface>,
) -> Result<()>
where
    T: AccountSerialize + AccountDeserialize + Clone,
{
    let cpi_program = token_program.to_account_info();
    let cpi_accounts = CloseAccount {
        account: account.to_account_info(),
        destination: destination.to_account_info(),
        authority: authority.to_account_info(),
    };

    let bump_bytes = [bump];
    let seeds_with_bump = with_bump(seeds, &bump_bytes);

    token_interface::close_account(CpiContext::new_with_signer(
        cpi_program,
        cpi_accounts,
        &[&seeds_with_bump],
    ))
}

pub fn resize_account<'info, T>(
    sender: &Signer<'info>,
    account: &AccountInfo<'info>,
    system_program: &Program<'info, System>,
) -> Result<()>
where
    T: Space,
{
    let current_len = account.data_len();
    let target_len = get_space(T::INIT_SPACE);

    // Handle resizing
    if current_len != target_len {
        // Realloc the account
        account.realloc(target_len, false)?;

        let new_minimum_balance = Rent::get()?.minimum_balance(target_len);
        let current_lamports = account.lamports();

        if current_len < target_len {
            // Account grew - need to add lamports
            if current_lamports < new_minimum_balance {
                let additional_lamports = new_minimum_balance - current_lamports;
                transfer_sol_from_user(additional_lamports, sender, account, system_program)?;
            }
        } else {
            // Account shrunk - can reclaim lamports
            if current_lamports > new_minimum_balance {
                let excess_lamports = current_lamports - new_minimum_balance;
                transfer_sol_from_data_account(excess_lamports, account, sender)?;
            }
        }
    }

    Ok(())
}

pub fn get_last_ix_idx(instructions: &UncheckedAccount) -> Result<usize> {
    let mut i: usize = 0;

    loop {
        if load_instruction_at_checked(i, instructions).is_err() {
            break;
        }
        i += 1;
    }

    if i == 0 {
        Err(ProgramError::InvalidInstructionData)?;
    }

    Ok(i - 1)
}

pub fn get_acc_meta(x: &AccountInfo) -> AccountMeta {
    if x.is_writable {
        AccountMeta::new(x.key(), x.is_signer)
    } else {
        AccountMeta::new_readonly(x.key(), x.is_signer)
    }
}

pub fn invoke_signed_with_seeds<'info, 'a>(
    cpi_ix: &Instruction,
    cpi_accs: &impl ToAccountInfos<'info>,
    remaining_accs: &'a [AccountInfo<'info>],
    seeds: &[&[u8]],
    bump: u8,
) -> Result<()> {
    let bump_bytes = [bump];
    let seeds_with_bump = with_bump(seeds, &bump_bytes);

    invoke_signed(
        cpi_ix,
        &[cpi_accs.to_account_infos(), remaining_accs.to_vec()].concat(),
        &[&seeds_with_bump],
    )?;

    Ok(())
}

pub fn invoke_unsigned<'info>(
    cpi_ix: &Instruction,
    cpi_accs: &impl ToAccountInfos<'info>,
    remaining_accs: &[AccountInfo<'info>],
) -> Result<()> {
    invoke(
        cpi_ix,
        &[cpi_accs.to_account_infos(), remaining_accs.to_vec()].concat(),
    )?;

    Ok(())
}

pub fn with_bump<'s>(seeds: &[&'s [u8]], bump: &'s [u8; 1]) -> Vec<&'s [u8]> {
    let mut v = seeds.to_vec();
    v.push(bump);
    v
}
