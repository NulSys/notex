import { useEffect, useMemo, useRef, type MouseEvent } from "react";
import { renderMarkdown } from "../lib/markdown";
import { assetUrl } from "../lib/assets";
import { isTauri } from "../lib/env";
import { useStore } from "../store";

export function Preview({ content, noteId }: { content: string; noteId?: string }) {
  const html = useMemo(() => renderMarkdown(content), [content]);
  const ref = useRef<HTMLDivElement>(null);

  // Resolve pasted-image markers to real asset URLs after each render.
  useEffect(() => {
    ref.current?.querySelectorAll("img[data-notex-img]").forEach((el) => {
      const img = el as HTMLImageElement;
      const file = img.getAttribute("data-notex-img");
      if (file) img.src = assetUrl(file);
    });
  }, [html]);
  const toggleTask = useStore((s) => s.toggleTask);
  const openOrCreateByTitle = useStore((s) => s.openOrCreateByTitle);

  const onClick = async (e: MouseEvent<HTMLDivElement>) => {
    const el = e.target as HTMLElement;

    // Checkbox toggle
    if (el instanceof HTMLInputElement && el.type === "checkbox") {
      e.preventDefault();
      if (!noteId) return;
      const boxes = Array.from(ref.current?.querySelectorAll('input[type="checkbox"]') ?? []);
      const index = boxes.indexOf(el);
      if (index >= 0) toggleTask(noteId, index);
      return;
    }

    // Wiki-link
    const wiki = el.closest("a.wikilink") as HTMLElement | null;
    if (wiki) {
      e.preventDefault();
      const target = wiki.getAttribute("data-note");
      if (target) openOrCreateByTitle(target);
      return;
    }

    // External link
    const link = el.closest("a[href]") as HTMLAnchorElement | null;
    if (link) {
      const href = link.getAttribute("href");
      if (href && /^https?:\/\//i.test(href)) {
        e.preventDefault();
        if (isTauri()) {
          const { openUrl } = await import("@tauri-apps/plugin-opener");
          openUrl(href).catch(() => {});
        } else {
          window.open(href, "_blank", "noopener");
        }
      }
    }
  };

  return (
    <div className="preview-scroll">
      <div
        ref={ref}
        className="markdown"
        onClick={onClick}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
