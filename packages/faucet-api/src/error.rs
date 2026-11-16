use {anchor_lang::prelude::*, base::error::AuthError};

pub enum ProgError {
    Auth(AuthError),
    Cusom(CustomError),
}

#[error_code]
pub enum CustomError {
    #[msg("Zero amount to claim")]
    ZeroAmount,
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
