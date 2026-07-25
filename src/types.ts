export type ThemeMode = "light" | "dark" | "system";
export type ViewMode = "edit" | "split" | "preview";
export type SortMode = "updated" | "created" | "title";

export type AccentId =
  | "violet"
  | "blue"
  | "sky"
  | "teal"
  | "green"
  | "amber"
  | "rose"
  | "pink";

/** Accent presets. `color` is the light-theme base swatch; the dark variant and
 *  all soft/hover/background tints are derived from it in CSS via color-mix. */
export const ACCENTS: { id: AccentId; label: string; color: string }[] = [
  { id: "violet", label: "Violet", color: "#6d5efc" },
  { id: "blue", label: "Blue", color: "#2563eb" },
  { id: "sky", label: "Sky", color: "#0284c7" },
  { id: "teal", label: "Teal", color: "#0d9488" },
  { id: "green", label: "Green", color: "#16a34a" },
  { id: "amber", label: "Amber", color: "#d97706" },
  { id: "rose", label: "Rose", color: "#e11d48" },
  { id: "pink", label: "Pink", color: "#db2777" },
];

export const DEFAULT_ACCENT: AccentId = "violet";

export type DateFormat = "med" | "long" | "us" | "eu" | "iso";
export type TimeFormat = "12" | "12s" | "24" | "24s";

export const DATE_FORMATS: { id: DateFormat; label: string }[] = [
  { id: "med", label: "Jul 25, 2026" },
  { id: "long", label: "Saturday, July 25, 2026" },
  { id: "us", label: "7/25/2026" },
  { id: "eu", label: "25/07/2026" },
  { id: "iso", label: "2026-07-25" },
];

export const TIME_FORMATS: { id: TimeFormat; label: string }[] = [
  { id: "12", label: "3:45 PM" },
  { id: "12s", label: "3:45:09 PM" },
  { id: "24", label: "15:45" },
  { id: "24s", label: "15:45:09" },
];

export const DEFAULT_DATE_FORMAT: DateFormat = "med";
export const DEFAULT_TIME_FORMAT: TimeFormat = "12";

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
  accent?: AccentId;
  dateFormat?: DateFormat;
  timeFormat?: TimeFormat;
  /** Editor:preview width ratio in split view (0.2–0.8, editor's fraction). */
  splitRatio?: number;
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
