/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useRef, useEffect } from 'react';
import { MousePointer2, PenLine, Play, Mail, Presentation, Folder, Loader2, FileText, Image as ImageIcon, Gamepad2, Eraser, Share2, Undo2, Redo2, RefreshCw, ArrowUpCircle, ShieldCheck, ExternalLink, Key } from 'lucide-react';
import { Modality, GenerateContentResponse } from "@google/genai";
import { AppId, DesktopItem, Stroke, Email } from './types';
import { HomeScreen } from './components/apps/HomeScreen';
import { MailApp } from './components/apps/MailApp';
import { SlidesApp } from './components/apps/SlidesApp';
import { AlienDefense } from './components/apps/AlienDefense';
import { FolderView } from './components/apps/FolderView';
import { AutomatorApp } from './components/apps/AutomatorApp';
import { DraggableWindow } from './components/DraggableWindow';
import { InkLayer } from './components/InkLayer';
import { getAiClient, HOME_TOOLS, MAIL_TOOLS, AUTOMATOR_TOOLS, MODEL_NAME, SYSTEM_INSTRUCTION } from './lib/gemini';
import { NotepadApp } from './components/apps/NotepadApp';

const APP_VERSION = "v1.2.3";

const INITIAL_DESKTOP_ITEMS: DesktopItem[] = [
    { id: 'mail', name: 'Mail', type: 'app', icon: Mail, appId: 'mail', bgColor: 'bg-gradient-to-br from-blue-400 to-blue-700' },
    { id: 'automator', name: 'Automator', type: 'app', icon: Share2, appId: 'automator', bgColor: 'bg-gradient-to-br from-indigo-500 to-indigo-800' },
    { id: 'slides', name: 'Slides', type: 'app', icon: Presentation, appId: 'slides', bgColor: 'bg-gradient-to-br from-orange-400 to-orange-700' },
    { id: 'snake', name: 'Alien Defense', type: 'app', icon: Gamepad2, appId: 'snake', bgColor: 'bg-gradient-to-br from-emerald-500 to-emerald-800' },
    { 
        id: 'how_to_use', 
        name: 'how_to_use.txt', 
        type: 'app', 
        icon: FileText, 
        appId: 'notepad', 
        bgColor: 'bg-gradient-to-br from-pink-500 to-pink-700',
        notepadInitialContent: `GEMINI INK - GESTURE GUIDE

Navigate your computer using natural hand-drawn sketches.

GLOBAL / DESKTOP
----------------
1. Delete Item: 
   Draw an "X" or a cross over any app icon or folder to delete it.

2. Explode Folder: 
   Draw outward pointing arrows coming out of a folder to "explode" it and reveal its contents on the desktop.

3. Get Info / Summarize: 
   Draw a question mark "?" over an item.
   - If it's a folder, it lists contents.
   - If it's a text file, it reads and summarizes the text.

AUTOMATOR APP
-------------
- Draw a "?" over the hub to get advanced automation suggestions (Jira, Zapier).
- Draw lines between service nodes to suggest integration bridges.

MAIL APP
--------
1. Delete Email: 
   Draw a horizontal line (strike-through) or an "X" over an email row.

2. Summarize Email: 
   Draw a question mark "?" over an email row to get a summary.`
    },
    { id: 'docs', name: 'Documents', type: 'folder', icon: Folder, bgColor: 'bg-gradient-to-br from-sky-400 to-sky-700', contents: [
        { id: 'doc1', name: 'Report.docx', type: 'app', icon: FileText, bgColor: 'bg-gradient-to-br from-blue-500 to-blue-700' },
        { id: 'img1', name: 'Vacation.png', type: 'app', icon: ImageIcon, bgColor: 'bg-gradient-to-br from-purple-500 to-purple-700' }
    ] }
];

const INITIAL_EMAILS: Email[] = [
    { id: 1, from: 'Thoms M.', subject: 'Project Deadline Updated!', preview: 'We need to push the launch date by two weeks due to...', body: 'Hi Team,\n\nWe need to push the launch date by two weeks due to pending QA approvals. Please update your roadmaps accordingly.\n\nThanks,\nBoss', time: '10:45 AM', unread: true },
    { id: 2, from: 'HR Department', subject: 'Annual Leave Policy', preview: 'Please review the attached changes to our annual leave policy...', body: 'Dear Employees,\n\nPlease review the attached changes to our annual leave policy effective next month. The main change concerns rollover days.\n\nRegards,\nHR', time: 'Yesterday', unread: false },
    { id: 3, from: 'Newsletter', subject: 'Tech Trends 2024', preview: 'Top 10 AI trends you need to watch out for this year...', body: 'Welcome to this week\'s newsletter! Here are the Top 10 AI trends:\n1. Multimodal Models\n2. Agentic AI\n3. ... [Click to read more]', time: 'Yesterday', unread: false },
];

interface OpenWindow {
    id: string;
    item: DesktopItem;
    zIndex: number;
    pos: { x: number, y: number };
    size?: { width: number, height: number };
}

type UpdateStatus = 'idle' | 'checking' | 'downloading' | 'ready';

export const App: React.FC = () => {
    const [openWindows, setOpenWindows] = useState<OpenWindow[]>([]);
    const [focusedId, setFocusedId] = useState<string | null>(null);
    const [nextZIndex, setNextZIndex] = useState(100);
    const [inkMode, setInkMode] = useState(false);
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [redoStack, setRedoStack] = useState<Stroke[]>([]);
    const [desktopItems, setDesktopItems] = useState<(DesktopItem | null)[]>(INITIAL_DESKTOP_ITEMS);
    const [emails, setEmails] = useState<Email[]>(INITIAL_EMAILS);
    const [isProcessing, setIsProcessing] = useState(false);
    const [toast, setToast] = useState<{ title?: string; message: React.ReactNode } | null>(null);
    const [wallpaperUrl, setWallpaperUrl] = useState<string | null>(null);
    const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle');
    const [updateProgress, setUpdateProgress] = useState(0);
    const [isApiKeySelected, setIsApiKeySelected] = useState<boolean>(true);
    const timeoutRef = useRef<number | null>(null);

    // Initial check for API Key
    useEffect(() => {
        const checkKey = async () => {
            if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
                const hasKey = await window.aistudio.hasSelectedApiKey();
                setIsApiKeySelected(hasKey);
            }
        };
        checkKey();
    }, []);

    const handleOpenSelectKey = async () => {
        if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
            await window.aistudio.openSelectKey();
            setIsApiKeySelected(true); // Assume success per guidelines
        }
    };

    // Update system simulation / Service Worker logic
    useEffect(() => {
        if (!isApiKeySelected) return;

        // Simulate background update check
        const checkUpdates = async () => {
            setUpdateStatus('checking');
            await new Promise(r => setTimeout(r, 2000));
            
            // Randomly decide if update is available for demo purposes
            const hasUpdate = Math.random() > 0.8;
            if (hasUpdate) {
                setUpdateStatus('downloading');
                let progress = 0;
                const interval = setInterval(() => {
                    progress += Math.random() * 15;
                    if (progress >= 100) {
                        setUpdateProgress(100);
                        setUpdateStatus('ready');
                        clearInterval(interval);
                    } else {
                        setUpdateProgress(progress);
                    }
                }, 400);
            } else {
                setUpdateStatus('idle');
            }
        };

        checkUpdates();

        // Real SW update logic
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                window.location.reload();
            });
        }
    }, [isApiKeySelected]);

    const handleRestartUpdate = () => {
        window.location.reload();
    };

    const showToast = (message: React.ReactNode, title?: string, autoDismiss: boolean = true) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        setToast({ message, title });
        if (autoDismiss) {
            timeoutRef.current = window.setTimeout(() => {
                setToast(null);
                timeoutRef.current = null;
            }, 12000); 
        }
    };

    const handleUndo = () => {
        if (strokes.length === 0 || isProcessing) return;
        const newStrokes = [...strokes];
        const last = newStrokes.pop();
        if (last) {
            setRedoStack(prev => [...prev, last]);
            setStrokes(newStrokes);
        }
    };

    const handleRedo = () => {
        if (redoStack.length === 0 || isProcessing) return;
        const newRedo = [...redoStack];
        const last = newRedo.pop();
        if (last) {
            setStrokes(prev => [...prev, last]);
            setRedoStack(newRedo);
        }
    };

    const handleStrokeComplete = (stroke: Stroke) => {
        setStrokes(prev => [...prev, stroke]);
        setRedoStack([]); 
    };

    const clearInk = () => {
        setStrokes([]);
        setRedoStack([]);
    };

    const handleLaunch = (item: DesktopItem) => {
        if (inkMode) return;
        
        if (openWindows.find(w => w.id === item.id)) {
            focusWindow(item.id);
            return;
        }

        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const isMobile = screenWidth < 768;

        let initialSize = { width: 640, height: 480 };
        if (item.appId === 'mail') initialSize = { width: Math.min(screenWidth * 0.9, 900), height: Math.min(screenHeight * 0.8, 700) };
        if (item.appId === 'automator') initialSize = { width: Math.min(screenWidth * 0.9, 1000), height: Math.min(screenHeight * 0.85, 800) };
        if (item.appId === 'snake') initialSize = { width: Math.min(screenWidth * 0.9, 500), height: Math.min(screenHeight * 0.9, 650) };
        if (item.appId === 'notepad') initialSize = { width: Math.min(screenWidth * 0.9, 450), height: Math.min(screenHeight * 0.7, 550) };

        setOpenWindows(prev => [...prev, {
            id: item.id,
            item: item,
            zIndex: nextZIndex,
            pos: isMobile ? { x: 0, y: 0 } : { x: 50 + (prev.length * 30), y: 50 + (prev.length * 30) },
            size: initialSize
        }]);
        setNextZIndex(prev => prev + 1);
        setFocusedId(item.id);
    };

    const closeWindow = (id: string) => {
        setOpenWindows(prev => prev.filter(w => w.id !== id));
        if (focusedId === id) setFocusedId(null);
    };

    const focusWindow = (id: string | null) => {
        if (id === null) {
            setFocusedId(null);
            return;
        }
        setFocusedId(id);
        setOpenWindows(prev => prev.map(w => w.id === id ? { ...w, zIndex: nextZIndex } : w));
        setNextZIndex(prev => prev + 1);
    };

    const findItemByName = (items: (DesktopItem | null)[], name: string): DesktopItem | undefined => {
        for (const item of items) {
            if (!item) continue;
            if (item.name.toLowerCase().includes(name.toLowerCase())) return item;
            if (item.type === 'folder' && item.contents) {
                const found = findItemByName(item.contents, name);
                if (found) return found;
            }
        }
        return undefined;
    };

    const findEmailInList = (emailList: Email[], subjectQuery?: string, senderQuery?: string) => {
         const sQuery = subjectQuery?.toLowerCase() || '';
         const fQuery = senderQuery?.toLowerCase() || '';
         return emailList.find(e => {
             if (sQuery && fQuery) return e.subject.toLowerCase().includes(sQuery) && e.from.toLowerCase().includes(fQuery);
             if (sQuery) return e.subject.toLowerCase().includes(sQuery);
             if (fQuery) return e.from.toLowerCase().includes(fQuery);
             return false;
         });
    };

    const executeInkAction = async () => {
        if (strokes.length === 0) return;
        setIsProcessing(true);
        try {
            const canvas = await html2canvas(document.body, { 
                ignoreElements: (el) => el.id === 'control-bar' || (el as HTMLElement).id === 'update-badge', 
                logging: false, 
                scale: 1,
                useCORS: true
            });
            const base64Image = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
            
            // GUIDELINE: Create a new GoogleGenAI instance right before making an API call
            const ai = getAiClient();
            
            let activeTools = HOME_TOOLS;
            let contextDescription = 'Desktop environment';
            if (focusedId) {
                const win = openWindows.find(w => w.id === focusedId);
                if (win?.item.appId === 'mail') { activeTools = MAIL_TOOLS; contextDescription = 'Secure Mail Application'; }
                else if (win?.item.appId === 'automator') { activeTools = AUTOMATOR_TOOLS; contextDescription = 'Visual Automation & Architecture Hub'; }
            }

            const response = await ai.models.generateContent({
                model: MODEL_NAME,
                contents: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
                    { text: `Current User Context: ${contextDescription}. Interpret the white drawn ink strokes. System Instruction: ${SYSTEM_INSTRUCTION}` }
                ],
                config: { tools: activeTools, temperature: 0.1 }
            });

            if (response.functionCalls && response.functionCalls.length > 0) {
                let actionTaken = false;
                let messages: React.ReactNode[] = [];
                let toastTitle = "Action Executed";

                for (const call of response.functionCalls) {
                    const args = call.args as any;

                    if (call.name === 'analyze_automation_context') {
                        toastTitle = "Architecture Analysis";
                        const advice = await ai.models.generateContent({
                            model: 'gemini-3-pro-preview',
                            contents: `Provide deep architectural advice for: ${args.focus_area}. User intent: ${args.user_intent_sketch}. Refer to Jira project 'Aethermore' (KAN) and Kindle publishing workflows.`,
                            config: { thinkingConfig: { thinkingBudget: 4000 } }
                        });
                        messages.push(<div key="adv" className="text-sky-100 leading-relaxed font-normal">{advice.text}</div>);
                        actionTaken = true;
                    } 
                    else if (call.name === 'link_integrations') {
                        messages.push(<div key="link">Established secure bridge: <span className="text-white font-bold">{args.source_node}</span> ⇄ <span className="text-white font-bold">{args.target_node}</span></div>);
                        actionTaken = true;
                    }
                    else if (call.name === 'delete_email') {
                        const email = findEmailInList(emails, args.subject_text, args.sender_text);
                        if (email) {
                            setEmails(prev => prev.filter(e => e.id !== email.id));
                            messages.push(<div key={`del-${email.id}`}>Deleted email from <span className="font-bold text-white">{email.from}</span></div>);
                            actionTaken = true;
                        }
                    }
                    else if (call.name === 'summarize_email') {
                        const email = findEmailInList(emails, args.subject_text, args.sender_text);
                        if (email) {
                            toastTitle = "Email Intelligence";
                            const summary = await ai.models.generateContent({
                                model: 'gemini-3-flash-preview',
                                contents: `Summarize this email concisely: Subject: ${email.subject}. From: ${email.from}. Body: ${email.body}`
                            });
                            messages.push(
                                <div key={`sum-${email.id}`} className="mb-4 last:mb-0">
                                    <div className="text-sky-400 font-bold text-sm mb-1 uppercase tracking-widest">Regarding: {email.subject}</div>
                                    <div className="text-white/90 leading-relaxed">{summary.text}</div>
                                </div>
                            );
                            actionTaken = true;
                        }
                    }
                    else if (call.name === 'delete_item') {
                        const item = findItemByName(desktopItems, args.itemName);
                        if (item) {
                            setDesktopItems(prev => prev.map(i => i?.id === item.id ? null : i));
                            messages.push(<div key={`item-${item.id}`}>Deleted <span className="text-white font-bold">{item.name}</span> from desktop.</div>);
                            actionTaken = true;
                        }
                    }
                    else if (call.name === 'explain_item') {
                        const item = findItemByName(desktopItems, args.itemName);
                        if (item) {
                            toastTitle = "System Analysis";
                            messages.push(<div key={`exp-${item.id}`}>Analyzed <span className="text-white font-bold">{item.name}</span>. It is a {item.type} linked to the Aethermore project.</div>);
                            actionTaken = true;
                        }
                    }
                }

                if (messages.length > 0) showToast(<div className="flex flex-col gap-4">{messages}</div>, toastTitle, false);
                else if (!actionTaken) showToast("Strokes recognized but no matching tool found.", "System Warning", true);
            } else {
                showToast("No gestures detected. Try drawing more clearly.", undefined, true);
            }
        } catch (e: any) {
            console.error(e);
            // GUIDELINE: If the request fails with 404 Not Found, prompt for key re-selection
            if (e.message?.includes("Requested entity was not found") || e.status === 404) {
                setIsApiKeySelected(false);
                handleOpenSelectKey();
                showToast("Security context expired. Please re-authorize the API key.", "Auth Error", true);
            } else {
                showToast("Gemini Processing Error. Please try again.", "Critical", true);
            }
        } finally {
            setIsProcessing(false);
            clearInk();
        }
    };

    const buttonBaseClasses = "relative overflow-hidden p-4 rounded-full transition-all duration-300 border-t border-white/5 shadow-lg active:scale-90 disabled:cursor-not-allowed";
    const glossOverlay = <div className="absolute inset-0 bg-[radial-gradient(at_top_left,_rgba(255,255,255,0.15)_0%,_transparent_60%)] pointer-events-none" />;

    // API Key Selection Guard Screen
    if (!isApiKeySelected) {
        return (
            <div className="h-full w-full bg-[#050508] flex items-center justify-center p-6 text-center">
                <div className="max-w-md w-full flex flex-col items-center gap-8">
                    <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-indigo-600 rounded-[2.5rem] flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.2)]">
                        <ShieldCheck size={48} className="text-white" />
                    </div>
                    <div className="space-y-4">
                        <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase">System Guard</h1>
                        <p className="text-zinc-400 text-sm font-medium leading-relaxed uppercase tracking-widest">
                            Gemini Ink requires a valid AI Studio API key from a paid GCP project to initialize high-security neural processing.
                        </p>
                    </div>
                    
                    <button 
                        onClick={handleOpenSelectKey}
                        className="group relative w-full px-8 py-5 bg-white text-black font-black uppercase italic tracking-[0.2em] rounded-3xl transition-all hover:scale-[1.02] active:scale-95 shadow-[0_20px_40px_rgba(255,255,255,0.1)] flex items-center justify-center gap-4"
                    >
                        <Key size={20} /> Connect Account
                    </button>

                    <a 
                        href="https://ai.google.dev/gemini-api/docs/billing" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-zinc-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors"
                    >
                        Billing Documentation <ExternalLink size={12} />
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full bg-[#050508] text-white font-sans overflow-hidden relative selection:bg-sky-500/30" onPointerDownCapture={(e) => {
            if (toast && !(e.target as HTMLElement).closest('.toast-card')) setToast(null);
        }}>
            {/* COD Style Update Banner */}
            {(updateStatus === 'checking' || updateStatus === 'downloading') && (
                <div className="fixed top-0 left-0 w-full z-[10000] bg-zinc-950/90 backdrop-blur-xl border-b border-white/10 p-3 flex flex-col items-center gap-2 animate-in slide-in-from-top duration-500">
                    <div className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-zinc-400 italic">
                        <RefreshCw size={14} className="animate-spin text-sky-400" />
                        {updateStatus === 'checking' ? "Checking for secure updates..." : `Downloading Core Assets... ${Math.round(updateProgress)}%`}
                    </div>
                    {updateStatus === 'downloading' && (
                        <div className="w-full max-w-md h-1 bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-sky-500 to-indigo-600 transition-all duration-300" 
                                style={{ width: `${updateProgress}%` }}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Update Ready Notification */}
            {updateStatus === 'ready' && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[10000] w-[90vw] max-w-lg bg-emerald-500 shadow-[0_20px_40px_rgba(16,185,129,0.3)] rounded-3xl p-6 border border-white/20 flex items-center justify-between animate-in zoom-in duration-500">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-2xl">
                            <ArrowUpCircle className="text-white" size={24} />
                        </div>
                        <div>
                            <h4 className="text-white font-black text-sm uppercase tracking-tighter">Update Ready</h4>
                            <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest">Restart to apply latest patches</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleRestartUpdate}
                        className="px-6 py-3 bg-white text-emerald-600 font-black text-xs uppercase italic tracking-widest rounded-2xl hover:scale-105 transition-transform"
                    >
                        Restart
                    </button>
                </div>
            )}

            {/* Version Badge */}
            <div id="update-badge" className="fixed bottom-4 right-4 z-[5000] pointer-events-none opacity-40 hover:opacity-100 transition-opacity">
                <div className="px-3 py-1 bg-black/40 border border-white/10 rounded-full backdrop-blur-md">
                    <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-tighter">InkOS {APP_VERSION}</span>
                </div>
            </div>

            {/* HUD / Control Bar */}
            <div id="control-bar" className="fixed bottom-10 left-1/2 -translate-x-1/2 flex flex-row items-center justify-center p-3 bg-zinc-950/80 backdrop-blur-3xl border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)] rounded-full z-[9000]">
                <div className="flex items-center gap-4">
                    <button onClick={() => setInkMode(false)} className={`${buttonBaseClasses} ${!inkMode ? 'bg-gradient-to-br from-sky-400 to-sky-600' : 'bg-zinc-800 text-zinc-500'}`}>
                        {glossOverlay}<MousePointer2 size={24} className="relative z-10" />
                    </button>
                    <button onClick={() => setInkMode(true)} className={`${buttonBaseClasses} ${inkMode ? 'bg-gradient-to-br from-rose-500 to-rose-700' : 'bg-zinc-800 text-zinc-500'}`}>
                        {glossOverlay}<PenLine size={24} className="relative z-10" />
                    </button>
                </div>
                <div className={`h-8 w-px bg-white/10 transition-all ${inkMode ? 'mx-4 opacity-100' : 'mx-0 opacity-0'}`} />
                <div className={`flex items-center gap-3 transition-all overflow-hidden ${inkMode ? 'max-w-[500px] opacity-100 pr-2' : 'max-w-0 opacity-0'}`}>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleUndo} 
                            disabled={strokes.length === 0 || isProcessing} 
                            className={`${buttonBaseClasses} bg-zinc-800 text-zinc-400 p-2 disabled:opacity-30`}
                            title="Undo (Ctrl+Z)"
                        >
                            {glossOverlay}<Undo2 size={20} className="relative z-10" />
                        </button>
                        <button 
                            onClick={handleRedo} 
                            disabled={redoStack.length === 0 || isProcessing} 
                            className={`${buttonBaseClasses} bg-zinc-800 text-zinc-400 p-2 disabled:opacity-30`}
                            title="Redo (Ctrl+Y)"
                        >
                            {glossOverlay}<Redo2 size={20} className="relative z-10" />
                        </button>
                    </div>
                    <div className="h-6 w-px bg-white/10 mx-1" />
                    <button 
                        onClick={executeInkAction} 
                        disabled={isProcessing || strokes.length === 0} 
                        className={`${buttonBaseClasses} ${isProcessing ? 'bg-zinc-700' : strokes.length > 0 ? 'bg-gradient-to-br from-emerald-500 to-emerald-700' : 'bg-zinc-800 text-zinc-600'}`}
                    >
                        {glossOverlay}{isProcessing ? <Loader2 size={24} className="animate-spin" /> : <Play size={24} fill="currentColor" />}
                    </button>
                    <button onClick={clearInk} disabled={strokes.length === 0 && redoStack.length === 0} className={`${buttonBaseClasses} bg-zinc-800 text-zinc-400`}>
                        {glossOverlay}<Eraser size={24} />
                    </button>
                </div>
            </div>

            <div className="h-full w-full relative bg-[#0a0a0f]" style={{ backgroundImage: wallpaperUrl ? `url(${wallpaperUrl})` : 'none', backgroundSize: 'cover' }}>
                <div className="h-full w-full" onMouseDown={() => focusWindow(null)}>
                    <HomeScreen items={desktopItems} onLaunch={handleLaunch} />
                </div>

                {openWindows.map(win => {
                    let content = null;
                    if (win.item.appId === 'mail') content = <MailApp emails={emails} />;
                    else if (win.item.appId === 'automator') content = <AutomatorApp />;
                    else if (win.item.appId === 'slides') content = <SlidesApp />;
                    else if (win.item.appId === 'snake') content = <AlienDefense />;
                    else if (win.item.appId === 'notepad') content = <NotepadApp initialContent={win.item.notepadInitialContent} />;
                    else if (win.item.type === 'folder') content = <FolderView folder={win.item} />;

                    return (
                        <DraggableWindow key={win.id} id={win.id} title={win.item.name} icon={win.item.icon} initialPos={win.pos} initialSize={win.size} zIndex={win.zIndex} isActive={focusedId === win.id} onClose={() => closeWindow(win.id)} onFocus={() => focusWindow(win.id)}>
                            {content}
                        </DraggableWindow>
                    );
                })}

                <InkLayer active={inkMode} strokes={strokes} onStrokeComplete={handleStrokeComplete} isProcessing={isProcessing} />

                {toast && (
                    <div className={`toast-card fixed bottom-32 left-1/2 -translate-x-1/2 bg-zinc-950/98 backdrop-blur-3xl text-white px-8 py-8 md:px-12 md:py-12 rounded-[2.5rem] md:rounded-[4rem] shadow-[0_60px_120px_-30px_rgba(0,0,0,0.9)] z-[10000] border border-white/10 flex flex-col gap-6 animate-in slide-in-from-bottom-20 duration-700 ease-out ${toast.title?.includes('Intelligence') || toast.title?.includes('Audit') ? 'w-[90vw] lg:w-[70rem]' : 'max-w-xl w-[90vw]'}`}>
                        <div className="flex items-center justify-between border-b border-white/10 pb-6">
                            <div className="flex items-center gap-5">
                                <div className="w-4 h-4 rounded-full bg-sky-500 shadow-[0_0_20px_rgba(56,189,248,0.8)] animate-pulse" />
                                <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight uppercase italic">{toast.title || 'Notification'}</h3>
                            </div>
                            <div className="px-5 py-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-400 text-[10px] font-black tracking-widest uppercase hidden sm:block">AI Verified</div>
                        </div>
                        <div className="text-zinc-200 leading-relaxed whitespace-pre-wrap max-h-[50vh] overflow-y-auto pr-4 scrollbar-thin text-base md:text-lg">
                            {toast.message}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};