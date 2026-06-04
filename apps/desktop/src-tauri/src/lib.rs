use std::path::PathBuf;
use std::process::Command;

#[tauri::command]
fn scanner_status() -> Result<String, String> {
    run_scanner(&["status"])
}

#[tauri::command]
fn scanner_scan_visible_artifact() -> Result<String, String> {
    run_scanner(&["scan-visible-artifact"])
}

#[tauri::command]
fn scanner_start_watch() -> Result<String, String> {
    run_scanner(&["watch-start"])
}

#[tauri::command]
fn scanner_stop_watch() -> Result<String, String> {
    run_scanner(&["watch-stop"])
}

fn run_scanner(args: &[&str]) -> Result<String, String> {
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

fn run_executable(path: PathBuf, args: &[&str]) -> Result<String, String> {
    let output = Command::new(path)
        .args(args)
        .output()
        .map_err(|error| format!("Unable to start scanner sidecar: {error}"))?;

    command_output(output)
}

fn command_output(output: std::process::Output) -> Result<String, String> {
    if output.status.success() {
        String::from_utf8(output.stdout).map_err(|error| format!("Scanner output was not UTF-8: {error}"))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Scanner sidecar failed: {stderr}"))
    }
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            scanner_status,
            scanner_scan_visible_artifact,
            scanner_start_watch,
            scanner_stop_watch
        ])
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}
