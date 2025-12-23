import { LucideIcon } from 'lucide-react';

interface ToggleProps {
    label: string;
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    icon: LucideIcon;
}

const Toggle = ({ label, enabled, onChange, icon: Icon }: ToggleProps) => (
    <div
        onClick={() => onChange(!enabled)}
        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all border ${enabled
                ? 'bg-indigo-500/10 border-indigo-500/50'
                : 'bg-zinc-800/50 border-white/5 hover:border-white/10'
            }`}
    >
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-md ${enabled ? 'bg-indigo-500 text-white' : 'bg-zinc-700 text-zinc-400'}`}>
                <Icon size={18} />
            </div>
            <span className={`text-sm font-medium ${enabled ? 'text-white' : 'text-zinc-400'}`}>
                {label}
            </span>
        </div>
        <div className={`w-10 h-5 rounded-full relative transition-colors ${enabled ? 'bg-indigo-500' : 'bg-zinc-700'}`}>
            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${enabled ? 'left-6' : 'left-1'}`} />
        </div>
    </div>
);

export default Toggle;
