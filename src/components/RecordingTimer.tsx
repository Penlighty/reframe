import { memo, useEffect, useState } from 'react';

interface RecordingTimerProps {
    isPaused: boolean;
    isStopping?: boolean;
    onTimeUpdate?: (seconds: number) => void;
    initialSeconds?: number;
}

const RecordingTimer = memo(({ isPaused, isStopping = false, onTimeUpdate, initialSeconds = 0 }: RecordingTimerProps) => {
    const [seconds, setSeconds] = useState(initialSeconds);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (!isPaused && !isStopping) {
            interval = setInterval(() => {
                setSeconds(s => {
                    const next = s + 1;
                    if (onTimeUpdate) onTimeUpdate(next);
                    return next;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isPaused, isStopping, onTimeUpdate]);

    const formatTime = (secs: number) => {
        const hrs = Math.floor(secs / 3600);
        const mins = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        return `${hrs > 0 ? `${hrs}:` : ''}${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex items-center gap-2 font-mono text-red-500 font-bold min-w-[60px]">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            {formatTime(seconds)}
        </div>
    );
});

export default RecordingTimer;
