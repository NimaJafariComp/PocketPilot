use crate::{config::AppConfig, error::AppError, error::AppResult};
use reqwest::{Client, Method};
use serde::Deserialize;
use serde_json::{json, Value};
use jsonwebtoken::{Algorithm, EncodingKey, Header};

const FIRESTORE_SCOPE: &str = "https://www.googleapis.com/auth/datastore";
const GOOGLE_TOKEN_URL: &str = "https://oauth2.googleapis.com/token";

#[derive(Clone)]
pub struct FirestoreClient {
    client: Client,
    config: AppConfig,
}

#[derive(Debug, Clone)]
pub struct MerchantMemory {
    pub category: String,
    pub count: i64,
}

#[derive(Debug, Deserialize)]
struct ServiceAccountKey {
    client_email: String,
    private_key: String,
    token_uri: Option<String>,
}

#[derive(Debug, serde::Serialize)]
struct ServiceAccountClaims {
    iss: String,
    scope: String,
    aud: String,
    exp: usize,
    iat: usize,
}

#[derive(Debug, Deserialize)]
struct AccessTokenResponse {
    access_token: String,
}

impl FirestoreClient {
    pub fn new(client: Client, config: AppConfig) -> Self {
        Self { client, config }
    }

    pub async fn get_merchant_memory(
        &self,
        user_id: &str,
        normalized_merchant: &str,
    ) -> AppResult<Option<MerchantMemory>> {
        let doc_id = urlencoding::encode(normalized_merchant);
        let path = format!("users/{user_id}/merchantCategoryMemory/{doc_id}");
        let url = format!("{}/{}", self.config.firestore_base_url(), path);
        let response = self.request(Method::GET, &url, None).await?;
        if response.status() == reqwest::StatusCode::NOT_FOUND {
            return Ok(None);
        }
        if !response.status().is_success() {
            return Err(AppError::internal(format!(
                "Firestore get failed with {}",
                response.status()
            )));
        }
        let json: Value = response
            .json()
            .await
            .map_err(|error| AppError::internal(format!("Invalid Firestore response: {error}")))?;
        let fields = json.get("fields").cloned().unwrap_or(Value::Null);
        let category = fields
            .get("category")
            .and_then(|value| value.get("stringValue"))
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_string();
        if category.is_empty() {
            return Ok(None);
        }
        let count = fields
            .get("count")
            .and_then(|value| value.get("integerValue"))
            .and_then(Value::as_str)
            .and_then(|value| value.parse::<i64>().ok())
            .unwrap_or(1);
        Ok(Some(MerchantMemory { category, count }))
    }

    pub async fn upsert_merchant_memory(
        &self,
        user_id: &str,
        normalized_merchant: &str,
        category: &str,
    ) -> AppResult<()> {
        let doc_id = urlencoding::encode(normalized_merchant);
        let path = format!("users/{user_id}/merchantCategoryMemory/{doc_id}");
        let url = format!("{}/{}", self.config.firestore_base_url(), path);
        let now = chrono::Utc::now().to_rfc3339();
        let existing = self
            .get_merchant_memory(user_id, normalized_merchant)
            .await?
            .map(|memory| memory.count)
            .unwrap_or(0);
        let body = json!({
            "fields": {
                "normalizedMerchant": { "stringValue": normalized_merchant },
                "category": { "stringValue": category },
                "count": { "integerValue": (existing + 1).to_string() },
                "lastConfirmedAt": { "timestampValue": now },
                "updatedAt": { "timestampValue": now }
            }
        });
        let response = self.request(Method::PATCH, &url, Some(body)).await?;
        if !response.status().is_success() {
            return Err(AppError::internal(format!(
                "Firestore upsert failed with {}",
                response.status()
            )));
        }
        Ok(())
    }

    async fn request(
        &self,
        method: Method,
        url: &str,
        body: Option<Value>,
    ) -> AppResult<reqwest::Response> {
        let mut request = self.client.request(method, url);
        if self.config.is_emulator_mode() {
            request = request.header("Authorization", "Bearer owner");
        } else {
            let access_token = self.google_access_token().await?;
            request = request.bearer_auth(access_token);
        }
        if let Some(body) = body {
            request = request.json(&body);
        }
        request
            .send()
            .await
            .map_err(|error| AppError::internal(format!("Firestore request failed: {error}")))
    }

    async fn google_access_token(&self) -> AppResult<String> {
        let credentials_path = self
            .config
            .google_application_credentials
            .as_ref()
            .ok_or_else(|| AppError::internal("GOOGLE_APPLICATION_CREDENTIALS is required outside the Firestore emulator"))?;
        let file = std::fs::read_to_string(credentials_path)
            .map_err(|error| AppError::internal(format!("Failed to read service account credentials: {error}")))?;
        let credentials: ServiceAccountKey = serde_json::from_str(&file)
            .map_err(|error| AppError::internal(format!("Invalid service account credentials JSON: {error}")))?;
        let issued_at = chrono::Utc::now().timestamp().max(0) as usize;
        let claims = ServiceAccountClaims {
            iss: credentials.client_email.clone(),
            scope: FIRESTORE_SCOPE.to_string(),
            aud: credentials
                .token_uri
                .clone()
                .unwrap_or_else(|| GOOGLE_TOKEN_URL.to_string()),
            iat: issued_at,
            exp: issued_at + 3600,
        };
        let assertion = jsonwebtoken::encode(
            &Header::new(Algorithm::RS256),
            &claims,
            &EncodingKey::from_rsa_pem(credentials.private_key.as_bytes())
                .map_err(|error| AppError::internal(format!("Invalid service account private key: {error}")))?,
        )
        .map_err(|error| AppError::internal(format!("Failed to sign service account assertion: {error}")))?;

        let token_url = credentials
            .token_uri
            .unwrap_or_else(|| GOOGLE_TOKEN_URL.to_string());
        let response = self
            .client
            .post(token_url)
            .form(&[
                ("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer"),
                ("assertion", assertion.as_str()),
            ])
            .send()
            .await
            .map_err(|error| AppError::internal(format!("Failed to request Google access token: {error}")))?;
        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(AppError::internal(format!(
                "Google access token request failed with {status}: {body}"
            )));
        }
        let token: AccessTokenResponse = response
            .json()
            .await
            .map_err(|error| AppError::internal(format!("Invalid Google access token response: {error}")))?;
        Ok(token.access_token)
    }
}
