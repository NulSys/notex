use serde_json::{json, Value};

const SYSTEM_PROMPT: &str = "You are a note-taking assistant that turns an image into clean, \
well-structured Markdown notes. Accurately transcribe printed text and handwriting. Preserve \
structure: use headings, bullet/numbered lists, tables, task checkboxes (- [ ]), and fenced code \
blocks where they fit the content. Capture diagrams as concise textual descriptions or lists. \
Do not invent information that isn't in the image. Output ONLY the Markdown notes — no preamble, \
no explanation, and do not wrap the whole thing in a code fence.";

/// Turn an image into Markdown notes. Routes to the chosen provider:
/// - `anthropic`: Claude (paid, best) — https://api.anthropic.com
/// - `ollama`:    local models (free, offline) — http://localhost:11434
/// - `gemini`:    Google Gemini (free tier)
///
/// Runs in Rust (raw HTTP via reqwest): avoids webview CORS and keeps keys out
/// of the webview network layer.
#[tauri::command]
pub async fn ai_notes_from_image(
    provider: String,
    api_key: String,
    model: String,
    base_url: String,
    image_b64: String,
    media_type: String,
    instruction: String,
) -> Result<String, String> {
    match provider.as_str() {
        "ollama" => ollama(&model, &base_url, &image_b64, &instruction).await,
        "gemini" => gemini(&api_key, &model, &image_b64, &media_type, &instruction).await,
        _ => anthropic(&api_key, &model, &image_b64, &media_type, &instruction).await,
    }
}

async fn anthropic(
    api_key: &str,
    model: &str,
    image_b64: &str,
    media_type: &str,
    instruction: &str,
) -> Result<String, String> {
    if api_key.trim().is_empty() {
        return Err("No Anthropic API key set. Add one in Settings → AI.".into());
    }
    let body = json!({
        "model": model,
        "max_tokens": 8192,
        "system": SYSTEM_PROMPT,
        "messages": [{
            "role": "user",
            "content": [
                { "type": "image", "source": { "type": "base64", "media_type": media_type, "data": image_b64 } },
                { "type": "text", "text": instruction }
            ]
        }]
    });
    let resp = reqwest::Client::new()
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Couldn't reach the Anthropic API: {e}"))?;

    let status = resp.status();
    let val: Value = resp.json().await.map_err(|e| format!("Unexpected response: {e}"))?;
    if !status.is_success() {
        let msg = val["error"]["message"].as_str().unwrap_or("Unknown error");
        let hint = match status.as_u16() {
            401 => " (check your API key)",
            429 => " (rate limited — wait and retry)",
            _ => "",
        };
        return Err(format!("Anthropic error {}: {msg}{hint}", status.as_u16()));
    }
    if val["stop_reason"] == "refusal" {
        return Err("The model declined this image for safety reasons.".into());
    }
    val["content"]
        .as_array()
        .and_then(|blocks| blocks.iter().find(|b| b["type"] == "text"))
        .and_then(|b| b["text"].as_str())
        .filter(|t| !t.trim().is_empty())
        .map(|t| t.to_string())
        .ok_or_else(|| "The model returned no text.".into())
}

async fn gemini(
    api_key: &str,
    model: &str,
    image_b64: &str,
    media_type: &str,
    instruction: &str,
) -> Result<String, String> {
    if api_key.trim().is_empty() {
        return Err("No Google Gemini API key set. Add one in Settings → AI.".into());
    }
    let url =
        format!("https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent");
    let body = json!({
        "system_instruction": { "parts": [{ "text": SYSTEM_PROMPT }] },
        "contents": [{
            "parts": [
                { "inline_data": { "mime_type": media_type, "data": image_b64 } },
                { "text": instruction }
            ]
        }]
    });
    let resp = reqwest::Client::new()
        .post(&url)
        .header("x-goog-api-key", api_key)
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Couldn't reach Gemini: {e}"))?;

    let status = resp.status();
    let val: Value = resp.json().await.map_err(|e| format!("Unexpected Gemini response: {e}"))?;
    if !status.is_success() {
        let msg = val["error"]["message"].as_str().unwrap_or("Unknown error");
        return Err(format!("Gemini error {}: {msg}", status.as_u16()));
    }
    if let Some(reason) = val["promptFeedback"]["blockReason"].as_str() {
        return Err(format!("Gemini blocked the request: {reason}"));
    }
    val["candidates"][0]["content"]["parts"]
        .as_array()
        .and_then(|parts| parts.iter().find_map(|p| p["text"].as_str()))
        .filter(|t| !t.trim().is_empty())
        .map(|t| t.to_string())
        .ok_or_else(|| "Gemini returned no text.".into())
}

async fn ollama(
    model: &str,
    base_url: &str,
    image_b64: &str,
    instruction: &str,
) -> Result<String, String> {
    let base = if base_url.trim().is_empty() {
        "http://localhost:11434"
    } else {
        base_url.trim().trim_end_matches('/')
    };
    let url = format!("{base}/api/generate");
    let body = json!({
        "model": model,
        "system": SYSTEM_PROMPT,
        "prompt": instruction,
        "images": [image_b64],
        "stream": false
    });
    let resp = reqwest::Client::new()
        .post(&url)
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| {
            format!(
                "Couldn't reach Ollama at {base}. Is it running? Start it with `ollama serve`, \
                 then pull a vision model, e.g. `ollama pull llama3.2-vision`. [{e}]"
            )
        })?;

    let status = resp.status();
    let val: Value = resp.json().await.map_err(|e| format!("Unexpected Ollama response: {e}"))?;
    if !status.is_success() {
        let msg = val["error"].as_str().unwrap_or("Unknown error");
        return Err(format!("Ollama error {}: {msg}", status.as_u16()));
    }
    val["response"]
        .as_str()
        .filter(|t| !t.trim().is_empty())
        .map(|t| t.to_string())
        .ok_or_else(|| "Ollama returned no text.".into())
}
