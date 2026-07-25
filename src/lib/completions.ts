import { autocompletion, type CompletionContext, type CompletionResult } from "@codemirror/autocomplete";
import { useStore, selectAllTags } from "../store";
import { deriveTitle } from "./markdown";

// Suggest existing note titles after "[[".
function wikiSource(ctx: CompletionContext): CompletionResult | null {
  const m = ctx.matchBefore(/\[\[([^\]\n]*)$/);
  if (!m) return null;
  const notes = useStore.getState().notes.filter((n) => !n.deletedAt && !n.locked);
  const seen = new Set<string>();
  const options = notes
    .map((n) => deriveTitle(n.content))
    .filter((t) => t && t !== "Untitled" && !seen.has(t) && seen.add(t))
    .map((t) => ({ label: t, type: "text", apply: `${t}]]` }));
  if (options.length === 0) return null;
  return { from: m.from + 2, options, validFor: /^[^\]\n]*$/ };
}

// Suggest existing tags after "#word".
function tagSource(ctx: CompletionContext): CompletionResult | null {
  const m = ctx.matchBefore(/#([\w/-]+)$/);
  if (!m) return null;
  const tags = selectAllTags(useStore.getState().notes);
  const options = tags.map((t) => ({
    label: `#${t.tag}`,
    detail: `${t.count}`,
    type: "keyword",
    apply: `#${t.tag}`,
  }));
  if (options.length === 0) return null;
  return { from: m.from, options, validFor: /^#[\w/-]*$/ };
}

export const notexAutocomplete = autocompletion({
  override: [wikiSource, tagSource],
  icons: false,
  activateOnTyping: true,
});
