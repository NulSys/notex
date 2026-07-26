import { invoke } from "@tauri-apps/api/core";

const SUPPORTED = ["image/png", "image/jpeg", "image/gif", "image/webp"];

/** Anthropic-supported image media type, or null if unsupported. */
export function imageMediaType(type: string): string | null {
  const t = type === "image/jpg" ? "image/jpeg" : type;
  return SUPPORTED.includes(t) ? t : null;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Turn an image into Markdown notes via the chosen provider (call runs in Rust). */
export async function notesFromImage(opts: {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl: string;
  bytes: Uint8Array;
  mediaType: string;
  instruction: string;
}): Promise<string> {
  return invoke<string>("ai_notes_from_image", {
    provider: opts.provider,
    apiKey: opts.apiKey,
    model: opts.model,
    baseUrl: opts.baseUrl,
    imageB64: bytesToBase64(opts.bytes),
    mediaType: opts.mediaType,
    instruction: opts.instruction,
  });
}
