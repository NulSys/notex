import type { AppData, EncryptedEnvelope, Note } from "../types";
import { DATA_VERSION } from "../types";
import { isTauri } from "./env";
import { encryptString, getMasterKey } from "./crypto";

const STORE_DIR = "store";
const STORE_FILE = "store/data.json";
const LS_KEY = "notex:data";

export function emptyData(): AppData {
  return {
    version: DATA_VERSION,
    notes: [],
    folders: [],
    settings: {
      theme: "system",
      viewMode: "split",
      sort: "updated",
      lastNoteId: null,
      sidebarCollapsed: false,
    },
  };
}

async function readRaw(): Promise<string | null> {
  if (isTauri()) {
    const { readTextFile, exists, BaseDirectory } = await import("@tauri-apps/plugin-fs");
    const there = await exists(STORE_FILE, { baseDir: BaseDirectory.AppData });
    if (!there) return null;
    return readTextFile(STORE_FILE, { baseDir: BaseDirectory.AppData });
  }
  return localStorage.getItem(LS_KEY);
}

async function writeRaw(json: string): Promise<void> {
  if (isTauri()) {
    const { writeTextFile, mkdir, exists, BaseDirectory } = await import("@tauri-apps/plugin-fs");
    const dirThere = await exists(STORE_DIR, { baseDir: BaseDirectory.AppData });
    if (!dirThere) await mkdir(STORE_DIR, { baseDir: BaseDirectory.AppData, recursive: true });
    await writeTextFile(STORE_FILE, json, { baseDir: BaseDirectory.AppData });
  } else {
    localStorage.setItem(LS_KEY, json);
  }
}

export type LoadResult =
  | { locked: false; data: AppData }
  | { locked: true; header: EncryptedEnvelope };

/** Load persisted app data, or signal that the vault is encrypted and needs unlocking. */
export async function loadData(): Promise<LoadResult> {
  try {
    const raw = await readRaw();
    if (!raw) return { locked: false, data: emptyData() };
    const parsed = JSON.parse(raw);
    if (parsed && parsed.encrypted === true) {
      return { locked: true, header: parsed as EncryptedEnvelope };
    }
    return { locked: false, data: normalize(parsed) };
  } catch (err) {
    console.error("Failed to load NoteX data:", err);
    return { locked: false, data: emptyData() };
  }
}

/** Normalize a decrypted payload (used after unlocking an encrypted vault). */
export function normalizeData(raw: unknown): AppData {
  return normalize(raw);
}

/**
 * Serialize app data for disk: re-encrypt any locked notes, then (if the vault is
 * encrypted) wrap the whole payload in an AES-GCM envelope.
 */
async function serialize(data: AppData): Promise<string> {
  const key = getMasterKey();

  // Ensure locked notes are stored as ciphertext, never plaintext.
  const notes: Note[] = await Promise.all(
    data.notes.map(async (n) => {
      const { unlocked, ...rest } = n;
      if (rest.locked && unlocked && key) {
        const cipher = await encryptString(key, rest.content);
        return { ...rest, content: "", cipher };
      }
      return { ...rest };
    })
  );
  const plain: AppData = { ...data, notes };

  const sec = data.settings.security;
  if (sec?.vaultEncrypted && key) {
    const payload = await encryptString(key, JSON.stringify(plain));
    const envelope: EncryptedEnvelope = {
      encrypted: true,
      kdf: { salt: sec.salt, iterations: sec.iterations },
      verifier: sec.verifier,
      payload,
      ...(sec.helloBlob ? { hello: sec.helloBlob } : {}),
    };
    return JSON.stringify(envelope);
  }
  return JSON.stringify(plain);
}

/** Persist app data. Called (debounced) by the store on every mutation. */
export async function saveData(data: AppData): Promise<void> {
  const sec = data.settings.security;
  // Never overwrite an encrypted vault with plaintext while locked.
  if (sec?.vaultEncrypted && !getMasterKey()) return;
  try {
    await writeRaw(await serialize(data));
  } catch (err) {
    console.error("Failed to save NoteX data:", err);
  }
}

/** Export a single note to a user-chosen .md file. Returns the saved path, or null if cancelled. */
export async function exportNoteToFile(defaultName: string, content: string): Promise<string | null> {
  if (isTauri()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    const path = await save({
      defaultPath: `${defaultName}.md`,
      filters: [{ name: "Markdown", extensions: ["md"] }],
    });
    if (!path) return null;
    await writeTextFile(path, content);
    return path;
  } else {
    // Browser fallback: trigger a download.
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${defaultName}.md`;
    a.click();
    URL.revokeObjectURL(url);
    return `${defaultName}.md`;
  }
}

/** Import one or more .md files, returning their contents. */
export async function importMarkdownFiles(): Promise<{ name: string; content: string }[]> {
  if (isTauri()) {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    const selected = await open({
      multiple: true,
      filters: [{ name: "Markdown / Text", extensions: ["md", "markdown", "txt"] }],
    });
    if (!selected) return [];
    const paths = Array.isArray(selected) ? selected : [selected];
    const out: { name: string; content: string }[] = [];
    for (const p of paths) {
      const content = await readTextFile(p);
      const name = p.split(/[\\/]/).pop()?.replace(/\.(md|markdown|txt)$/i, "") ?? "Imported";
      out.push({ name, content });
    }
    return out;
  }
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".md,.markdown,.txt";
    input.multiple = true;
    input.onchange = async () => {
      const files = Array.from(input.files ?? []);
      const out = await Promise.all(
        files.map(async (f) => ({
          name: f.name.replace(/\.(md|markdown|txt)$/i, ""),
          content: await f.text(),
        }))
      );
      resolve(out);
    };
    input.click();
  });
}

function normalize(raw: unknown): AppData {
  const base = emptyData();
  if (!raw || typeof raw !== "object") return base;
  const d = raw as Partial<AppData>;
  const notes = (Array.isArray(d.notes) ? d.notes : []).map((n: any) => ({
    ...n,
    tags: Array.isArray(n.tags) ? n.tags : [],
    deletedAt: n.deletedAt ?? null,
    locked: n.locked ?? false,
  }));
  return {
    version: DATA_VERSION,
    notes,
    folders: Array.isArray(d.folders) ? d.folders : [],
    settings: { ...base.settings, ...(d.settings ?? {}) },
  };
}
