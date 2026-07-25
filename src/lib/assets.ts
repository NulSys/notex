import { appDataDir, join } from "@tauri-apps/api/path";
import { mkdir, writeFile } from "@tauri-apps/plugin-fs";
import { convertFileSrc } from "@tauri-apps/api/core";
import { isTauri } from "./env";
import { uid } from "./id";

// Pasted images are stored as files under <appData>/images and referenced in
// note markdown with a short marker (notexasset:<filename>) instead of a giant
// inline data URL — keeps the editor text clean.
let imagesDir: string | null = null;

/** Resolve + create the images directory. Safe to call repeatedly. */
export async function initAssets(): Promise<void> {
  if (!isTauri() || imagesDir) return;
  try {
    const dir = await join(await appDataDir(), "images");
    await mkdir(dir, { recursive: true }).catch(() => {});
    imagesDir = dir;
  } catch (e) {
    console.error("Failed to init image storage:", e);
  }
}

/** Save image bytes to the vault; returns the marker filename (or null). */
export async function saveImage(bytes: Uint8Array, ext: string): Promise<string | null> {
  if (!imagesDir) await initAssets();
  if (!imagesDir) return null;
  const filename = `${uid("img_")}.${ext.replace(/[^a-z0-9]/gi, "") || "png"}`;
  try {
    await writeFile(await join(imagesDir, filename), bytes);
    return filename;
  } catch (e) {
    console.error("Failed to save image:", e);
    return null;
  }
}

/** Resolve a marker filename to a loadable asset URL for the preview. */
export function assetUrl(filename: string): string {
  if (!imagesDir) return "";
  const sep = imagesDir.includes("\\") ? "\\" : "/";
  return convertFileSrc(`${imagesDir}${sep}${filename}`);
}
