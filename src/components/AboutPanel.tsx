import React, { memo } from 'react';
import { ShieldCheck, FileText, Heart, Video } from 'lucide-react';
import logo from '../assets/logo.png';

export const AboutPanel = memo(() => {
    return (
        <div className="p-8 h-full overflow-y-auto custom-scrollbar animate-in slide-in-from-bottom-4 duration-500">
            <div className="max-w-3xl mx-auto space-y-12 pb-20">
                {/* Hero Section */}
                <header className="text-center space-y-4">
                    <div className="inline-block p-4 bg-indigo-500/10 rounded-3xl border border-indigo-500/20 mb-4">
                        <img src={logo} alt="Reframe" className="w-20 h-20 rounded-2xl shadow-2xl" />
                    </div>
                    <h2 className="text-4xl font-extrabold tracking-tight">About Reframe</h2>
                    <p className="text-indigo-400 font-medium tracking-wide uppercase text-xs">A Professional Tool for Educational Excellence</p>
                </header>

                {/* Mission / Values */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                        <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
                            <Heart size={20} />
                        </div>
                        <h3 className="text-lg font-bold">Our Mission</h3>
                        <p className="text-sm text-zinc-400 leading-relaxed">
                            To the Glory of God, created for creative disciple-makers using Refresh Studio to raise kingdom creatives. Reframe is designed to empower educators and mentors with professional-grade tools to share knowledge effectively.
                        </p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                        <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400">
                            <Video size={20} />
                        </div>
                        <h3 className="text-lg font-bold">Theta Labs</h3>
                        <p className="text-sm text-zinc-400 leading-relaxed">
                            Developed by <span className="text-white font-semibold">Theta Labs</span>, we focus on building high-performance software that integrates seamlessly into modern educational workflows and creative studio environments.
                        </p>
                    </div>
                </div>

                {/* Legal Tabs */}
                <div className="space-y-6">
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-zinc-100 font-bold">
                            <ShieldCheck className="text-green-400" size={20} />
                            <h3>Privacy Policy</h3>
                        </div>
                        <div className="bg-black/20 rounded-2xl p-6 border border-white/5 text-sm text-zinc-400 leading-relaxed space-y-3">
                            <p>• <span className="text-zinc-200">Local First:</span> Reframe is a local-first application. Your recordings, system audio, and webcam data never leave your computer unless you explicitly export or share them.</p>
                            <p>• <span className="text-zinc-200">Zero Tracking:</span> We do not collect personal usage data, keystrokes (beyond the visual overlay), or metadata about your recording content.</p>
                            <p>• <span className="text-zinc-200">Educational Safety:</span> Designed for use in sensitive educational environments, ensuring complete control over file storage and data privacy.</p>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-zinc-100 font-bold">
                            <FileText className="text-blue-400" size={20} />
                            <h3>Terms & Conditions</h3>
                        </div>
                        <div className="bg-black/20 rounded-2xl p-6 border border-white/5 text-sm text-zinc-400 leading-relaxed space-y-3">
                            <p>• <span className="text-zinc-200">Purpose:</span> This software is provided for professional educational and creative use. Redistribution or reverse engineering without consent is prohibited.</p>
                            <p>• <span className="text-zinc-200">Liability:</span> Reframe is provided "as is". While we strive for absolute reliability, Theta Labs is not responsible for data loss from hardware failure or system conflicts.</p>
                            <p>• <span className="text-zinc-200">Ownership:</span> You retain 100% ownership of any content created using Reframe.</p>
                        </div>
                    </section>
                </div>

                <footer className="text-center pt-8 border-t border-white/5">
                    <p className="text-[10px] text-zinc-600 uppercase tracking-[0.2em]">Build 0.1.0 • Made with Excellence • Reframe by Theta Labs</p>
                </footer>
            </div>
        </div>
    );
});

AboutPanel.displayName = 'AboutPanel';
