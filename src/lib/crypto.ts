// All at-rest encryption uses AES-256-GCM with a key derived from the user's
// passphrase via PBKDF2-SHA256. The derived key lives only in memory (below).

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const DEFAULT_ITERATIONS = 310_000;
const VERIFIER_TOKEN = "NOTEX_VERIFY_v1";

function toB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function fromB64(s: string): Uint8Array {
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// TS 5.7's DOM lib types Uint8Array as possibly SharedArrayBuffer-backed;
// WebCrypto wants a plain BufferSource. These are always ArrayBuffer-backed.
const bs = (x: Uint8Array): BufferSource => x as unknown as BufferSource;

export function randomSaltB64(): string {
  return toB64(crypto.getRandomValues(new Uint8Array(16)));
}

export async function deriveKey(
  passphrase: string,
  saltB64: string,
  iterations: number
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    bs(encoder.encode(passphrase)),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: bs(fromB64(saltB64)), iterations, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    true, // extractable — needed to wrap the key for Windows Hello
    ["encrypt", "decrypt"]
  );
}

export async function encryptString(key: CryptoKey, text: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: bs(iv) }, key, bs(encoder.encode(text)));
  return `${toB64(iv)}:${toB64(ct)}`;
}

export async function decryptString(key: CryptoKey, blob: string): Promise<string> {
  const [ivB, ctB] = blob.split(":");
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: bs(fromB64(ivB)) },
    key,
    bs(fromB64(ctB))
  );
  return decoder.decode(pt);
}

export async function makeVerifier(key: CryptoKey): Promise<string> {
  return encryptString(key, VERIFIER_TOKEN);
}

export async function checkVerifier(key: CryptoKey, verifier: string): Promise<boolean> {
  try {
    return (await decryptString(key, verifier)) === VERIFIER_TOKEN;
  } catch {
    return false;
  }
}

export async function exportKeyB64(key: CryptoKey): Promise<string> {
  return toB64(await crypto.subtle.exportKey("raw", key));
}

export async function importKeyB64(b64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", bs(fromB64(b64)), { name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}

// ---- In-memory master key (never persisted) ----
let masterKey: CryptoKey | null = null;
export function setMasterKey(k: CryptoKey | null) {
  masterKey = k;
}
export function getMasterKey(): CryptoKey | null {
  return masterKey;
}
export function hasMasterKey(): boolean {
  return masterKey !== null;
}
