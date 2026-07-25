import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

// Base editor chrome. Colors reference CSS variables so a single theme adapts
// to both light and dark — we only flip the variables on :root.
const baseTheme = EditorView.theme({
  "&": {
    color: "var(--note-text, var(--text))",
    backgroundColor: "transparent",
    height: "100%",
    fontSize: "var(--note-size, 15px)",
  },
  ".cm-scroller": {
    fontFamily: "var(--note-font, var(--font-editor))",
    lineHeight: "1.75",
    padding: "8px 4px 40vh",
    overflow: "auto",
  },
  ".cm-content": {
    caretColor: "var(--accent)",
    maxWidth: "780px",
    margin: "0 auto",
    padding: "0 8px",
  },
  ".cm-line": { padding: "0 4px" },
  "&.cm-focused": { outline: "none" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--accent)", borderLeftWidth: "2px" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
    backgroundColor: "var(--cm-selection)",
  },
  ".cm-gutters": { display: "none" },
  ".cm-activeLine": { backgroundColor: "transparent" },
  ".cm-placeholder": { color: "var(--text-faint)", fontStyle: "normal" },
  ".cm-panels": { backgroundColor: "var(--surface)", color: "var(--text)" },
  ".cm-searchMatch": { backgroundColor: "var(--cm-match)", borderRadius: "3px" },
  ".cm-searchMatch.cm-searchMatch-selected": { backgroundColor: "var(--accent-soft)" },
});

const highlight = HighlightStyle.define([
  { tag: t.heading1, color: "var(--text-strong)", fontWeight: "750", fontSize: "1.5em", lineHeight: "1.4" },
  { tag: t.heading2, color: "var(--text-strong)", fontWeight: "700", fontSize: "1.3em" },
  { tag: t.heading3, color: "var(--text-strong)", fontWeight: "700", fontSize: "1.15em" },
  { tag: [t.heading4, t.heading5, t.heading6], color: "var(--text-strong)", fontWeight: "700" },
  { tag: t.strong, color: "var(--text-strong)", fontWeight: "700" },
  { tag: t.emphasis, fontStyle: "italic", color: "var(--text)" },
  { tag: t.strikethrough, textDecoration: "line-through", color: "var(--text-muted)" },
  { tag: [t.link, t.url], color: "var(--accent)", textDecoration: "underline", textUnderlineOffset: "2px" },
  { tag: t.monospace, color: "var(--cm-code)", fontFamily: "var(--font-mono)" },
  { tag: t.quote, color: "var(--text-muted)", fontStyle: "italic" },
  { tag: [t.list, t.contentSeparator], color: "var(--accent)" },
  { tag: t.processingInstruction, color: "var(--text-faint)" }, // markdown syntax marks (#, *, >)
  { tag: t.meta, color: "var(--text-faint)" },
]);

export const notexEditorTheme = [baseTheme, syntaxHighlighting(highlight)];
