use serde_json::{json, Value};

const SYSTEM_PROMPT: &str = "You are a note-taking assistant that turns an image into clean, \
well-structured Markdown notes. Accurately transcribe printed text and handwriting. Preserve \
structure: use headings, bullet/numbered lists, tables, task checkboxes (- [ ]), and fenced code \
blocks where they fit the content. Capture diagrams as concise textual descriptions or lists. \
Do not invent information that isn't in the image. Output ONLY the Markdown notes — no preamble, \
no explanation, and do not wrap the whole thing in a code fence.";

/// Send an image to the Anthropic Messages API and return generated Markdown notes.
/// Uses raw HTTP (reqwest) from Rust: no official Rust SDK exists, and this avoids
/// webview CORS and keeps the API key out of the webview network layer.
#[tauri::command]
pub async fn ai_notes_from_image(
    api_key: String,
    model: String,
    image_b64: String,
    media_type: String,
    instruction: String,
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

    let client = reqwest::Client::new();
    let resp = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Couldn't reach the Anthropic API: {e}"))?;

    let status = resp.status();
    let val: Value = resp
        .json()
        .await
        .map_err(|e| format!("Unexpected response from the API: {e}"))?;

    if !status.is_success() {
        let msg = val["error"]["message"].as_str().unwrap_or("Unknown error");
        let hint = match status.as_u16() {
            401 => " (check your API key)",
            429 => " (rate limited — wait a moment and retry)",
            _ => "",
        };
        return Err(format!("API error {}: {msg}{hint}", status.as_u16()));
    }

    if val["stop_reason"] == "refusal" {
        return Err("The model declined this image for safety reasons.".into());
    }

    let text = val["content"]
        .as_array()
        .and_then(|blocks| blocks.iter().find(|b| b["type"] == "text"))
        .and_then(|b| b["text"].as_str())
        .filter(|t| !t.trim().is_empty())
        .ok_or("The model returned no text.")?;

    Ok(text.to_string())
}
