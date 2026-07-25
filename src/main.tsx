import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { isTauri } from "./lib/env";
import "katex/dist/katex.min.css";
import "./styles.css";

// Apply the last-used resolved theme synchronously, before the first paint, so
// the boot screen shows in the right theme (no light/dark flash on startup).
try {
  const t = localStorage.getItem("notex-resolved-theme");
  if (t === "dark" || t === "light") document.documentElement.setAttribute("data-theme", t);
} catch {}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// The window is created hidden (tauri.conf.json) to avoid a white flash; reveal
// it once the app has actually painted.
if (isTauri()) {
  requestAnimationFrame(() =>
    requestAnimationFrame(async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        await getCurrentWindow().show();
      } catch {
        /* ignore — non-Tauri or already visible */
      }
    })
  );
}
