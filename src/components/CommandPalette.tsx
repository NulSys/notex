import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Search, FileText, Plus, SunMoon, PanelLeft, Star, CornerDownLeft, RefreshCw } from "lucide-react";
import { useStore } from "../store";
import { useUpdater } from "../lib/updater";
import { deriveTitle, deriveSnippet } from "../lib/markdown";

interface Item {
  key: string;
  group: "Actions" | "Notes";
  title: string;
  sub?: string;
  icon: ReactNode;
  run: () => void;
}

export function CommandPalette() {
  const open = useStore((s) => s.paletteOpen);
  const close = useStore((s) => s.closePalette);
  const notes = useStore((s) => s.notes);
  const select = useStore((s) => s.select);
  const createNote = useStore((s) => s.createNote);
  const cycleTheme = useStore((s) => s.cycleTheme);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const setFilter = useStore((s) => s.setFilter);

  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase();

    const actions: Item[] = [
      {
        key: "act:new",
        group: "Actions",
        title: "Create new note",
        sub: "Start a fresh markdown note",
        icon: <Plus size={17} />,
        run: () => createNote(),
      },
      {
        key: "act:theme",
        group: "Actions",
        title: "Switch theme",
        sub: "Cycle light · dark · system",
        icon: <SunMoon size={17} />,
        run: () => cycleTheme(),
      },
      {
        key: "act:favorites",
        group: "Actions",
        title: "Go to Favorites",
        icon: <Star size={17} />,
        run: () => setFilter({ type: "favorites" }),
      },
      {
        key: "act:sidebar",
        group: "Actions",
        title: "Toggle sidebar",
        icon: <PanelLeft size={17} />,
        run: () => toggleSidebar(),
      },
      {
        key: "act:update",
        group: "Actions",
        title: "Check for updates",
        sub: "See if a newer version of NoteX is available",
        icon: <RefreshCw size={17} />,
        run: () => useUpdater.getState().runCheck(),
      },
    ];

    const matchedActions = q
      ? actions.filter((a) => a.title.toLowerCase().includes(q))
      : actions.slice(0, 2);

    const noteItems: Item[] = notes
      .map((n) => ({ n, title: deriveTitle(n.content) }))
      .filter(({ n, title }) => {
        if (!q) return true;
        return (
          title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.tags.some((t) => t.includes(q))
        );
      })
      .slice(0, q ? 12 : 6)
      .map(({ n, title }) => ({
        key: `note:${n.id}`,
        group: "Notes" as const,
        title,
        sub: deriveSnippet(n.content) || "Empty note",
        icon: <FileText size={17} />,
        run: () => select(n.id),
      }));

    return [...matchedActions, ...noteItems];
  }, [query, notes, createNote, cycleTheme, toggleSidebar, setFilter, select]);

  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, items.length - 1)));
  }, [items.length]);

  if (!open) return null;

  const run = (item: Item) => {
    item.run();
    close();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % Math.max(1, items.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + items.length) % Math.max(1, items.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (items[active]) run(items[active]);
    }
  };

  // group boundaries for labels
  let lastGroup: string | null = null;

  return (
    <div className="overlay" onMouseDown={close}>
      <div className="palette" onMouseDown={(e) => e.stopPropagation()} onKeyDown={onKeyDown}>
        <div className="palette-input">
          <Search size={19} color="var(--text-muted)" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes or run a command…"
            spellCheck={false}
          />
        </div>
        <div className="palette-list" ref={listRef}>
          {items.length === 0 && <div className="palette-empty">No results for “{query}”.</div>}
          {items.map((item, i) => {
            const showLabel = item.group !== lastGroup;
            lastGroup = item.group;
            return (
              <div key={item.key}>
                {showLabel && <div className="palette-group-label">{item.group}</div>}
                <button
                  className={`palette-item${i === active ? " active" : ""}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => run(item)}
                >
                  <span className="p-icon">{item.icon}</span>
                  <span className="p-body">
                    <div className="p-title">{item.title}</div>
                    {item.sub && <div className="p-sub">{item.sub}</div>}
                  </span>
                  {i === active && (
                    <span className="p-hint">
                      <CornerDownLeft size={14} />
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
        <div className="palette-footer">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> navigate
          </span>
          <span>
            <kbd>↵</kbd> open
          </span>
          <span>
            <kbd>esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
