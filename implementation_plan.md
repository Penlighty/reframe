# Reframe - Implementation Plan

## Project Goal
Build "Reframe", a lightweight, professional-grade screen recording application using Tauri (Rust + React).

## Technology Stack
- **Core**: Tauri (latest)
- **Backend**: Rust (for system-level interaction, FFmpeg orchestration)
- **Frontend**: React, TypeScript, TailwindCSS
- **State Management**: React Context / Hooks (initially), potentially Zustand later.
- **Icons**: Lucide-React

## Phases

### Phase 1: Foundation & UI Prototype (Done)
- [x] Initialize Tauri project structure.
- [x] Configure TailwindCSS.
- [x] Port the "Lumina Capture" React prototype provided by the user into the Reframe codebase.
- [x] Ensure the UI looks premium (Glassmorphism, Dark Mode).
- [x] Implement the "Interaction Layer" (Mouse/Keyboard visualization) in the frontend.
- [x] Verify Rust environment and create dev helper script.


### Phase 2: Rust Backend & Capture Pipeline (In Progress)
- [x] Set up Rust integration (Backend Skeleton created).
- [x] Implement commands to start/stop recording (FFmpeg process management).
- [x] Integrate FFmpeg (using `gdigrab` for video).
- [x] Handle file system operations for saving recordings (Saves to `Videos/Reframe/Session_...`).
- [x] Implement Audio Capture (Passes selected dshow device to FFmpeg).

### Phase 3: Advanced Features
- [x] Audio Meter integration (reading real system audio levels).
- [x] Webcam overlay window (using multi-window Tauri features).
- [x] Settings persistence.
- [x] Audio recording with microphone selection.

### Phase 4: Optimization & Polish
- Optimize React renders (already started in the prototype).
- Ensure GPU acceleration for overlays.
- Packaging and Distribution.

## Initial Directory Structure
```
/src-tauri
  /src
    main.rs (Rust backend entry)
  tauri.conf.json
/src
  /components
    InteractionLayer.tsx
    RecordingTimer.tsx
    AudioMeter.tsx
    ...
  App.tsx
  main.tsx
  index.css (Tailwind directives)
```
