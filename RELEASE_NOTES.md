Fixes for scrolling and layout.

- **Mouse-wheel scrolling fixed** — resolved a WebView2 issue where the window's occlusion detection paused the compositor, so the mouse wheel didn't scroll notes (the scrollbar still worked). Wheel scrolling now works throughout the app.
- **Sort control** — the "Last edited" sort dropdown no longer gets clipped in the notes list.
