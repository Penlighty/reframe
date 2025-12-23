import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { emit } from '@tauri-apps/api/event';
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import {
  Mic,
  Monitor,
  Video,
  Music,
  Settings,
  Folder,
  Play,
  MousePointer2,
  Keyboard,
  MoreHorizontal,
  Film,
  AlertCircle,
  Info,
  ListFilter,
  Trash2,
  Edit3,
  Clock,
  ArrowDownAZ,
  HardDrive,
  LayoutGrid,
  List,
  CheckSquare,
  Square as SquareIcon,
  Trash,
} from 'lucide-react';
import logo from './assets/logo.png';
import InteractionLayer from './components/InteractionLayer';
import AudioMeter from './components/AudioMeter';
import Toggle from './components/Toggle';
import { useSettings } from './hooks/useSettings';
import FloatingBar from './components/FloatingBar';
import { SettingsPanel } from './components/SettingsPanel';
import { AboutPanel } from './components/AboutPanel';

export interface FileRecord {
  id: number;
  name: string;
  duration: string;
  size: string;
  folder: string;
  files: string[];
  fullPath?: string;
}

interface AppProps {
  mode?: 'controls' | 'overlay';
}

export default function App({ mode = 'controls' }: AppProps) {
  const [activeTab, setActiveTab] = useState('record');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showStopConfirmation, setShowStopConfirmation] = useState(false);
  const [pendingRecordingName, setPendingRecordingName] = useState('');
  const [diskInfo, setDiskInfo] = useState<{ free: number, total: number, label: string } | null>(null);
  const [micMuteWarning, setMicMuteWarning] = useState(false);
  const [sortMode, setSortMode] = useState<'newest' | 'name' | 'size'>('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [renamingFile, setRenamingFile] = useState<FileRecord | null>(null);
  const [deletingFile, setDeletingFile] = useState<FileRecord | null>(null);
  const [newName, setNewName] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const finalDurationRef = React.useRef(0);
  const sessionPathRef = React.useRef<string>('');

  const { settings, updateSettings, loaded } = useSettings();

  // Unified Webcam window lifecycle management
  useEffect(() => {
    if (!loaded || mode !== 'controls') return;

    const syncWebcam = async () => {
      try {
        console.log('[WebcamSync] Desired state:', settings.webcamEnabled);
        await invoke('toggle_webcam', { show: settings.webcamEnabled });

        if (settings.webcamEnabled) {
          // Broadcast full settings to ensure the new webcam window is up to date
          setTimeout(() => {
            emit('settings-sync', settings).catch(console.error);
          }, 400);
        }
      } catch (e) {
        console.error('[WebcamSync] Failed:', e);
      }
    };

    // Small delay to ensure Tauri's window manager is ready (especially on boot)
    const timer = setTimeout(syncWebcam, 300);
    return () => clearTimeout(timer);
  }, [settings.webcamEnabled, loaded, mode]);
  const [recordings, setRecordings] = useState<FileRecord[]>([]);
  const [availableDevices, setAvailableDevices] = useState<{ audio: string[], video: string[] }>({ audio: [], video: [] });

  useEffect(() => {
    if (mode === 'overlay') {
      import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
        getCurrentWindow().setIgnoreCursorEvents(true);
      });
      invoke('start_global_listener').catch(e => console.error("Failed to start global listener:", e));
      return;
    }

    invoke<{ audio: string[], video: string[] }>('get_input_devices')
      .then(devices => {
        setAvailableDevices(devices);
      })
      .catch(err => console.error("Failed to fetch devices:", err));

    // Fetch disk info
    const updateDiskInfo = () => {
      invoke<any>('get_disk_info')
        .then(info => setDiskInfo(info))
        .catch(err => console.error("Failed to fetch disk info:", err));
    };
    updateDiskInfo();
    const diskInterval = setInterval(updateDiskInfo, 30000); // Update every 30s
    return () => clearInterval(diskInterval);
  }, [mode]);

  const refreshRecordings = async () => {
    try {
      const recs = await invoke<FileRecord[]>('list_recordings', { savePath: settings.savePath });
      setRecordings(recs);
      setSelectedIds(new Set()); // Reset selection on refresh
    } catch (e) {
      console.error("Failed to list recordings:", e);
    }
  };

  useEffect(() => {
    if (loaded) {
      refreshRecordings();
    }
  }, [loaded, settings.savePath]);

  if (mode === 'overlay') {
    return (
      <InteractionLayer
        mouseEnabled={settings.showClicks}
        keysEnabled={settings.showKeystrokes}
        keystrokePosition={settings.keystrokePosition}
        clickColorLeft={settings.clickColorLeft}
        clickColorRight={settings.clickColorRight}
      />
    );
  }

  const handleTimeUpdate = React.useCallback((t: number) => {
    finalDurationRef.current = t;
  }, []);

  const formatTime = (secs: number) => {
    if (!secs) return "00:00";
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${hrs > 0 ? `${hrs}:` : ''}${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const playBeep = (frequency = 440, type: OscillatorType = 'sine', duration = 0.2) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn("Audio Context blocked or failed:", e);
    }
  };

  const startCountdown = () => {
    let count = 3;
    setCountdown(count);
    playBeep(440);
    getCurrentWindow().setDecorations(false);

    const timer = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
        playBeep(440);
      } else {
        clearInterval(timer);
        setCountdown(null);
        playBeep(880, 'sine', 0.4);
        startRecordingActual();
      }
    }, 1200);
  };

  const startRecordingActual = async () => {
    try {
      let actualMicDevice = settings.micDevice;
      if (actualMicDevice === 'Default' && availableDevices.audio.length > 0) {
        const realDevice = availableDevices.audio.find(d => d !== 'Default');
        if (realDevice) actualMicDevice = realDevice;
      }

      const rustOptions = {
        micEnabled: settings.micEnabled,
        micDevice: actualMicDevice,
        systemAudioEnabled: settings.systemAudioEnabled,
        savePath: settings.savePath,
        captureMode: settings.captureMode,
        windowTitle: '',
        region: '',
        micVolume: settings.micVolume,
        systemAudioVolume: settings.systemAudioVolume
      };

      const res = await invoke<string>('start_recording', { options: JSON.stringify(rustOptions) });
      sessionPathRef.current = res;
      setIsRecording(true);
      await getCurrentWindow().setDecorations(false);
      await getCurrentWindow().setSize(new LogicalSize(600, 140));
    } catch (e) {
      console.error("Failed to start recording:", e);
      alert("Failed to start recording: " + e);
    }
  };

  const handleStopRecording = () => {
    setShowStopConfirmation(true);
  };

  const confirmStopRecording = async () => {
    setShowStopConfirmation(false);
    try {
      const result = await invoke<{ path: string, size: string }>('stop_recording');
      const outputPath = result.path;

      setIsRecording(false);
      setIsPaused(false);
      await getCurrentWindow().setDecorations(true);
      await getCurrentWindow().setSize(new LogicalSize(900, 600));

      const duration = finalDurationRef.current;
      const formattedDuration = formatTime(duration);
      const defaultName = `Recording ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
      const finalName = pendingRecordingName.trim() || defaultName;

      // Save metadata to disk
      const folderPath = outputPath.substring(0, outputPath.lastIndexOf('\\'));
      await invoke('save_metadata', {
        path: folderPath,
        metadata: JSON.stringify({
          name: finalName,
          duration: formattedDuration,
          timestamp: Date.now()
        })
      });

      // Switch to library and refresh
      setActiveTab('library');
      await refreshRecordings();

      finalDurationRef.current = 0;
      setPendingRecordingName('');
    } catch (e) {
      console.error("Failed to stop recording:", e);
    }
  };

  const cancelStopRecording = () => {
    setShowStopConfirmation(false);
  };

  const toggleWebcam = async () => {
    updateSettings({ webcamEnabled: !settings.webcamEnabled }, true);
  };

  return (
    <div className="w-full h-full bg-transparent font-sans text-zinc-100 relative overflow-hidden select-none">

      {/* Countdown Overlay */}
      {countdown !== null && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-transparent backdrop-blur-[2px] animate-in fade-in duration-300">
          <div className="text-9xl font-bold font-mono text-indigo-400 animate-bounce drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]">
            {countdown}
          </div>
        </div>
      )}

      {/* Floating Control Bar */}
      {isRecording && (
        <div className="w-full h-full flex items-center justify-center bg-transparent relative">
          {!showStopConfirmation ? (
            <FloatingBar
              isPaused={isPaused}
              setIsPaused={setIsPaused}
              onStop={handleStopRecording}
              showClicks={settings.showClicks}
              toggleClicks={() => updateSettings({ showClicks: !settings.showClicks })}
              onTimeUpdate={handleTimeUpdate}
              initialSeconds={finalDurationRef.current}
              webcamEnabled={settings.webcamEnabled}
              toggleWebcam={toggleWebcam}
            />
          ) : (
            /* Stop Confirmation Dialog (replaces bar temporarily) */
            <div
              data-tauri-drag-region
              className="bg-zinc-900/90 backdrop-blur-xl border border-red-500/30 shadow-2xl rounded-2xl px-6 py-4 flex flex-col items-center gap-3 animate-in zoom-in-95 duration-200"
            >
              <div className="text-sm font-medium text-white">Stop Recording?</div>
              <div className="flex gap-3">
                <button
                  onClick={confirmStopRecording}
                  className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-colors shadow-lg shadow-red-500/20"
                >
                  Yes, Stop
                </button>
                <button
                  onClick={cancelStopRecording}
                  className="px-4 py-1.5 bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white text-xs font-bold rounded-lg transition-colors border border-white/5"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Mic Mute Disclaimer */}
          {micMuteWarning && (
            <div className="absolute top-full mt-6 left-1/2 -translate-x-1/2 bg-zinc-900 border border-indigo-500/50 px-5 py-3 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-top-4 duration-500 z-[100] min-w-[280px]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                  <AlertCircle size={18} />
                </div>
                <div>
                  <div className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest">Recording Limitation</div>
                  <div className="text-xs text-zinc-300 mt-0.5 leading-tight">Live audio toggling is not yet supported. This change will apply to your <span className="text-indigo-400 font-bold">next session</span>.</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ... existing Main Window code, but Start Button Logic updated */}
      {/* update button onClick to `startCountdown` */}


      {/* MAIN WINDOW (Dashboard) */}
      {!isRecording && countdown === null && (

        <div className="bg-zinc-900/95 w-full h-full flex flex-col overflow-hidden text-zinc-100">
          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
            <div className="w-60 bg-black/20 border-r border-white/5 flex flex-col p-4 gap-2">
              <div className="mb-6 px-2 pt-2 flex items-center gap-3">
                <img src={logo} alt="Reframe Logo" className="w-8 h-8 rounded-lg shadow-lg shadow-indigo-500/20" />
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Reframe</h1>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">by Theta Labs</p>
                </div>
              </div>

              <nav className="space-y-1">
                {[
                  { id: 'record', icon: Video, label: 'Recorder' },
                  { id: 'library', icon: Folder, label: 'Library' },
                  { id: 'settings', icon: Settings, label: 'Settings' },
                  { id: 'about', icon: Info, label: 'About' },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === item.id
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/20'
                      : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                      }`}
                  >
                    <item.icon size={18} />
                    {item.label}
                  </button>
                ))}
              </nav>

              <div className="mt-auto bg-zinc-900/50 p-3 rounded-xl border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Storage</span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {diskInfo ? `${(diskInfo.free / 1024 / 1024 / 1024).toFixed(1)}GB Free` : "Loading..."}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-500"
                    style={{ width: diskInfo ? `${Math.min(100, (1 - diskInfo.free / diskInfo.total) * 100)}%` : '0%' }}
                  />
                </div>
                {diskInfo && <div className="text-[9px] text-zinc-600 mt-1 truncate">{diskInfo.label}</div>}
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-zinc-900 to-zinc-900/50 relative">
              {/* --- RECORDER TAB --- */}
              {activeTab === 'record' && (
                <div className="flex-1 flex flex-col p-6 gap-6 overflow-hidden animate-in fade-in duration-300">
                  <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">

                    {/* Left Col: Preview */}
                    <div className="col-span-7 flex flex-col gap-4">
                      <div className="flex-1 bg-black/40 rounded-xl border border-white/10 relative overflow-hidden group min-h-[240px]">
                        <div className="absolute inset-0 flex items-center justify-center text-zinc-600 group-hover:text-zinc-500 transition-colors">
                          <Monitor size={64} strokeWidth={1} />
                        </div>

                        {/* Preview Overlays (Simplified) */}
                        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Recording Mode</span>
                            <div className="px-2 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded text-xs font-bold text-indigo-300">
                              Fullscreen Display
                            </div>
                          </div>

                          <button
                            onClick={toggleWebcam}
                            className={`p-2.5 rounded-xl backdrop-blur-md border transition-all duration-300 shadow-lg ${settings.webcamEnabled
                              ? 'bg-indigo-500 border-indigo-400 text-white shadow-indigo-500/40 translate-y-[-2px]'
                              : 'bg-black/60 border-white/10 text-zinc-400 hover:border-white/20'
                              }`}
                            title="Toggle Webcam Overlay"
                          >
                            <Video size={18} className={settings.webcamEnabled ? 'animate-pulse' : ''} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Right Col: Settings */}
                    <div className="col-span-5 flex flex-col gap-4">
                      {/* Audio Section */}
                      <div className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-3">
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                          Audio Sources
                        </h3>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-1 w-full mr-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <button
                                  onClick={() => updateSettings({ micEnabled: !settings.micEnabled })}
                                  className={`p-1.5 rounded-md transition-colors shrink-0 ${settings.micEnabled ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}
                                >
                                  <Mic size={14} />
                                </button>
                                <div className="min-w-0 flex-1">
                                  <div className="flex justify-between items-center text-xs font-medium text-zinc-300">
                                    <span>Mic</span>
                                    <span className="text-[10px] text-zinc-500">{settings.micVolume.toFixed(1)}x</span>
                                  </div>
                                  <select
                                    className="bg-transparent text-[10px] text-zinc-500 outline-none w-full truncate mb-1"
                                    onChange={(e) => updateSettings({ micDevice: e.target.value })}
                                    value={settings.micDevice}
                                  >
                                    {availableDevices.audio.map((dev, i) => (
                                      <option key={i} value={dev}>{dev}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              {/* Mic Volume Slider */}
                              <input
                                type="range"
                                min="0"
                                max="10"
                                step="0.1"
                                value={settings.micVolume}
                                onChange={(e) => updateSettings({ micVolume: parseFloat(e.target.value) })}
                                className="w-full h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-indigo-500"
                                disabled={!settings.micEnabled}
                              />
                            </div>
                            <AudioMeter active={settings.micEnabled} />
                          </div>

                          <div className="flex items-center justify-between mt-4">
                            <div className="flex flex-col gap-1 w-full mr-2">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => updateSettings({ systemAudioEnabled: !settings.systemAudioEnabled })}
                                  className={`p-1.5 rounded-md transition-colors shrink-0 ${settings.systemAudioEnabled ? 'bg-purple-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}
                                >
                                  <Music size={14} />
                                </button>
                                <div className="min-w-0 flex-1">
                                  <div className="flex justify-between items-center text-xs font-medium text-zinc-300">
                                    <span>System</span>
                                    <span className="text-[10px] text-zinc-500">{settings.systemAudioVolume.toFixed(1)}x</span>
                                  </div>
                                  <div className="text-[10px] text-zinc-500 mb-1">Loopback</div>
                                </div>
                              </div>
                              {/* System Volume Slider */}
                              <input
                                type="range"
                                min="0"
                                max="10"
                                step="0.1"
                                value={settings.systemAudioVolume}
                                onChange={(e) => updateSettings({ systemAudioVolume: parseFloat(e.target.value) })}
                                className="w-full h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-purple-500"
                                disabled={!settings.systemAudioEnabled}
                              />
                            </div>
                            <AudioMeter active={settings.systemAudioEnabled} />
                          </div>
                        </div>
                      </div>

                      {/* Visual Effects Section (Streamlined) */}
                      <div className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-3">
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                          Quick Toggles
                        </h3>
                        <div className="space-y-4 pt-1">
                          <Toggle
                            label="Mouse Clicks"
                            icon={MousePointer2}
                            enabled={settings.showClicks}
                            onChange={v => updateSettings({ showClicks: v })}
                          />
                          <Toggle
                            label="Keystrokes"
                            icon={Keyboard}
                            enabled={settings.showKeystrokes}
                            onChange={v => updateSettings({ showKeystrokes: v })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer: Name Input & Start Button */}
                  <div className="h-24 shrink-0 flex flex-col items-center justify-center gap-3 border-t border-white/5 pt-4">
                    <div className="w-full max-w-sm relative">
                      <input
                        type="text"
                        placeholder="Recording Name (Optional)"
                        value={pendingRecordingName}
                        onChange={(e) => setPendingRecordingName(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm text-zinc-300 placeholder:text-zinc-600 focus:border-indigo-500/50 outline-none transition-all"
                      />
                    </div>
                    <button
                      onClick={startCountdown}
                      disabled={countdown !== null}
                      className="w-full max-w-sm flex items-center justify-center gap-3 px-6 py-3 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white rounded-xl font-bold text-base shadow-lg shadow-red-500/10 hover:shadow-red-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {countdown !== null ? (
                        <div className="text-white">Starting in {countdown}...</div>
                      ) : (
                        <>
                          <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
                          Start Recording
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* --- LIBRARY TAB --- */}
              {activeTab === 'library' && (
                <div
                  className="p-8 h-full flex flex-col relative"
                  style={{ animation: 'fadeIn 0.3s ease-out' }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <h2 className="text-2xl font-bold">Recordings</h2>
                    </div>

                    <div className="flex gap-2 relative">
                      {selectedIds.size > 0 && (
                        <button
                          onClick={() => {
                            const toDelete = recordings.filter(r => selectedIds.has(r.id as number));
                            if (window.confirm(`Delete ${selectedIds.size} recordings forever?`)) {
                              Promise.all(toDelete.map(r => {
                                const path = r.fullPath;
                                if (path) {
                                  const folderPath = path.substring(0, path.lastIndexOf('\\'));
                                  return invoke('delete_recording', { path: folderPath });
                                }
                                return Promise.resolve();
                              })).then(() => {
                                setSelectedIds(new Set());
                                refreshRecordings();
                              });
                            }
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all text-xs font-bold"
                        >
                          <Trash size={14} /> Delete Selected ({selectedIds.size})
                        </button>
                      )}

                      <button
                        onClick={() => {
                          if (selectedIds.size === recordings.length && recordings.length > 0) setSelectedIds(new Set());
                          else setSelectedIds(new Set(recordings.map(r => r.id as number)));
                        }}
                        className="p-2 hover:bg-white/5 rounded text-zinc-400 hover:text-white transition-colors"
                        title="Select All"
                      >
                        {selectedIds.size === recordings.length && recordings.length > 0 ? <CheckSquare size={18} className="text-indigo-400" /> : <SquareIcon size={18} />}
                      </button>

                      <button
                        onClick={() => invoke('open_folder', { path: settings.savePath })}
                        className="p-2 hover:bg-white/5 rounded text-zinc-400 hover:text-white transition-colors"
                        title="Open Folder"
                      >
                        <Folder size={18} />
                      </button>
                      <div className="relative">
                        <button
                          onClick={() => setShowSortMenu(!showSortMenu)}
                          className={`p-2 hover:bg-white/5 rounded transition-colors ${showSortMenu ? 'text-indigo-400 bg-white/5' : 'text-zinc-400 hover:text-white'}`}
                          title="Sort Options"
                        >
                          <ListFilter size={18} />
                        </button>
                        {showSortMenu && (
                          <div className="absolute right-0 mt-2 w-48 bg-zinc-800 border border-white/10 rounded-xl shadow-2xl z-50 p-1 animate-in fade-in zoom-in-95 duration-100">
                            {[
                              { id: 'newest', label: 'Newest First', icon: Clock },
                              { id: 'name', label: 'By Name', icon: ArrowDownAZ },
                              { id: 'size', label: 'By Size', icon: HardDrive },
                            ].map((mode) => (
                              <button
                                key={mode.id}
                                onClick={() => {
                                  setSortMode(mode.id as any);
                                  setShowSortMenu(false);
                                }}
                                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${sortMode === mode.id ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                              >
                                <mode.icon size={14} />
                                {mode.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="h-6 w-px bg-white/10 mx-1 self-center" />

                      <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/5 h-fit self-center">
                        <button
                          onClick={() => setViewMode('list')}
                          className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                          title="List View"
                        >
                          <List size={14} />
                        </button>
                        <button
                          onClick={() => setViewMode('grid')}
                          className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                          title="Grid View"
                        >
                          <LayoutGrid size={14} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {recordings.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-4 border-2 border-dashed border-white/5 rounded-xl">
                      <Film size={48} className="opacity-20" />
                      <p>No recordings yet. Start creating!</p>
                    </div>
                  ) : (
                    <div className={viewMode === 'list' ? "space-y-2 overflow-y-auto custom-scrollbar pr-2" : "grid grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto custom-scrollbar pr-2"}>
                      {[...recordings]
                        .sort((a, b) => {
                          if (sortMode === 'newest') return (b.id as number) - (a.id as number);
                          if (sortMode === 'name') return a.name.localeCompare(b.name);
                          if (sortMode === 'size') {
                            const parseSize = (s: string) => parseFloat(s.split(' ')[0]) || 0;
                            return parseSize(b.size) - parseSize(a.size);
                          }
                          return 0;
                        })
                        .map((rec) => {
                          const isSelected = selectedIds.has(rec.id as number);
                          return (
                            <div
                              key={rec.id}
                              className={`group relative flex ${viewMode === 'list' ? 'items-center gap-3 p-1.5' : 'flex-col gap-2 p-3'} bg-zinc-900/40 hover:bg-zinc-800/60 border ${isSelected ? 'border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.1)]' : 'border-white/5 hover:border-white/10'} rounded-xl transition-all duration-200`}
                            >
                              {/* Selection Overlay for both views */}
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const next = new Set(selectedIds);
                                  if (isSelected) next.delete(rec.id as number);
                                  else next.add(rec.id as number);
                                  setSelectedIds(next);
                                }}
                                className={`absolute top-2 left-2 w-4 h-4 rounded border transition-all cursor-pointer flex items-center justify-center z-20 ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'bg-black/60 border-white/20 opacity-0 group-hover:opacity-100'}`}
                              >
                                {isSelected && <div className="w-2 h-1 border-l-2 border-b-2 border-white -rotate-45 mb-0.5" />}
                              </div>

                              <div
                                onClick={() => invoke('open_file', { path: rec.fullPath })}
                                className={`${viewMode === 'list' ? 'w-10 h-10' : 'w-full aspect-video'} bg-black/60 rounded-lg flex items-center justify-center shrink-0 cursor-pointer group/play overflow-hidden relative`}
                              >
                                <Play size={viewMode === 'list' ? 16 : 24} className="text-zinc-500 group-hover/play:text-indigo-400 group-hover/play:scale-110 transition-all fill-zinc-500 group-hover/play:fill-indigo-400/20 z-10" />
                                {viewMode === 'grid' && (
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                                    <div className="text-[10px] font-mono text-zinc-400">{rec.duration}</div>
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <h4 className={`font-bold text-zinc-100 truncate ${viewMode === 'list' ? 'text-xs' : 'text-sm mb-0.5'}`}>{rec.name}</h4>
                                <div className={`flex items-center gap-2 text-zinc-500 font-medium ${viewMode === 'list' ? 'text-[9px]' : 'text-[10px]'}`}>
                                  <span className="truncate flex items-center gap-1"><Folder size={9} className="opacity-50" /> {rec.folder}</span>
                                  <span>•</span>
                                  <span>{rec.size}</span>
                                  {viewMode === 'list' && (
                                    <>
                                      <span>•</span>
                                      <span className="text-indigo-400 font-bold">{rec.duration}</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className={viewMode === 'list' ? "relative" : "absolute top-2 right-2"}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuId(activeMenuId === rec.id ? null : rec.id as number);
                                  }}
                                  className={`p-1 rounded-md transition-all ${activeMenuId === rec.id ? 'bg-indigo-500 text-white' : 'hover:bg-white/10 text-zinc-400'}`}
                                >
                                  <MoreHorizontal size={viewMode === 'list' ? 16 : 14} />
                                </button>

                                {activeMenuId === rec.id && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-40"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveMenuId(null);
                                      }}
                                    />
                                    <div className="absolute right-0 mt-2 w-44 bg-zinc-800/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 p-1.5 animate-in fade-in zoom-in-95 duration-200">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveMenuId(null);
                                          setRenamingFile(rec);
                                          setNewName(rec.name);
                                        }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-zinc-300 hover:bg-white/10 hover:text-white rounded-xl transition-all group/item"
                                      >
                                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover/item:bg-indigo-500 group-hover/item:text-white transition-all">
                                          <Edit3 size={14} />
                                        </div>
                                        <div className="flex flex-col items-start text-left">
                                          <span className="font-bold">Rename</span>
                                          <span className="text-[10px] text-zinc-500">Update file label</span>
                                        </div>
                                      </button>
                                      <div className="my-1 h-px bg-white/5 mx-2" />
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveMenuId(null);
                                          setDeletingFile(rec);
                                        }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-zinc-300 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all group/item"
                                      >
                                        <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 group-hover/item:bg-red-500 group-hover/item:text-white transition-all">
                                          <Trash2 size={14} />
                                        </div>
                                        <div className="flex flex-col items-start text-left">
                                          <span className="font-bold">Delete</span>
                                          <span className="text-[10px] text-zinc-500">Move to trash</span>
                                        </div>
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}

                  {/* Rename Modal */}
                  {renamingFile && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                      <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-bold mb-2">Rename Recording</h3>
                        <p className="text-zinc-500 text-sm mb-6">Enter a new name for this recording.</p>
                        <input
                          autoFocus
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const path = renamingFile.fullPath;
                              if (path) {
                                const folderPath = path.substring(0, path.lastIndexOf('\\'));
                                invoke('rename_recording', { path: folderPath, newName }).then(() => {
                                  setRenamingFile(null);
                                  refreshRecordings();
                                });
                              }
                            }
                            if (e.key === 'Escape') setRenamingFile(null);
                          }}
                          className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none transition-all mb-8"
                        />
                        <div className="flex gap-3">
                          <button
                            onClick={() => setRenamingFile(null)}
                            className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              const path = renamingFile.fullPath;
                              if (path) {
                                const folderPath = path.substring(0, path.lastIndexOf('\\'));
                                invoke('rename_recording', { path: folderPath, newName }).then(() => {
                                  setRenamingFile(null);
                                  refreshRecordings();
                                });
                              }
                            }}
                            className="flex-1 px-4 py-3 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all"
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Delete Confirmation Modal */}
                  {deletingFile && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                      <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mb-6">
                          <Trash2 size={32} />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Delete Recording?</h3>
                        <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
                          This will permanently delete <span className="text-white font-bold">"{deletingFile.name}"</span> and all its associated files. This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setDeletingFile(null)}
                            className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold transition-all"
                          >
                            Keep File
                          </button>
                          <button
                            onClick={() => {
                              const path = deletingFile.fullPath;
                              if (path) {
                                const folderPath = path.substring(0, path.lastIndexOf('\\'));
                                invoke('delete_recording', { path: folderPath }).then(() => {
                                  setDeletingFile(null);
                                  refreshRecordings();
                                });
                              }
                            }}
                            className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-400 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 transition-all"
                          >
                            Delete Forever
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* --- SETTINGS TAB --- */}
              {activeTab === 'settings' && (
                <div className="p-8 h-full overflow-y-auto custom-scrollbar animate-in fade-in duration-500">
                  <SettingsPanel
                    settings={settings}
                    updateSettings={updateSettings}
                    availableDevices={availableDevices}
                  />
                </div>
              )}

              {/* --- ABOUT TAB --- */}
              {activeTab === 'about' && (
                <AboutPanel />
              )}

            </div>
          </div>
        </div >
      )
      }
    </div >
  );
}
