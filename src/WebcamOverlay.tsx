import { useEffect, useRef, useState } from 'react';
import { Move, Camera, AlertCircle, RefreshCw } from 'lucide-react';
import { useSettings } from './hooks/useSettings';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { LogicalSize } from '@tauri-apps/api/window';

export default function WebcamOverlay() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isHovered, setIsHovered] = useState(false);
    const [hasStream, setHasStream] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { settings, loaded } = useSettings();
    const streamRef = useRef<MediaStream | null>(null);
    const lastSizeRef = useRef({ w: 0, h: 0 });

    const stopStream = () => {
        if (streamRef.current) {
            console.log('WebcamOverlay: Stopping active stream');
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    const startCamera = async () => {
        if (!loaded) return;

        console.log('WebcamOverlay: Attempting start with device:', settings.webcamDevice);
        stopStream();
        setHasStream(false);
        setError(null);

        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(d => d.kind === 'videoinput');

            let videoConstraints: any = true;
            if (settings.webcamDevice && settings.webcamDevice !== 'Default') {
                const target = videoDevices.find(d => d.label === settings.webcamDevice);
                if (target) {
                    videoConstraints = { deviceId: { exact: target.deviceId } };
                }
            }

            console.log('WebcamOverlay: Accessing media stream...');
            const stream = await navigator.mediaDevices.getUserMedia({
                video: videoConstraints,
                audio: false
            });

            console.log('WebcamOverlay: Stream captured successfully');
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;

                // Show video immediately
                setHasStream(true);

                try {
                    await videoRef.current.play();
                    console.log('WebcamOverlay: Video playing successfully');
                } catch (playErr) {
                    console.warn('WebcamOverlay: play() failed, retrying...', playErr);
                    setTimeout(() => videoRef.current?.play().catch(e => console.error("Final play retry failed:", e)), 500);
                }
            }
        } catch (err: any) {
            console.error("WebcamOverlay Camera Error:", err);
            setError(err.message || 'Camera access failed');
            setHasStream(false);
        }
    };

    // React to settings changes
    useEffect(() => {
        if (loaded) {
            startCamera();
        }
        return () => stopStream();
    }, [loaded, settings.webcamDevice]);

    // Handle window resizing and properties
    useEffect(() => {
        if (!loaded) return;

        let frameId: number;
        const updateWindowProps = async () => {
            try {
                const win = getCurrentWebviewWindow();
                const width = Math.round(settings.webcamWidth || 300);
                const height = Math.round(settings.webcamHeight || 300);

                if (lastSizeRef.current.w !== width || lastSizeRef.current.h !== height) {
                    await win.setSize(new LogicalSize(width, height));
                    lastSizeRef.current = { w: width, h: height };

                    // Batching property updates
                    await Promise.all([
                        win.setShadow(false),
                        win.setDecorations(false)
                    ]);
                }
            } catch (e) {
                // Silent catch for background property failures
            }
        };

        const debouncedUpdate = () => {
            if (frameId) cancelAnimationFrame(frameId);
            frameId = requestAnimationFrame(() => {
                updateWindowProps();
            });
        };

        debouncedUpdate();
        return () => {
            if (frameId) cancelAnimationFrame(frameId);
        };
    }, [settings.webcamWidth, settings.webcamHeight, loaded]);

    const getRoundnessStyle = () => {
        return `${settings.webcamRoundness / 2}%`;
    };

    if (!loaded) return null;

    // NOTE: We don't check settings.webcamEnabled here. 
    // If the window is open, it should be working. 
    // This fixed the "Sync Hardware" requirement where the window 
    // was stuck in a stale disabled state on launch.

    return (
        <div
            className="w-full h-full flex items-center justify-center relative group bg-transparent overflow-hidden"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Minimal Overlay Controls */}
            <div className={`absolute top-4 right-4 transition-all duration-300 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'} z-50 flex gap-2`}>
                <button
                    onClick={startCamera}
                    title="Refresh Camera"
                    className="p-2 bg-zinc-900/90 backdrop-blur-md rounded-xl text-zinc-400 hover:text-white border border-white/5 transition-colors"
                >
                    <RefreshCw size={14} />
                </button>
                <div
                    className="p-2 bg-zinc-900/90 backdrop-blur-md rounded-xl cursor-move text-white hover:bg-indigo-500 transition-colors border border-white/10"
                    onPointerDown={() => getCurrentWebviewWindow().startDragging()}
                >
                    <Move size={14} />
                </div>
            </div>

            {/* Video Shape Container */}
            <div
                className="w-full h-full relative overflow-hidden bg-black shadow-none border-none isolation-auto"
                style={{
                    borderRadius: getRoundnessStyle(),
                    WebkitMaskImage: '-webkit-radial-gradient(white, black)',
                    maskImage: '-webkit-radial-gradient(white, black)',
                    boxShadow: 'none',
                    isolation: 'isolate'
                }}
            >
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover bg-black transition-opacity duration-300 ${hasStream ? 'opacity-100' : 'opacity-0'}`}
                    style={{
                        transform: `scaleX(-1) scale(${settings.webcamZoom})`,
                        borderRadius: getRoundnessStyle(),
                    }}
                />

                {!hasStream && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-zinc-500 p-6 text-center gap-3">
                        {error ? (
                            <>
                                <AlertCircle size={20} className="text-red-500/50" />
                                <div className="text-[10px] font-bold text-red-500/80 uppercase tracking-widest leading-none">Camera Status</div>
                                <div className="text-[9px] text-zinc-600 leading-tight max-w-[180px]">{error}</div>
                                <button
                                    onClick={startCamera}
                                    className="mt-1 flex items-center gap-2 px-3 py-1 bg-white/5 hover:bg-white/10 rounded-md text-[9px] uppercase font-bold transition-all border border-white/5"
                                >
                                    <RefreshCw size={10} />
                                    Retry
                                </button>
                            </>
                        ) : (
                            <>
                                <Camera size={24} className="opacity-10 animate-pulse" />
                                <div className="text-[9px] uppercase tracking-[0.2em] font-bold opacity-30">Connecting...</div>
                            </>
                        )}
                    </div>
                )}

                <div className={`absolute inset-0 border-2 border-indigo-500/40 transition-opacity duration-300 pointer-events-none ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                    style={{ borderRadius: getRoundnessStyle() }}
                />
            </div>
        </div>
    );
}
