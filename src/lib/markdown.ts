import { Marked, type Tokens } from "marked";
import { markedHighlight } from "marked-highlight";
import markedKatex from "marked-katex-extension";
import markedFootnote from "marked-footnote";
import hljs from "highlight.js/lib/common";
import DOMPurify from "dompurify";

const CALLOUT_META: Record<string, { icon: string; label: string }> = {
  note: { icon: "📝", label: "Note" },
  info: { icon: "ℹ️", label: "Info" },
  tip: { icon: "💡", label: "Tip" },
  important: { icon: "❗", label: "Important" },
  warning: { icon: "⚠️", label: "Warning" },
  caution: { icon: "🔥", label: "Caution" },
  danger: { icon: "⛔", label: "Danger" },
  success: { icon: "✅", label: "Success" },
  question: { icon: "❓", label: "Question" },
  quote: { icon: "❝", label: "Quote" },
  example: { icon: "🧪", label: "Example" },
  todo: { icon: "☑️", label: "To-do" },
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const marked = new Marked(
  markedHighlight({
    emptyLangClass: "hljs",
    langPrefix: "hljs language-",
    highlight(code, lang) {
      if (lang === "mermaid") return code; // handled at render time in the preview
      const language = hljs.getLanguage(lang) ? lang : "plaintext";
      return hljs.highlight(code, { language }).value;
    },
  })
);

marked.setOptions({ gfm: true, breaks: true });

export function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

// Add ids to headings so the outline can scroll to them.
marked.use({
  renderer: {
    heading({ tokens, depth }: Tokens.Heading) {
      const text = this.parser.parseInline(tokens);
      const raw = tokens.map((t) => ("text" in t ? (t as any).text : "")).join("");
      return `<h${depth} id="h-${slug(raw)}">${text}</h${depth}>\n`;
    },
  },
});

marked.use(markedFootnote());
marked.use(markedKatex({ throwOnError: false, nonStandard: true }));

// [[Wiki-links]] → clickable spans resolved in the preview.
marked.use({
  extensions: [
    {
      name: "wikilink",
      level: "inline",
      start(src: string) {
        return src.indexOf("[[");
      },
      tokenizer(src: string) {
        const m = /^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/.exec(src);
        if (!m) return undefined;
        return {
          type: "wikilink",
          raw: m[0],
          target: m[1].trim(),
          alias: (m[2] || m[1]).trim(),
        } as any;
      },
      renderer(token: any) {
        return `<a class="wikilink" data-note="${esc(token.target)}" href="#">${esc(token.alias)}</a>`;
      },
    },
    // Obsidian-style callouts: > [!warning] Title \n > body
    {
      name: "callout",
      level: "block",
      start(src: string) {
        const i = src.search(/^> *\[!/m);
        return i < 0 ? undefined : i;
      },
      tokenizer(src: string) {
        const rule = /^(> *\[!(\w+)\][+-]? *(.*)(?:\n|$)(?:>.*(?:\n|$))*)/;
        const m = rule.exec(src);
        if (!m) return undefined;
        const type = m[2].toLowerCase();
        if (!CALLOUT_META[type]) return undefined;
        const lines = m[1].split("\n");
        const body = lines
          .slice(1)
          .map((l) => l.replace(/^>\s?/, ""))
          .join("\n")
          .trim();
        const tokens = this.lexer.blockTokens(body, [] as any);
        return {
          type: "callout",
          raw: m[1],
          calloutType: type,
          title: m[3].trim(),
          tokens,
        } as any;
      },
      renderer(token: any) {
        const meta = CALLOUT_META[token.calloutType] ?? CALLOUT_META.note;
        const body = this.parser.parse(token.tokens);
        const title = token.title ? esc(token.title) : meta.label;
        return `<div class="callout callout-${token.calloutType}"><div class="callout-title"><span class="callout-icon">${meta.icon}</span>${title}</div><div class="callout-body">${body}</div></div>`;
      },
    },
  ],
});

/** Render markdown to sanitized HTML. */
export function renderMarkdown(md: string): string {
  const rawHtml = marked.parse(md ?? "", { async: false }) as string;
  const clean = DOMPurify.sanitize(rawHtml, {
    ADD_ATTR: ["target", "data-note", "data-task-index"],
  });
  // Enable GFM task checkboxes so the preview can toggle them.
  return clean.replace(/(<input[^>]*type="checkbox"[^>]*?)\sdisabled(="")?/g, "$1");
}

/** Derive a display title from a note's content (first meaningful line). */
export function deriveTitle(content: string): string {
  const line = (content ?? "")
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  if (!line) return "Untitled";
  const cleaned = line
    .replace(/^#{1,6}\s+/, "")
    .replace(/^[-*+]\s+/, "")
    .replace(/^>\s+/, "")
    .replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, "$1")
    .replace(/[*_`~]/g, "")
    .trim();
  return cleaned.slice(0, 120) || "Untitled";
}

/** A short plain-text snippet for note-list previews. */
export function deriveSnippet(content: string): string {
  const lines = (content ?? "").split("\n").map((l) => l.trim());
  const title = deriveTitle(content);
  const body = lines
    .filter((l) => l.length > 0)
    .map((l) =>
      l
        .replace(/^#{1,6}\s+/, "")
        .replace(/^[-*+]\s+/, "")
        .replace(/^>\s+/, "")
        .replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, "$1")
        .replace(/[*_`~#]/g, "")
        .trim()
    )
    .filter((l) => l && l !== title);
  return body.join("  ").slice(0, 160);
}

/** Rough word count for the status bar. */
export function wordCount(content: string): number {
  const m = (content ?? "").trim().match(/\S+/g);
  return m ? m.length : 0;
}

/** Estimated reading time in minutes (~220 wpm). */
export function readingTime(content: string): number {
  return Math.max(1, Math.round(wordCount(content) / 220));
}

// Re-export the Tokens type to satisfy TS in strict mode if referenced elsewhere.
export type { Tokens };
