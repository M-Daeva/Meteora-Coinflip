use {anchor_lang::prelude::*, base::error::AuthError};

pub enum ProgError {
    Auth(AuthError),
    Cusom(CustomError),
}

#[error_code]
pub enum CustomError {
    #[msg("This Token-2022 extension isn't supported")]
    ForbiddenExtension,

    #[msg("Wrong account owner")]
    WrongAccountOwner,

    #[msg("Account is too small")]
    AccountTooSmall,

    #[msg("Bad discriminator")]
    BadDiscriminator,
}

impl From<CustomError> for ProgError {
    fn from(error: CustomError) -> Self {
        Self::Cusom(error)
    }
}

impl From<AuthError> for ProgError {
    fn from(error: AuthError) -> Self {
        Self::Auth(error)
    }
}
