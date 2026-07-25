mod hello;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Prevent WebView2 from freezing/reaping the renderer when the window is
    // occluded (e.g. behind another window) or backgrounded — which otherwise
    // closes the window shortly after launch.
    #[cfg(windows)]
    {
        let existing = std::env::var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS").unwrap_or_default();
        let flags = "--disable-features=CalculateNativeWinOcclusion \
                     --disable-backgrounding-occluded-windows \
                     --disable-renderer-backgrounding \
                     --disable-background-timer-throttling";
        std::env::set_var(
            "WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS",
            format!("{existing} {flags}").trim(),
        );
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            hello::hello_available,
            hello::hello_protect,
            hello::hello_unprotect
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
