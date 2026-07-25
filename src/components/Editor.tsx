import { useState, type KeyboardEvent } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { EditorView } from "@codemirror/view";
import {
  Pencil,
  Columns2,
  Eye,
  Pin,
  Star,
  Download,
  Trash2,
  FileText,
  X,
  Plus,
  Info,
  Link2,
  ListTree,
  Clock,
  Lock,
  LockOpen,
} from "lucide-react";
import { useStore } from "../store";
import { notexEditorTheme } from "../lib/editor";
import { deriveTitle, wordCount, readingTime, slug } from "../lib/markdown";
import { extractHeadings, parseWikiLinks } from "../lib/parse";
import { formatRelative } from "../lib/time";
import { exportNoteToFile } from "../lib/storage";
import { notexAutocomplete } from "../lib/completions";
import { hasMasterKey } from "../lib/crypto";
import { Preview } from "./Preview";
import { LockedNote } from "./LockedNote";
import { FooterClock } from "./FooterClock";

const cmExtensions = [
  markdown({ base: markdownLanguage, codeLanguages: languages }),
  EditorView.lineWrapping,
  notexAutocomplete,
  notexEditorTheme,
];

export function Editor() {
  const note = useStore((s) => s.notes.find((n) => n.id === s.selectedId) ?? null);
  const notes = useStore((s) => s.notes);
  const viewMode = useStore((s) => s.settings.viewMode);
  const setViewMode = useStore((s) => s.setViewMode);
  const updateNoteContent = useStore((s) => s.updateNoteContent);
  const togglePin = useStore((s) => s.togglePin);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const deleteNote = useStore((s) => s.deleteNote);
  const addTag = useStore((s) => s.addTag);
  const removeTag = useStore((s) => s.removeTag);
  const createNote = useStore((s) => s.createNote);
  const select = useStore((s) => s.select);
  const security = useStore((s) => s.settings.security);
  const lockNote = useStore((s) => s.lockNote);
  const provideKey = useStore((s) => s.provideKey);
  const openSecurity = useStore((s) => s.openSecurity);

  const [tagInput, setTagInput] = useState("");
  const [showInfo, setShowInfo] = useState(false);

  if (!note) {
    return (
      <section className="editor-col">
        <div className="empty">
          <div className="empty-inner">
            <div className="empty-icon">
              <FileText size={30} />
            </div>
            <h2>No note selected</h2>
            <p>Pick a note from the list, or create a new one to start writing in markdown.</p>
            <button className="btn primary" onClick={() => createNote()}>
              <Plus size={15} /> New note
            </button>
          </div>
        </div>
      </section>
    );
  }

  const onTagKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim()) {
      addTag(note.id, tagInput);
      setTagInput("");
    } else if (e.key === "Backspace" && !tagInput && note.tags.length) {
      removeTag(note.id, note.tags[note.tags.length - 1]);
    }
  };

  const onExport = async () => {
    await exportNoteToFile(deriveTitle(note.content) || "note", note.content);
  };

  const onDelete = () => deleteNote(note.id); // soft-delete → Trash

  const onLockToggle = async () => {
    if (!security) {
      openSecurity(); // must set up a passphrase first
      return;
    }
    // Lock / re-lock the current note. Ensure we hold the key.
    if (!hasMasterKey()) {
      const p = prompt("Enter your passphrase to lock this note:");
      if (!p) return;
      if (!(await provideKey(p))) {
        alert("Incorrect passphrase.");
        return;
      }
    }
    await lockNote(note.id);
  };

  const isOpenLocked = note.locked && note.unlocked; // decrypted this session
  const showEditor = viewMode === "edit" || viewMode === "split";
  const showPreview = viewMode === "preview" || viewMode === "split";

  const headings = extractHeadings(note.content);
  const myTitle = deriveTitle(note.content).toLowerCase();
  const backlinks = notes.filter(
    (n) =>
      n.id !== note.id &&
      !n.deletedAt &&
      !n.locked &&
      parseWikiLinks(n.content).some((t) => t.toLowerCase() === myTitle)
  );

  const scrollToHeading = (text: string) => {
    document.querySelector(`.preview-scroll #h-${slug(text)}`)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="editor-col">
      <div className="toolbar">
        <div className="segmented">
          <button className={viewMode === "edit" ? "active" : ""} onClick={() => setViewMode("edit")} title="Editor only">
            <Pencil size={16} />
          </button>
          <button className={viewMode === "split" ? "active" : ""} onClick={() => setViewMode("split")} title="Split view">
            <Columns2 size={16} />
          </button>
          <button className={viewMode === "preview" ? "active" : ""} onClick={() => setViewMode("preview")} title="Preview only">
            <Eye size={16} />
          </button>
        </div>

        <div className="spacer" />

        <button
          className={`icon-btn${note.pinned ? " on" : ""}`}
          onClick={() => togglePin(note.id)}
          title={note.pinned ? "Unpin" : "Pin to top"}
        >
          <Pin size={17} fill={note.pinned ? "currentColor" : "none"} />
        </button>
        <button
          className={`icon-btn star${note.favorite ? " on" : ""}`}
          onClick={() => toggleFavorite(note.id)}
          title={note.favorite ? "Remove favorite" : "Add to favorites"}
        >
          <Star size={17} fill={note.favorite ? "currentColor" : "none"} />
        </button>
        <button
          className={`icon-btn${showInfo ? " on" : ""}`}
          onClick={() => setShowInfo((v) => !v)}
          title="Note info, outline & backlinks"
        >
          <Info size={17} />
        </button>
        <button
          className={`icon-btn${note.locked ? " on" : ""}`}
          onClick={onLockToggle}
          title={note.locked ? "Re-lock note" : "Lock note"}
        >
          {isOpenLocked ? <LockOpen size={17} /> : <Lock size={17} />}
        </button>
        <button className="icon-btn" onClick={onExport} title="Export as Markdown">
          <Download size={17} />
        </button>
        <button className="icon-btn danger" onClick={onDelete} title="Move to Trash">
          <Trash2 size={17} />
        </button>
      </div>

      <div className="tag-bar">
        {note.tags.map((t) => (
          <span key={t} className="tag-pill">
            #{t}
            <button onClick={() => removeTag(note.id, t)} title="Remove tag">
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          className="tag-add"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={onTagKey}
          placeholder={note.tags.length ? "Add tag…" : "Add tags…  (or type #tags in the note)"}
          spellCheck={false}
        />
      </div>

      {note.locked && !note.unlocked ? (
        <LockedNote noteId={note.id} />
      ) : (
      <div className="editor-main">
        <div className={`editor-body ${viewMode === "split" ? "split" : "single"}`}>
          {showEditor && (
            <div className="pane editor-pane">
              <div className="cm-host">
                <CodeMirror
                  key={note.id}
                  value={note.content}
                  onChange={(val) => updateNoteContent(note.id, val)}
                  extensions={cmExtensions}
                  basicSetup={{
                    lineNumbers: false,
                    foldGutter: false,
                    highlightActiveLine: false,
                    highlightActiveLineGutter: false,
                    autocompletion: false,
                    bracketMatching: false,
                  }}
                  placeholder="Start writing in markdown…  Try [[links]], #tags, and > [!tip] callouts"
                  autoFocus
                  theme="none"
                />
              </div>
            </div>
          )}
          {showPreview && (
            <div className="pane preview-pane">
              <Preview content={note.content} noteId={note.id} />
            </div>
          )}
        </div>

        {showInfo && (
          <aside className="info-panel">
            <div className="info-section">
              <div className="info-head">
                <Clock size={14} /> Info
              </div>
              <div className="info-stats">
                <div><b>{wordCount(note.content)}</b><span>words</span></div>
                <div><b>{readingTime(note.content)}</b><span>min read</span></div>
                <div><b>{note.content.length}</b><span>chars</span></div>
              </div>
              <div className="info-meta">
                <div><span>Created</span>{formatRelative(note.createdAt)}</div>
                <div><span>Modified</span>{formatRelative(note.updatedAt)}</div>
              </div>
            </div>

            <div className="info-section">
              <div className="info-head">
                <ListTree size={14} /> Outline
              </div>
              {headings.length === 0 ? (
                <div className="info-empty">No headings</div>
              ) : (
                <div className="outline">
                  {headings.map((h, i) => (
                    <button
                      key={i}
                      className="outline-item"
                      style={{ paddingLeft: 4 + (h.level - 1) * 12 }}
                      onClick={() => scrollToHeading(h.text)}
                    >
                      {h.text}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="info-section">
              <div className="info-head">
                <Link2 size={14} /> Backlinks
                {backlinks.length > 0 && <span className="info-badge">{backlinks.length}</span>}
              </div>
              {backlinks.length === 0 ? (
                <div className="info-empty">
                  No backlinks yet. Link here with <code>[[{deriveTitle(note.content)}]]</code>.
                </div>
              ) : (
                <div className="backlinks">
                  {backlinks.map((b) => (
                    <button key={b.id} className="backlink-item" onClick={() => select(b.id)}>
                      <FileText size={13} />
                      {deriveTitle(b.content)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
      )}

      <div className="statusbar">
        <span>{wordCount(note.content)} words</span>
        <span className="dot" />
        <span>{readingTime(note.content)} min read</span>
        <span className="dot" />
        <span>Edited {formatRelative(note.updatedAt)}</span>
        <div style={{ flex: 1 }} />
        <FooterClock />
        <span className="dot" />
        <span style={{ opacity: 0.7 }}>Autosaved</span>
      </div>
    </section>
  );
}
