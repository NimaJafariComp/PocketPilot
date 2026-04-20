use std::env;

#[derive(Clone, Debug)]
pub struct AppConfig {
    pub port: u16,
    pub project_id: String,
    pub ollama_base_url: String,
    pub ollama_chat_model: String,
    pub ollama_embed_model: String,
    pub qdrant_url: String,
    pub qdrant_collection: String,
    pub google_application_credentials: Option<String>,
    pub firebase_auth_emulator_host: Option<String>,
    pub firestore_emulator_host: Option<String>,
}

impl AppConfig {
    pub fn from_env(default_port: u16) -> Self {
        Self {
            port: env::var("PORT")
                .ok()
                .and_then(|value| value.parse::<u16>().ok())
                .unwrap_or(default_port),
            project_id: env::var("POCKETPILOT_PROJECT_ID")
                .or_else(|_| env::var("FIREBASE_PROJECT_ID"))
                .unwrap_or_else(|_| "demo-pocketpilot".to_string()),
            ollama_base_url: env::var("OLLAMA_BASE_URL")
                .unwrap_or_else(|_| "http://127.0.0.1:11434".to_string()),
            ollama_chat_model: env::var("OLLAMA_CHAT_MODEL")
                .unwrap_or_else(|_| "qwen2.5:1.5b".to_string()),
            ollama_embed_model: env::var("OLLAMA_EMBED_MODEL")
                .unwrap_or_else(|_| "nomic-embed-text:v1.5".to_string()),
            qdrant_url: env::var("QDRANT_URL")
                .unwrap_or_else(|_| "http://127.0.0.1:6333".to_string()),
            qdrant_collection: env::var("QDRANT_COLLECTION")
                .unwrap_or_else(|_| "pocketpilot_vectors_v2".to_string()),
            google_application_credentials: env::var("GOOGLE_APPLICATION_CREDENTIALS").ok(),
            firebase_auth_emulator_host: env::var("FIREBASE_AUTH_EMULATOR_HOST").ok(),
            firestore_emulator_host: env::var("FIRESTORE_EMULATOR_HOST").ok(),
        }
    }

    pub fn firestore_base_url(&self) -> String {
        if let Some(host) = &self.firestore_emulator_host {
            format!("http://{host}/v1/projects/{}/databases/(default)/documents", self.project_id)
        } else {
            format!(
                "https://firestore.googleapis.com/v1/projects/{}/databases/(default)/documents",
                self.project_id
            )
        }
    }

    pub fn is_emulator_mode(&self) -> bool {
        self.firebase_auth_emulator_host.is_some() || self.firestore_emulator_host.is_some()
    }
}
