import { useMemo, useState } from "react";
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
  Sparkles,
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
  { key: "manual", label: "Manual (drag)" },
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
  const reorderNotes = useStore((s) => s.reorderNotes);
  const restoreNote = useStore((s) => s.restoreNote);
  const deleteForever = useStore((s) => s.deleteForever);
  const emptyTrash = useStore((s) => s.emptyTrash);
  const openAi = useStore((s) => s.openAi);

  const isTrash = filter.type === "trash";
  const notes = useMemo(
    () => computeVisibleNotes(allNotes, filter, search, sort),
    [allNotes, filter, search, sort]
  );

  // Manual drag-to-reorder (only in Manual sort mode).
  const manual = sort === "manual" && !isTrash;
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const dropOnto = (sourceId: string, targetId: string) => {
    if (!sourceId || sourceId === targetId) return;
    const ids = notes.map((n) => n.id);
    const from = ids.indexOf(sourceId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(from, 1);
    ids.splice(to, 0, sourceId);
    reorderNotes(ids);
  };

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
            <div className="list-title-actions">
              <button className="icon-btn" onClick={openAi} title="Notes from image (AI)">
                <Sparkles size={16} />
              </button>
              <button className="btn primary" onClick={() => createNote()} title="New note (Ctrl+N)">
                <Plus size={15} />
                New
              </button>
            </div>
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

      <div
        className="note-scroll"
        onDragOver={
          manual
            ? (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                const card = (e.target as HTMLElement).closest?.(".note-card") as HTMLElement | null;
                const id = card?.dataset.noteId ?? null;
                if (id && id !== overId) setOverId(id);
              }
            : undefined
        }
        onDrop={
          manual
            ? (e) => {
                e.preventDefault();
                const card = (e.target as HTMLElement).closest?.(".note-card") as HTMLElement | null;
                const targetId = card?.dataset.noteId;
                const src = dragId || e.dataTransfer.getData("text/plain");
                if (src && targetId) dropOnto(src, targetId);
                setDragId(null);
                setOverId(null);
              }
            : undefined
        }
      >
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
              <div
                key={n.id}
                role="button"
                tabIndex={0}
                className={`note-card${n.id === selectedId ? " active" : ""}${
                  manual ? " draggable" : ""
                }${dragId === n.id ? " dragging" : ""}${
                  manual && overId === n.id && dragId !== n.id ? " drag-over" : ""
                }`}
                data-note-id={n.id}
                onClick={() => select(n.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    select(n.id);
                  }
                }}
                draggable={manual}
                onDragStart={(e) => {
                  if (!manual) return;
                  // setData is required or Chromium/WebView2 never fires drop.
                  e.dataTransfer.setData("text/plain", n.id);
                  e.dataTransfer.effectAllowed = "move";
                  setDragId(n.id);
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setOverId(null);
                }}
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
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
