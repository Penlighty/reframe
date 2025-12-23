use rdev::{listen, Button, EventType, Key};
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::Manager;
use tauri::{Emitter, State}; // Added Emitter
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;

#[derive(Clone, Serialize)]
struct ClickPayload {
    x: f64,
    y: f64,
    button: String,
}

struct RecordingState {
    process: Child,
    output_path: PathBuf,
}

struct AppState {
    recording: Mutex<Option<RecordingState>>,
    listener_running: Mutex<bool>,
}

#[tauri::command]
fn start_global_listener(app: tauri::AppHandle, state: State<AppState>) {
    let mut running = state.listener_running.lock().unwrap();
    if *running {
        println!("Global listener already running.");
        return;
    }
    *running = true;

    println!("Starting global input listener...");
    std::thread::spawn(move || {
        let mut last_x = 0.0;
        let mut last_y = 0.0;

        if let Err(error) = listen(move |event| match event.event_type {
            EventType::MouseMove { x, y } => {
                last_x = x;
                last_y = y;
            }
            EventType::ButtonPress(Button::Left) => {
                let _ = app.emit(
                    "global-click",
                    ClickPayload {
                        x: last_x,
                        y: last_y,
                        button: "left".to_string(),
                    },
                );
            }
            EventType::ButtonPress(Button::Right) => {
                let _ = app.emit(
                    "global-click",
                    ClickPayload {
                        x: last_x,
                        y: last_y,
                        button: "right".to_string(),
                    },
                );
            }
            EventType::KeyPress(key) => {
                let _ = app.emit("global-key", format!("{:?}", key));
            }
            _ => {}
        }) {
            println!("Error: {:?}", error);
        }
    });
}

#[derive(Serialize)]
struct DeviceList {
    audio: Vec<String>,
    video: Vec<String>,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct RecordingOptions {
    mic_enabled: bool,
    mic_device: Option<String>,
    system_audio_enabled: bool,
    save_path: String,
    capture_mode: Option<String>,
    window_title: Option<String>,
    region: Option<String>,
    #[serde(rename = "micVolume")]
    mic_volume: Option<f32>,
    #[serde(rename = "systemAudioVolume")]
    system_audio_volume: Option<f32>,
}

// Redundant command removed as convertFileSrc is used in frontend.

#[tauri::command]
fn open_folder(app: tauri::AppHandle, path: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    let target_path = if !path.is_empty() {
        std::path::PathBuf::from(path)
    } else {
        dirs::video_dir()
            .unwrap_or(std::path::PathBuf::from("./"))
            .join("Reframe")
    };

    if !target_path.exists() {
        std::fs::create_dir_all(&target_path).ok();
    }

    let path_str = target_path.to_string_lossy().to_string();
    println!("Opening folder: {}", path_str);
    app.opener()
        .open_path(path_str, None::<String>)
        .map_err(|e| format!("Failed to open: {}", e))?;
    Ok(())
}

#[tauri::command]
fn open_file(app: tauri::AppHandle, path: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    println!("Opening file: {}", path);
    app.opener()
        .open_path(path, None::<String>)
        .map_err(|e| format!("Failed to open file: {}", e))?;
    Ok(())
}

#[derive(Serialize, Deserialize)]
struct RecordingMetadata {
    name: String,
    duration: String,
    timestamp: u64,
}

#[tauri::command]
fn save_metadata(path: String, metadata: String) -> Result<(), String> {
    let metadata_path = std::path::Path::new(&path).join("metadata.json");
    fs::write(metadata_path, metadata).map_err(|e| format!("Failed to save metadata: {}", e))?;
    Ok(())
}

#[derive(Serialize)]
struct FileRecord {
    id: u64,
    name: String,
    duration: String,
    size: String,
    folder: String,
    files: Vec<String>,
    #[serde(rename = "fullPath")]
    full_path: String,
}

#[tauri::command]
async fn list_recordings(save_path: String) -> Result<Vec<FileRecord>, String> {
    let root_dir = if !save_path.is_empty() {
        PathBuf::from(&save_path)
    } else {
        dirs::video_dir()
            .unwrap_or(PathBuf::from("./"))
            .join("Reframe")
    };

    if !root_dir.exists() {
        fs::create_dir_all(&root_dir).ok();
        return Ok(Vec::new());
    }

    let mut recordings = Vec::new();
    let entries = fs::read_dir(root_dir).map_err(|e| e.to_string())?;

    for entry in entries {
        if let Ok(entry) = entry {
            let path = entry.path();
            if path.is_dir()
                && path
                    .file_name()
                    .unwrap()
                    .to_string_lossy()
                    .starts_with("Session_")
            {
                let metadata_path = path.join("metadata.json");
                let video_path = path.join("screen.mp4");

                if video_path.exists() {
                    let mut name = path.file_name().unwrap().to_string_lossy().to_string();
                    let mut duration = "00:00".to_string();
                    let mut id = 0;

                    if metadata_path.exists() {
                        if let Ok(meta_str) = fs::read_to_string(metadata_path) {
                            if let Ok(meta) = serde_json::from_str::<RecordingMetadata>(&meta_str) {
                                name = meta.name;
                                duration = meta.duration;
                                id = meta.timestamp;
                            }
                        }
                    }

                    if id == 0 {
                        id = entry
                            .metadata()
                            .ok()
                            .and_then(|m| m.created().ok())
                            .map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap().as_secs())
                            .unwrap_or(0);
                    }

                    let size_bytes = fs::metadata(&video_path).map(|m| m.len()).unwrap_or(0);
                    let size_mb = (size_bytes as f64) / (1024.0 * 1024.0);
                    let size_str = format!("{:.1} MB", size_mb);

                    recordings.push(FileRecord {
                        id,
                        name,
                        duration,
                        size: size_str,
                        folder: path.file_name().unwrap().to_string_lossy().to_string(),
                        files: vec!["screen.mp4".to_string()],
                        full_path: video_path.to_string_lossy().to_string(),
                    });
                }
            }
        }
    }

    // Sort by id (timestamp) descending by default
    recordings.sort_by(|a, b| b.id.cmp(&a.id));

    Ok(recordings)
}

#[tauri::command]
fn delete_recording(path: String) -> Result<(), String> {
    // path is the folder path
    let p = std::path::Path::new(&path);
    if p.exists() && p.is_dir() {
        fs::remove_dir_all(p).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn rename_recording(path: String, new_name: String) -> Result<(), String> {
    let metadata_path = std::path::Path::new(&path).join("metadata.json");
    if metadata_path.exists() {
        let meta_str = fs::read_to_string(&metadata_path).map_err(|e| e.to_string())?;
        if let Ok(mut meta) = serde_json::from_str::<RecordingMetadata>(&meta_str) {
            meta.name = new_name;
            let updated = serde_json::to_string(&meta).map_err(|e| e.to_string())?;
            fs::write(metadata_path, updated).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
async fn get_input_devices(app: tauri::AppHandle) -> Result<DeviceList, String> {
    let output = app
        .shell()
        .command("ffmpeg")
        .args(["-list_devices", "true", "-f", "dshow", "-i", "dummy"])
        .output()
        .await
        .map_err(|e| format!("Failed to execute ffmpeg: {}", e))?;

    let stderr = String::from_utf8_lossy(&output.stderr);
    println!("FFmpeg device output:\n{}", stderr);

    let mut audio_devices = Vec::new();
    let mut video_devices = Vec::new();

    // Match device lines like: [dshow @ ...] "Device Name" (audio)
    // or: [dshow @ ...] "Device Name" (video)
    let device_with_type_regex =
        Regex::new(r#"\[dshow @ [^\]]+\]\s+"([^"]+)"\s+\((audio|video)\)"#).unwrap();

    for line in stderr.lines() {
        if let Some(caps) = device_with_type_regex.captures(line) {
            if let (Some(name), Some(dtype)) = (caps.get(1), caps.get(2)) {
                let name_str = name.as_str().to_string();
                let dtype_str = dtype.as_str();
                println!("Found device: {} ({})", name_str, dtype_str);
                if dtype_str == "video" {
                    video_devices.push(name_str);
                } else if dtype_str == "audio" {
                    audio_devices.push(name_str);
                }
            }
        }
    }

    if audio_devices.is_empty() {
        audio_devices.push("Default".to_string());
    }
    if video_devices.is_empty() {
        video_devices.push("Default".to_string());
    }

    Ok(DeviceList {
        audio: audio_devices,
        video: video_devices,
    })
}

#[derive(Serialize)]
struct DiskInfo {
    free: u64,
    total: u64,
    label: String,
}

#[tauri::command]
async fn get_disk_info() -> Result<DiskInfo, String> {
    // On Windows, use wmic to get disk info for C:
    // wmic logicaldisk where "DeviceID='C:'" get size,freespace,volumename
    let output = Command::new("wmic")
        .args([
            "logicaldisk",
            "where",
            "DeviceID='C:'",
            "get",
            "size,freespace,volumename",
            "/format:list",
        ])
        .output()
        .map_err(|e| format!("Failed to run wmic: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut free = 0;
    let mut total = 0;
    let mut label = "Local Disk".to_string();

    for line in stdout.lines() {
        let parts: Vec<&str> = line.split('=').collect();
        if parts.len() == 2 {
            let key = parts[0].trim();
            let val = parts[1].trim();
            match key {
                "FreeSpace" => free = val.parse().unwrap_or(0),
                "Size" => total = val.parse().unwrap_or(0),
                "VolumeName" => {
                    if !val.is_empty() {
                        label = val.to_string()
                    }
                }
                _ => {}
            }
        }
    }

    if label == "Local Disk" {
        label = "System Drive (C:)".to_string();
    } else {
        label = format!("{} (C:)", label);
    }

    Ok(DiskInfo { free, total, label })
}

#[tauri::command]
async fn select_folder(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    let (tx, rx) = std::sync::mpsc::channel();

    app.dialog().file().pick_folder(move |folder| {
        let _ = tx.send(folder);
    });

    let result = rx.recv().map_err(|e| e.to_string())?;
    Ok(result.map(|p| p.to_string()))
}

#[tauri::command]
fn start_recording(state: State<AppState>, options: String) -> Result<String, String> {
    let mut recording = state.recording.lock().unwrap();
    if recording.is_some() {
        return Err("Already recording".into());
    }

    let opts: RecordingOptions =
        serde_json::from_str(&options).map_err(|e| format!("Invalid options JSON: {}", e))?;

    println!("Starting recording with parsed options: {:?}", opts);

    let mic_vol = opts.mic_volume.unwrap_or(1.0);
    let sys_vol = opts.system_audio_volume.unwrap_or(1.0);

    // Setup directory
    let root_dir = if !opts.save_path.is_empty() {
        PathBuf::from(&opts.save_path)
    } else {
        dirs::video_dir()
            .unwrap_or(PathBuf::from("./"))
            .join("Reframe")
    };

    let timestamp = chrono::Local::now().format("%Y-%m-%d_%H-%M-%S").to_string();
    let session_dir = root_dir.join(format!("Session_{}", timestamp));

    fs::create_dir_all(&session_dir).map_err(|e| format!("Failed to create directory: {}", e))?;

    let output_file = session_dir.join("screen.mp4");
    let output_path_str = output_file.to_string_lossy().to_string();

    // Get FFmpeg path
    let ffmpeg_path = "C:\\Users\\Owner\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.0.1-full_build\\bin\\ffmpeg.exe";

    // Build FFmpeg command using std::process::Command
    let mut cmd = Command::new(ffmpeg_path);

    cmd.stdin(Stdio::piped())
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit());

    cmd.arg("-y"); // Overwrite output

    // Track audio inputs
    let mut audio_input_count = 0;

    // Add microphone audio if enabled
    if opts.mic_enabled {
        if let Some(ref dev_name) = opts.mic_device {
            if !dev_name.is_empty() && dev_name != "Default" {
                println!("Adding microphone: {}", dev_name);
                cmd.args(["-f", "dshow", "-i", &format!("audio={}", dev_name)]);
                audio_input_count += 1;
            }
        }
    }

    // Add system audio if enabled (uses virtual-audio-capturer)
    if opts.system_audio_enabled {
        println!("Adding system audio: virtual-audio-capturer");
        cmd.args(["-f", "dshow", "-i", "audio=virtual-audio-capturer"]);
        audio_input_count += 1;
    }

    // Add video input with optimization flags
    cmd.args([
        "-f",
        "gdigrab",
        "-framerate",
        "30",
        "-offset_x",
        "0",
        "-offset_y",
        "0",
        "-draw_mouse",
        "1",
        "-i",
        "desktop",
    ]);

    // Encoding settings for video
    cmd.args([
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-preset",
        "superfast",
        "-profile:v",
        "main",
        "-level",
        "3.0",
        "-g",
        "30", // Keyframe every second for 30fps
        "-crf",
        "23",
    ]);

    // Handle audio encoding based on number of audio sources
    if audio_input_count == 2 {
        // Mix both audio sources into one track with volume boost
        let filter = format!(
            "[0:a]volume={:.1}[a0];[1:a]volume={:.1}[a1];[a0][a1]amix=inputs=2:duration=longest[aout]",
            mic_vol, sys_vol
        );
        cmd.args([
            "-filter_complex",
            &filter,
            "-map",
            "2:v",
            "-map",
            "[aout]",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-ar",
            "44100",
            "-ac",
            "2",
        ]);
    } else if audio_input_count == 1 {
        let vol = if opts.mic_enabled { mic_vol } else { sys_vol };
        let filter = format!("volume={:.1}", vol);
        cmd.args([
            "-filter:a",
            &filter,
            "-map",
            "1:v",
            "-map",
            "0:a",
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            "-ar",
            "44100",
            "-ac",
            "2",
        ]);
    }

    if audio_input_count == 0 {
        cmd.arg("-an");
    }

    cmd.args(["-movflags", "+faststart", &output_path_str]);

    println!("Spawning FFmpeg...");
    let child = cmd
        .spawn()
        .map_err(|e| format!("Failed to spawn ffmpeg: {}", e))?;
    println!("FFmpeg spawned with PID: {:?}", child.id());

    *recording = Some(RecordingState {
        process: child,
        output_path: output_file,
    });

    Ok(session_dir.to_string_lossy().to_string())
}

#[derive(Serialize)]
struct StopResult {
    path: String,
    size: String,
}

#[tauri::command]
fn stop_recording(state: State<AppState>) -> Result<StopResult, String> {
    let mut recording = state.recording.lock().unwrap();

    if let Some(mut rec_state) = recording.take() {
        println!("Stopping recording gracefully...");

        // Send 'q\n' to stdin to gracefully stop FFmpeg
        if let Some(ref mut stdin) = rec_state.process.stdin {
            let _ = stdin.write_all(b"q\n");
            let _ = stdin.flush();
        }

        // Wait for FFmpeg to finish (up to 5 seconds)
        println!("Waiting for FFmpeg to finish...");
        for i in 0..50 {
            match rec_state.process.try_wait() {
                Ok(Some(status)) => {
                    println!("FFmpeg exited with status: {:?}", status);
                    break;
                }
                Ok(None) => {
                    std::thread::sleep(std::time::Duration::from_millis(100));
                }
                Err(e) => {
                    println!("Error checking process status: {}", e);
                    break;
                }
            }
            if i == 49 {
                println!("FFmpeg didn't exit gracefully, killing...");
                let _ = rec_state.process.kill();
            }
        }

        // Get file size
        let size_bytes = fs::metadata(&rec_state.output_path)
            .map(|m| m.len())
            .unwrap_or(0);
        let size_mb = (size_bytes as f64) / (1024.0 * 1024.0);
        let size_str = format!("{:.1} MB", size_mb);

        // Return the output path and size
        let path = rec_state.output_path.to_string_lossy().to_string();
        println!("Recording stopped, output: {}, size: {}", path, size_str);
        Ok(StopResult {
            path,
            size: size_str,
        })
    } else {
        Err("Not recording".into())
    }
}

#[tauri::command]
async fn toggle_webcam(app: tauri::AppHandle, show: bool) -> Result<(), String> {
    if show {
        // Look for the window defined in tauri.conf.json first
        if let Some(w) = app.get_webview_window("webcam") {
            w.show().map_err(|e| e.to_string())?;
            return Ok(());
        }

        let win = tauri::WebviewWindowBuilder::new(
            &app,
            "webcam",
            tauri::WebviewUrl::App("/webcam".into()),
        )
        .title("Reframe by Theta Labs")
        .inner_size(300.0, 300.0)
        .min_inner_size(150.0, 150.0)
        .max_inner_size(1000.0, 1000.0)
        .decorations(false)
        .transparent(true)
        .shadow(false)
        .always_on_top(true)
        .resizable(true)
        .skip_taskbar(true)
        .visible(false) // Start invisible to avoid shadow flicker
        .build()
        .map_err(|e| format!("Failed to create window: {}", e))?;

        win.set_shadow(false).ok();
        win.show().map_err(|e| e.to_string())?;

        Ok(())
    } else {
        if let Some(w) = app.get_webview_window("webcam") {
            w.close().map_err(|e| e.to_string())?;
        }
        Ok(())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // Configure overlay window to be click-through
            if let Some(overlay) = app.get_webview_window("overlay") {
                // We want the overlay to be transparent to mouse events so valid clicks pass through
                // to the OS/other apps.
                println!("Setting overlay ignore cursor events to true");
                let _ = overlay.set_ignore_cursor_events(true);
                let _ = overlay.maximize(); // Maximize manually to cover screen without exclusive fullscreen mode
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                // If the controls window is closed, we should exit the entire app
                // to prevent the overlay from hanging around + stop any recording.
                if window.label() == "controls" {
                    std::process::exit(0);
                }
            }
        })
        .manage(AppState {
            recording: Mutex::new(None),
            listener_running: Mutex::new(false),
        })
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            start_recording,
            stop_recording,
            get_input_devices,
            toggle_webcam,
            open_folder,
            open_file,
            save_metadata,
            list_recordings,
            delete_recording,
            rename_recording,
            start_global_listener,
            get_disk_info,
            select_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
