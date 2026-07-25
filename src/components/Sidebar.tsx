import { useEffect, useRef, useState } from "react";
import {
  NotebookText,
  Star,
  FolderClosed,
  Plus,
  Sun,
  Moon,
  MonitorSmartphone,
  Trash2,
  Upload,
  Hash,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { useStore, selectAllTags, selectTrashCount, type Filter } from "../store";
import { importMarkdownFiles } from "../lib/storage";
import { buildTagTree, type TagNode } from "../lib/parse";

export function Sidebar() {
  const notes = useStore((s) => s.notes);
  const folders = useStore((s) => s.folders);
  const filter = useStore((s) => s.filter);
  const setFilter = useStore((s) => s.setFilter);
  const createFolder = useStore((s) => s.createFolder);
  const renameFolder = useStore((s) => s.renameFolder);
  const deleteFolder = useStore((s) => s.deleteFolder);
  const theme = useStore((s) => s.settings.theme);
  const cycleTheme = useStore((s) => s.cycleTheme);
  const createNote = useStore((s) => s.createNote);
  const openSecurity = useStore((s) => s.openSecurity);
  const hasVault = useStore((s) => !!s.settings.security);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId) renameRef.current?.select();
  }, [renamingId]);

  const activeNotes = notes.filter((n) => !n.deletedAt);
  const tagTree = buildTagTree(selectAllTags(notes));
  const favCount = activeNotes.filter((n) => n.favorite).length;
  const trashCount = selectTrashCount(notes);
  const isActive = (f: Filter) =>
    filter.type === f.type &&
    (f.type !== "folder" || (filter as any).id === (f as any).id) &&
    (f.type !== "tag" || (filter as any).tag === (f as any).tag);

  const startRename = (id: string, name: string) => {
    setRenamingId(id);
    setRenameValue(name);
  };
  const commitRename = () => {
    if (renamingId) renameFolder(renamingId, renameValue);
    setRenamingId(null);
  };

  const onAddFolder = () => {
    const id = createFolder("New Folder");
    setFilter({ type: "folder", id });
    startRename(id, "New Folder");
  };

  const onImport = async () => {
    const files = await importMarkdownFiles();
    for (const f of files)
      createNote({
        content: f.content.startsWith("#") ? f.content : `# ${f.name}\n\n${f.content}`,
        select: false,
      });
  };

  const ThemeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : MonitorSmartphone;

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">N</div>
        <div className="brand-name">
          Note<span>X</span>
        </div>
      </div>

      <button
        className={`nav-item${isActive({ type: "all" }) ? " active" : ""}`}
        onClick={() => setFilter({ type: "all" })}
      >
        <span className="nav-icon">
          <NotebookText size={17} />
        </span>
        <span className="nav-text">All Notes</span>
        <span className="nav-count">{activeNotes.length}</span>
      </button>

      <button
        className={`nav-item${isActive({ type: "favorites" }) ? " active" : ""}`}
        onClick={() => setFilter({ type: "favorites" })}
      >
        <span className="nav-icon">
          <Star size={17} />
        </span>
        <span className="nav-text">Favorites</span>
        {favCount > 0 && <span className="nav-count">{favCount}</span>}
      </button>

      <div className="nav-scroll">
        <div className="nav-section">
          <div className="nav-label">
            <span>Folders</span>
            <button onClick={onAddFolder} title="New folder">
              <Plus size={14} />
            </button>
          </div>
          {folders.length === 0 && <div className="nav-hint">No folders yet</div>}
          {folders.map((f) => {
            const count = activeNotes.filter((n) => n.folderId === f.id).length;
            const active = isActive({ type: "folder", id: f.id });
            if (renamingId === f.id) {
              return (
                <div key={f.id} style={{ padding: "2px 6px" }}>
                  <input
                    ref={renameRef}
                    className="inline-input"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                  />
                </div>
              );
            }
            return (
              <button
                key={f.id}
                className={`nav-item${active ? " active" : ""}`}
                onClick={() => setFilter({ type: "folder", id: f.id })}
                onDoubleClick={() => startRename(f.id, f.name)}
              >
                <span className="nav-icon">
                  <FolderClosed size={16} style={{ color: f.color }} />
                </span>
                <span className="nav-text">{f.name}</span>
                {active ? (
                  <span
                    className="nav-count"
                    role="button"
                    title="Delete folder"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete folder "${f.name}"? Notes inside will move to All Notes.`))
                        deleteFolder(f.id);
                    }}
                  >
                    <Trash2 size={13} />
                  </span>
                ) : (
                  count > 0 && <span className="nav-count">{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {tagTree.length > 0 && (
          <div className="nav-section">
            <div className="nav-label">
              <span>Tags</span>
            </div>
            {tagTree.map((node) => (
              <TagBranch
                key={node.path}
                node={node}
                depth={0}
                activePath={filter.type === "tag" ? filter.tag : null}
                onSelect={(tag) => setFilter({ type: "tag", tag })}
              />
            ))}
          </div>
        )}
      </div>

      <button
        className={`nav-item${isActive({ type: "trash" }) ? " active" : ""}`}
        onClick={() => setFilter({ type: "trash" })}
      >
        <span className="nav-icon">
          <Trash2 size={17} />
        </span>
        <span className="nav-text">Trash</span>
        {trashCount > 0 && <span className="nav-count">{trashCount}</span>}
      </button>

      <div className="sidebar-footer">
        <button
          className="btn ghost"
          style={{ flex: 1, justifyContent: "center" }}
          onClick={cycleTheme}
          title="Switch theme (Ctrl+Shift+D)"
        >
          <ThemeIcon size={16} />
          <span style={{ textTransform: "capitalize" }}>{theme}</span>
        </button>
        <button
          className={`icon-btn${hasVault ? " on" : ""}`}
          onClick={openSecurity}
          title="Security & encryption"
        >
          <ShieldCheck size={16} />
        </button>
        <button className="icon-btn" onClick={onImport} title="Import markdown files">
          <Upload size={16} />
        </button>
      </div>
    </aside>
  );
}

function TagBranch({
  node,
  depth,
  activePath,
  onSelect,
}: {
  node: TagNode;
  depth: number;
  activePath: string | null;
  onSelect: (tag: string) => void;
}) {
  const [open, setOpen] = useState(depth === 0);
  const hasChildren = node.children.length > 0;
  const active = activePath === node.path;
  return (
    <>
      <button
        className={`nav-item tag-item${active ? " active" : ""}`}
        style={{ paddingLeft: 10 + depth * 14 }}
        onClick={() => onSelect(node.path)}
      >
        <span
          className="nav-icon tag-caret"
          onClick={(e) => {
            if (hasChildren) {
              e.stopPropagation();
              setOpen((o) => !o);
            }
          }}
        >
          {hasChildren ? (
            <ChevronRight size={14} className={`caret${open ? " open" : ""}`} />
          ) : (
            <Hash size={14} />
          )}
        </span>
        <span className="nav-text">{node.name}</span>
        {node.count > 0 && <span className="nav-count">{node.count}</span>}
      </button>
      {hasChildren && open &&
        node.children.map((child) => (
          <TagBranch
            key={child.path}
            node={child}
            depth={depth + 1}
            activePath={activePath}
            onSelect={onSelect}
          />
        ))}
    </>
  );
}
