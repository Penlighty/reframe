import React, { memo } from 'react';
import {
    Monitor, Mic, Video, MousePointer2, Keyboard,
    Info, Check, AlertCircle, Folder
} from 'lucide-react';
import { AppSettings } from '../hooks/useSettings';
import Toggle from './Toggle';
import { invoke } from '@tauri-apps/api/core';

interface SettingsPanelProps {
    settings: AppSettings;
    updateSettings: (newSettings: Partial<AppSettings>, immediate?: boolean) => Promise<void>;
    availableDevices: { audio: string[], video: string[] };
}

export const SettingsPanel = memo(({ settings, updateSettings, availableDevices }: SettingsPanelProps) => {
    return (
        <div className="space-y-8 pb-20 max-w-4xl">
            {/* --- STORAGE & FILES --- */}
            <section>
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">Storage & Files</h3>
                <div className="bg-white/5 p-5 rounded-xl border border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-zinc-300">Save Location</label>
                        <button
                            onClick={async () => {
                                const folder = await invoke<string | null>('select_folder');
                                if (folder) updateSettings({ savePath: folder });
                            }}
                            className="text-xs bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 px-3 py-1.5 rounded-lg border border-indigo-500/20 transition-colors"
                        >
                            Change Folder
                        </button>
                    </div>
                    <div className="bg-black/40 px-4 py-3 rounded-lg border border-white/5 flex items-center justify-between group">
                        <span className="text-xs text-zinc-400 font-mono truncate mr-4">
                            {settings.savePath || "Default (Videos/Reframe)"}
                        </span>
                        <Folder size={14} className="text-zinc-600 group-hover:text-zinc-400 shrink-0" />
                    </div>
                </div>
            </section>

            {/* --- RECORDING HARDWARE --- */}
            <section>
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">Hardware Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Toggle
                            label="Microphone"
                            icon={Mic}
                            enabled={settings.micEnabled}
                            onChange={(enabled) => updateSettings({ micEnabled: enabled })}
                        />
                        <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-3">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Device Source</label>
                            <select
                                className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-sm text-white focus:border-indigo-500 outline-none disabled:opacity-50"
                                value={settings.micDevice}
                                disabled={!settings.micEnabled}
                                onChange={(e) => updateSettings({ micDevice: e.target.value })}
                            >
                                {availableDevices.audio.map(dev => (
                                    <option key={dev} value={dev}>{dev}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Toggle
                            label="System Audio"
                            icon={Monitor}
                            enabled={settings.systemAudioEnabled}
                            onChange={(enabled) => updateSettings({ systemAudioEnabled: enabled })}
                        />
                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                            <p className="text-[10px] text-zinc-500">Requires virtual-audio-capturer driver to be installed for loopback recording.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- VISUAL OVERLAYS --- */}
            <section>
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">Visual Overlays</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                        <Toggle
                            label="Mouse Clicks"
                            icon={MousePointer2}
                            enabled={settings.showClicks}
                            onChange={(enabled) => updateSettings({ showClicks: enabled })}
                        />
                        {settings.showClicks && (
                            <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex gap-4 animate-in slide-in-from-top-2 duration-300">
                                <div className="flex-1 space-y-2">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Left Click</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={settings.clickColorLeft}
                                            onChange={(e) => updateSettings({ clickColorLeft: e.target.value })}
                                            className="w-8 h-8 rounded border-none bg-transparent cursor-pointer"
                                        />
                                        <span className="text-xs font-mono text-zinc-400 capitalize">{settings.clickColorLeft}</span>
                                    </div>
                                </div>
                                <div className="flex-1 space-y-2 border-l border-white/10 pl-4">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Right Click</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={settings.clickColorRight}
                                            onChange={(e) => updateSettings({ clickColorRight: e.target.value })}
                                            className="w-8 h-8 rounded border-none bg-transparent cursor-pointer"
                                        />
                                        <span className="text-xs font-mono text-zinc-400 capitalize">{settings.clickColorRight}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <Toggle
                            label="Keystrokes"
                            icon={Keyboard}
                            enabled={settings.showKeystrokes}
                            onChange={(enabled) => updateSettings({ showKeystrokes: enabled })}
                        />
                        {settings.showKeystrokes && (
                            <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-2 animate-in slide-in-from-top-2 duration-300">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Position</label>
                                <select
                                    className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-sm text-white focus:border-indigo-500 outline-none"
                                    value={settings.keystrokePosition}
                                    onChange={(e) => updateSettings({ keystrokePosition: e.target.value as any })}
                                >
                                    <option value="bottom-left">Bottom Left</option>
                                    <option value="bottom-right">Bottom Right</option>
                                    <option value="top-left">Top Left</option>
                                    <option value="top-right">Top Right</option>
                                    <option value="bottom-center">Bottom Center</option>
                                </select>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* --- WEBCAM SETTINGS --- */}
            <section>
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">Webcam Settings</h3>
                <div className="space-y-4">
                    <Toggle
                        label="Enable Webcam Window"
                        icon={Video}
                        enabled={settings.webcamEnabled}
                        onChange={(enabled) => {
                            updateSettings({ webcamEnabled: enabled }, true);
                        }}
                    />

                    <div className={`bg-white/5 rounded-xl border border-white/5 overflow-hidden transition-all duration-300 ${!settings.webcamEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div className="p-6 space-y-8">
                            {/* Shape Selection */}
                            <div className="space-y-3">
                                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Frame Shape</label>
                                <div className="flex gap-2">
                                    {[
                                        { id: 'square', label: 'Square', icon: 'aspect-square' },
                                        { id: 'portrait', label: 'Portrait', icon: 'aspect-[3/4]' },
                                        { id: 'landscape', label: 'Landscape', icon: 'aspect-video' }
                                    ].map((shape) => (
                                        <button
                                            key={shape.id}
                                            onClick={() => {
                                                const updates: any = { webcamShape: shape.id as any };
                                                if (shape.id === 'square') { updates.webcamWidth = 300; updates.webcamHeight = 300; }
                                                if (shape.id === 'portrait') { updates.webcamWidth = 300; updates.webcamHeight = 400; }
                                                if (shape.id === 'landscape') { updates.webcamWidth = 450; updates.webcamHeight = 250; }
                                                updateSettings(updates);
                                            }}
                                            className={`flex-1 p-3 rounded-lg border text-sm font-medium transition-all flex flex-col items-center gap-2 ${settings.webcamShape === shape.id
                                                ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                                                : 'bg-black/20 border-white/5 text-zinc-500 hover:border-white/10'
                                                }`}
                                        >
                                            <div className={`w-8 h-8 rounded border-2 ${settings.webcamShape === shape.id ? 'border-indigo-400' : 'border-zinc-700'} ${shape.icon}`} />
                                            {shape.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Source Selection */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                    <Video size={14} className="text-zinc-500" />
                                    Video Source
                                </div>
                                <select
                                    className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-sm text-white focus:border-indigo-500 outline-none"
                                    value={settings.webcamDevice}
                                    onChange={(e) => updateSettings({ webcamDevice: e.target.value })}
                                >
                                    {availableDevices.video.map(dev => (
                                        <option key={dev} value={dev}>{dev}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Dimension Sliders */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Width</label>
                                            <span className="text-xs font-mono text-indigo-400">{settings.webcamWidth}px</span>
                                        </div>
                                        <input
                                            type="range" min="100" max="800" step="10"
                                            value={settings.webcamWidth}
                                            onChange={(e) => updateSettings({ webcamWidth: parseInt(e.target.value) })}
                                            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Height</label>
                                            <span className="text-xs font-mono text-indigo-400">{settings.webcamHeight}px</span>
                                        </div>
                                        <input
                                            type="range" min="100" max="800" step="10"
                                            value={settings.webcamHeight}
                                            onChange={(e) => updateSettings({ webcamHeight: parseInt(e.target.value) })}
                                            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Zoom Level</label>
                                            <span className="text-xs font-mono text-indigo-400">{Math.round(settings.webcamZoom * 100)}%</span>
                                        </div>
                                        <input
                                            type="range" min="1" max="3" step="0.1"
                                            value={settings.webcamZoom}
                                            onChange={(e) => updateSettings({ webcamZoom: parseFloat(e.target.value) })}
                                            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Corner Roundness</label>
                                            <span className="text-xs font-mono text-indigo-400">{settings.webcamRoundness}%</span>
                                        </div>
                                        <input
                                            type="range" min="0" max="100" step="1"
                                            value={settings.webcamRoundness}
                                            onChange={(e) => updateSettings({ webcamRoundness: parseInt(e.target.value) })}
                                            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-black/20 p-3 rounded-lg flex items-start gap-2">
                                <Info size={14} className="text-zinc-600 mt-0.5" />
                                <div className="space-y-2">
                                    <p className="text-[10px] text-zinc-500 leading-normal">
                                        Changes are applied instantly. If the webcam window doesn't resize correctly, try toggling it off and on.
                                    </p>
                                    <button
                                        onClick={() => {
                                            updateSettings({ ...settings }, true);
                                            invoke('toggle_webcam', { show: settings.webcamEnabled });
                                        }}
                                        className="text-[9px] text-indigo-400 font-bold uppercase hover:text-indigo-300 transition-colors"
                                    >
                                        Sync Hardware Now
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- VIDEO OUTPUT --- */}
            <section>
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">Video Output</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                        <label className="text-sm text-zinc-400 mb-2 block">Resolution</label>
                        <select
                            className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-sm text-white focus:border-indigo-500 outline-none"
                            value={settings.resolution}
                            onChange={(e) => updateSettings({ resolution: e.target.value })}
                        >
                            <option value="Original (Lossless)">Original (Lossless)</option>
                            <option value="4K UHD (3840x2160)">4K UHD (3840x2160)</option>
                            <option value="1080p FHD (1920x1080)">1080p FHD (1920x1080)</option>
                            <option value="720p HD (1280x720)">720p HD (1280x720)</option>
                        </select>
                    </div>
                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                        <label className="text-sm text-zinc-400 mb-2 block">Frame Rate</label>
                        <select
                            className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-sm text-white focus:border-indigo-500 outline-none"
                            value={settings.fps}
                            onChange={(e) => updateSettings({ fps: parseInt(e.target.value) })}
                        >
                            <option value={120}>120 FPS</option>
                            <option value={60}>60 FPS</option>
                            <option value={30}>30 FPS</option>
                        </select>
                    </div>
                </div>
            </section>

            {/* --- ENCODING --- */}
            <section>
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">Encoding</h3>
                <div className="bg-white/5 rounded-xl border border-white/5 divide-y divide-white/5">
                    <div className="p-4 flex items-center justify-between">
                        <div>
                            <div className="text-sm font-medium">Hardware Acceleration</div>
                            <div className="text-xs text-zinc-500">NVIDIA NVENC H.264 (Detected)</div>
                        </div>
                        <div className="flex items-center gap-2 text-green-400 text-xs bg-green-400/10 px-2 py-1 rounded border border-green-400/20">
                            <Check size={12} /> Active
                        </div>
                    </div>
                    <div className="p-4 flex items-center justify-between">
                        <div>
                            <div className="text-sm font-medium">Video Format</div>
                            <div className="text-xs text-zinc-500">Container format for output files</div>
                        </div>
                        <select
                            className="bg-black/20 border border-white/10 rounded-lg p-2 text-sm text-white outline-none"
                            value={settings.videoFormat}
                            onChange={(e) => updateSettings({ videoFormat: e.target.value })}
                        >
                            <option value="MP4 (Recommended)">MP4 (Recommended)</option>
                            <option value="MKV">MKV</option>
                            <option value="MOV">MOV</option>
                        </select>
                    </div>
                </div>
            </section>

            <section>
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle className="text-indigo-400 shrink-0 mt-0.5" size={18} />
                    <div>
                        <h4 className="text-sm font-medium text-indigo-300">Pro Tip</h4>
                        <p className="text-xs text-indigo-200/60 mt-1">
                            Reframe automatically separates your webcam, screen, and audio into separate tracks within the session folder for easier post-production.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
});

SettingsPanel.displayName = 'SettingsPanel';
