export type ThemeMode = "light" | "dark" | "system";
export type ViewMode = "edit" | "split" | "preview";
export type SortMode = "updated" | "created" | "title";

export interface Note {
  id: string;
  content: string;
  folderId: string | null;
  tags: string[];
  pinned: boolean;
  favorite: boolean;
  createdAt: number;
  updatedAt: number;
  /** When soft-deleted (in Trash), the timestamp; null when active. */
  deletedAt: number | null;
  /** Per-note lock. When true, `content` is empty on disk and `cipher` holds the encrypted body. */
  locked?: boolean;
  /** AES-GCM ciphertext (base64 iv:ct) of the note body when locked. */
  cipher?: string;
  /** Runtime only (never persisted): a locked note decrypted for this session. */
  unlocked?: boolean;
}

/** Envelope written to disk when whole-vault encryption is on. */
export interface EncryptedEnvelope {
  encrypted: true;
  kdf: { salt: string; iterations: number };
  verifier: string;
  payload: string;
  /** DPAPI-protected master key for Windows Hello unlock (outside the payload). */
  hello?: string;
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

export interface Security {
  /** KDF salt (base64) for deriving the master key from the passphrase. */
  salt: string;
  iterations: number;
  /** AES-GCM encryption of a known token, used to verify the passphrase. */
  verifier: string;
  /** Whether the whole store is encrypted at rest. */
  vaultEncrypted: boolean;
  /** Auto-lock after this many minutes of inactivity (0 = never). */
  autoLockMinutes: number;
  /** DPAPI-protected master key (base64) enabling Windows Hello unlock, if set up. */
  helloBlob?: string;
}

export interface Settings {
  theme: ThemeMode;
  viewMode: ViewMode;
  sort: SortMode;
  lastNoteId: string | null;
  sidebarCollapsed: boolean;
  seeded?: boolean;
  security?: Security;
}

export interface AppData {
  version: number;
  notes: Note[];
  folders: Folder[];
  settings: Settings;
}

export const DATA_VERSION = 1;

export const FOLDER_COLORS = [
  "#6d5efc",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#8b5cf6",
  "#14b8a6",
];
