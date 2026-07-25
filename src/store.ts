import { create } from "zustand";
import type { AccentId, AppData, DateFormat, EncryptedEnvelope, Folder, Note, Settings, SortMode, ThemeMode, TimeFormat, ViewMode } from "./types";
import { FOLDER_COLORS, DEFAULT_DATE_FORMAT } from "./types";
import { formatDate } from "./lib/time";
import { uid } from "./lib/id";
import { loadData, saveData, emptyData, normalizeData } from "./lib/storage";
import { deriveTitle } from "./lib/markdown";
import { effectiveTags } from "./lib/parse";
import * as vault from "./lib/crypto";
import { helloProtect, helloUnprotect } from "./lib/hello";

const WELCOME_NOTE = `# Welcome to NoteX 👋

A calm, fast, **private** place to think in Markdown. #welcome #getting-started/basics

> [!tip] Live preview
> Type in the left pane and watch it render on the right. Toggle **Editor · Split · Preview** from the top-left buttons.

## Link your thoughts

Write [[wiki-links]] to connect notes — type \`[[\` for autocomplete. Every note shows its **backlinks** in the info panel (the ⓘ button).

## Rich Markdown

**Bold**, *italic*, ~~strikethrough~~, \`inline code\`, and math like $E = mc^2$.

> [!warning] Callouts
> Use \`> [!note]\`, \`> [!tip]\`, \`> [!warning]\`, and more for colorful highlights.

Code is syntax-highlighted:

\`\`\`js
function hello(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

Tasks you can click:

- [x] Install NoteX
- [ ] Write my first note
- [ ] Lock a private note 🔒

## Organize & protect

- **#nested/tags** show as a tree in the sidebar
- **Pin** ⭐ and **favorite** important notes
- Deleted notes go to **Trash** (restore anytime)
- Click the **shield** to set a passphrase — notes are encrypted with AES-256, unlockable by passphrase or **Windows Hello**[^1]

| Action | Shortcut |
| --- | --- |
| New note | Ctrl + N |
| Command palette | Ctrl + K |
| Toggle sidebar | Ctrl + \\\\ |
| Switch theme | Ctrl + Shift + D |

---

Delete this note whenever you're ready — and enjoy. ✨

[^1]: Everything stays on your device. There's no account and no cloud.
`;

export type Filter =
  | { type: "all" }
  | { type: "favorites" }
  | { type: "trash" }
  | { type: "folder"; id: string }
  | { type: "tag"; tag: string };

interface State {
  loaded: boolean;
  notes: Note[];
  folders: Folder[];
  settings: Settings;

  // UI state (not persisted except where noted)
  selectedId: string | null;
  filter: Filter;
  search: string;
  paletteOpen: boolean;

  // lifecycle
  init: () => Promise<void>;

  // notes
  createNote: (opts?: { folderId?: string | null; content?: string; select?: boolean }) => string;
  updateNoteContent: (id: string, content: string) => void;
  deleteNote: (id: string) => void;
  restoreNote: (id: string) => void;
  deleteForever: (id: string) => void;
  emptyTrash: () => void;
  toggleTask: (id: string, index: number) => void;
  openOrCreateByTitle: (title: string) => void;
  openDailyNote: () => void;
  togglePin: (id: string) => void;
  toggleFavorite: (id: string) => void;
  moveNote: (id: string, folderId: string | null) => void;
  setNoteTags: (id: string, tags: string[]) => void;
  addTag: (id: string, tag: string) => void;
  removeTag: (id: string, tag: string) => void;

  // folders
  createFolder: (name: string) => string;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;

  // ui
  select: (id: string | null) => void;
  setFilter: (f: Filter) => void;
  setSearch: (q: string) => void;
  openPalette: () => void;
  closePalette: () => void;
  securityOpen: boolean;
  openSecurity: () => void;
  closeSecurity: () => void;
  settingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;

  // security / encryption
  locked: boolean; // app-level: encrypted vault awaiting unlock
  securityHeader: EncryptedEnvelope | null;
  unlockVault: (passphrase: string) => Promise<boolean>;
  unlockWithHello: () => Promise<boolean>;
  lockSession: () => void; // clear key from memory (auto-lock / manual)
  setupPassphrase: (passphrase: string, encryptVault: boolean) => Promise<void>;
  removePassphrase: (passphrase: string) => Promise<boolean>;
  setVaultEncryption: (on: boolean) => void;
  setAutoLock: (minutes: number) => void;
  enableHello: () => Promise<boolean>;
  disableHello: () => void;
  provideKey: (passphrase: string) => Promise<boolean>;
  lockNote: (id: string) => Promise<boolean>;
  unlockNote: (id: string, passphrase?: string) => Promise<boolean>;

  // settings
  setTheme: (t: ThemeMode) => void;
  cycleTheme: () => void;
  setAccent: (a: AccentId) => void;
  setDateFormat: (f: DateFormat) => void;
  setTimeFormat: (f: TimeFormat) => void;
  setSplitRatio: (r: number) => void;
  setViewMode: (v: ViewMode) => void;
  setSort: (s: SortMode) => void;
  toggleSidebar: () => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let savesReady = false; // gate the first write past WebView2/IPC warmup
function enableSaves() {
  savesReady = true;
}
function persist(get: () => State) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const s = get();
    if (!s.loaded || !savesReady) return;
    saveData({ version: 1, notes: s.notes, folders: s.folders, settings: s.settings });
  }, 600);
}

export const useStore = create<State>((set, get) => {
  const commit = (partial: Partial<State>) => {
    set(partial);
    persist(get);
  };

  return {
    loaded: false,
    notes: [],
    folders: [],
    settings: emptyData().settings,
    selectedId: null,
    filter: { type: "all" },
    search: "",
    paletteOpen: false,
    securityOpen: false,
    settingsOpen: false,
    locked: false,
    securityHeader: null,

    init: async () => {
      const res = await loadData();
      if (res.locked) {
        set({ loaded: true, locked: true, securityHeader: res.header });
        return;
      }
      const data = res.data;

      // First-ever run: seed a friendly welcome note (only if truly empty & never seeded).
      if (!data.settings.seeded && data.notes.length === 0 && data.folders.length === 0) {
        const now = Date.now();
        data.notes = [
          {
            id: uid("n_"),
            content: WELCOME_NOTE,
            folderId: null,
            tags: ["welcome"],
            pinned: false,
            favorite: false,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          },
        ];
        data.settings.seeded = true;
        data.settings.lastNoteId = data.notes[0].id;
      }

      const sorted = [...data.notes].sort(byRecency);
      const selectedId =
        data.settings.lastNoteId && sorted.some((n) => n.id === data.settings.lastNoteId)
          ? data.settings.lastNoteId
          : sorted[0]?.id ?? null;
      set({
        loaded: true,
        notes: data.notes,
        folders: data.folders,
        settings: data.settings,
        selectedId,
      });
      // Enable writes only after WebView2/IPC warmup, then flush the seed once.
      setTimeout(() => {
        enableSaves();
        persist(get);
      }, 1500);
    },

    createNote: (opts = {}) => {
      const id = uid("n_");
      const now = Date.now();
      const note: Note = {
        id,
        content: opts.content ?? "",
        folderId:
          opts.folderId ??
          (get().filter.type === "folder" ? (get().filter as { id: string }).id : null),
        tags: [],
        pinned: false,
        favorite: false,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      const settings = { ...get().settings, lastNoteId: id };
      commit({ notes: [note, ...get().notes], settings });
      if (opts.select !== false) set({ selectedId: id });
      return id;
    },

    updateNoteContent: (id, content) => {
      const notes = get().notes.map((n) =>
        n.id === id ? { ...n, content, updatedAt: Date.now() } : n
      );
      commit({ notes });
    },

    // Soft-delete: move to Trash.
    deleteNote: (id) => {
      const notes = get().notes.map((n) =>
        n.id === id ? { ...n, deletedAt: Date.now() } : n
      );
      let selectedId = get().selectedId;
      if (selectedId === id) {
        const next = notes.filter((n) => !n.deletedAt).sort(byRecency);
        selectedId = next[0]?.id ?? null;
      }
      commit({ notes, selectedId, settings: { ...get().settings, lastNoteId: selectedId } });
    },

    restoreNote: (id) =>
      commit({
        notes: get().notes.map((n) =>
          n.id === id ? { ...n, deletedAt: null, updatedAt: Date.now() } : n
        ),
      }),

    deleteForever: (id) => {
      const remaining = get().notes.filter((n) => n.id !== id);
      let selectedId = get().selectedId;
      if (selectedId === id) selectedId = null;
      commit({ notes: remaining, selectedId });
    },

    emptyTrash: () =>
      commit({ notes: get().notes.filter((n) => !n.deletedAt) }),

    // Toggle the Nth "- [ ]" / "- [x]" checkbox in a note's content.
    toggleTask: (id, index) => {
      const note = get().notes.find((n) => n.id === id);
      if (!note || note.locked) return;
      let i = -1;
      const next = note.content.replace(/\[([ xX])\]/g, (m, mark) => {
        i++;
        if (i !== index) return m;
        return mark.trim() === "" ? "[x]" : "[ ]";
      });
      if (next !== note.content) {
        commit({
          notes: get().notes.map((n) => (n.id === id ? { ...n, content: next, updatedAt: Date.now() } : n)),
        });
      }
    },

    // Follow a [[wiki-link]]: open the matching note, or create it.
    openOrCreateByTitle: (title) => {
      const target = title.trim().toLowerCase();
      const found = get().notes.find(
        (n) => !n.deletedAt && !n.locked && deriveTitle(n.content).toLowerCase() === target
      );
      if (found) {
        get().select(found.id);
      } else {
        get().createNote({ content: `# ${title.trim()}\n\n` });
      }
    },

    openDailyNote: () => {
      const title = formatDate(new Date(), get().settings.dateFormat ?? DEFAULT_DATE_FORMAT);
      const target = title.toLowerCase();
      const found = get().notes.find(
        (n) => !n.deletedAt && !n.locked && deriveTitle(n.content).toLowerCase() === target
      );
      if (found) {
        get().select(found.id);
      } else {
        get().createNote({ content: `# ${title}\n\n## Notes\n\n- \n\n## Tasks\n\n- [ ] ` });
      }
    },

    togglePin: (id) =>
      commit({
        notes: get().notes.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)),
      }),

    toggleFavorite: (id) =>
      commit({
        notes: get().notes.map((n) => (n.id === id ? { ...n, favorite: !n.favorite } : n)),
      }),

    moveNote: (id, folderId) =>
      commit({
        notes: get().notes.map((n) =>
          n.id === id ? { ...n, folderId, updatedAt: Date.now() } : n
        ),
      }),

    setNoteTags: (id, tags) =>
      commit({
        notes: get().notes.map((n) =>
          n.id === id ? { ...n, tags: dedupe(tags), updatedAt: Date.now() } : n
        ),
      }),

    addTag: (id, tag) => {
      const t = normalizeTag(tag);
      if (!t) return;
      commit({
        notes: get().notes.map((n) =>
          n.id === id ? { ...n, tags: dedupe([...n.tags, t]), updatedAt: Date.now() } : n
        ),
      });
    },

    removeTag: (id, tag) =>
      commit({
        notes: get().notes.map((n) =>
          n.id === id ? { ...n, tags: n.tags.filter((x) => x !== tag) } : n
        ),
      }),

    createFolder: (name) => {
      const id = uid("f_");
      const color = FOLDER_COLORS[get().folders.length % FOLDER_COLORS.length];
      const folder: Folder = { id, name: name.trim() || "New Folder", color, createdAt: Date.now() };
      commit({ folders: [...get().folders, folder] });
      return id;
    },

    renameFolder: (id, name) =>
      commit({
        folders: get().folders.map((f) => (f.id === id ? { ...f, name: name.trim() || f.name } : f)),
      }),

    deleteFolder: (id) => {
      const notes = get().notes.map((n) => (n.folderId === id ? { ...n, folderId: null } : n));
      const folders = get().folders.filter((f) => f.id !== id);
      const filter = get().filter.type === "folder" && (get().filter as { id: string }).id === id
        ? ({ type: "all" } as Filter)
        : get().filter;
      commit({ notes, folders, filter });
    },

    select: (id) => commit({ selectedId: id, settings: { ...get().settings, lastNoteId: id } }),
    setFilter: (f) => set({ filter: f }),
    setSearch: (q) => set({ search: q }),
    openPalette: () => set({ paletteOpen: true }),
    closePalette: () => set({ paletteOpen: false }),
    openSecurity: () => set({ securityOpen: true }),
    closeSecurity: () => set({ securityOpen: false }),
    openSettings: () => set({ settingsOpen: true }),
    closeSettings: () => set({ settingsOpen: false }),

    unlockVault: async (passphrase) => {
      const res = await loadData();
      if (!res.locked) return true; // already unlocked / not encrypted
      const h = res.header;
      const key = await vault.deriveKey(passphrase, h.kdf.salt, h.kdf.iterations);
      if (!(await vault.checkVerifier(key, h.verifier))) return false;
      vault.setMasterKey(key);
      try {
        const data = normalizeData(JSON.parse(await vault.decryptString(key, h.payload)));
        set({ locked: false, securityHeader: null, ...hydrate(data) });
        return true;
      } catch {
        vault.setMasterKey(null);
        return false;
      }
    },

    unlockWithHello: async () => {
      const blob = get().locked ? get().securityHeader?.hello : get().settings.security?.helloBlob;
      if (!blob) return false;
      const raw = await helloUnprotect(blob);
      if (!raw) return false;
      const key = await vault.importKeyB64(raw);
      if (get().locked) {
        const res = await loadData();
        if (res.locked) {
          if (!(await vault.checkVerifier(key, res.header.verifier))) return false;
          try {
            vault.setMasterKey(key);
            const data = normalizeData(JSON.parse(await vault.decryptString(key, res.header.payload)));
            set({ locked: false, securityHeader: null, ...hydrate(data) });
            return true;
          } catch {
            vault.setMasterKey(null);
            return false;
          }
        }
      }
      vault.setMasterKey(key);
      return true;
    },

    lockSession: () => {
      vault.setMasterKey(null);
      const sec = get().settings.security;
      const notes = get().notes.map((n) =>
        n.locked ? { ...n, content: "", unlocked: false } : n
      );
      if (sec?.vaultEncrypted) {
        set({ notes, locked: true, selectedId: null });
      } else {
        set({ notes });
      }
    },

    setupPassphrase: async (passphrase, encryptVault) => {
      const salt = vault.randomSaltB64();
      const iterations = vault.DEFAULT_ITERATIONS;
      const key = await vault.deriveKey(passphrase, salt, iterations);
      const verifier = await vault.makeVerifier(key);
      vault.setMasterKey(key);
      commit({
        settings: {
          ...get().settings,
          security: {
            salt,
            iterations,
            verifier,
            vaultEncrypted: encryptVault,
            autoLockMinutes: get().settings.security?.autoLockMinutes ?? 0,
          },
        },
      });
    },

    removePassphrase: async (passphrase) => {
      const sec = get().settings.security;
      if (!sec) return false;
      const key = await vault.deriveKey(passphrase, sec.salt, sec.iterations);
      if (!(await vault.checkVerifier(key, sec.verifier))) return false;
      const notes = await Promise.all(
        get().notes.map(async (n) => {
          if (n.locked && n.cipher) {
            try {
              const plain = await vault.decryptString(key, n.cipher);
              return { ...n, content: plain, locked: false, cipher: undefined, unlocked: undefined };
            } catch {
              return n;
            }
          }
          return n;
        })
      );
      vault.setMasterKey(null);
      const next = { ...get().settings };
      delete next.security;
      commit({ notes, settings: next });
      return true;
    },

    setVaultEncryption: (on) => {
      const sec = get().settings.security;
      if (!sec) return;
      commit({ settings: { ...get().settings, security: { ...sec, vaultEncrypted: on } } });
    },

    setAutoLock: (minutes) => {
      const sec = get().settings.security;
      if (!sec) return;
      commit({ settings: { ...get().settings, security: { ...sec, autoLockMinutes: minutes } } });
    },

    enableHello: async () => {
      const key = vault.getMasterKey();
      const sec = get().settings.security;
      if (!key || !sec) return false;
      const raw = await vault.exportKeyB64(key);
      const blob = await helloProtect(raw);
      if (!blob) return false;
      commit({ settings: { ...get().settings, security: { ...sec, helloBlob: blob } } });
      return true;
    },

    disableHello: () => {
      const sec = get().settings.security;
      if (!sec) return;
      const security = { ...sec };
      delete security.helloBlob;
      commit({ settings: { ...get().settings, security } });
    },

    // Derive + hold the master key for this session (used before locking notes).
    provideKey: async (passphrase) => {
      const sec = get().settings.security;
      if (!sec) return false;
      const key = await vault.deriveKey(passphrase, sec.salt, sec.iterations);
      if (!(await vault.checkVerifier(key, sec.verifier))) return false;
      vault.setMasterKey(key);
      return true;
    },

    // Lock a note (or re-lock an unlocked one): encrypt its current content.
    lockNote: async (id) => {
      const key = vault.getMasterKey();
      if (!key) return false;
      const note = get().notes.find((n) => n.id === id);
      if (!note) return false;
      const cipher = await vault.encryptString(key, note.content);
      commit({
        notes: get().notes.map((n) =>
          n.id === id ? { ...n, locked: true, unlocked: false, cipher, content: "" } : n
        ),
      });
      return true;
    },

    unlockNote: async (id, passphrase) => {
      let key = vault.getMasterKey();
      if (!key && passphrase) {
        const sec = get().settings.security;
        if (!sec) return false;
        const k = await vault.deriveKey(passphrase, sec.salt, sec.iterations);
        if (!(await vault.checkVerifier(k, sec.verifier))) return false;
        vault.setMasterKey(k);
        key = k;
      }
      if (!key) return false;
      const note = get().notes.find((n) => n.id === id);
      if (!note || !note.locked || !note.cipher) return false;
      try {
        const plain = await vault.decryptString(key, note.cipher);
        set({
          notes: get().notes.map((n) => (n.id === id ? { ...n, content: plain, unlocked: true } : n)),
        });
        return true;
      } catch {
        return false;
      }
    },

    setTheme: (t) => commit({ settings: { ...get().settings, theme: t } }),
    cycleTheme: () => {
      const order: ThemeMode[] = ["light", "dark", "system"];
      const cur = get().settings.theme;
      const next = order[(order.indexOf(cur) + 1) % order.length];
      commit({ settings: { ...get().settings, theme: next } });
    },
    setAccent: (a) => commit({ settings: { ...get().settings, accent: a } }),
    setDateFormat: (f) => commit({ settings: { ...get().settings, dateFormat: f } }),
    setTimeFormat: (f) => commit({ settings: { ...get().settings, timeFormat: f } }),
    setSplitRatio: (r) => commit({ settings: { ...get().settings, splitRatio: r } }),
    setViewMode: (v) => commit({ settings: { ...get().settings, viewMode: v } }),
    setSort: (s) => commit({ settings: { ...get().settings, sort: s } }),
    toggleSidebar: () =>
      commit({ settings: { ...get().settings, sidebarCollapsed: !get().settings.sidebarCollapsed } }),
  };
});

function byRecency(a: Note, b: Note): number {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
  return b.updatedAt - a.updatedAt;
}

/** Build the state slice for freshly-loaded/decrypted data (notes, folders, settings, selection). */
function hydrate(data: AppData): Partial<State> {
  const sorted = [...data.notes].filter((n) => !n.deletedAt).sort(byRecency);
  const last = data.settings.lastNoteId;
  const selectedId = last && sorted.some((n) => n.id === last) ? last : sorted[0]?.id ?? null;
  return {
    loaded: true,
    notes: data.notes,
    folders: data.folders,
    settings: data.settings,
    selectedId,
  };
}

function sorter(mode: SortMode): (a: Note, b: Note) => number {
  return (a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    switch (mode) {
      case "created":
        return b.createdAt - a.createdAt;
      case "title":
        return deriveTitle(a.content).localeCompare(deriveTitle(b.content));
      case "updated":
      default:
        return b.updatedAt - a.updatedAt;
    }
  };
}

function normalizeTag(t: string): string {
  return t.trim().replace(/^#/, "").replace(/\s+/g, "-").toLowerCase();
}

function dedupe(arr: string[]): string[] {
  return Array.from(new Set(arr.map((t) => normalizeTag(t)).filter(Boolean)));
}

/** All tags (explicit + inline) across active notes, with counts. */
export function selectAllTags(notes: Note[]): { tag: string; count: number }[] {
  const map = new Map<string, number>();
  for (const n of notes) {
    if (n.deletedAt) continue;
    for (const t of effectiveTags(n)) map.set(t, (map.get(t) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/** Count of notes in Trash. */
export function selectTrashCount(notes: Note[]): number {
  return notes.filter((n) => n.deletedAt).length;
}

/**
 * Notes matching the active filter + search, sorted. Pure function — call inside
 * a component's useMemo. Do NOT pass directly to useStore(): it returns a fresh
 * array each call, which makes zustand's useSyncExternalStore loop infinitely (#185).
 */
export function computeVisibleNotes(
  notes: Note[],
  filter: Filter,
  search: string,
  sort: SortMode = "updated"
): Note[] {
  // Trash view shows only deleted; every other view excludes deleted.
  let list =
    filter.type === "trash" ? notes.filter((n) => n.deletedAt) : notes.filter((n) => !n.deletedAt);

  switch (filter.type) {
    case "favorites":
      list = list.filter((n) => n.favorite);
      break;
    case "folder":
      list = list.filter((n) => n.folderId === filter.id);
      break;
    case "tag":
      list = list.filter((n) => effectiveTags(n).some((t) => t === filter.tag || t.startsWith(filter.tag + "/")));
      break;
  }
  const q = search.trim().toLowerCase();
  if (q) {
    list = list.filter((n) => {
      const inTitle = deriveTitle(n.content).toLowerCase().includes(q);
      const inBody = !n.locked && n.content.toLowerCase().includes(q);
      const inTags = effectiveTags(n).some((t) => t.includes(q));
      return inTitle || inBody || inTags;
    });
  }
  if (filter.type === "trash") return [...list].sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0));
  return [...list].sort(sorter(sort));
}
