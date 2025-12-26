/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { Settings, Zap, Database, MessageSquare, Github, Share2, BookOpen, Terminal, Activity } from 'lucide-react';

const NODES = [
    { id: 'jira', name: 'Jira Cloud', icon: Settings, color: 'text-blue-500', bg: 'bg-blue-500/10', pos: { x: 20, y: 25 }, subtitle: 'Aethermore (KAN)' },
    { id: 'zapier', name: 'Zapier', icon: Zap, color: 'text-orange-500', bg: 'bg-orange-500/10', pos: { x: 50, y: 50 }, subtitle: 'Workflow Orchestrator' },
    { id: 'kindle', name: 'Kindle Vellum', icon: BookOpen, color: 'text-amber-500', bg: 'bg-amber-500/10', pos: { x: 80, y: 25 }, subtitle: 'KDP Publishing' },
    { id: 'slack', name: 'Slack', icon: MessageSquare, color: 'text-purple-500', bg: 'bg-purple-500/10', pos: { x: 80, y: 75 }, subtitle: 'Team Comms' },
    { id: 'github', name: 'GitHub', icon: Github, color: 'text-zinc-400', bg: 'bg-zinc-400/10', pos: { x: 20, y: 75 }, subtitle: 'Asset Repos' },
    { id: 'database', name: 'Central DB', icon: Database, color: 'text-emerald-500', bg: 'bg-emerald-500/10', pos: { x: 50, y: 85 }, subtitle: 'Production Data' },
];

export const AutomatorApp: React.FC = () => {
    const [logs, setLogs] = useState<string[]>([
        "SYSTEM: Initialization complete.",
        "LOAD: Aethermore Games Jira project linked.",
        "AUTH: Zapier OAuth token verified.",
        "READY: Listening for gestures..."
    ]);

    useEffect(() => {
        const interval = setInterval(() => {
            const events = [
                "JIRA: Rule 'Auto-sync' triggered.",
                "ZAPIER: Webhook received for issue KAN-402.",
                "KINDLE: Checking manuscript status...",
                "DB: Syncing asset metadata...",
                "SYSTEM: Automation rules healthy."
            ];
            setLogs(prev => [...prev.slice(-4), events[Math.floor(Math.random() * events.length)]]);
        }, 8000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="h-full w-full bg-[#05050a] flex flex-col overflow-hidden relative">
            {/* Professional Header */}
            <div className="p-4 md:p-6 border-b border-zinc-800/50 bg-zinc-900/40 flex justify-between items-center z-20 backdrop-blur-xl shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-2xl bg-sky-500/10 border border-sky-500/20 shadow-[0_0_15px_rgba(56,189,248,0.1)]">
                        <Share2 className="text-sky-400" size={20} />
                    </div>
                    <div>
                        <h2 className="font-black text-xs md:text-sm tracking-widest text-zinc-100 uppercase italic">Automation Architect Pro</h2>
                        <p className="text-[10px] text-zinc-500 font-mono tracking-tighter opacity-80">v2.5.2 // SECURE_HUB</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="hidden sm:flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                        <Activity className="text-emerald-500 animate-pulse" size={14} />
                        <span className="text-emerald-500 text-[10px] font-black uppercase tracking-widest">Realtime Feed</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 relative bg-[radial-gradient(#1c1c21_1.5px,transparent_1.5px)] [background-size:40px_40px]">
                {/* Visual Connections */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
                    <defs>
                        <linearGradient id="bridge-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#f97316" />
                        </linearGradient>
                    </defs>
                    {NODES.map((node, i) => i > 0 && (
                        <line 
                            key={`line-${node.id}`}
                            x1="50%" y1="50%" 
                            x2={`${node.pos.x}%`} y2={`${node.pos.y}%`} 
                            stroke="url(#bridge-grad)" 
                            strokeWidth="1.5" 
                            strokeDasharray="6 8" 
                        />
                    ))}
                </svg>

                {/* Nodes Container */}
                <div className="absolute inset-0 overflow-auto overscroll-none p-20 min-w-[800px] min-h-[600px]">
                    {NODES.map(node => (
                        <div 
                            key={node.id}
                            style={{ left: `${node.pos.x}%`, top: `${node.pos.y}%` }}
                            className="absolute -translate-x-1/2 -translate-y-1/2 group"
                        >
                            <div className={`w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] ${node.bg} border border-white/5 flex flex-col items-center justify-center gap-3 hover:border-sky-500/40 hover:bg-sky-500/10 transition-all duration-700 cursor-pointer backdrop-blur-2xl shadow-3xl group-active:scale-95 overflow-hidden`}>
                                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/20 pointer-events-none" />
                                <node.icon className={`${node.color} w-10 h-10 md:w-12 md:h-12 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-transform duration-500 group-hover:scale-110`} />
                                <div className="text-center px-4">
                                    <span className="text-[11px] md:text-xs font-black text-white block tracking-tight uppercase">{node.name}</span>
                                    <span className="text-[8px] md:text-[9px] font-bold text-zinc-500 uppercase tracking-tighter opacity-60">{node.subtitle}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Terminal HUD */}
                <div className="absolute bottom-8 left-8 p-6 bg-zinc-950/80 border border-white/5 rounded-[2rem] backdrop-blur-3xl pointer-events-none w-72 md:w-80 shadow-4xl overflow-hidden">
                    <div className="flex items-center gap-3 mb-4 border-b border-white/5 pb-3">
                        <Terminal size={14} className="text-zinc-400" />
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest italic">Core Integration Log</span>
                    </div>
                    <div className="space-y-2">
                        {logs.map((log, i) => (
                            <p key={i} className="text-[10px] font-mono text-zinc-400 truncate tracking-tighter">
                                <span className="text-sky-500/60 mr-2 opacity-100 italic">ink#</span> {log}
                            </p>
                        ))}
                    </div>
                    <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center">
                         <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em]">AES-256 Enabled</span>
                         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                </div>

                {/* Gesture Hint */}
                <div className="absolute bottom-10 right-10 flex flex-col items-end pointer-events-none gap-2">
                    <p className="text-zinc-600 text-[10px] font-mono uppercase tracking-widest text-right">
                        System State: Optimal
                        <br/>Active Listeners: {NODES.length}
                    </p>
                    <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-full backdrop-blur-2xl shadow-2xl">
                        <p className="text-zinc-100 text-[11px] font-black tracking-widest uppercase italic">
                            Draw "?" for architectural review
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};