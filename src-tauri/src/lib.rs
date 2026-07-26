mod ai;
mod hello;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // NOTE: The WebView2 flags that disable native-window occlusion detection
    // (so the renderer isn't reaped/backgrounded when the window looks occluded)
    // are set via `app.windows[].additionalBrowserArgs` in tauri.conf.json.
    // Tauri v2 passes that through the WebView2 API, which takes precedence over
    // the WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS env var, so the config is the
    // only place that reliably applies them.

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        // Remembers window size/position/maximized across launches.
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(|app| {
            // The window starts hidden (visible:false) so the frontend can reveal
            // it after first paint, avoiding a white flash. This is a safety net:
            // if the frontend never calls show() (e.g. a load error), force the
            // window visible after a short delay so it can never stay hidden.
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_millis(1500));
                if let Some(w) = handle.get_webview_window("main") {
                    if !w.is_visible().unwrap_or(true) {
                        let _ = w.show();
                    }
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            hello::hello_available,
            hello::hello_protect,
            hello::hello_unprotect,
            ai::ai_notes_from_image
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
