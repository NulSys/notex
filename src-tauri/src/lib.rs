mod hello;

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
        .invoke_handler(tauri::generate_handler![
            hello::hello_available,
            hello::hello_protect,
            hello::hello_unprotect
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
