use std::path::PathBuf;
use std::process::Command;
use tauri::Manager;
use tauri_plugin_shell::ShellExt;

#[tauri::command]
async fn scanner_status(app: tauri::AppHandle) -> Result<String, String> {
    run_scanner(&app, &["status"]).await
}

#[tauri::command]
async fn show_main_window(app: tauri::AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window was not found.".to_string())?;
    window.show().map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())
}

#[tauri::command]
async fn scanner_scan_visible_artifact(app: tauri::AppHandle) -> Result<String, String> {
    run_scanner(&app, &["scan-visible-artifact"]).await
}

#[tauri::command]
async fn scanner_scan_region_artifact(
    app: tauri::AppHandle,
    region_json: String,
) -> Result<String, String> {
    run_scanner(
        &app,
        &[
            "scan-region-artifact",
            "--region-json",
            region_json.as_str(),
        ],
    )
    .await
}

#[tauri::command]
async fn scanner_classify_visible_screen(app: tauri::AppHandle) -> Result<String, String> {
    run_scanner(&app, &["classify-visible-screen"]).await
}

#[tauri::command]
async fn scanner_classify_region_artifact(
    app: tauri::AppHandle,
    region_json: String,
) -> Result<String, String> {
    run_scanner(
        &app,
        &[
            "classify-region-artifact",
            "--region-json",
            region_json.as_str(),
        ],
    )
    .await
}

#[tauri::command]
async fn scanner_start_watch(app: tauri::AppHandle) -> Result<String, String> {
    run_scanner(&app, &["watch-start"]).await
}

#[tauri::command]
async fn scanner_stop_watch(app: tauri::AppHandle) -> Result<String, String> {
    run_scanner(&app, &["watch-stop"]).await
}

#[tauri::command]
async fn scanner_ocr_substats(app: tauri::AppHandle, image_path: String) -> Result<String, String> {
    run_scanner(&app, &["ocr-substats", image_path.as_str()]).await
}

#[tauri::command]
async fn scanner_parse_fixture_artifact(
    app: tauri::AppHandle,
    fixture_folder: String,
) -> Result<String, String> {
    run_scanner(&app, &["parse-fixture-artifact", fixture_folder.as_str()]).await
}

#[tauri::command]
async fn scanner_parse_fixture_card(
    app: tauri::AppHandle,
    fixture_folder: String,
) -> Result<String, String> {
    run_scanner(&app, &["parse-fixture-card", fixture_folder.as_str()]).await
}

#[tauri::command]
async fn scanner_parse_region_fixture(
    app: tauri::AppHandle,
    fixture_name: String,
    region_json: String,
) -> Result<String, String> {
    run_scanner(
        &app,
        &[
            "parse-region-fixture",
            fixture_name.as_str(),
            region_json.as_str(),
        ],
    )
    .await
}

#[tauri::command]
async fn scanner_parse_screenshot_artifact(
    app: tauri::AppHandle,
    image_path: String,
) -> Result<String, String> {
    run_scanner(&app, &["parse-screenshot-artifact", image_path.as_str()]).await
}

#[tauri::command]
async fn scanner_parse_screenshot_fixture(
    app: tauri::AppHandle,
    fixture_name: String,
) -> Result<String, String> {
    run_scanner(&app, &["parse-screenshot-fixture", fixture_name.as_str()]).await
}

#[tauri::command]
async fn scanner_classify_region_fixture(
    app: tauri::AppHandle,
    fixture_name: String,
    region_json: String,
) -> Result<String, String> {
    run_scanner(
        &app,
        &[
            "classify-region-fixture",
            fixture_name.as_str(),
            region_json.as_str(),
        ],
    )
    .await
}

#[tauri::command]
async fn scanner_classify_screenshot_artifact(
    app: tauri::AppHandle,
    image_path: String,
) -> Result<String, String> {
    run_scanner(&app, &["classify-screenshot-artifact", image_path.as_str()]).await
}

#[tauri::command]
async fn scanner_classify_screenshot_fixture(
    app: tauri::AppHandle,
    fixture_name: String,
) -> Result<String, String> {
    run_scanner(
        &app,
        &["classify-screenshot-fixture", fixture_name.as_str()],
    )
    .await
}

async fn run_scanner(app: &tauri::AppHandle, args: &[&str]) -> Result<String, String> {
    if let Ok(path) = std::env::var("GENSHIN_SCANNER_PATH") {
        return run_executable(PathBuf::from(path), args);
    }

    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let debug_exe = manifest_dir
        .join("..")
        .join("..")
        .join("scanner-win")
        .join("bin")
        .join("Debug")
        .join("net10.0-windows")
        .join("GenshinArtifactScanner.Win.exe");

    if debug_exe.exists() {
        return run_executable(debug_exe, args);
    }

    if let Some(result) = run_bundled_sidecar(app, args).await {
        return result;
    }

    let project = manifest_dir
        .join("..")
        .join("..")
        .join("scanner-win")
        .join("GenshinArtifactScanner.Win.csproj");

    let output = Command::new("dotnet")
        .arg("run")
        .arg("--project")
        .arg(project)
        .arg("--")
        .args(args)
        .output()
        .map_err(|error| format!("Unable to start scanner sidecar: {error}"))?;

    command_output(output)
}

async fn run_bundled_sidecar(
    app: &tauri::AppHandle,
    args: &[&str],
) -> Option<Result<String, String>> {
    let mut command = match app.shell().sidecar("GenshinArtifactScanner.Win") {
        Ok(command) => command,
        Err(_) => return None,
    };

    for arg in args {
        command = command.arg(*arg);
    }

    Some(
        command
            .output()
            .await
            .map_err(|error| format!("Unable to run bundled scanner sidecar: {error}"))
            .and_then(|output| {
                command_output_parts(output.status.success(), &output.stdout, &output.stderr)
            }),
    )
}

fn run_executable(path: PathBuf, args: &[&str]) -> Result<String, String> {
    let output = Command::new(path)
        .args(args)
        .output()
        .map_err(|error| format!("Unable to start scanner sidecar: {error}"))?;

    command_output(output)
}

fn command_output(output: std::process::Output) -> Result<String, String> {
    command_output_parts(output.status.success(), &output.stdout, &output.stderr)
}

fn command_output_parts(success: bool, stdout: &[u8], stderr: &[u8]) -> Result<String, String> {
    if success {
        String::from_utf8(stdout.to_vec())
            .map_err(|error| format!("Scanner output was not UTF-8: {error}"))
    } else {
        let stdout_text = String::from_utf8_lossy(stdout).trim().to_string();
        if stdout_text.starts_with('{') {
            return Ok(stdout_text);
        }

        let stderr = String::from_utf8_lossy(stderr);
        Err(format!("Scanner sidecar failed: {stderr}"))
    }
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            show_main_window,
            scanner_status,
            scanner_scan_visible_artifact,
            scanner_scan_region_artifact,
            scanner_classify_visible_screen,
            scanner_classify_region_artifact,
            scanner_start_watch,
            scanner_stop_watch,
            scanner_ocr_substats,
            scanner_parse_fixture_artifact,
            scanner_parse_fixture_card,
            scanner_parse_region_fixture,
            scanner_parse_screenshot_artifact,
            scanner_parse_screenshot_fixture,
            scanner_classify_region_fixture,
            scanner_classify_screenshot_artifact,
            scanner_classify_screenshot_fixture
        ])
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}
