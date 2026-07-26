import { isTauri } from "./env";

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Mix a hex color toward another hex by `amount` (0..1); returns "#rrggbb". */
function mix(hex: string, toward: string, amount: number): string {
  const a = hexToRgb(hex);
  const b = hexToRgb(toward);
  const ch = (x: number, y: number) => Math.round(x + (y - x) * amount);
  const to2 = (v: number) => v.toString(16).padStart(2, "0");
  return `#${to2(ch(a.r, b.r))}${to2(ch(a.g, b.g))}${to2(ch(a.b, b.b))}`;
}

/** The NoteX "N" monogram, gradient-tinted to the given accent color. */
function iconSvg(accent: string): string {
  const light = mix(accent, "#ffffff", 0.18);
  const dark = mix(accent, "#000000", 0.28);
  const dot = mix(accent, "#ffffff", 0.72);
  return `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1024" y2="1024" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${light}"/>
      <stop offset="0.55" stop-color="${accent}"/>
      <stop offset="1" stop-color="${dark}"/>
    </linearGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1024" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.22"/>
      <stop offset="0.5" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect x="112" y="96" width="800" height="800" rx="196" fill="url(#bg)"/>
  <rect x="112" y="96" width="800" height="800" rx="196" fill="url(#sheen)"/>
  <rect x="112.5" y="96.5" width="799" height="799" rx="195.5" fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="3"/>
  <g fill="#ffffff" fill-opacity="0.85">
    <rect x="360" y="640" width="304" height="34" rx="17"/>
    <rect x="360" y="712" width="220" height="34" rx="17" fill-opacity="0.55"/>
  </g>
  <path d="M 372 356 L 372 596 L 424 596 L 424 452 L 600 596 L 652 596 L 652 356 L 600 356 L 600 500 L 424 356 Z" fill="#ffffff"/>
  <circle cx="676" cy="372" r="26" fill="${dot}"/>
</svg>`;
}

function svgToPng(dataUrl: string, size: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no 2d context"));
      ctx.drawImage(image, 0, 0, size, size);
      canvas.toBlob(async (blob) => {
        if (!blob) return reject(new Error("toBlob failed"));
        resolve(new Uint8Array(await blob.arrayBuffer()));
      }, "image/png");
    };
    image.onerror = () => reject(new Error("SVG failed to load"));
    image.src = dataUrl;
  });
}

/** Re-tint the running window/taskbar icon to match the accent color. */
export async function applyAccentIcon(accent: string): Promise<void> {
  if (!isTauri()) return;
  try {
    const svg = iconSvg(accent);
    const dataUrl = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
    const png = await svgToPng(dataUrl, 256);
    const [{ Image }, { getCurrentWindow }] = await Promise.all([
      import("@tauri-apps/api/image"),
      import("@tauri-apps/api/window"),
    ]);
    const img = await Image.fromBytes(png);
    await getCurrentWindow().setIcon(img);
  } catch (e) {
    console.error("Failed to set accent icon:", e);
  }
}
