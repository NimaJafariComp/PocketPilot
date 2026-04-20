use crate::{
    config::AppConfig,
    error::AppResult,
    ollama::OllamaClient,
    qdrant::{
        build_sparse_vector, hash_content, hash_point_id, QdrantClient, SparseBoost, RAG_VECTOR_SOURCE,
    },
    types::{RagDocumentInput, RagMessage},
};
use chrono::Utc;
use serde_json::{json, Value};
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct SyncStats {
    pub indexed: usize,
    pub skipped: usize,
    pub removed: usize,
}

pub async fn sync_rag_documents(
    qdrant: &QdrantClient,
    ollama: &OllamaClient,
    user_id: &str,
    documents: &[RagDocumentInput],
    removed_ref_ids: &[String],
) -> AppResult<SyncStats> {
    let existing_points = qdrant.scroll_user_points(user_id).await.unwrap_or_default();
    let mut existing_by_ref_id: HashMap<String, (Value, String)> = HashMap::new();
    for point in existing_points {
        if let Some(payload) = point.payload.as_ref() {
            if let Some(ref_id) = payload.get("refId").and_then(Value::as_str) {
                existing_by_ref_id.insert(
                    ref_id.to_string(),
                    (
                        point.id.clone(),
                        payload
                            .get("contentHash")
                            .and_then(Value::as_str)
                            .unwrap_or_default()
                            .to_string(),
                    ),
                );
            }
        }
    }

    let mut changed_documents = Vec::new();
    let mut skipped = 0usize;
    for document in documents {
        let content_hash = hash_content(&document.text);
        if let Some((_, existing_hash)) = existing_by_ref_id.get(&document.id) {
            if existing_hash == &content_hash {
                skipped += 1;
                continue;
            }
        }
        changed_documents.push((document.clone(), content_hash));
    }

    for batch in changed_documents.chunks(25) {
        let mut embeddings = Vec::with_capacity(batch.len());
        for (document, _) in batch {
            embeddings.push(ollama.embed_text(&document.text).await?);
        }
        if let Some(first) = embeddings.first() {
            qdrant.ensure_collection(first.len()).await?;
        }
        let now = Utc::now().to_rfc3339();
        let points = batch
            .iter()
            .enumerate()
            .map(|(index, (document, content_hash))| {
                let mut payload = serde_json::Map::new();
                payload.insert("userId".to_string(), json!(user_id));
                payload.insert("kind".to_string(), json!(document.kind));
                payload.insert("refId".to_string(), json!(document.id));
                payload.insert("text".to_string(), json!(document.text));
                payload.insert(
                    "tags".to_string(),
                    json!(document.tags.clone().unwrap_or_default()),
                );
                payload.insert("source".to_string(), json!(RAG_VECTOR_SOURCE));
                payload.insert("contentHash".to_string(), json!(content_hash));
                payload.insert("createdAt".to_string(), json!(now));
                payload.insert("updatedAt".to_string(), json!(now));
                for (key, value) in sanitize_metadata(&document.metadata) {
                    payload.insert(key, value);
                }
                json!({
                    "id": hash_point_id(user_id, &document.id),
                    "vector": {
                        "dense": embeddings[index],
                        "sparse": build_sparse_vector(&document.text, &build_sparse_boosts(document))
                    },
                    "payload": payload
                })
            })
            .collect::<Vec<_>>();
        qdrant.upsert_points(points).await?;
    }

    let removed_ids = removed_ref_ids
        .iter()
        .filter_map(|ref_id| existing_by_ref_id.get(ref_id).map(|(point_id, _)| point_id.clone()))
        .collect::<Vec<_>>();
    qdrant.delete_points(removed_ids.clone()).await?;

    Ok(SyncStats {
        indexed: changed_documents.len(),
        skipped,
        removed: removed_ids.len(),
    })
}

pub async fn rag_chat(
    config: &AppConfig,
    qdrant: &QdrantClient,
    ollama: &OllamaClient,
    user_id: &str,
    query: &str,
    messages: &[RagMessage],
    top_k: usize,
) -> AppResult<(String, usize)> {
    if let Some(answer) = classify_conversational_shortcut(query) {
        return Ok((answer.to_string(), 0));
    }

    let embedding = ollama.embed_text(query).await?;
    qdrant.ensure_collection(embedding.len()).await?;
    let sparse = build_sparse_vector(query, &[]);
    let matches = qdrant
        .search_hybrid_points(
            &embedding,
            &sparse,
            user_id,
            None,
            top_k.min(32),
            has_precision_signals(query),
        )
        .await?;

    let context_blocks = matches
        .iter()
        .enumerate()
        .map(|(index, point)| {
            let payload = point.payload.as_ref().unwrap_or(&Value::Null);
            format!(
                "Context {} [{}:{}]\n{}",
                index + 1,
                payload.get("kind").and_then(Value::as_str).unwrap_or("unknown"),
                payload.get("refId").and_then(Value::as_str).unwrap_or("unknown"),
                payload.get("text").and_then(Value::as_str).unwrap_or_default()
            )
        })
        .collect::<Vec<_>>()
        .join("\n\n");

    let history = messages
        .iter()
        .rev()
        .take(6)
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .map(|message| format!("{}: {}", message.role.to_uppercase(), message.content))
        .collect::<Vec<_>>()
        .join("\n");

    let prompt = [
        "Use this user-specific financial context to answer the question.",
        "Hybrid retrieval already blended semantic matches with exact keyword matches.",
        "If the answer cannot be derived from context, clearly say that.",
        "Keep answers concise and practical.",
        "",
        "Retrieved Context:",
        if context_blocks.is_empty() { "No indexed context found." } else { &context_blocks },
        "",
        "Recent Conversation:",
        if history.is_empty() { "None" } else { &history },
        "",
        &format!("User Question: {query}"),
    ]
    .join("\n");

    let answer = ollama.chat_text(&prompt).await?;
    let _ = config;
    Ok((answer, matches.len()))
}

pub fn sanitize_metadata(
    metadata: &Option<HashMap<String, Value>>,
) -> HashMap<String, Value> {
    metadata
        .clone()
        .unwrap_or_default()
        .into_iter()
        .filter(|(_, value)| !value.is_null())
        .collect()
}

fn build_sparse_boosts(document: &RagDocumentInput) -> Vec<SparseBoost> {
    let mut boosts = Vec::new();
    let metadata = document.metadata.clone().unwrap_or_default();
    if document.kind == "transaction" {
        add_sparse_boost(&mut boosts, metadata.get("transactionId"), 12.0);
        add_sparse_boost(&mut boosts, metadata.get("merchantMatchKey"), 10.0);
        add_sparse_boost(&mut boosts, metadata.get("normalizedMerchant"), 8.0);
        add_sparse_boost(&mut boosts, metadata.get("merchant"), 7.0);
        add_sparse_boost(&mut boosts, metadata.get("merchantLower"), 7.0);
        add_sparse_boost(&mut boosts, metadata.get("transactionDate"), 6.0);
        add_sparse_boost(&mut boosts, metadata.get("transactionMonthName"), 4.0);
        add_sparse_boost(&mut boosts, metadata.get("transactionYear"), 4.0);
        add_sparse_boost(&mut boosts, metadata.get("amountAbs"), 4.0);
        add_sparse_boost(&mut boosts, metadata.get("category"), 2.0);
    }
    boosts
}

fn add_sparse_boost(boosts: &mut Vec<SparseBoost>, value: Option<&Value>, weight: f32) {
    let token = match value {
        Some(Value::String(string)) if !string.trim().is_empty() => string.trim().to_lowercase(),
        Some(Value::Number(number)) => number.to_string(),
        _ => return,
    };
    boosts.push(SparseBoost { token, weight });
}

fn classify_conversational_shortcut(query: &str) -> Option<&'static str> {
    let normalized = query.trim().to_lowercase();
    match normalized.as_str() {
        "hi" | "hello" | "hey" | "good morning" | "good afternoon" | "good evening" => {
            Some("Hello! I'm ready to help with your spending, budgets, goals, and transaction questions.")
        }
        "thanks" | "thank you" | "thx" => {
            Some("You're welcome. I'm here whenever you want to dig into your finances.")
        }
        _ => None,
    }
}

fn has_precision_signals(query: &str) -> bool {
    let q = query.to_lowercase();
    regex::Regex::new(r"\b\d{4}-\d{2}(?:-\d{2})?\b|\$\s*\d|\b\d+\.\d+\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}\b")
        .unwrap()
        .is_match(&q)
}
