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

export type NoteFont = "default" | "serif" | "mono" | "rounded";
export const NOTE_FONTS: { id: NoteFont; label: string; stack: string | null }[] = [
  { id: "default", label: "Default (Sans)", stack: null },
  { id: "serif", label: "Serif", stack: 'Georgia, Cambria, "Times New Roman", serif' },
  { id: "mono", label: "Monospace", stack: '"Cascadia Code", Consolas, ui-monospace, monospace' },
  { id: "rounded", label: "Rounded", stack: '"Segoe UI Variable Display", "Nunito", "Comfortaa", system-ui, sans-serif' },
];

export type NoteSize = "s" | "m" | "l" | "xl";
export const NOTE_SIZES: { id: NoteSize; label: string; px: string }[] = [
  { id: "s", label: "Small", px: "14px" },
  { id: "m", label: "Medium", px: "15.5px" },
  { id: "l", label: "Large", px: "17.5px" },
  { id: "xl", label: "Extra large", px: "20px" },
];

// Preset text colors for note content (null = follow the theme). Plus a custom
// color picker in Settings for anything else.
export const TEXT_COLORS: { id: string; label: string; color: string | null }[] = [
  { id: "default", label: "Default", color: null },
  { id: "slate", label: "Slate", color: "#64748b" },
  { id: "emerald", label: "Emerald", color: "#059669" },
  { id: "blue", label: "Blue", color: "#2563eb" },
  { id: "amber", label: "Amber", color: "#b45309" },
  { id: "rose", label: "Rose", color: "#e11d48" },
  { id: "purple", label: "Purple", color: "#7c3aed" },
];

export const DEFAULT_NOTE_FONT: NoteFont = "default";
export const DEFAULT_NOTE_SIZE: NoteSize = "m";

// AI (image → notes). Choose a provider; each has its own key/model needs.
export type AiProvider = "anthropic" | "ollama" | "gemini";
export const AI_PROVIDERS: { id: AiProvider; label: string }[] = [
  { id: "anthropic", label: "Claude · Anthropic (best · paid)" },
  { id: "ollama", label: "Ollama · local (free · offline)" },
  { id: "gemini", label: "Google Gemini (free tier)" },
];
export const DEFAULT_AI_PROVIDER: AiProvider = "anthropic";

export const AI_MODELS: { id: string; label: string }[] = [
  { id: "claude-opus-4-8", label: "Claude Opus 4.8 (best)" },
  { id: "claude-sonnet-5", label: "Claude Sonnet 5 (balanced)" },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5 (fastest)" },
];
export const DEFAULT_AI_MODEL = "claude-opus-4-8";
export const DEFAULT_OLLAMA_MODEL = "llama3.2-vision";
export const DEFAULT_OLLAMA_URL = "http://localhost:11434";
export const DEFAULT_GEMINI_MODEL = "gemini-1.5-flash";

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
  /** Note content font, size, and text color (undefined = theme defaults). */
  noteFont?: NoteFont;
  noteSize?: NoteSize;
  textColor?: string; // hex; absent = follow theme
  /** AI (image → notes): provider + per-provider key/model. */
  aiProvider?: AiProvider;
  aiApiKey?: string; // Anthropic
  aiModel?: string; // Anthropic
  geminiApiKey?: string;
  geminiModel?: string;
  ollamaModel?: string;
  ollamaUrl?: string;
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
