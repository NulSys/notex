import { create } from "zustand";
import { check, type Update, type DownloadEvent } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export type UpdateStatus =
  | "idle" // nothing happening
  | "checking" // querying the release manifest
  | "available" // a newer version exists, awaiting the user
  | "downloading" // fetching + installing the update
  | "ready" // installed, waiting for a restart
  | "uptodate" // checked, already on the latest
  | "error"; // check or install failed

interface UpdaterState {
  open: boolean; // is the update window visible
  status: UpdateStatus;
  currentVersion: string | null;
  newVersion: string | null;
  notes: string | null;
  date: string | null;
  progress: number; // 0..100 (0 when total size is unknown)
  downloaded: number; // bytes pulled so far
  total: number | null; // total bytes, if the server reports it
  error: string | null;
  _update: Update | null; // the pending update handle (not for UI use)

  /** Query GitHub for a newer release. `silent` = don't surface "up to date"/errors. */
  runCheck: (opts?: { silent?: boolean }) => Promise<void>;
  /** Download the pending update, verify its signature, and install it. */
  downloadAndInstall: () => Promise<void>;
  /** Restart the app so the freshly-installed version takes over. */
  restart: () => Promise<void>;
  closeWindow: () => void;
}

// The updater only exists inside the Tauri desktop runtime. In a plain browser
// dev server (`npm run dev`) the plugin IPC is absent, so we no-op cleanly.
function inTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export const useUpdater = create<UpdaterState>((set, get) => ({
  open: false,
  status: "idle",
  currentVersion: null,
  newVersion: null,
  notes: null,
  date: null,
  progress: 0,
  downloaded: 0,
  total: null,
  error: null,
  _update: null,

  runCheck: async ({ silent = false } = {}) => {
    if (!inTauri()) {
      if (!silent) set({ open: true, status: "error", error: "Updates are only available in the desktop app." });
      return;
    }
    // A manual check opens the window immediately with a spinner; a silent
    // background check stays hidden until it actually finds something.
    set({
      status: "checking",
      error: null,
      open: silent ? get().open : true,
    });
    try {
      const update = await check();
      if (update) {
        set({
          status: "available",
          open: true,
          _update: update,
          currentVersion: update.currentVersion,
          newVersion: update.version,
          notes: update.body ?? null,
          date: update.date ?? null,
          progress: 0,
          downloaded: 0,
          total: null,
        });
      } else {
        set({ status: "uptodate", _update: null, newVersion: null });
      }
    } catch (e) {
      // Before the first release exists, the manifest 404s — that's expected,
      // so a background check swallows it rather than nagging the user.
      console.error("Update check failed:", e);
      if (!silent) set({ status: "error", open: true, error: describe(e) });
      else set({ status: "idle" });
    }
  },

  downloadAndInstall: async () => {
    const update = get()._update;
    if (!update) return;
    set({ status: "downloading", progress: 0, downloaded: 0, total: null, error: null });
    try {
      await update.downloadAndInstall((event: DownloadEvent) => {
        switch (event.event) {
          case "Started": {
            const total = event.data.contentLength ?? null;
            set({ total, downloaded: 0, progress: 0 });
            break;
          }
          case "Progress": {
            const downloaded = get().downloaded + event.data.chunkLength;
            const total = get().total;
            set({
              downloaded,
              progress: total ? Math.min(100, Math.round((downloaded / total) * 100)) : 0,
            });
            break;
          }
          case "Finished": {
            set({ progress: 100 });
            break;
          }
        }
      });
      set({ status: "ready" });
    } catch (e) {
      console.error("Update install failed:", e);
      set({ status: "error", error: describe(e) });
    }
  },

  restart: async () => {
    if (!inTauri()) return;
    await relaunch();
  },

  closeWindow: () => set({ open: false }),
}));

function describe(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return "Something went wrong. Please try again.";
}
