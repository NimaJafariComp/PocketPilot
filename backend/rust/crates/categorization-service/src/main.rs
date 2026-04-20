use axum::{
    extract::State,
    http::{HeaderMap, Method, StatusCode},
    routing::{get, post},
    Json, Router,
};
use pocketpilot_common::{
    categorization::{categorize_transactions, learn_merchant_category},
    firestore::FirestoreClient,
    ollama::OllamaClient,
    types::{CategorizeTransactionsBody, CategorizeTransactionsResponse, LearnMerchantCategoryBody},
    verify_bearer_token, AppConfig, AppError,
};
use reqwest::Client;
use serde_json::json;
use std::sync::Arc;
use tower_http::{cors::{Any, CorsLayer}, trace::TraceLayer};
use tracing::info;

#[derive(Clone)]
struct AppState {
    client: Client,
    config: AppConfig,
    firestore: FirestoreClient,
    ollama: OllamaClient,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    let config = AppConfig::from_env(8088);
    let client = Client::new();
    let state = Arc::new(AppState {
        firestore: FirestoreClient::new(client.clone(), config.clone()),
        ollama: OllamaClient::new(client.clone(), config.clone()),
        client,
        config: config.clone(),
    });

    let app = Router::new()
        .route("/health", get(health))
        .route("/categorizeTransactions", post(categorize))
        .route("/learnMerchantCategory", post(learn))
        .layer(TraceLayer::new_for_http())
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_headers(Any)
                .allow_methods([Method::GET, Method::POST]),
        )
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(("0.0.0.0", config.port))
        .await
        .expect("bind categorization service");
    info!("categorization-service listening on {}", config.port);
    axum::serve(listener, app).await.expect("serve categorization service");
}

async fn health(State(state): State<Arc<AppState>>) -> Json<serde_json::Value> {
    Json(json!({
        "ok": true,
        "service": "categorization-service",
        "ollama": state.config.ollama_base_url,
        "timestamp": chrono::Utc::now().to_rfc3339(),
    }))
}

async fn categorize(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(body): Json<CategorizeTransactionsBody>,
) -> Result<Json<CategorizeTransactionsResponse>, AppError> {
    let auth = verify_bearer_token(
        &state.client,
        &state.config,
        headers.get("authorization").and_then(|value| value.to_str().ok()),
    )
    .await?;
    if body.transactions.is_empty() {
        return Err(AppError::bad_request("transactions are required"));
    }
    let results = categorize_transactions(
        &state.firestore,
        &state.ollama,
        &auth.user_id,
        &body.transactions,
        body.categories,
    )
    .await?;
    Ok(Json(CategorizeTransactionsResponse { ok: true, results }))
}

async fn learn(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(body): Json<LearnMerchantCategoryBody>,
) -> Result<(StatusCode, Json<serde_json::Value>), AppError> {
    let auth = verify_bearer_token(
        &state.client,
        &state.config,
        headers.get("authorization").and_then(|value| value.to_str().ok()),
    )
    .await?;
    if body.merchant.trim().is_empty() || body.category.trim().is_empty() {
        return Err(AppError::bad_request("merchant and category are required"));
    }
    learn_merchant_category(&state.firestore, &auth.user_id, &body.merchant, &body.category).await?;
    Ok((StatusCode::OK, Json(json!({ "ok": true }))))
}
