use serde::{Deserialize, Serialize};
use std::time::Duration;
use std::path::PathBuf;
use std::process::Command;
use tauri::{Emitter, Manager, PhysicalPosition, PhysicalSize, WindowEvent};
use tauri_plugin_shell::ShellExt;

#[derive(Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct PhysicalWindowRect {
    x: i32,
    y: i32,
    width: u32,
    height: u32,
}

#[tauri::command]
async fn scanner_status(app: tauri::AppHandle) -> Result<String, String> {
    run_scanner(&app, &["status"]).await
}

#[tauri::command]
async fn show_main_window(app: tauri::AppHandle) -> Result<(), String> {
    let window = get_window(&app, "main")?;
    set_no_activate(&window, true)?;
    window
        .set_focusable(false)
        .map_err(|error| error.to_string())?;
    window
        .set_always_on_top(true)
        .map_err(|error| error.to_string())?;
    show_topmost_no_activate(&window)
}

#[tauri::command]
async fn enable_main_input(app: tauri::AppHandle) -> Result<(), String> {
    let window = get_window(&app, "main")?;
    set_no_activate(&window, false)?;
    window
        .set_focusable(true)
        .map_err(|error| error.to_string())?;
    window
        .set_always_on_top(false)
        .map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())
}

#[tauri::command]
async fn set_roi_overlay_bounds(
    app: tauri::AppHandle,
    rect: PhysicalWindowRect,
) -> Result<(), String> {
    let window = get_window(&app, "roi-overlay")?;
    set_window_bounds(&window, rect)?;
    window
        .set_always_on_top(true)
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn set_roi_edit_mode(app: tauri::AppHandle, editing: bool) -> Result<(), String> {
    let window = get_window(&app, "roi-overlay")?;
    if editing {
        set_no_activate(&window, true)?;
        window
            .set_focusable(false)
            .map_err(|error| error.to_string())?;
        window
            .set_ignore_cursor_events(false)
            .map_err(|error| error.to_string())?;
        show_topmost_no_activate(&window)?;
    } else {
        window
            .set_ignore_cursor_events(true)
            .map_err(|error| error.to_string())?;
        window.hide().map_err(|error| error.to_string())?;
    }

    app.emit_to("roi-overlay", "roi-edit-mode", editing)
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn set_assistant_window_bounds(
    app: tauri::AppHandle,
    rect: PhysicalWindowRect,
) -> Result<(), String> {
    let window = get_window(&app, "assistant-bubble")?;
    set_window_bounds(&window, rect)?;
    window
        .set_focusable(false)
        .map_err(|error| error.to_string())?;
    set_no_activate(&window, true)?;
    window
        .set_always_on_top(true)
        .map_err(|error| error.to_string())?;
    show_topmost_no_activate(&window)
}

#[tauri::command]
async fn get_assistant_window_bounds(app: tauri::AppHandle) -> Result<PhysicalWindowRect, String> {
    let window = get_window(&app, "assistant-bubble")?;
    let position = window.outer_position().map_err(|error| error.to_string())?;
    let size = window.outer_size().map_err(|error| error.to_string())?;
    Ok(PhysicalWindowRect {
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
    })
}

#[tauri::command]
async fn start_assistant_drag(app: tauri::AppHandle) -> Result<(), String> {
    get_window(&app, "assistant-bubble")?
        .start_dragging()
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn quit_app(app: tauri::AppHandle) -> Result<(), String> {
    app.exit(0);
    Ok(())
}

#[tauri::command]
async fn show_fixture_playground(app: tauri::AppHandle) -> Result<(), String> {
    let window = get_window(&app, "fixture-playground")?;
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
    occlusion_avoided: Option<bool>,
) -> Result<String, String> {
    let mut args = vec![
        "scan-region-artifact",
        "--region-json",
        region_json.as_str(),
    ];
    if occlusion_avoided.unwrap_or(false) {
        args.push("--occlusion-avoided");
    }

    run_scanner_with_assistant_hidden(&app, &args).await
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

async fn run_scanner_with_assistant_hidden(
    app: &tauri::AppHandle,
    args: &[&str],
) -> Result<String, String> {
    let hidden_windows = hide_capture_occluders(app)?;
    std::thread::sleep(Duration::from_millis(80));
    let result = run_scanner(app, args).await;
    restore_capture_occluders(hidden_windows)?;
    result
}

fn hide_capture_occluders(app: &tauri::AppHandle) -> Result<Vec<tauri::WebviewWindow>, String> {
    let mut hidden = Vec::new();
    for label in ["assistant-bubble", "main"] {
        if let Some(window) = app.get_webview_window(label) {
            if window.is_visible().map_err(|error| error.to_string())? {
                window.hide().map_err(|error| error.to_string())?;
                hidden.push(window);
            }
        }
    }

    Ok(hidden)
}

fn restore_capture_occluders(windows: Vec<tauri::WebviewWindow>) -> Result<(), String> {
    for window in windows {
        if window.label() == "assistant-bubble" {
            window
                .set_focusable(false)
                .map_err(|error| error.to_string())?;
        }
        set_no_activate(&window, true)?;
        show_topmost_no_activate(&window)?;
    }

    Ok(())
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

fn get_window(app: &tauri::AppHandle, label: &str) -> Result<tauri::WebviewWindow, String> {
    app.get_webview_window(label)
        .ok_or_else(|| format!("{label} window was not found."))
}

fn set_window_bounds(
    window: &tauri::WebviewWindow,
    rect: PhysicalWindowRect,
) -> Result<(), String> {
    if rect.width == 0 || rect.height == 0 {
        return Err("Window width and height must be greater than zero.".to_string());
    }

    window
        .set_position(PhysicalPosition::new(rect.x, rect.y))
        .map_err(|error| error.to_string())?;
    window
        .set_size(PhysicalSize::new(rect.width, rect.height))
        .map_err(|error| error.to_string())
}

#[cfg(target_os = "windows")]
fn set_no_activate(window: &tauri::WebviewWindow, enabled: bool) -> Result<(), String> {
    const GWL_EXSTYLE: i32 = -20;
    const WS_EX_NOACTIVATE: isize = 0x0800_0000;

    #[link(name = "user32")]
    extern "system" {
        fn GetWindowLongPtrW(window: *mut std::ffi::c_void, index: i32) -> isize;
        fn SetWindowLongPtrW(window: *mut std::ffi::c_void, index: i32, value: isize) -> isize;
    }

    let hwnd = window.hwnd().map_err(|error| error.to_string())?;
    let current = unsafe { GetWindowLongPtrW(hwnd.0, GWL_EXSTYLE) };
    let next = if enabled {
        current | WS_EX_NOACTIVATE
    } else {
        current & !WS_EX_NOACTIVATE
    };

    unsafe {
        SetWindowLongPtrW(hwnd.0, GWL_EXSTYLE, next);
    }
    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn set_no_activate(_window: &tauri::WebviewWindow, _enabled: bool) -> Result<(), String> {
    Ok(())
}

#[cfg(target_os = "windows")]
fn show_topmost_no_activate(window: &tauri::WebviewWindow) -> Result<(), String> {
    const SW_SHOWNOACTIVATE: i32 = 4;
    const SWP_NOSIZE: u32 = 0x0001;
    const SWP_NOMOVE: u32 = 0x0002;
    const SWP_NOACTIVATE: u32 = 0x0010;
    const SWP_SHOWWINDOW: u32 = 0x0040;
    const HWND_TOPMOST: isize = -1;

    #[link(name = "user32")]
    extern "system" {
        fn ShowWindow(window: *mut std::ffi::c_void, command: i32) -> i32;
        fn SetWindowPos(
            window: *mut std::ffi::c_void,
            insert_after: *mut std::ffi::c_void,
            x: i32,
            y: i32,
            width: i32,
            height: i32,
            flags: u32,
        ) -> i32;
    }

    let hwnd = window.hwnd().map_err(|error| error.to_string())?;
    set_no_activate(window, true)?;
    unsafe {
        ShowWindow(hwnd.0, SW_SHOWNOACTIVATE);
        let ok = SetWindowPos(
            hwnd.0,
            HWND_TOPMOST as *mut std::ffi::c_void,
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_SHOWWINDOW,
        );
        if ok == 0 {
            return Err("Unable to show window without activation.".to_string());
        }
    }
    set_no_activate(window, true)?;

    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn show_topmost_no_activate(window: &tauri::WebviewWindow) -> Result<(), String> {
    window.show().map_err(|error| error.to_string())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            if let Some(main) = app.get_webview_window("main") {
                main.hide()?;
            }
            if let Some(overlay) = app.get_webview_window("roi-overlay") {
                set_no_activate(&overlay, true).map_err(std::io::Error::other)?;
                let _ = overlay.set_shadow(false);
                overlay.set_focusable(false)?;
                overlay.set_ignore_cursor_events(true)?;
                overlay.hide()?;
            }
            if let Some(bubble) = app.get_webview_window("assistant-bubble") {
                let _ = bubble.set_shadow(false);
                // Mouse events still reach the WebView, but keyboard focus stays with
                // the game so borderless/fullscreen clients are not minimized by clicks.
                bubble.set_focusable(false)?;
                set_no_activate(&bubble, true).map_err(std::io::Error::other)?;
                bubble.set_always_on_top(true)?;
                bubble.set_size(PhysicalSize::new(72, 72))?;
                show_topmost_no_activate(&bubble).map_err(std::io::Error::other)?;
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == "main" {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window.set_always_on_top(false);
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            show_main_window,
            enable_main_input,
            set_roi_overlay_bounds,
            set_roi_edit_mode,
            set_assistant_window_bounds,
            get_assistant_window_bounds,
            start_assistant_drag,
            quit_app,
            show_fixture_playground,
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
