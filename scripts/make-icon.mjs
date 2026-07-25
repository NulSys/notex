import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// A sleek rounded-square logo: deep indigo→violet gradient with a bold "N" monogram
// and three "note line" accents. Rendered at 1024×1024 for `tauri icon`.
const svg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1024" y2="1024" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#7c6cff"/>
      <stop offset="0.55" stop-color="#6d5efc"/>
      <stop offset="1" stop-color="#4f46e5"/>
    </linearGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1024" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.22"/>
      <stop offset="0.5" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="22" stdDeviation="26" flood-color="#1e1b4b" flood-opacity="0.35"/>
    </filter>
  </defs>

  <rect x="112" y="96" width="800" height="800" rx="196" fill="url(#bg)" filter="url(#soft)"/>
  <rect x="112" y="96" width="800" height="800" rx="196" fill="url(#sheen)"/>
  <rect x="112.5" y="96.5" width="799" height="799" rx="195.5" fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="3"/>

  <!-- note lines -->
  <g fill="#ffffff" fill-opacity="0.85">
    <rect x="360" y="640" width="304" height="34" rx="17"/>
    <rect x="360" y="712" width="220" height="34" rx="17" fill-opacity="0.55"/>
  </g>

  <!-- N monogram -->
  <path d="M 372 356 L 372 596 L 424 596 L 424 452 L 600 596 L 652 596 L 652 356 L 600 356 L 600 500 L 424 356 Z"
        fill="#ffffff"/>
  <circle cx="676" cy="372" r="26" fill="#c7f9cc"/>
</svg>`;

async function main() {
  const iconsDir = join(root, "src-tauri", "icons");
  mkdirSync(iconsDir, { recursive: true });
  const out = join(root, "app-icon.png");
  await sharp(Buffer.from(svg)).resize(1024, 1024).png().toFile(out);
  console.log("Wrote", out);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
