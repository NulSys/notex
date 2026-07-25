import type { DateFormat, TimeFormat } from "../types";

const pad = (n: number) => String(n).padStart(2, "0");

/** Format a date per the user's chosen date format. */
export function formatDate(d: Date, fmt: DateFormat): string {
  switch (fmt) {
    case "iso":
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    case "us":
      return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
    case "eu":
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    case "long":
      return d.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    case "med":
    default:
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }
}

/** Format a time per the user's chosen time format. */
export function formatTime(d: Date, fmt: TimeFormat): string {
  const withSeconds = fmt === "12s" || fmt === "24s";
  const hour12 = fmt === "12" || fmt === "12s";
  return d.toLocaleTimeString(undefined, {
    hour: hour12 ? "numeric" : "2-digit",
    minute: "2-digit",
    second: withSeconds ? "2-digit" : undefined,
    hour12,
  });
}

/** Whether a time format shows seconds (so the clock ticks every second). */
export function timeHasSeconds(fmt: TimeFormat): boolean {
  return fmt === "12s" || fmt === "24s";
}

export function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const date = new Date(ts);
  const now = new Date();
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  });
}
