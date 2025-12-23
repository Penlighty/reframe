import {
    Play,
    Pause,
    Square,
    MousePointer2,
    Minus,
    GripVertical,
    X,
    Video
} from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import RecordingTimer from './RecordingTimer';
// We'll accept a subset of AppSettings or just the values needed
interface FloatingBarProps {
    isPaused: boolean;
    setIsPaused: (val: boolean) => void;
    onStop: () => void;
    showClicks: boolean;
    toggleClicks: () => void;
    onTimeUpdate: (time: number) => void;
    initialSeconds?: number;
    webcamEnabled: boolean;
    toggleWebcam: () => void;
}

const FloatingBar = ({
    isPaused,
    setIsPaused,
    onStop,
    showClicks,
    toggleClicks,
    onTimeUpdate,
    initialSeconds = 0,
    webcamEnabled,
    toggleWebcam
}: FloatingBarProps) => {
    return (
        <div
            data-tauri-drag-region
            onPointerDown={() => getCurrentWindow().startDragging()}
            className="bg-zinc-900/90 backdrop-blur-xl border border-white/10 shadow-2xl rounded-full pl-3 pr-5 py-3 flex items-center gap-4 cursor-grab active:cursor-grabbing relative"
            style={{ animation: 'slideDown 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards' }}
        >
            {/* Drag Handle */}
            <div
                className="text-zinc-600 hover:text-zinc-400 transition-colors cursor-grab active:cursor-grabbing"
            >
                <GripVertical size={18} />
            </div>

            <RecordingTimer
                isPaused={isPaused}
                onTimeUpdate={onTimeUpdate}
                initialSeconds={initialSeconds}
            />

            <div className="h-6 w-px bg-white/10" />

            <div className="flex items-center gap-2">
                <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => setIsPaused(!isPaused)}
                    className="p-2 hover:bg-white/10 rounded-full text-white transition-colors"
                    title={isPaused ? "Resume" : "Pause"}
                >
                    {isPaused ? <Play size={20} fill="currentColor" /> : <Pause size={20} fill="currentColor" />}
                </button>

                <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={onStop}
                    className="w-8 h-8 flex items-center justify-center bg-red-500 hover:bg-red-600 rounded-md transition-all shadow-lg shadow-red-500/20"
                    title="Stop Recording"
                >
                    <Square size={14} fill="white" className="text-white" />
                </button>
            </div>

            <div className="h-6 w-px bg-white/10" />

            <div className="flex items-center gap-3 text-zinc-400">
                <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={toggleWebcam}
                    className={`transition-colors ${webcamEnabled ? 'text-indigo-400' : 'text-zinc-500'}`}
                    title="Toggle Webcam Overlay"
                >
                    <Video size={18} />
                </button>
                <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={toggleClicks}
                    className={`transition-colors ${showClicks ? 'text-indigo-400' : 'text-zinc-600'}`}
                    title="Toggle Click Effects"
                >
                    <MousePointer2 size={18} />
                </button>
            </div>

            <div className="h-6 w-px bg-white/10" />

            {/* Window Controls */}
            <div className="flex items-center gap-1">
                <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => getCurrentWindow().minimize()}
                    className="p-1.5 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors"
                    title="Minimize"
                >
                    <Minus size={18} />
                </button>
                <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => onStop()}
                    className="p-1.5 hover:bg-white/10 rounded-full text-zinc-400 hover:text-red-400 transition-colors"
                    title="Close Overlay"
                >
                    <X size={18} />
                </button>
            </div>
        </div>
    );
};

export default FloatingBar;
