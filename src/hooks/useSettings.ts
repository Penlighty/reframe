import { useState, useEffect, useRef } from 'react';
import { load, Store } from '@tauri-apps/plugin-store';
import { emit, listen } from '@tauri-apps/api/event'; // Import events

export interface AppSettings {
    micEnabled: boolean;
    micDevice: string;
    systemAudioEnabled: boolean;
    webcamEnabled: boolean;
    captureMode: 'fullscreen' | 'window' | 'region';
    showClicks: boolean;
    showKeystrokes: boolean;
    keystrokePosition: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' | 'bottom-center';
    clickColorLeft: string;
    clickColorRight: string;
    micVolume: number;
    systemAudioVolume: number;
    savePath: string;
    webcamShape: 'square' | 'portrait' | 'landscape';
    webcamZoom: number;
    webcamRoundness: number;
    webcamWidth: number;
    webcamHeight: number;
    webcamDevice: string;
    resolution: string;
    fps: number;
    videoFormat: string;
}

const DEFAULT_SETTINGS: AppSettings = {
    micEnabled: true,
    micDevice: 'Default',
    systemAudioEnabled: false,
    webcamEnabled: false,
    captureMode: 'fullscreen',
    showClicks: true,
    showKeystrokes: true,
    keystrokePosition: 'bottom-left',
    clickColorLeft: '#6366f1',
    clickColorRight: '#ea580c',
    micVolume: 1.0,
    systemAudioVolume: 1.0,
    savePath: '',
    webcamShape: 'square',
    webcamZoom: 1.0,
    webcamRoundness: 20, // 20 / 2 = 10% border-radius default
    webcamWidth: 300,
    webcamHeight: 300,
    webcamDevice: 'Default',
    resolution: '1080p FHD (1920x1080)',
    fps: 60,
    videoFormat: 'MP4 (Recommended)',
};

let storeInstance: Store | null = null;

async function getStore(): Promise<Store> {
    if (!storeInstance) {
        storeInstance = await load('settings.json');
    }
    return storeInstance;
}

export function useSettings() {
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
    const [loaded, setLoaded] = useState(false);
    const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const syncTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Load settings on mount and listen for sync events
    useEffect(() => {
        let unlisten: (() => void) | undefined;

        async function init() {
            try {
                const store = await getStore();
                const saved = await store.get<AppSettings>('settings');
                if (saved) {
                    setSettings(prev => ({ ...prev, ...saved }));
                }
            } catch (e) {
                console.error('Failed to load settings:', e);
            }
            setLoaded(true);

            // Listen for updates from other windows/instances
            unlisten = await listen<AppSettings>('settings-sync', (event) => {
                setSettings(event.payload);
            });
        }
        init();

        return () => {
            if (unlisten) unlisten();
        };
    }, []);

    // Save settings whenever they change
    const updateSettings = async (newSettings: Partial<AppSettings>, immediate = false) => {
        setSettings(prev => {
            const updated = { ...prev, ...newSettings };

            // Debounce cross-window sync to prevent performance lag during slider dragging
            if (syncTimeout.current) clearTimeout(syncTimeout.current);

            if (immediate) {
                emit('settings-sync', updated).catch(e => console.error("Sync error:", e));
            } else {
                syncTimeout.current = setTimeout(() => {
                    emit('settings-sync', updated).catch(e => console.error("Sync error:", e));
                }, 16); // Sync at ~60Hz to keep UI responsive without saturating CPU
            }

            if (saveTimeout.current) {
                clearTimeout(saveTimeout.current);
            }

            const performSave = async () => {
                try {
                    const store = await getStore();
                    await store.set('settings', updated);
                    await store.save();
                } catch (e) {
                    console.error('Failed to save settings:', e);
                }
            };

            if (immediate) {
                performSave();
            } else {
                saveTimeout.current = setTimeout(performSave, 1500); // 1.5s debounce for disk IO
            }

            return updated;
        });
    };

    return { settings, updateSettings, loaded };
}
