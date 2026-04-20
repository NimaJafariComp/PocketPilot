use serde::{Deserialize, Serialize};
use std::collections::HashMap;

pub type EmbeddingKind = String;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CategorizationRequestItem {
    pub merchant: String,
    pub amount: f64,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CategorizeTransactionsBody {
    pub transactions: Vec<CategorizationRequestItem>,
    pub categories: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CategorizationResult {
    pub category: String,
    pub category_source: String,
    pub category_confidence: f64,
    pub category_needs_review: bool,
    pub normalized_merchant: String,
    pub reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategorizeTransactionsResponse {
    pub ok: bool,
    pub results: Vec<CategorizationResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LearnMerchantCategoryBody {
    pub merchant: String,
    pub category: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RagDocumentInput {
    pub id: String,
    pub kind: EmbeddingKind,
    pub text: String,
    pub tags: Option<Vec<String>>,
    pub metadata: Option<HashMap<String, serde_json::Value>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncRagIndexBody {
    pub documents: Option<Vec<RagDocumentInput>>,
    pub removed_ids: Option<Vec<String>>,
    pub batch_index: Option<u32>,
    pub batch_count: Option<u32>,
    pub total_operations: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RagMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RagChatBody {
    pub query: String,
    pub messages: Option<Vec<RagMessage>>,
    pub top_k: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpsertVectorBody {
    pub id: Option<String>,
    pub vector: Vec<f32>,
    pub payload: UpsertVectorPayloadBody,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpsertVectorPayloadBody {
    pub kind: String,
    pub ref_id: String,
    pub text: String,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryVectorsBody {
    pub vector: Vec<f32>,
    pub limit: Option<usize>,
    pub kinds: Option<Vec<String>>,
    pub score_threshold: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthResponse {
    pub ok: bool,
    pub service: String,
    pub qdrant: String,
    pub ollama: String,
    #[serde(rename = "ollamaModels")]
    pub ollama_models: HashMap<String, String>,
    pub timestamp: String,
}
