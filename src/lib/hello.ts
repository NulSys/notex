import { isTauri } from "./env";

// Windows Hello bridge (implemented as Rust commands in src-tauri).
// hello_protect wraps a key with DPAPI; hello_unprotect requires a Hello
// consent prompt before releasing it.

export async function helloAvailable(): Promise<boolean> {
  if (!isTauri()) return false;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<boolean>("hello_available");
  } catch {
    return false;
  }
}

export async function helloProtect(keyB64: string): Promise<string | null> {
  if (!isTauri()) return null;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<string>("hello_protect", { key: keyB64 });
  } catch (e) {
    console.error("hello_protect failed:", e);
    return null;
  }
}

export async function helloUnprotect(blobB64: string): Promise<string | null> {
  if (!isTauri()) return null;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<string>("hello_unprotect", { blob: blobB64 });
  } catch (e) {
    console.error("hello_unprotect failed:", e);
    return null;
  }
}
