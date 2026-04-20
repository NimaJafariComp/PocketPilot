use crate::{
    error::AppResult,
    firestore::FirestoreClient,
    ollama::OllamaClient,
    types::{CategorizationRequestItem, CategorizationResult},
};
use regex::Regex;
use serde_json::json;
use std::collections::{HashMap, HashSet};

const DEFAULT_CATEGORIES: &[&str] = &[
    "Uncategorized",
    "Groceries",
    "Dining",
    "Transportation",
    "Entertainment",
    "Shopping",
    "Bills",
    "Health",
    "Income",
];

struct Rule<'a> {
    category: &'a str,
    patterns: &'a [&'a str],
    reason: &'a str,
}

const NOISE_TOKENS: &[&str] = &[
    "ach", "auth", "card", "check", "checkcard", "com", "dbt", "debit", "inc", "llc", "online",
    "payment", "pos", "purchase", "sq", "store", "tap", "visa", "withdrawal",
];

pub async fn categorize_transactions(
    firestore: &FirestoreClient,
    ollama: &OllamaClient,
    user_id: &str,
    transactions: &[CategorizationRequestItem],
    categories: Option<Vec<String>>,
) -> AppResult<Vec<CategorizationResult>> {
    let categories = unique_categories(categories);
    let normalized: Vec<String> = transactions
        .iter()
        .map(|transaction| normalize_merchant(&transaction.merchant))
        .collect();

    let mut merchant_memories = HashMap::new();
    for merchant in normalized.iter().cloned().collect::<HashSet<_>>() {
        if let Some(memory) = firestore.get_merchant_memory(user_id, &merchant).await? {
            merchant_memories.insert(merchant, memory);
        }
    }

    let mut results = Vec::with_capacity(transactions.len());
    for (index, transaction) in transactions.iter().enumerate() {
        let normalized_merchant = normalized[index].clone();
        if let Some(memory) = merchant_memories.get(&normalized_merchant) {
            if categories.contains(&memory.category) {
                results.push(build_result(
                    normalized_merchant,
                    memory.category.clone(),
                    "auto-history",
                    clamp_confidence((0.82 + memory.count as f64 * 0.03).min(0.98)),
                    Some("Matched prior user categorization history".to_string()),
                ));
                continue;
            }
        }

        if let Some(rule_result) = apply_rule(transaction, &normalized_merchant, &categories) {
            results.push(rule_result);
            continue;
        }

        if !is_meaningful_merchant(&normalized_merchant, transaction.notes.as_deref()) {
            results.push(build_result(
                normalized_merchant,
                fallback_category(&categories),
                "auto-ai",
                0.1,
                Some("Merchant text did not provide enough semantic signal".to_string()),
            ));
            continue;
        }

        let ai_result = ask_ai_for_category(ollama, transaction, &normalized_merchant, &categories).await.ok().flatten();
        if let Some(ai_result) = ai_result {
            if ai_result.category != "Uncategorized" && ai_result.category_confidence >= 0.78 {
                results.push(ai_result);
                continue;
            }
        }

        results.push(build_result(
            normalized_merchant,
            fallback_category(&categories),
            "auto-ai",
            0.2,
            Some("No confident rule, history, or AI match".to_string()),
        ));
    }
    Ok(results)
}

pub async fn learn_merchant_category(
    firestore: &FirestoreClient,
    user_id: &str,
    merchant: &str,
    category: &str,
) -> AppResult<()> {
    let normalized = normalize_merchant(merchant);
    if normalized.is_empty() {
        return Ok(());
    }
    firestore
        .upsert_merchant_memory(user_id, &normalized, category)
        .await
}

fn unique_categories(categories: Option<Vec<String>>) -> Vec<String> {
    let source: Vec<String> = categories.unwrap_or_else(|| DEFAULT_CATEGORIES.iter().map(|value| value.to_string()).collect());
    let mut seen = HashSet::new();
    source
        .into_iter()
        .filter(|category| !category.is_empty() && seen.insert(category.clone()))
        .collect()
}

fn fallback_category(categories: &[String]) -> String {
    if categories.iter().any(|category| category == "Uncategorized") {
        "Uncategorized".to_string()
    } else {
        categories.first().cloned().unwrap_or_else(|| "Uncategorized".to_string())
    }
}

pub fn normalize_merchant(merchant: &str) -> String {
    let noise_tokens: HashSet<&str> = NOISE_TOKENS.iter().copied().collect();
    let digits = Regex::new(r"\b\d{2,}\b").unwrap();
    let normalized = digits
        .replace_all(
            &merchant
                .to_lowercase()
                .replace(['#', '*'], " ")
                .chars()
                .map(|char| if char.is_ascii_lowercase() || char.is_ascii_whitespace() { char } else { ' ' })
                .collect::<String>(),
            " ",
        )
        .to_string();
    let tokens = normalized
        .split_whitespace()
        .filter(|token| token.len() > 1 && !noise_tokens.contains(*token))
        .take(5)
        .collect::<Vec<_>>();
    let joined = tokens.join(" ").trim().to_string();
    if joined.is_empty() {
        merchant.trim().to_lowercase()
    } else {
        joined
    }
}

fn is_meaningful_merchant(normalized_merchant: &str, notes: Option<&str>) -> bool {
    let compact = normalized_merchant.replace(' ', "");
    let note_has_signal = notes.map(|notes| Regex::new(r"[a-zA-Z]{4,}").unwrap().is_match(notes)).unwrap_or(false);
    if compact.len() < 4 && !note_has_signal {
        return false;
    }
    let has_letters = Regex::new(r"[a-z]{3,}").unwrap().is_match(normalized_merchant);
    let has_vowels = compact.chars().any(|char| matches!(char, 'a' | 'e' | 'i' | 'o' | 'u'));
    let looks_like_code = Regex::new(r"^[a-z0-9]{3,10}$").unwrap().is_match(&compact) && !has_vowels;
    if !has_letters && !note_has_signal {
        return false;
    }
    if looks_like_code && !note_has_signal {
        return false;
    }
    true
}

fn build_result(
    normalized_merchant: String,
    category: String,
    category_source: &str,
    category_confidence: f64,
    reason: Option<String>,
) -> CategorizationResult {
    CategorizationResult {
        category_needs_review: category == "Uncategorized" || category_confidence < 0.75,
        category,
        category_source: category_source.to_string(),
        category_confidence,
        normalized_merchant,
        reason,
    }
}

fn clamp_confidence(value: f64) -> f64 {
    (value.clamp(0.0, 1.0) * 100.0).round() / 100.0
}

fn apply_rule(
    input: &CategorizationRequestItem,
    normalized_merchant: &str,
    categories: &[String],
) -> Option<CategorizationResult> {
    let search_text = format!(
        "{} {}",
        normalized_merchant,
        input.notes.clone().unwrap_or_default().to_lowercase()
    );
    let rules = [
        Rule {
            category: "Income",
            patterns: &["salary", "payroll", "direct deposit", "freelance", "paycheck"],
            reason: "Matched income keywords",
        },
        Rule {
            category: "Groceries",
            patterns: &["whole foods", "trader joe", "costco", "safeway", "kroger", "aldi", "grocery"],
            reason: "Matched grocery merchant keywords",
        },
        Rule {
            category: "Dining",
            patterns: &["subway", "chipotle", "starbucks", "panera", "mcdonald", "restaurant", "cafe", "coffee", "pizza", "taco"],
            reason: "Matched dining merchant keywords",
        },
        Rule {
            category: "Transportation",
            patterns: &["shell", "chevron", "exxon", "uber", "lyft", "gas", "fuel", "parking", "transit"],
            reason: "Matched transportation merchant keywords",
        },
        Rule {
            category: "Entertainment",
            patterns: &[
                "netflix",
                "spotify",
                "hulu",
                "disney",
                "amc",
                "steam",
                "playstation",
                "xbox",
                "movie",
                "theater",
                "concert",
                "ticketmaster",
                "patreon",
                "audible",
                "kindle unlimited",
                "youtube premium",
            ],
            reason: "Matched entertainment or digital media subscription keywords",
        },
        Rule {
            category: "Shopping",
            patterns: &["amazon", "target", "walmart", "best buy", "apple store", "home depot", "ikea", "etsy"],
            reason: "Matched retail shopping merchant keywords",
        },
        Rule {
            category: "Bills",
            patterns: &[
                "utility",
                "electric",
                "water bill",
                "internet",
                "phone bill",
                "insurance",
                "rent",
                "mortgage",
                "membership fee",
                "annual fee",
                "monthly fee",
            ],
            reason: "Matched recurring bill or fee keywords",
        },
        Rule {
            category: "Health",
            patterns: &[
                "cvs",
                "walgreens",
                "pharmacy",
                "hospital",
                "clinic",
                "dental",
                "medical",
                "urgent care",
                "gym",
                "fitness",
                "wellness",
                "yoga",
                "pilates",
                "cycle",
                "spin",
                "barre",
                "crossfit",
                "therapy",
                "therapist",
                "counseling",
                "massage",
                "spa",
                "chiropr",
                "physical therapy",
                "med spa",
                "meditation",
                "sauna",
                "membership",
                "monthly membership",
                "planet fitness",
                "equinox",
                "orange theory",
                "orangetheory",
                "soulcycle",
                "corepower",
                "24 hour fitness",
                "la fitness",
            ],
            reason: "Matched health, wellness, or fitness membership keywords",
        },
    ];
    for rule in rules {
        if !categories.iter().any(|candidate| candidate == rule.category) {
            continue;
        }
        if rule.patterns.iter().any(|pattern| search_text.contains(pattern)) {
            return Some(build_result(
                normalized_merchant.to_string(),
                rule.category.to_string(),
                "auto-rule",
                0.9,
                Some(rule.reason.to_string()),
            ));
        }
    }
    None
}

fn refine_ai_result(
    normalized_merchant: &str,
    input: &CategorizationRequestItem,
    result: CategorizationResult,
    categories: &[String],
) -> CategorizationResult {
    let search_text = format!(
        "{} {}",
        normalized_merchant,
        input.notes.clone().unwrap_or_default().to_lowercase()
    );
    let health_signals = [
        "gym",
        "fitness",
        "wellness",
        "yoga",
        "pilates",
        "cycle",
        "spin",
        "barre",
        "crossfit",
        "therapy",
        "therapist",
        "massage",
        "spa",
        "chiropr",
        "physical therapy",
        "meditation",
        "workout",
        "class pass",
        "classpass",
        "membership",
        "soulcycle",
        "orangetheory",
        "planet fitness",
        "equinox",
    ];
    let entertainment_signals = [
        "subscription",
        "streaming",
        "premium",
        "music",
        "video",
        "podcast",
        "audible",
        "patreon",
        "netflix",
        "spotify",
        "hulu",
        "disney",
        "youtube premium",
    ];

    if result.category == "Shopping"
        && categories.iter().any(|category| category == "Health")
        && health_signals.iter().any(|pattern| search_text.contains(pattern))
    {
        return build_result(
            normalized_merchant.to_string(),
            "Health".to_string(),
            "auto-ai",
            clamp_confidence(result.category_confidence.max(0.84)),
            Some("Adjusted AI result toward Health based on fitness or wellness signals".to_string()),
        );
    }

    if (result.category == "Shopping" || result.category == "Bills")
        && categories.iter().any(|category| category == "Entertainment")
        && entertainment_signals
            .iter()
            .any(|pattern| search_text.contains(pattern))
    {
        return build_result(
            normalized_merchant.to_string(),
            "Entertainment".to_string(),
            "auto-ai",
            clamp_confidence(result.category_confidence.max(0.82)),
            Some("Adjusted AI result toward Entertainment based on subscription or media signals".to_string()),
        );
    }

    result
}

async fn ask_ai_for_category(
    ollama: &OllamaClient,
    input: &CategorizationRequestItem,
    normalized_merchant: &str,
    categories: &[String],
) -> AppResult<Option<CategorizationResult>> {
    let content = ollama
        .chat_json(
            "You categorize personal finance transactions.
Return only JSON with keys category, confidence, reason.
Category must be exactly one of the provided categories.
Confidence must be between 0 and 1.
Prefer Health for gyms, fitness studios, yoga, pilates, therapy, massage, wellness services, pharmacies, clinics, and health memberships.
Prefer Entertainment for streaming, digital media, gaming, concerts, movie tickets, creator memberships, and media subscriptions.
Prefer Bills for utilities, rent, insurance, phone, internet, and recurring household service fees.
Prefer Shopping only for clear retail goods or general merchandise purchases.
If uncertain, return Uncategorized with low confidence.",
            json!({
                "merchant": input.merchant,
                "normalizedMerchant": normalized_merchant,
                "amount": input.amount,
                "notes": input.notes.clone().unwrap_or_default(),
                "availableCategories": categories
            }),
        )
        .await?;
    let Some(parsed) = extract_json_object(&content) else {
        return Ok(None);
    };
    let category = parsed
        .get("category")
        .and_then(|value| value.as_str())
        .unwrap_or_default()
        .trim()
        .to_string();
    if !categories.iter().any(|candidate| candidate == &category) {
        return Ok(None);
    }
    let confidence = parsed
        .get("confidence")
        .and_then(|value| value.as_f64().or_else(|| value.as_str()?.parse::<f64>().ok()))
        .unwrap_or(0.65);
    let reason = parsed
        .get("reason")
        .and_then(|value| value.as_str())
        .unwrap_or("AI categorization")
        .to_string();
    let result = build_result(
        normalized_merchant.to_string(),
        category,
        "auto-ai",
        clamp_confidence(confidence),
        Some(reason),
    );
    Ok(Some(refine_ai_result(
        normalized_merchant,
        input,
        result,
        categories,
    )))
}

fn extract_json_object(raw: &str) -> Option<serde_json::Value> {
    let start = raw.find('{')?;
    let end = raw.rfind('}')?;
    serde_json::from_str::<serde_json::Value>(&raw[start..=end]).ok()
}
