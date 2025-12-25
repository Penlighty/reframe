import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
    value: string | number;
    label: string;
}

interface CustomSelectProps {
    options: Option[];
    value: string | number;
    onChange: (value: any) => void;
    label?: string;
    disabled?: boolean;
    className?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
    options,
    value,
    onChange,
    label,
    disabled,
    className = ""
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value) || options[0];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {label && (
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">
                    {label}
                </label>
            )}
            <button
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 bg-zinc-900/40 border border-white/10 rounded-lg text-xs transition-all focus:border-indigo-500/50 outline-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-white/20 active:scale-[0.98]'
                    } ${isOpen ? 'border-indigo-500/50 ring-1 ring-indigo-500/20 shadow-[0_0_20px_rgba(163,217,93,0.2)]' : ''}`}
            >
                <span className={`truncate ${selectedOption ? 'text-zinc-100' : 'text-zinc-500'}`}>
                    {selectedOption?.label || 'Select...'}
                </span>
                <ChevronDown
                    size={14}
                    className={`text-zinc-500 transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-400' : ''}`}
                />
            </button>

            {isOpen && (
                <div className="absolute z-[100] mt-2 w-full bg-zinc-800/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-1.5 animate-in fade-in zoom-in-95 duration-200 origin-top">
                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {options.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-xl transition-all group ${value === option.value
                                    ? 'bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-500/20'
                                    : 'text-zinc-300 hover:bg-white/10 hover:text-white'
                                    }`}
                            >
                                <span className="truncate">{option.label}</span>
                                {value === option.value && <Check size={14} className="shrink-0" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
