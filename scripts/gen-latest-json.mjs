// Generates the `latest.json` update manifest that the Tauri updater reads from
// GitHub Releases. Run it AFTER `npm run app:build` has produced a signed NSIS
// installer (`.exe`) and its detached signature (`.exe.sig`).
//
//   node scripts/gen-latest-json.mjs
//
// Release notes: put them in RELEASE_NOTES.md at the repo root (or set the
// RELEASE_NOTES env var). Falls back to a generic line if neither is present.
//
// Output: ./latest.json  — upload this alongside the installer to the GitHub
// release tagged `v<version>`.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const GH_OWNER = "NulSys";
const GH_REPO = "notex";

const conf = JSON.parse(readFileSync(join(root, "src-tauri", "tauri.conf.json"), "utf8"));
const version = conf.version;
const productName = conf.productName; // "NoteX"

const tag = `v${version}`;
const installerName = `${productName}_${version}_x64-setup.exe`;
const sigPath = join(root, "src-tauri", "target", "release", "bundle", "nsis", `${installerName}.sig`);

if (!existsSync(sigPath)) {
  console.error(`\n  ✗ Signature not found:\n    ${sigPath}\n`);
  console.error("  Did the build run with signing env vars set? See RELEASING.md.\n");
  process.exit(1);
}

const signature = readFileSync(sigPath, "utf8").trim();

let notes = process.env.RELEASE_NOTES?.trim();
if (!notes) {
  const notesFile = join(root, "RELEASE_NOTES.md");
  if (existsSync(notesFile)) notes = readFileSync(notesFile, "utf8").trim();
}
if (!notes) notes = `NoteX ${version}`;

const manifest = {
  version,
  notes,
  pub_date: new Date().toISOString(),
  platforms: {
    "windows-x86_64": {
      signature,
      url: `https://github.com/${GH_OWNER}/${GH_REPO}/releases/download/${tag}/${installerName}`,
    },
  },
};

const outPath = join(root, "latest.json");
writeFileSync(outPath, JSON.stringify(manifest, null, 2));

console.log(`\n  ✓ Wrote ${outPath}`);
console.log(`\n  Upload these two files to the GitHub release "${tag}":`);
console.log(`    • ${installerName}`);
console.log(`    • latest.json\n`);
console.log(`  Installer path:`);
console.log(`    src-tauri/target/release/bundle/nsis/${installerName}\n`);
