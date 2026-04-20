use std::fs;
use std::sync::Mutex;
use tauri::{Manager, PhysicalSize};

#[cfg(target_os = "macos")]
use tauri::{Emitter, RunEvent};

// ── Tauri commands ───────────────────────────────────────────────────────

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

// ── App entry ────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(PendingFiles(Mutex::new(Vec::new())))
        .invoke_handler(tauri::generate_handler![read_text_file, write_text_file, get_pending_files])
        .setup(|app| {
            if let Some(monitor) = app.primary_monitor().ok().flatten() {
                let screen_width = monitor.size().width as f64;
                let screen_height = monitor.size().height as f64;

                let window_width = (screen_width * 0.45) as u32;
                let window_height = (screen_height * 0.6) as u32;
                let min_width = (screen_width * 0.3) as u32;
                let min_height = (screen_height * 0.4) as u32;

                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.set_size(PhysicalSize::new(window_width, window_height));
                    let _ = window.set_min_size(Some(PhysicalSize::new(min_width, min_height)));
                }
            }

            // On Windows/Linux, files opened via OS association arrive as CLI arguments
            #[cfg(not(target_os = "macos"))]
            {
                let args: Vec<String> = std::env::args().skip(1).collect();
                for arg in args {
                    let path = std::path::Path::new(&arg);
                    if path.is_file() {
                        if let Some(state) = app.try_state::<PendingFiles>() {
                            state.0.lock().unwrap().push(arg);
                        }
                    }
                }
            }

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|_app_handle, _event| {
        // macOS delivers opened files via Apple Events
        #[cfg(target_os = "macos")]
        if let RunEvent::Opened { urls } = _event {
            for url in urls {
                if url.scheme() == "file" {
                    if let Ok(path) = url.to_file_path() {
                        let path_str = path.to_string_lossy().to_string();
                        if let Some(state) = _app_handle.try_state::<PendingFiles>() {
                            state.0.lock().unwrap().push(path_str.clone());
                        }
                        let _ = _app_handle.emit("open-file", &path_str);
                    }
                }
            }
        }
    });
}
