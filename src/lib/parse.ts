import type { Note } from "../types";

// Strip fenced code blocks and inline code so we don't pick up tags/links inside code.
function stripCode(md: string): string {
  return (md ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ");
}

// Inline tags: #work, #work/ios, #2026-goals. Nested via "/". Not inside code.
const TAG_RE = /(^|[\s(])#([A-Za-z0-9_][A-Za-z0-9_/-]*)/g;

export function parseInlineTags(content: string): string[] {
  const text = stripCode(content);
  const out: string[] = [];
  let m: RegExpExecArray | null;
  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(text))) {
    const tag = m[2].replace(/\/+$/, "").toLowerCase();
    if (tag) out.push(tag);
  }
  return out;
}

// Wiki-links: [[Note Title]] or [[Note Title|alias]]. Returns the target titles.
const LINK_RE = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;

export function parseWikiLinks(content: string): string[] {
  const text = stripCode(content);
  const out: string[] = [];
  let m: RegExpExecArray | null;
  LINK_RE.lastIndex = 0;
  while ((m = LINK_RE.exec(text))) {
    const target = m[1].trim();
    if (target) out.push(target);
  }
  return out;
}

export interface Heading {
  level: number;
  text: string;
}

/** Markdown headings for a table-of-contents outline (ignores headings inside code fences). */
export function extractHeadings(content: string): Heading[] {
  const out: Heading[] = [];
  let inFence = false;
  for (const line of (content ?? "").split("\n")) {
    if (/^```/.test(line.trim())) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = /^(#{1,6})\s+(.*)$/.exec(line);
    if (m) out.push({ level: m[1].length, text: m[2].replace(/[*_`~]/g, "").trim() });
  }
  return out;
}

/** Explicit tag pills + inline #tags from the body, deduped and normalized. */
export function effectiveTags(note: Note): string[] {
  if (note.locked) return note.tags;
  const all = [...note.tags, ...parseInlineTags(note.content)].map((t) =>
    t.replace(/^#/, "").toLowerCase()
  );
  return Array.from(new Set(all.filter(Boolean)));
}

/** Build a nested tree from flat nested-tag strings like "work/ios/ui". */
export interface TagNode {
  name: string; // segment label
  path: string; // full path "work/ios"
  count: number; // notes with this exact tag or a descendant
  ownCount: number; // notes with exactly this tag
  children: TagNode[];
}

export function buildTagTree(tagCounts: { tag: string; count: number }[]): TagNode[] {
  const roots: TagNode[] = [];
  const index = new Map<string, TagNode>();

  const ensure = (path: string): TagNode => {
    const existing = index.get(path);
    if (existing) return existing;
    const segs = path.split("/");
    const name = segs[segs.length - 1];
    const node: TagNode = { name, path, count: 0, ownCount: 0, children: [] };
    index.set(path, node);
    if (segs.length === 1) {
      roots.push(node);
    } else {
      const parent = ensure(segs.slice(0, -1).join("/"));
      parent.children.push(node);
    }
    return node;
  };

  for (const { tag, count } of tagCounts) {
    const node = ensure(tag);
    node.ownCount += count;
    // add to count of this node and all ancestors
    const segs = tag.split("/");
    for (let i = 1; i <= segs.length; i++) {
      const p = segs.slice(0, i).join("/");
      const n = index.get(p);
      if (n) n.count += count;
    }
  }

  const sortRec = (nodes: TagNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}
