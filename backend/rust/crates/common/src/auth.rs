use crate::{config::AppConfig, error::AppError, error::AppResult};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use jsonwebtoken::{decode, decode_header, Algorithm, DecodingKey, Validation};
use reqwest::Client;
use serde::Deserialize;
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct AuthContext {
    pub user_id: String,
}

#[derive(Debug, Deserialize)]
struct TokenClaims {
    sub: Option<String>,
    user_id: Option<String>,
    aud: Option<String>,
    iss: Option<String>,
    exp: Option<u64>,
}

pub async fn verify_bearer_token(
    client: &Client,
    config: &AppConfig,
    authorization: Option<&str>,
) -> AppResult<AuthContext> {
    let header = authorization
        .ok_or_else(|| AppError::unauthorized("Missing or invalid Authorization header"))?;
    let token = header
        .strip_prefix("Bearer ")
        .ok_or_else(|| AppError::unauthorized("Missing or invalid Authorization header"))?
        .trim();

    if config.is_emulator_mode() {
        return decode_emulator_token(token);
    }

    verify_google_token(client, config, token).await
}

fn decode_emulator_token(token: &str) -> AppResult<AuthContext> {
    let payload = token
        .split('.')
        .nth(1)
        .ok_or_else(|| AppError::unauthorized("Malformed emulator token"))?;
    let decoded = URL_SAFE_NO_PAD
        .decode(payload.as_bytes())
        .map_err(|_| AppError::unauthorized("Malformed emulator token"))?;
    let claims: TokenClaims = serde_json::from_slice(&decoded)
        .map_err(|_| AppError::unauthorized("Malformed emulator token"))?;
    let user_id = claims
        .user_id
        .or(claims.sub)
        .ok_or_else(|| AppError::unauthorized("Missing user id in token"))?;
    Ok(AuthContext { user_id })
}

async fn verify_google_token(client: &Client, config: &AppConfig, token: &str) -> AppResult<AuthContext> {
    let header = decode_header(token).map_err(|_| AppError::unauthorized("Malformed token header"))?;
    let kid = header.kid.ok_or_else(|| AppError::unauthorized("Missing token kid"))?;
    let certs: HashMap<String, String> = client
        .get("https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com")
        .send()
        .await
        .map_err(|error| AppError::unauthorized(format!("Failed to load token certs: {error}")))?
        .json()
        .await
        .map_err(|error| AppError::unauthorized(format!("Failed to parse token certs: {error}")))?;

    let pem = certs
        .get(&kid)
        .ok_or_else(|| AppError::unauthorized("Unknown token signing key"))?;
    let mut validation = Validation::new(Algorithm::RS256);
    validation.set_audience(&[config.project_id.as_str()]);
    validation.set_issuer(&[format!(
        "https://securetoken.google.com/{}",
        config.project_id
    )]);
    let decoded = decode::<TokenClaims>(
        token,
        &DecodingKey::from_rsa_pem(pem.as_bytes())
            .map_err(|error| AppError::unauthorized(format!("Invalid token key: {error}")))?,
        &validation,
    )
    .map_err(|error| AppError::unauthorized(format!("Invalid Firebase token: {error}")))?;

    let user_id = decoded
        .claims
        .user_id
        .or(decoded.claims.sub)
        .ok_or_else(|| AppError::unauthorized("Missing user id in token"))?;
    Ok(AuthContext { user_id })
}
