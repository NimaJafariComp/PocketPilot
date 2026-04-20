use axum::{
    extract::State,
    http::{HeaderMap, Method},
    routing::{get, post},
    Json, Router,
};
use pocketpilot_common::{
    ollama::OllamaClient,
    qdrant::{build_sparse_vector, hash_content, hash_point_id, QdrantClient, RAG_VECTOR_SOURCE},
    rag::{rag_chat, sanitize_metadata, sync_rag_documents},
    types::{HealthResponse, QueryVectorsBody, RagChatBody, SyncRagIndexBody, UpsertVectorBody},
    verify_bearer_token, AppConfig, AppError,
};
use reqwest::Client;
use serde_json::json;
use std::{collections::HashMap, sync::Arc};
use tower_http::{cors::{Any, CorsLayer}, trace::TraceLayer};
use tracing::info;

#[derive(Clone)]
struct AppState {
    client: Client,
    config: AppConfig,
    qdrant: QdrantClient,
    ollama: OllamaClient,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    let config = AppConfig::from_env(8089);
    let client = Client::new();
    let state = Arc::new(AppState {
        qdrant: QdrantClient::new(client.clone(), config.clone()),
        ollama: OllamaClient::new(client.clone(), config.clone()),
        client,
        config: config.clone(),
    });

    let app = Router::new()
        .route("/health", get(health))
        .route("/syncRagIndex", post(sync_index))
        .route("/ragChat", post(chat))
        .route("/upsertVector", post(upsert_vector))
        .route("/queryVectors", post(query_vectors))
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
        .expect("bind rag service");
    info!("rag-service listening on {}", config.port);
    axum::serve(listener, app).await.expect("serve rag service");
}

async fn health(State(state): State<Arc<AppState>>) -> Json<HealthResponse> {
    Json(HealthResponse {
        ok: true,
        service: "rag-service".to_string(),
        qdrant: state.config.qdrant_url.clone(),
        ollama: state.config.ollama_base_url.clone(),
        ollama_models: HashMap::from([
            ("chat".to_string(), state.config.ollama_chat_model.clone()),
            ("embed".to_string(), state.config.ollama_embed_model.clone()),
        ]),
        timestamp: chrono::Utc::now().to_rfc3339(),
    })
}

async fn sync_index(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(body): Json<SyncRagIndexBody>,
) -> Result<Json<serde_json::Value>, AppError> {
    let auth = verify_bearer_token(
        &state.client,
        &state.config,
        headers.get("authorization").and_then(|value| value.to_str().ok()),
    )
    .await?;
    let documents = body
        .documents
        .unwrap_or_default()
        .into_iter()
        .filter(|document| !document.id.is_empty() && !document.text.is_empty())
        .collect::<Vec<_>>();
    let removed_ids = body
        .removed_ids
        .unwrap_or_default()
        .into_iter()
        .filter(|value| !value.is_empty())
        .collect::<Vec<_>>();
    let batch_index = body.batch_index.unwrap_or(1);
    let batch_count = body.batch_count.unwrap_or(1);
    let total = body
        .total_operations
        .unwrap_or((documents.len() + removed_ids.len()) as u32);
    let stats = sync_rag_documents(
        &state.qdrant,
        &state.ollama,
        &auth.user_id,
        &documents,
        &removed_ids,
    )
    .await?;
    Ok(Json(json!({
        "ok": true,
        "indexed": stats.indexed,
        "skipped": stats.skipped,
        "removed": stats.removed,
        "model": state.config.ollama_embed_model,
        "processed": stats.indexed + stats.skipped + stats.removed,
        "total": total,
        "batchIndex": batch_index,
        "batchCount": batch_count,
        "done": batch_index >= batch_count
    })))
}

async fn chat(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(body): Json<RagChatBody>,
) -> Result<Json<serde_json::Value>, AppError> {
    let auth = verify_bearer_token(
        &state.client,
        &state.config,
        headers.get("authorization").and_then(|value| value.to_str().ok()),
    )
    .await?;
    let query = body.query.trim().to_string();
    if query.is_empty() {
        return Err(AppError::bad_request("query is required"));
    }
    let (answer, retrieved) = rag_chat(
        &state.config,
        &state.qdrant,
        &state.ollama,
        &auth.user_id,
        &query,
        &body.messages.unwrap_or_default(),
        body.top_k.unwrap_or(12),
    )
    .await?;
    Ok(Json(json!({
        "ok": true,
        "answer": answer,
        "retrieved": retrieved,
        "model": state.config.ollama_chat_model
    })))
}

async fn upsert_vector(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(body): Json<UpsertVectorBody>,
) -> Result<Json<serde_json::Value>, AppError> {
    let auth = verify_bearer_token(
        &state.client,
        &state.config,
        headers.get("authorization").and_then(|value| value.to_str().ok()),
    )
    .await?;
    if body.vector.is_empty() {
        return Err(AppError::bad_request("vector is required"));
    }
    if body.payload.kind.trim().is_empty()
        || body.payload.ref_id.trim().is_empty()
        || body.payload.text.trim().is_empty()
    {
        return Err(AppError::bad_request(
            "payload.kind, payload.refId and payload.text are required",
        ));
    }
    state.qdrant.ensure_collection(body.vector.len()).await?;
    let now = chrono::Utc::now().to_rfc3339();
    let point_id = body
        .id
        .unwrap_or_else(|| hash_point_id(&auth.user_id, &format!("{}:{}", body.payload.kind, body.payload.ref_id)));
    state
        .qdrant
        .upsert_points(vec![json!({
            "id": point_id,
            "vector": {
                "dense": body.vector,
                "sparse": build_sparse_vector(&body.payload.text, &[])
            },
            "payload": {
                "userId": auth.user_id,
                "kind": body.payload.kind,
                "refId": body.payload.ref_id,
                "text": body.payload.text,
                "tags": body.payload.tags.unwrap_or_default(),
                "source": RAG_VECTOR_SOURCE,
                "contentHash": hash_content(&body.payload.text),
                "createdAt": now,
                "updatedAt": now
            }
        })])
        .await?;
    Ok(Json(json!({ "ok": true, "id": point_id })))
}

async fn query_vectors(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(body): Json<QueryVectorsBody>,
) -> Result<Json<serde_json::Value>, AppError> {
    let auth = verify_bearer_token(
        &state.client,
        &state.config,
        headers.get("authorization").and_then(|value| value.to_str().ok()),
    )
    .await?;
    if body.vector.is_empty() {
        return Err(AppError::bad_request("vector is required"));
    }
    state.qdrant.ensure_collection(body.vector.len()).await?;
    let matches = state
        .qdrant
        .query_dense_points(
            &body.vector,
            &auth.user_id,
            body.kinds.as_deref(),
            body.limit.unwrap_or(8).min(20),
            body.score_threshold,
        )
        .await?;
    let _ = sanitize_metadata;
    Ok(Json(json!({ "ok": true, "matches": matches })))
}
