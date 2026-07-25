import { EditorView, keymap } from "@codemirror/view";
import { EditorSelection, Prec } from "@codemirror/state";

/** Wrap each selection with markdown markers (e.g. ** for bold). */
export function wrapInline(view: EditorView, before: string, after = before): boolean {
  const { state } = view;
  const tr = state.changeByRange((range) => ({
    changes: [
      { from: range.from, insert: before },
      { from: range.to, insert: after },
    ],
    range: EditorSelection.range(range.from + before.length, range.to + before.length),
  }));
  view.dispatch(state.update(tr, { scrollIntoView: true }));
  view.focus();
  return true;
}

/** Add or remove a line prefix (e.g. "# ", "- ", "> ") on every selected line. */
export function toggleLinePrefix(view: EditorView, prefix: string): boolean {
  const { state } = view;
  const tr = state.changeByRange((range) => {
    const first = state.doc.lineAt(range.from).number;
    const last = state.doc.lineAt(range.to).number;
    const changes = [];
    let delta = 0;
    for (let n = first; n <= last; n++) {
      const line = state.doc.line(n);
      if (line.text.startsWith(prefix)) {
        changes.push({ from: line.from, to: line.from + prefix.length, insert: "" });
        delta -= prefix.length;
      } else {
        changes.push({ from: line.from, insert: prefix });
        delta += prefix.length;
      }
    }
    return {
      changes,
      range: EditorSelection.range(range.from, Math.max(range.from, range.to + delta)),
    };
  });
  view.dispatch(state.update(tr, { scrollIntoView: true }));
  view.focus();
  return true;
}

/** Insert a markdown link around the selection, leaving the cursor on "url". */
export function insertLink(view: EditorView): boolean {
  const { state } = view;
  const tr = state.changeByRange((range) => {
    const text = state.sliceDoc(range.from, range.to) || "text";
    const insert = `[${text}](url)`;
    const urlStart = range.from + text.length + 3; // "[" + text + "]("
    return {
      changes: { from: range.from, to: range.to, insert },
      range: EditorSelection.range(urlStart, urlStart + 3),
    };
  });
  view.dispatch(state.update(tr, { scrollIntoView: true }));
  view.focus();
  return true;
}

/** Editor keyboard shortcuts for formatting. Highest precedence so they win
 *  over CodeMirror's default emacs-style bindings (e.g. Ctrl-B = move left). */
export const formattingKeymap = Prec.highest(
  keymap.of([
    { key: "Mod-b", run: (v) => wrapInline(v, "**") },
    { key: "Mod-i", run: (v) => wrapInline(v, "*") },
    { key: "Mod-e", run: (v) => wrapInline(v, "`") },
  ])
);
