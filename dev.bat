@echo off
set "FFMPEG_PATH=C:\Users\Owner\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.0.1-full_build\bin"
set "CARGO_PATH=C:\Users\Owner\.cargo\bin"
set "PATH=%FFMPEG_PATH%;%CARGO_PATH%;%PATH%"
npm run tauri dev
