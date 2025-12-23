import { useState, useEffect } from 'react';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';

import {
    X,
    Play,
    Folder,
    Film,
    Loader2,
    FolderOpen,
    ExternalLink
} from 'lucide-react';
import type { FileRecord } from '../App';

interface PlaybackModalProps {
    file: FileRecord;
    onClose: () => void;
}

const PlaybackModal = ({ file, onClose }: PlaybackModalProps) => {
    const [videoSrc, setVideoSrc] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');

    const openInSystemPlayer = () => {
        if (file.fullPath) {
            invoke('open_file', { path: file.fullPath })
                .catch((err) => console.error('Failed to open file in system player:', err));
        }
    };

    useEffect(() => {
        if (file.fullPath) {
            setLoading(true);
            setError('');
            try {
                // Ensure backslashes are normalized
                const cleanPath = file.fullPath.replace(/\\/g, '/');
                let assetUrl = convertFileSrc(cleanPath);

                // Force HTTPS to ensure secure context for media decoders
                if (assetUrl.startsWith('http://asset.localhost')) {
                    assetUrl = assetUrl.replace('http://', 'https://');
                }

                setVideoSrc(`${assetUrl}?t=${Date.now()}`);
                setLoading(false);
            } catch (e) {
                console.error('Failed to convert file src:', e);
                setError(`Failed to prepare video source: ${e}`);
                setLoading(false);
            }
        }
    }, [file.fullPath]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
            <div
                className="relative w-[800px] bg-zinc-950 rounded-xl border border-white/10 shadow-2xl overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="h-12 bg-white/5 border-b border-white/5 flex items-center justify-between px-4">
                    <div className="flex items-center gap-2">
                        <Film size={16} className="text-indigo-400" />
                        <span className="text-sm font-medium text-zinc-300">{file.name}</span>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Video Player Section */}
                <div className="aspect-video bg-black flex items-center justify-center group relative overflow-hidden">
                    {loading ? (
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 size={48} className="text-indigo-400 animate-spin" />
                            <span className="text-zinc-400">Loading video...</span>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center gap-4 text-center p-8">
                            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center">
                                <Film size={32} className="text-red-400" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-white font-bold">Standard Playback Recommended</h3>
                                <p className="text-zinc-400 text-xs max-w-sm">
                                    The embedded player is restricted by system security. Use your system's default media player for the best experience.
                                </p>
                            </div>
                            <button
                                onClick={openInSystemPlayer}
                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-bold text-white shadow-xl shadow-indigo-500/20 transition-all flex items-center gap-2 group/btn"
                            >
                                <Play size={16} fill="currentColor" />
                                Play in System Player
                            </button>
                        </div>
                    ) : videoSrc ? (
                        <video
                            src={videoSrc}
                            controls
                            autoPlay
                            className="w-full h-full object-contain"
                            onError={(e) => {
                                console.error('Video element error:', e);
                                setError('Browser playback restricted');
                            }}
                        />
                    ) : (
                        <div className="flex flex-col items-center">
                            <Play size={48} className="text-white/20" />
                            <span className="text-zinc-500 mt-2">File path missing</span>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-zinc-900 border-t border-white/5 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <Folder size={14} />
                            <span>{file.folder}</span>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => {
                                if (file.fullPath) {
                                    invoke('open_folder', { path: file.fullPath }).catch((err) => console.error('Failed to open folder:', err));
                                }
                            }}
                            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-2"
                        >
                            <FolderOpen size={16} />
                            Open Folder
                        </button>
                        <button
                            onClick={openInSystemPlayer}
                            className="px-4 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 rounded-lg text-sm font-medium text-indigo-300 transition-colors flex items-center gap-2"
                        >
                            <ExternalLink size={16} />
                            Simple Playback
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlaybackModal;
