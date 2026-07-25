import { useMemo } from "react";
import {
  Search,
  Plus,
  Pin,
  Star,
  Lock,
  PanelLeftClose,
  PanelLeftOpen,
  Trash2,
  RotateCcw,
  ArrowDownUp,
} from "lucide-react";
import { useStore, computeVisibleNotes } from "../store";
import { deriveTitle, deriveSnippet } from "../lib/markdown";
import { effectiveTags } from "../lib/parse";
import { formatRelative } from "../lib/time";
import type { SortMode } from "../types";

const SORTS: { key: SortMode; label: string }[] = [
  { key: "updated", label: "Last edited" },
  { key: "created", label: "Date created" },
  { key: "title", label: "Title (A–Z)" },
];

export function NoteList() {
  const allNotes = useStore((s) => s.notes);
  const filter = useStore((s) => s.filter);
  const folders = useStore((s) => s.folders);
  const search = useStore((s) => s.search);
  const setSearch = useStore((s) => s.setSearch);
  const selectedId = useStore((s) => s.selectedId);
  const select = useStore((s) => s.select);
  const createNote = useStore((s) => s.createNote);
  const collapsed = useStore((s) => s.settings.sidebarCollapsed);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const sort = useStore((s) => s.settings.sort);
  const setSort = useStore((s) => s.setSort);
  const restoreNote = useStore((s) => s.restoreNote);
  const deleteForever = useStore((s) => s.deleteForever);
  const emptyTrash = useStore((s) => s.emptyTrash);

  const isTrash = filter.type === "trash";
  const notes = useMemo(
    () => computeVisibleNotes(allNotes, filter, search, sort),
    [allNotes, filter, search, sort]
  );

  let heading = "All Notes";
  if (filter.type === "favorites") heading = "Favorites";
  else if (filter.type === "trash") heading = "Trash";
  else if (filter.type === "folder")
    heading = folders.find((f) => f.id === filter.id)?.name ?? "Folder";
  else if (filter.type === "tag") heading = `#${filter.tag}`;

  return (
    <section className="list-col">
      <div className="list-header">
        <div className="list-title-row">
          <div className="list-title">
            <button
              className="icon-btn"
              style={{ width: 30, height: 30, marginLeft: -6 }}
              onClick={toggleSidebar}
              title="Toggle sidebar (Ctrl+\)"
            >
              {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            </button>
            {heading}
          </div>
          {isTrash ? (
            notes.length > 0 && (
              <button
                className="btn"
                onClick={() => {
                  if (confirm(`Permanently delete all ${notes.length} note(s) in Trash?`)) emptyTrash();
                }}
                title="Empty Trash"
              >
                <Trash2 size={15} />
                Empty
              </button>
            )
          ) : (
            <button className="btn primary" onClick={() => createNote()} title="New note (Ctrl+N)">
              <Plus size={15} />
              New
            </button>
          )}
        </div>
        <div className="list-controls">
          <div className="search-box">
            <Search size={15} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes…"
              spellCheck={false}
            />
            {!search && <kbd>Ctrl K</kbd>}
          </div>
          {!isTrash && (
            <div className="sort-menu" title="Sort notes">
              <ArrowDownUp size={14} />
              <select value={sort} onChange={(e) => setSort(e.target.value as SortMode)}>
                {SORTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="note-scroll">
        {notes.length === 0 ? (
          <div className="list-empty">
            {isTrash ? "Trash is empty." : search ? "No matching notes." : "No notes here yet."}
          </div>
        ) : (
          notes.map((n) => {
            const hidden = n.locked && !n.unlocked;
            const title = hidden ? "Locked note" : deriveTitle(n.content);
            const snippet = hidden ? "" : deriveSnippet(n.content);
            const tags = effectiveTags(n);
            return (
              <button
                key={n.id}
                className={`note-card${n.id === selectedId ? " active" : ""}`}
                onClick={() => select(n.id)}
              >
                <div className="note-card-top">
                  {n.locked && (
                    <span className="lock-mark" title="Locked">
                      <Lock size={12} />
                    </span>
                  )}
                  {n.pinned && !isTrash && (
                    <span className="pin-mark" title="Pinned">
                      <Pin size={12} fill="currentColor" />
                    </span>
                  )}
                  <span className="note-card-title">{title}</span>
                  {n.favorite && <Star size={12} className="star-mark" fill="currentColor" />}
                </div>
                <div className="note-card-snippet">
                  {hidden ? "🔒 This note is locked" : snippet || "No additional text"}
                </div>
                <div className="note-card-meta">
                  <span>{isTrash ? `Deleted ${formatRelative(n.deletedAt ?? 0)}` : formatRelative(n.updatedAt)}</span>
                  {!isTrash && tags.length > 0 && (
                    <span
                      className="dot"
                      style={{ width: 3, height: 3, borderRadius: 3, background: "currentColor" }}
                    />
                  )}
                  {!isTrash && (
                    <span className="mini-tags">
                      {tags.slice(0, 3).map((t) => (
                        <span key={t} className="mini-tag">
                          #{t}
                        </span>
                      ))}
                    </span>
                  )}
                  {isTrash && (
                    <span className="trash-actions">
                      <span
                        role="button"
                        title="Restore"
                        onClick={(e) => {
                          e.stopPropagation();
                          restoreNote(n.id);
                        }}
                      >
                        <RotateCcw size={13} />
                      </span>
                      <span
                        role="button"
                        title="Delete forever"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Permanently delete this note?")) deleteForever(n.id);
                        }}
                      >
                        <Trash2 size={13} />
                      </span>
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
