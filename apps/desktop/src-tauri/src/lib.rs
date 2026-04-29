use serde::{Deserialize, Serialize};
use tauri::Manager;

mod analysis;

#[derive(Debug, Serialize, Deserialize)]
pub struct AnalyzeResult {
    pub success: bool,
    pub snapshot: Option<analysis::CitySnapshot>,
    pub error: Option<String>,
}

#[tauri::command]
fn analyze_code(files: Vec<(String, String)>) -> AnalyzeResult {
    env_logger::init();

    let parsed = analysis::parse_files(&files, None);
    let snapshot = analysis::create_snapshot(parsed, vec![]);

    AnalyzeResult {
        success: true,
        snapshot: Some(snapshot),
        error: None,
    }
}

#[tauri::command]
fn parse_file(path: String, content: String) -> analysis::ParsedFile {
    let mut parser = analysis::AnalysisParser::new();
    parser.parse_file(&path, &content)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![analyze_code, parse_file])
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
