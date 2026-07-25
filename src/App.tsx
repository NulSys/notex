import { useEffect } from "react";
import { useStore } from "./store";
import { Sidebar } from "./components/Sidebar";
import { NoteList } from "./components/NoteList";
import { Editor } from "./components/Editor";
import { CommandPalette } from "./components/CommandPalette";
import { UnlockScreen } from "./components/UnlockScreen";
import { SecurityModal } from "./components/SecurityModal";
import { UpdateModal } from "./components/UpdateModal";
import { SettingsModal } from "./components/SettingsModal";
import { useUpdater } from "./lib/updater";
import { DEFAULT_ACCENT } from "./types";

export default function App() {
  const loaded = useStore((s) => s.loaded);
  const locked = useStore((s) => s.locked);
  const init = useStore((s) => s.init);
  const theme = useStore((s) => s.settings.theme);
  const accent = useStore((s) => s.settings.accent ?? DEFAULT_ACCENT);
  const sidebarCollapsed = useStore((s) => s.settings.sidebarCollapsed);
  const autoLockMinutes = useStore((s) => s.settings.security?.autoLockMinutes ?? 0);
  const lockSession = useStore((s) => s.lockSession);

  const openPalette = useStore((s) => s.openPalette);
  const createNote = useStore((s) => s.createNote);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const cycleTheme = useStore((s) => s.cycleTheme);

  // Boot
  useEffect(() => {
    init();
  }, [init]);

  // Quietly check for updates a few seconds after launch, once IPC has warmed up.
  useEffect(() => {
    const t = setTimeout(() => {
      useUpdater.getState().runCheck({ silent: true });
    }, 4000);
    return () => clearTimeout(t);
  }, []);

  // Resolve + apply theme (light / dark / system)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved = theme === "system" ? (mq.matches ? "dark" : "light") : theme;
      document.documentElement.setAttribute("data-theme", resolved);
      // Remember it so the next launch can apply it before first paint.
      try {
        localStorage.setItem("notex-resolved-theme", resolved);
      } catch {}
    };
    apply();
    if (theme === "system") {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [theme]);

  // Apply the chosen accent preset (drives every accent-derived colour in CSS).
  useEffect(() => {
    document.documentElement.setAttribute("data-accent", accent);
  }, [accent]);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openPalette();
      } else if (mod && e.key.toLowerCase() === "n" && !e.shiftKey) {
        e.preventDefault();
        createNote();
      } else if (mod && e.key === "\\") {
        e.preventDefault();
        toggleSidebar();
      } else if (mod && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        cycleTheme();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openPalette, createNote, toggleSidebar, cycleTheme]);

  // Auto-lock after a period of inactivity.
  useEffect(() => {
    if (!autoLockMinutes || locked) return;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => lockSession(), autoLockMinutes * 60_000);
    };
    const events = ["mousedown", "keydown", "mousemove", "touchstart", "wheel"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [autoLockMinutes, locked, lockSession]);

  if (!loaded) {
    return (
      <div className="boot">
        <div className="brand-mark">N</div>
      </div>
    );
  }

  if (locked) {
    return <UnlockScreen />;
  }

  return (
    <div className={`app${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
      <Sidebar />
      <NoteList />
      <Editor />
      <CommandPalette />
      <SecurityModal />
      <UpdateModal />
      <SettingsModal />
    </div>
  );
}
