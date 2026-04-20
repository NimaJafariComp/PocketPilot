use crate::{config::AppConfig, error::AppError, error::AppResult};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::collections::HashMap;

pub const DENSE_VECTOR_NAME: &str = "dense";
pub const SPARSE_VECTOR_NAME: &str = "sparse";
pub const RAG_VECTOR_SOURCE: &str = "rag";
const SPARSE_HASH_SPACE: u32 = 262_139;
const RRF_K: f32 = 60.0;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SparseVector {
    pub indices: Vec<u32>,
    pub values: Vec<f32>,
}

#[derive(Debug, Clone)]
pub struct SparseBoost {
    pub token: String,
    pub weight: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VectorPayloadRecord {
    pub user_id: String,
    pub kind: String,
    pub ref_id: String,
    pub text: String,
    pub tags: Vec<String>,
    pub source: String,
    pub content_hash: Option<String>,
    pub created_at: String,
    pub updated_at: Option<String>,
    #[serde(flatten)]
    pub metadata: HashMap<String, Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QdrantPoint {
    pub id: Value,
    pub score: Option<f32>,
    pub payload: Option<Value>,
}

#[derive(Clone)]
pub struct QdrantClient {
    client: Client,
    config: AppConfig,
}

impl QdrantClient {
    pub fn new(client: Client, config: AppConfig) -> Self {
        Self { client, config }
    }

    pub async fn ensure_collection(&self, dimension: usize) -> AppResult<()> {
        let url = format!("{}/collections/{}", self.config.qdrant_url, self.config.qdrant_collection);
        let response = self.client.get(&url).send().await;
        let mut should_create = false;
        match response {
            Ok(response) if response.status().is_success() => {
                let json: Value = response
                    .json()
                    .await
                    .map_err(|error| AppError::internal(format!("Invalid Qdrant collection response: {error}")))?;
                let size = json
                    .get("result")
                    .and_then(|value| value.get("config"))
                    .and_then(|value| value.get("params"))
                    .and_then(|value| value.get("vectors"))
                    .and_then(|value| value.get(DENSE_VECTOR_NAME))
                    .and_then(|value| value.get("size"))
                    .and_then(Value::as_u64)
                    .unwrap_or_default() as usize;
                let has_sparse = json
                    .get("result")
                    .and_then(|value| value.get("config"))
                    .and_then(|value| value.get("params"))
                    .and_then(|value| value.get("sparse_vectors"))
                    .and_then(|value| value.get(SPARSE_VECTOR_NAME))
                    .is_some();
                if size != dimension || !has_sparse {
                    self.client
                        .delete(&url)
                        .send()
                        .await
                        .map_err(|error| AppError::internal(format!("Failed to delete Qdrant collection: {error}")))?;
                    should_create = true;
                }
            }
            _ => should_create = true,
        }

        if should_create {
            self.client
                .put(&url)
                .json(&json!({
                    "vectors": {
                        DENSE_VECTOR_NAME: { "size": dimension, "distance": "Cosine" }
                    },
                    "sparse_vectors": {
                        SPARSE_VECTOR_NAME: {}
                    }
                }))
                .send()
                .await
                .map_err(|error| AppError::internal(format!("Failed to create Qdrant collection: {error}")))?;
        }
        Ok(())
    }

    pub async fn upsert_points(&self, points: Vec<Value>) -> AppResult<()> {
        if points.is_empty() {
            return Ok(());
        }
        self.client
            .put(format!(
                "{}/collections/{}/points?wait=true",
                self.config.qdrant_url, self.config.qdrant_collection
            ))
            .json(&json!({ "points": points }))
            .send()
            .await
            .map_err(|error| AppError::internal(format!("Qdrant upsert failed: {error}")))?;
        Ok(())
    }

    pub async fn delete_points(&self, ids: Vec<Value>) -> AppResult<()> {
        if ids.is_empty() {
            return Ok(());
        }
        self.client
            .post(format!(
                "{}/collections/{}/points/delete?wait=true",
                self.config.qdrant_url, self.config.qdrant_collection
            ))
            .json(&json!({ "points": ids }))
            .send()
            .await
            .map_err(|error| AppError::internal(format!("Qdrant delete failed: {error}")))?;
        Ok(())
    }

    pub async fn query_dense_points(
        &self,
        vector: &[f32],
        user_id: &str,
        kinds: Option<&[String]>,
        limit: usize,
        score_threshold: Option<f32>,
    ) -> AppResult<Vec<QdrantPoint>> {
        self.query_points(json!(vector), DENSE_VECTOR_NAME, user_id, kinds, limit, score_threshold)
            .await
    }

    pub async fn search_hybrid_points(
        &self,
        dense_vector: &[f32],
        sparse_vector: &SparseVector,
        user_id: &str,
        kinds: Option<&[String]>,
        limit: usize,
        prefer_sparse: bool,
    ) -> AppResult<Vec<QdrantPoint>> {
        let candidate_limit = (limit * 3).clamp(12, 60);
        let dense = self
            .query_dense_points(dense_vector, user_id, kinds, candidate_limit, None)
            .await?;
        if sparse_vector.indices.is_empty() {
            return Ok(dense.into_iter().take(limit).collect());
        }
        let sparse = self
            .query_points(json!(sparse_vector), SPARSE_VECTOR_NAME, user_id, kinds, candidate_limit, None)
            .await?;
        Ok(fuse_reciprocal_rank(dense, sparse, prefer_sparse, limit))
    }

    pub async fn scroll_user_points(&self, user_id: &str) -> AppResult<Vec<QdrantPoint>> {
        let mut points = Vec::new();
        let mut offset = Value::Null;
        loop {
            let response = self
                .client
                .post(format!(
                    "{}/collections/{}/points/scroll",
                    self.config.qdrant_url, self.config.qdrant_collection
                ))
                .json(&json!({
                    "offset": offset,
                    "limit": 256,
                    "filter": create_filter(user_id, None),
                    "with_payload": true,
                    "with_vector": false
                }))
                .send()
                .await
                .map_err(|error| AppError::internal(format!("Qdrant scroll failed: {error}")))?;
            let json: Value = response
                .json()
                .await
                .map_err(|error| AppError::internal(format!("Invalid Qdrant scroll response: {error}")))?;
            let page: Vec<QdrantPoint> = serde_json::from_value(
                json.get("result")
                    .and_then(|value| value.get("points"))
                    .cloned()
                    .unwrap_or_else(|| json!([])),
            )
            .map_err(|error| AppError::internal(format!("Invalid Qdrant points: {error}")))?;
            let next_offset = json
                .get("result")
                .and_then(|value| value.get("next_page_offset"))
                .cloned()
                .unwrap_or(Value::Null);
            let done = next_offset.is_null() || page.is_empty();
            points.extend(page);
            if done {
                break;
            }
            offset = next_offset;
        }
        Ok(points)
    }

    async fn query_points(
        &self,
        query: Value,
        using: &str,
        user_id: &str,
        kinds: Option<&[String]>,
        limit: usize,
        score_threshold: Option<f32>,
    ) -> AppResult<Vec<QdrantPoint>> {
        let response = self
            .client
            .post(format!(
                "{}/collections/{}/points/query",
                self.config.qdrant_url, self.config.qdrant_collection
            ))
            .json(&json!({
                "query": query,
                "using": using,
                "limit": limit,
                "score_threshold": score_threshold,
                "filter": create_filter(user_id, kinds),
                "with_payload": true,
                "with_vector": false
            }))
            .send()
            .await
            .map_err(|error| AppError::internal(format!("Qdrant query failed: {error}")))?;
        let json: Value = response
            .json()
            .await
            .map_err(|error| AppError::internal(format!("Invalid Qdrant query response: {error}")))?;
        serde_json::from_value(
            json.get("result")
                .and_then(|value| value.get("points"))
                .cloned()
                .unwrap_or_else(|| json!([])),
        )
        .map_err(|error| AppError::internal(format!("Invalid Qdrant matches: {error}")))
    }
}

pub fn hash_point_id(user_id: &str, document_id: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(format!("{user_id}:{document_id}"));
    hex::encode(hasher.finalize())[..32].to_string()
}

pub fn hash_content(text: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(text);
    hex::encode(hasher.finalize())
}

pub fn build_sparse_vector(text: &str, boosts: &[SparseBoost]) -> SparseVector {
    let mut index_to_values: HashMap<u32, f32> = HashMap::new();
    for (token, weight) in tokenize_for_sparse_index(text) {
        let index = fnv1a32(&token) % SPARSE_HASH_SPACE;
        *index_to_values.entry(index).or_default() += weight;
    }
    for boost in boosts {
        let normalized = boost.token.trim().to_lowercase();
        if normalized.is_empty() || boost.weight <= 0.0 {
            continue;
        }
        let index = fnv1a32(&normalized) % SPARSE_HASH_SPACE;
        *index_to_values.entry(index).or_default() += boost.weight;
    }
    let mut ordered: Vec<(u32, f32)> = index_to_values.into_iter().collect();
    ordered.sort_by_key(|(index, _)| *index);
    SparseVector {
        indices: ordered.iter().map(|(index, _)| *index).collect(),
        values: ordered.iter().map(|(_, value)| (*value * 10_000.0).round() / 10_000.0).collect(),
    }
}

fn create_filter(user_id: &str, kinds: Option<&[String]>) -> Value {
    let mut must = vec![
        json!({ "key": "userId", "match": { "value": user_id } }),
        json!({ "key": "source", "match": { "value": RAG_VECTOR_SOURCE } }),
    ];
    if let Some(kinds) = kinds {
        if !kinds.is_empty() {
            must.push(json!({ "key": "kind", "match": { "any": kinds } }));
        }
    }
    json!({ "must": must })
}

fn tokenize_for_sparse_index(text: &str) -> Vec<(String, f32)> {
    let lowered = text.to_lowercase();
    let mut entries: HashMap<String, f32> = HashMap::new();
    let add_token = |entries: &mut HashMap<String, f32>, token: String, weight: f32| {
        if token.is_empty() {
            return;
        }
        *entries.entry(token).or_default() += weight;
    };

    let date_regex = regex::Regex::new(r"\b\d{4}-\d{2}(?:-\d{2})?\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}\b").unwrap();
    for capture in date_regex.find_iter(&lowered) {
        add_token(&mut entries, capture.as_str().to_string(), 3.0);
    }

    let money_regex = regex::Regex::new(r"\$?\d+(?:\.\d+)?").unwrap();
    for capture in money_regex.find_iter(&lowered) {
        let raw = capture.as_str();
        let normalized = raw.trim_start_matches('$').to_string();
        let weight = if normalized.contains('.') || normalized.len() >= 4 || raw.contains('$') {
            2.5
        } else {
            1.2
        };
        add_token(&mut entries, normalized, weight);
        if raw.contains('$') {
            add_token(&mut entries, raw.to_string(), weight);
        }
    }

    let word_regex = regex::Regex::new(r"[a-z0-9][a-z0-9._:/-]{1,}").unwrap();
    for capture in word_regex.find_iter(&lowered) {
        let raw = capture.as_str();
        if raw.len() < 2 {
            continue;
        }
        let has_digit = raw.chars().any(|char| char.is_ascii_digit());
        add_token(&mut entries, raw.to_string(), if has_digit { 1.8 } else { 1.0 });
    }

    entries.into_iter().collect()
}

fn fnv1a32(input: &str) -> u32 {
    let mut hash: u32 = 0x811c9dc5;
    for byte in input.bytes() {
        hash ^= byte as u32;
        hash = hash.wrapping_mul(0x0100_0193);
    }
    hash
}

fn fuse_reciprocal_rank(
    dense: Vec<QdrantPoint>,
    sparse: Vec<QdrantPoint>,
    prefer_sparse: bool,
    limit: usize,
) -> Vec<QdrantPoint> {
    let dense_weight = if prefer_sparse { 0.4 } else { 0.6 };
    let sparse_weight = if prefer_sparse { 0.6 } else { 0.4 };
    let mut merged: HashMap<String, (QdrantPoint, f32)> = HashMap::new();
    for (index, point) in dense.into_iter().enumerate() {
        let key = point.id.to_string();
        let score = dense_weight / (RRF_K + index as f32 + 1.0);
        merged
            .entry(key)
            .and_modify(|(_, fused)| *fused += score)
            .or_insert((point, score));
    }
    for (index, point) in sparse.into_iter().enumerate() {
        let key = point.id.to_string();
        let score = sparse_weight / (RRF_K + index as f32 + 1.0);
        merged
            .entry(key)
            .and_modify(|(existing, fused)| {
                if existing.payload.is_none() {
                    existing.payload = point.payload.clone();
                }
                *fused += score;
            })
            .or_insert((point, score));
    }
    let mut values: Vec<(QdrantPoint, f32)> = merged.into_values().collect();
    values.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    values
        .into_iter()
        .take(limit)
        .map(|(mut point, score)| {
            point.score = Some(score);
            point
        })
        .collect()
}
