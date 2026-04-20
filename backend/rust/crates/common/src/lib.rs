pub mod auth;
pub mod categorization;
pub mod config;
pub mod error;
pub mod firestore;
pub mod ollama;
pub mod qdrant;
pub mod rag;
pub mod types;

pub use auth::verify_bearer_token;
pub use config::AppConfig;
pub use error::{AppError, AppResult};
