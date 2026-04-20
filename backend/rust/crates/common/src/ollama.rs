use crate::{config::AppConfig, error::AppError, error::AppResult};
use reqwest::Client;
use serde_json::{json, Value};

#[derive(Clone)]
pub struct OllamaClient {
    client: Client,
    config: AppConfig,
}

impl OllamaClient {
    pub fn new(client: Client, config: AppConfig) -> Self {
        Self { client, config }
    }

    pub async fn embed_text(&self, text: &str) -> AppResult<Vec<f32>> {
        let response = self
            .client
            .post(format!("{}/api/embed", self.config.ollama_base_url))
            .json(&json!({
                "model": self.config.ollama_embed_model,
                "input": text,
            }))
            .send()
            .await
            .map_err(|error| AppError::internal(format!("Ollama embed request failed: {error}")))?;
        let status = response.status();
        let json: Value = response
            .json()
            .await
            .map_err(|error| AppError::internal(format!("Invalid Ollama embed response: {error}")))?;

        if status.is_success() {
            if let Some(embedding) = json.get("embedding").and_then(parse_embedding) {
                return Ok(embedding);
            }
            if let Some(embeddings) = json.get("embeddings").and_then(Value::as_array) {
                if let Some(embedding) = embeddings.first().and_then(parse_embedding) {
                    return Ok(embedding);
                }
            }
        }

        let legacy = self
            .client
            .post(format!("{}/api/embeddings", self.config.ollama_base_url))
            .json(&json!({
                "model": self.config.ollama_embed_model,
                "prompt": text,
            }))
            .send()
            .await
            .map_err(|error| AppError::internal(format!("Ollama legacy embed failed: {error}")))?;
        let legacy_json: Value = legacy
            .json()
            .await
            .map_err(|error| AppError::internal(format!("Invalid Ollama legacy embed response: {error}")))?;
        legacy_json
            .get("embedding")
            .and_then(parse_embedding)
            .ok_or_else(|| AppError::internal("Ollama embed returned no embedding"))
    }

    pub async fn chat_json(&self, system_prompt: &str, user_payload: Value) -> AppResult<String> {
        let response = self
            .client
            .post(format!("{}/api/chat", self.config.ollama_base_url))
            .json(&json!({
                "model": self.config.ollama_chat_model,
                "stream": false,
                "messages": [
                    { "role": "system", "content": system_prompt },
                    { "role": "user", "content": user_payload.to_string() }
                ]
            }))
            .send()
            .await
            .map_err(|error| AppError::internal(format!("Ollama chat request failed: {error}")))?;
        let json: Value = response
            .json()
            .await
            .map_err(|error| AppError::internal(format!("Invalid Ollama chat response: {error}")))?;
        json.get("message")
            .and_then(|message| message.get("content"))
            .and_then(Value::as_str)
            .map(ToOwned::to_owned)
            .ok_or_else(|| {
                AppError::internal(
                    json.get("error")
                        .and_then(Value::as_str)
                        .unwrap_or("Ollama chat returned no content"),
                )
            })
    }

    pub async fn chat_text(&self, prompt: &str) -> AppResult<String> {
        let response = self
            .client
            .post(format!("{}/api/chat", self.config.ollama_base_url))
            .json(&json!({
                "model": self.config.ollama_chat_model,
                "stream": false,
                "messages": [
                    {
                        "role": "system",
                        "content": "You are PocketPilot's financial assistant. Use only provided context plus the recent conversation. If data is missing, say exactly what is missing."
                    },
                    { "role": "user", "content": prompt }
                ]
            }))
            .send()
            .await
            .map_err(|error| AppError::internal(format!("Ollama chat request failed: {error}")))?;
        let json: Value = response
            .json()
            .await
            .map_err(|error| AppError::internal(format!("Invalid Ollama chat response: {error}")))?;
        json.get("message")
            .and_then(|message| message.get("content"))
            .and_then(Value::as_str)
            .map(ToOwned::to_owned)
            .ok_or_else(|| {
                AppError::internal(
                    json.get("error")
                        .and_then(Value::as_str)
                        .unwrap_or("Ollama chat returned no content"),
                )
            })
    }
}

fn parse_embedding(value: &Value) -> Option<Vec<f32>> {
    value
        .as_array()
        .map(|items| items.iter().filter_map(Value::as_f64).map(|value| value as f32).collect::<Vec<_>>())
        .filter(|embedding| !embedding.is_empty())
}
