use std::fs;
use std::sync::Mutex;
use tauri::{Emitter, Manager, PhysicalSize, RunEvent};

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_text_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, &content).map_err(|e| e.to_string())
}

struct PendingFiles(Mutex<Vec<String>>);

#[tauri::command]
fn get_pending_files(state: tauri::State<PendingFiles>) -> Vec<String> {
    let mut files = state.0.lock().unwrap();
    files.drain(..).collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(PendingFiles(Mutex::new(Vec::new())))
        .invoke_handler(tauri::generate_handler![read_text_file, write_text_file, get_pending_files])
        .setup(|app| {
            // Get the primary monitor to calculate proportional window size
            if let Some(monitor) = app.primary_monitor().ok().flatten() {
                let screen_width = monitor.size().width as f64;
                let screen_height = monitor.size().height as f64;
                
                // Calculate proportional sizes (same as your Electron code)
                let window_width = (screen_width * 0.45) as u32;
                let window_height = (screen_height * 0.6) as u32;
                let min_width = (screen_width * 0.3) as u32;
                let min_height = (screen_height * 0.4) as u32;
                
                // Apply sizes to the main window
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.set_size(PhysicalSize::new(window_width, window_height));
                    let _ = window.set_min_size(Some(PhysicalSize::new(min_width, min_height)));
                }
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| {
        if let RunEvent::Opened { urls } = event {
            for url in urls {
                if url.scheme() == "file" {
                    if let Ok(path) = url.to_file_path() {
                        let path_str = path.to_string_lossy().to_string();
                        // Store for frontend to pick up on cold start
                        if let Some(state) = app_handle.try_state::<PendingFiles>() {
                            state.0.lock().unwrap().push(path_str.clone());
                        }
                        // Emit for when app is already running
                        let _ = app_handle.emit("open-file", &path_str);
                    }
                }
            }
        }
    });
}
