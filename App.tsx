
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { 
  Send, Moon, Sun, Bot, User, Settings, Sparkles, Brain, X, Plus, 
  MessageSquare, Menu, Globe, UserCircle, Layers, Database, Check, 
  ArrowLeft, ChevronDown, ChevronUp, Languages, Layout, Shield, AlertCircle,
  BookOpen, Code, Lightbulb, Zap, Trash2, Image as ImageIcon, Terminal, Play, Cpu, History,
  Library, Bookmark, PenTool, Search, Command, Mic, Volume2, Download, Palette, HardDrive, FileText, ExternalLink
} from 'lucide-react';

import { Message, Role, Theme, ChatSessionData, Source, Language, SavedPrompt, AccentColor, MemoryFact } from './types';
import { TRANSLATIONS, MODELS, getSystemInstruction, ACCENT_COLORS } from './constants';
import * as geminiService from './services/geminiService';
import MarkdownRenderer from './components/MarkdownRenderer';
import TypingIndicator from './components/TypingIndicator';

const DEFAULT_PROMPTS: SavedPrompt[] = [
  { id: '1', title: 'Giải thích Code', content: 'Hãy giải thích đoạn mã sau đây một cách chi tiết từng dòng:\n\n[Dán code vào đây]', category: 'Coding' },
  { id: '2', title: 'Viết Email', content: 'Hãy viết một email chuyên nghiệp về [Chủ đề], giọng văn lịch sự.', category: 'Writing' },
  { id: '3', title: 'Tóm tắt bài', content: 'Hãy tóm tắt văn bản sau đây thành 3 điểm chính:', category: 'Productivity' },
];

const App: React.FC = () => {
  // --- STATES ---
  const [sessions, setSessions] = useState<ChatSessionData[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>(''); 
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('nhutaibot_theme') as Theme) || Theme.DARK);
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('nhutaibot_lang') as Language) || Language.VI);
  const [accent, setAccent] = useState<AccentColor>(() => (localStorage.getItem('nhutaibot_accent') as AccentColor) || 'blue');
  
  // Modals
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAdvancedSettingsOpen, setIsAdvancedSettingsOpen] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  
  // Prompt Library UI State
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [isAddingPrompt, setIsAddingPrompt] = useState(false);
  const [newPromptTitle, setNewPromptTitle] = useState('');
  const [newPromptContent, setNewPromptContent] = useState('');
  const [newPromptCategory, setNewPromptCategory] = useState('Custom');

  // Memory
  const [memoryFacts, setMemoryFacts] = useState<MemoryFact[]>(() => {
    const saved = localStorage.getItem('nhutaibot_memory');
    return saved ? JSON.parse(saved) : [];
  });

  // Canvas
  const [canvasState, setCanvasState] = useState<{ open: boolean, code: string, lang: string }>({ open: false, code: '', lang: '' });
  const [pythonOutput, setPythonOutput] = useState<string>('');
  const [isPythonLoading, setIsPythonLoading] = useState(false);

  // Terminal
  const [terminalHistory, setTerminalHistory] = useState<string[]>(['NhutShell Ultimate v1.6. Gõ "help" hoặc "ai <hỏi>"']);
  const [terminalInput, setTerminalInput] = useState('');
  const [isTerminalLoading, setIsTerminalLoading] = useState(false);
  const [terminalSuggestions, setTerminalSuggestions] = useState<string[]>([]);
  
  // User Profile
  const [userName, setUserName] = useState<string>(localStorage.getItem('nhutaibot_username') || '');
  const [userJob, setUserJob] = useState<string>(localStorage.getItem('nhutaibot_job') || '');
  const [customInstructions, setCustomInstructions] = useState<string>(localStorage.getItem('nhutaibot_custom') || '');
  
  // AI Config
  const [currentMode, setCurrentMode] = useState<string>(localStorage.getItem('nhutaibot_mode') || 'standard');
  const [selectedModel, setSelectedModel] = useState<string>(localStorage.getItem('nhutaibot_model') || MODELS.FLASH.id);
  const [isCodeExecutionEnabled, setIsCodeExecutionEnabled] = useState(localStorage.getItem('nhutaibot_code') === 'true');
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(localStorage.getItem('nhutaibot_websearch') === 'true');
  const [isThinkingEnabled, setIsThinkingEnabled] = useState(localStorage.getItem('nhutaibot_thinking') === 'true');
  const [isTTSEnabled, setIsTTSEnabled] = useState(localStorage.getItem('nhutaibot_tts') === 'true');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pyodideRef = useRef<any>(null);
  const t = TRANSLATIONS[language];

  // --- EFFECTS ---
  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', theme === Theme.DARK);
    document.documentElement.style.setProperty('--accent-color', ACCENT_COLORS[accent]);
    localStorage.setItem('nhutaibot_theme', theme);
    localStorage.setItem('nhutaibot_accent', accent);
  }, [theme, accent]);

  useEffect(() => {
    const savedSess = localStorage.getItem('nhutaibot_sessions');
    if (savedSess) {
      const parsed = JSON.parse(savedSess);
      setSessions(parsed);
      if (parsed.length > 0) loadSession(parsed[0].id, parsed);
      else createNewSession();
    } else {
      createNewSession();
    }
    const savedPromptsLocal = localStorage.getItem('nhut_saved_prompts');
    setSavedPrompts(savedPromptsLocal ? JSON.parse(savedPromptsLocal) : DEFAULT_PROMPTS);
    
    const handleKeys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setIsLibraryOpen(true); }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, []);

  // Sync settings to Storage
  useEffect(() => {
    localStorage.setItem('nhutaibot_websearch', isWebSearchEnabled.toString());
    localStorage.setItem('nhutaibot_thinking', isThinkingEnabled.toString());
    localStorage.setItem('nhutaibot_code', isCodeExecutionEnabled.toString());
    localStorage.setItem('nhutaibot_tts', isTTSEnabled.toString());
    if (currentSessionId) {
      const current = sessions.find(s => s.id === currentSessionId);
      if (current) reinitChat(current);
    }
  }, [isWebSearchEnabled, isThinkingEnabled, isCodeExecutionEnabled, isTTSEnabled]);

  // Loading Logic
  useEffect(() => {
    if (isLoading) {
      setLoadingStep(t.thinking);
      const timers = [
        setTimeout(() => setLoadingStep(t.checkAnswer), 1500),
        setTimeout(() => setLoadingStep(t.suggesting), 3000)
      ];
      return () => timers.forEach(clearTimeout);
    }
  }, [isLoading, t]);

  // --- CORE FUNCTIONS ---
  const createNewSession = () => {
    const newId = Date.now().toString();
    const newSession: ChatSessionData = {
      id: newId, title: t.newChat, messages: [],
      modelId: selectedModel, isThinkingEnabled, isWebSearchEnabled,
      temperature: 0.7, language, lastUpdated: new Date().toISOString(),
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newId);
    setMessages([]);
    reinitChat(newSession);
  };

  const loadSession = (id: string, currentSessions = sessions) => {
    const session = currentSessions.find(s => s.id === id);
    if (session) {
      setCurrentSessionId(id);
      setMessages(session.messages);
      setSelectedModel(session.modelId);
      setIsThinkingEnabled(session.isThinkingEnabled);
      setIsWebSearchEnabled(session.isWebSearchEnabled);
      reinitChat(session);
    }
    setIsSidebarOpen(false);
  };

  const reinitChat = (session: ChatSessionData) => {
    geminiService.initializeChat(
      selectedModel, isThinkingEnabled ? 16384 : 0, session.messages, isWebSearchEnabled,
      isCodeExecutionEnabled, 0.7, 
      getSystemInstruction(language, currentMode, memoryFacts.map(f => f.text), customInstructions)
    );
  };

  const handleSend = async (overrideInput?: string) => {
    const msgText = overrideInput || input;
    if ((!msgText.trim() && !selectedImage) || isLoading) return;
    
    const userMsg: Message = { id: Date.now().toString(), role: Role.USER, content: msgText, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const imagePart = selectedImage ? { inlineData: { data: selectedImage.split(',')[1], mimeType: 'image/png' } } : undefined;
      const stream = await geminiService.sendMessageStream(msgText, imagePart);
      setSelectedImage(null);
      
      const botMsgId = (Date.now() + 1).toString();
      let fullContent = '';
      let collectedSources: Source[] = [];
      
      setMessages(prev => [...prev, { id: botMsgId, role: Role.MODEL, content: '', timestamp: new Date().toISOString(), sources: [] }]);

      for await (const chunk of stream) {
        if (chunk.text) {
          fullContent += chunk.text;
        }
        
        // Extract grounding sources if any
        const chunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks) {
           chunks.forEach((c: any) => {
             if (c.web && c.web.uri) {
               if (!collectedSources.find(s => s.uri === c.web.uri)) {
                 collectedSources.push({ uri: c.web.uri, title: c.web.title || 'Source' });
               }
             }
           });
        }

        setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, content: fullContent, sources: collectedSources.length > 0 ? collectedSources : m.sources } : m));
      }

      let newTitle = sessions.find(s => s.id === currentSessionId)?.title || t.newChat;
      if (messages.length === 0) newTitle = msgText.substring(0, 30);

      const updatedSessions = sessions.map(s => s.id === currentSessionId ? { 
        ...s, title: newTitle, messages: [...s.messages, userMsg, { id: botMsgId, role: Role.MODEL, content: fullContent, timestamp: new Date().toISOString(), sources: collectedSources }]
      } : s);
      setSessions(updatedSessions);
      localStorage.setItem('nhutaibot_sessions', JSON.stringify(updatedSessions));
      
      if (isTTSEnabled) handleSpeak(fullContent);
    } catch (e) {
      setMessages(prev => [...prev, { id: 'err', role: Role.MODEL, content: t.error, timestamp: new Date().toISOString(), isError: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- PROMPT LIBRARY LOGIC ---
  const handleAddPrompt = () => {
    if (!newPromptTitle || !newPromptContent) return;
    const newPrompt: SavedPrompt = { id: Date.now().toString(), title: newPromptTitle, content: newPromptContent, category: newPromptCategory };
    const updated = [newPrompt, ...savedPrompts];
    setSavedPrompts(updated);
    localStorage.setItem('nhut_saved_prompts', JSON.stringify(updated));
    setNewPromptTitle(''); setNewPromptContent(''); setIsAddingPrompt(false);
  };

  const handleUsePrompt = (content: string) => {
    if (isTerminalOpen) setTerminalInput(content);
    else setInput(content);
    setIsLibraryOpen(false);
  };

  // --- TERMINAL LOGIC ---
  const processTerminalCommand = async (cmd: string) => {
    const fullCmd = cmd.trim();
    if (!fullCmd) return;
    setTerminalHistory(prev => [...prev, `> ${fullCmd}`]);
    const args = fullCmd.split(' ');
    const command = args[0].toLowerCase();

    if (command === 'ai') {
      const prompt = args.slice(1).join(' ');
      if (!prompt) { setTerminalHistory(prev => [...prev, 'Nhập câu hỏi sau ai. VD: ai Hello']); return; }
      setIsTerminalLoading(true);
      setTerminalHistory(prev => [...prev, '[AI]: Đang phản hồi...']);
      try {
        const stream = await geminiService.sendMessageStream(prompt);
        let full = "";
        for await (const chunk of stream) if (chunk.text) full += chunk.text;
        setTerminalHistory(prev => {
          const last = [...prev];
          last[last.length - 1] = `[AI]: ${full}`;
          return last;
        });
        setTerminalSuggestions(['Giải thích thêm', 'Viết code mẫu', 'Tóm tắt lại']);
      } catch (e) { setTerminalHistory(prev => [...prev, '[Error]: Không thể kết nối AI.']); }
      setIsTerminalLoading(false);
    } else if (command === 'help') {
      setTerminalHistory(prev => [...prev, 'Lệnh: ai <hỏi>, clear, ls, cat <file>, touch <file>, rm <file>, whoami']);
      setTerminalSuggestions(['ai Xin chào', 'ls', 'whoami']);
    } else if (command === 'clear') {
      setTerminalHistory(['NhutShell v1.6']); setTerminalSuggestions([]);
    } else if (command === 'whoami') {
      setTerminalHistory(prev => [...prev, `User: ${userName || 'Khách'}`]);
    } else if (command === 'ls') {
      const files = Object.keys(localStorage).filter(k => k.startsWith('nhutshell_file_')).map(k => k.replace('nhutshell_file_', ''));
      setTerminalHistory(prev => [...prev, files.length ? files.join('  ') : '(Trống)']);
    } else if (command === 'cat') {
      const content = localStorage.getItem(`nhutshell_file_${args[1]}`);
      setTerminalHistory(prev => [...prev, content || 'File không tồn tại.']);
    } else if (command === 'touch') {
      localStorage.setItem(`nhutshell_file_${args[1]}`, '');
      setTerminalHistory(prev => [...prev, `Đã tạo ${args[1]}`]);
    } else {
      setTerminalHistory(prev => [...prev, `Lệnh không rõ: ${command}`]);
      setTerminalSuggestions(['help', 'ai Giải thích lệnh ' + command]);
    }
  };

  // --- UTILS ---
  const handleSpeak = (text: string) => {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text.replace(/[*#`]/g, ''));
    utter.lang = language === Language.VI ? 'vi-VN' : 'en-US';
    window.speechSynthesis.speak(utter);
  };

  const startVoiceInput = () => {
    // @ts-ignore
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = language === Language.VI ? 'vi-VN' : 'en-US';
    recognition.onresult = (event: any) => setInput(event.results[0][0].transcript);
    recognition.start();
  };

  const runPython = async (code: string) => {
    try {
      setIsPythonLoading(true);
      if (!pyodideRef.current) {
        // @ts-ignore
        pyodideRef.current = await window.loadPyodide();
      }
      const py = pyodideRef.current;
      py.runPython(`import sys\nimport io\nsys.stdout = io.StringIO()`);
      await py.runPythonAsync(code);
      const stdout = py.runPython("sys.stdout.getvalue()");
      setPythonOutput(stdout || "Success (No output)");
    } catch (err: any) { setPythonOutput(`Error: ${err.message}`); }
    finally { setIsPythonLoading(false); }
  };

  const handleRunCode = (code: string, lang: string) => {
    setCanvasState({ open: true, code, lang });
    if (lang === 'python') runPython(code);
  };

  const addMemoryFact = (text: string) => {
    const newFact = { id: Date.now().toString(), text, timestamp: new Date().toISOString() };
    const updated = [...memoryFacts, newFact];
    setMemoryFacts(updated);
    localStorage.setItem('nhutaibot_memory', JSON.stringify(updated));
  };

  // --- RENDER ---
  return (
    <div className={`h-screen w-full flex transition-colors overflow-hidden ${theme === Theme.DARK ? 'bg-black text-gray-200' : 'bg-white text-gray-900'}`}>
      
      {/* SIDEBAR */}
      <aside className={`fixed lg:static inset-y-0 left-0 w-72 z-50 transform transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${theme === Theme.DARK ? 'bg-gray-950 border-r border-gray-800' : 'bg-gray-50 border-r border-gray-200'} p-4 flex flex-col shadow-2xl lg:shadow-none`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-bold text-lg flex items-center gap-2 accent-text"><MessageSquare size={18} /> {t.history}</h2>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2"><X size={20} /></button>
        </div>
        <button onClick={createNewSession} className="w-full flex items-center justify-center gap-2 p-3 accent-bg text-white rounded-xl font-bold mb-4 shadow-lg hover:scale-[1.02] active:scale-95 transition-all"><Plus size={18} /> {t.newChat}</button>
        <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar mb-4">
          {sessions.map(s => (
            <div key={s.id} onClick={() => loadSession(s.id)} className={`p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between group ${currentSessionId === s.id ? 'bg-white/5 accent-text' : 'hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500'}`}>
              <span className="truncate text-sm font-medium">{s.title}</span>
              <button onClick={(e) => { e.stopPropagation(); /* handle export */ }} className="opacity-0 group-hover:opacity-100 p-1 hover:text-blue-500"><Download size={14} /></button>
            </div>
          ))}
        </div>
        <div className="pt-4 border-t dark:border-gray-800 space-y-1">
           <button onClick={() => setIsMemoryOpen(true)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 transition-all font-bold text-sm text-amber-500"><Database size={18} /> {t.memory}</button>
           <button onClick={() => setIsTerminalOpen(true)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 transition-all font-bold text-sm text-purple-500"><Terminal size={18} /> NhutShell AI</button>
           <button onClick={() => setIsAdvancedSettingsOpen(true)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 transition-all font-bold text-sm text-gray-500"><Settings size={18} /> {t.settings}</button>
        </div>
      </aside>

      {/* CHAT AREA */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-500 ${canvasState.open ? 'lg:mr-[45%]' : ''}`}>
        <header className="h-16 flex items-center justify-between px-4 border-b dark:border-gray-800 backdrop-blur-md z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 lg:hidden"><Menu size={24} /></button>
            <span className="text-xl font-black bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent italic">NhutAIbot <span className="text-[10px] accent-text">ULTIMATE</span></span>
          </div>
          <div className="flex items-center gap-1 md:gap-3">
            <button onClick={() => setTheme(theme === Theme.DARK ? Theme.LIGHT : Theme.DARK)} className="p-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">{theme === Theme.DARK ? <Sun size={20} /> : <Moon size={20} />}</button>
            <div className="w-9 h-9 accent-bg rounded-full flex items-center justify-center text-white font-black text-sm shadow-lg">{userName.charAt(0).toUpperCase() || "U"}</div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-8 space-y-6">
          {messages.length === 0 && (
             <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-6 animate-slide-up">
                <div className="w-20 h-20 accent-bg rounded-[2rem] flex items-center justify-center shadow-2xl rotate-3"><Bot size={40} className="text-white" /></div>
                <h1 className="text-4xl font-black italic">{userName ? `Chào ${userName}!` : 'Sẵn sàng trợ giúp!'}</h1>
                <p className="text-gray-500 font-medium">Dùng <b>NhutShell AI</b> để gõ lệnh hoặc <b>Ctrl+K</b> để mở Prompt Library.</p>
                <div className="flex flex-wrap justify-center gap-2">
                   {['standard', 'coder', 'learning'].map(m => (
                     <button key={m} onClick={() => setCurrentMode(m)} className={`px-4 py-2 rounded-2xl border text-xs font-bold transition-all ${currentMode === m ? 'accent-bg text-white' : 'bg-gray-100 dark:bg-gray-900 border-transparent text-gray-500'}`}>{t.modes[m as keyof typeof t.modes]}</button>
                   ))}
                </div>
             </div>
          )}
          {messages.map(m => (
            <div key={m.id} className={`flex ${m.role === Role.USER ? 'justify-end' : 'justify-start'} animate-slide-up group`}>
              <div className={`flex gap-4 max-w-[90%] md:max-w-[85%] ${m.role === Role.USER ? 'flex-row-reverse' : ''}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-1 shadow-md ${m.role === Role.USER ? 'accent-bg' : 'bg-gray-100 dark:bg-gray-900 accent-text'}`}>{m.role === Role.USER ? <span className="text-xs text-white font-bold">U</span> : <Bot size={24} />}</div>
                <div className={`relative ${m.role === Role.USER ? 'bg-white/5 dark:bg-white/5 rounded-2xl p-4' : ''}`}>
                  <MarkdownRenderer content={m.content} onRunCode={handleRunCode} />
                  
                  {/* Web Search Sources */}
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-4 pt-3 border-t dark:border-white/10 space-y-2 animate-slide-up">
                       <div className="text-[10px] font-black uppercase text-gray-500 flex items-center gap-1"><Globe size={10} /> {language === Language.VI ? 'Nguồn tham khảo' : 'Sources'}</div>
                       <div className="flex flex-wrap gap-2">
                          {m.sources.map((s, idx) => (
                            <a key={idx} href={s.uri} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 dark:bg-white/5 hover:bg-blue-500/10 hover:text-blue-500 rounded-full text-[10px] font-bold transition-all border dark:border-transparent">
                               <span className="truncate max-w-[120px]">{s.title}</span>
                               <ExternalLink size={10} />
                            </a>
                          ))}
                       </div>
                    </div>
                  )}

                  {m.role === Role.MODEL && !isLoading && (
                    <div className="absolute -bottom-6 left-0 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                       <button onClick={() => handleSpeak(m.content)} className="p-1 hover:accent-text" title="Đọc"><Volume2 size={14} /></button>
                       <button onClick={() => addMemoryFact(m.content.substring(0, 100))} className="p-1 hover:text-amber-500" title="Ghi nhớ"><Bookmark size={14} /></button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {isLoading && <div className="flex justify-start gap-4 items-center"><Bot size={24} className="accent-text animate-pulse" /><div className="flex flex-col"><TypingIndicator /><span className="text-[10px] font-bold accent-text animate-pulse">{loadingStep}</span></div></div>}
          <div ref={messagesEndRef} className="h-20" />
        </main>

        <footer className="p-4 md:pb-8 bg-transparent z-40">
           <div className="max-w-3xl mx-auto w-full">
             <div className="flex flex-col p-2 bg-gray-100 dark:bg-gray-900 rounded-[2.5rem] shadow-2xl border border-transparent dark:border-gray-800 focus-within:accent-border transition-all">
                <textarea 
                  value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder={t.inputPlaceholder} 
                  className="bg-transparent border-none focus:ring-0 p-4 text-lg resize-none no-scrollbar h-auto min-h-[56px] max-h-40 font-medium"
                  rows={1}
                />
                <div className="flex items-center justify-between px-3 pb-2">
                   <div className="flex gap-1 md:gap-2">
                      <button onClick={startVoiceInput} className="p-2.5 text-gray-500 hover:accent-text rounded-full transition-all hover:bg-white/10"><Mic size={22} /></button>
                      <button onClick={() => setIsLibraryOpen(true)} className="p-2.5 text-gray-500 hover:accent-text rounded-full transition-all hover:bg-white/10"><Library size={22} /></button>
                      <button onClick={() => fileInputRef.current?.click()} className="p-2.5 text-gray-500 hover:accent-text rounded-full transition-all hover:bg-white/10"><ImageIcon size={22} /></button>
                      <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0]; if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => setSelectedImage(ev.target?.result as string);
                          reader.readAsDataURL(file);
                        }
                      }} />
                      <button onClick={() => setIsTTSEnabled(!isTTSEnabled)} className={`p-2.5 rounded-full transition-all ${isTTSEnabled ? 'accent-text bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'text-gray-500 hover:bg-white/10'}`} title="Text-to-Speech"><Volume2 size={22} /></button>
                      <button onClick={() => setIsThinkingEnabled(!isThinkingEnabled)} className={`p-2.5 rounded-full transition-all ${isThinkingEnabled ? 'text-blue-400 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'text-gray-500 hover:bg-white/10'}`} title="Deep Thinking"><Brain size={22} /></button>
                      <button onClick={() => setIsWebSearchEnabled(!isWebSearchEnabled)} className={`p-2.5 rounded-full transition-all ${isWebSearchEnabled ? 'text-emerald-500 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'text-gray-500 hover:bg-white/10'}`} title="Web Search"><Globe size={22} /></button>
                   </div>
                   <button onClick={() => handleSend()} className={`p-3.5 rounded-full transition-all ${input.trim() ? 'accent-bg text-white shadow-lg' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'}`}><Send size={20} /></button>
                </div>
             </div>
           </div>
        </footer>
      </div>

      {/* --- MODALS --- */}
      {/* (Phần Modals giữ nguyên như cũ để không làm mất tính năng) */}
      {isLibraryOpen && (
        <div className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white dark:bg-gray-950 w-full max-w-2xl h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border dark:border-gray-800 animate-slide-up">
              <header className="p-6 border-b dark:border-gray-800 flex items-center justify-between">
                 <h2 className="text-xl font-black accent-text flex items-center gap-2"><Library size={24} /> {t.library}</h2>
                 <button onClick={() => setIsLibraryOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"><X size={20} /></button>
              </header>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                 {isAddingPrompt ? (
                    <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl">
                       <input type="text" placeholder="Tiêu đề..." value={newPromptTitle} onChange={(e) => setNewPromptTitle(e.target.value)} className="w-full p-3 rounded-xl bg-white dark:bg-gray-800 border dark:border-gray-700 outline-none font-bold" />
                       <textarea placeholder="Nội dung lệnh..." value={newPromptContent} onChange={(e) => setNewPromptContent(e.target.value)} rows={4} className="w-full p-3 rounded-xl bg-white dark:bg-gray-800 border dark:border-gray-700 outline-none resize-none" />
                       <div className="flex justify-end gap-2">
                          <button onClick={() => setIsAddingPrompt(false)} className="px-4 py-2 font-bold text-gray-500">Hủy</button>
                          <button onClick={handleAddPrompt} className="px-6 py-2 accent-bg text-white rounded-xl font-bold">Lưu</button>
                       </div>
                    </div>
                 ) : (
                    <>
                       <button onClick={() => setIsAddingPrompt(true)} className="w-full py-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl text-gray-500 font-bold flex items-center justify-center gap-2 hover:accent-border hover:accent-text transition-all"><Plus size={18} /> Thêm Prompt mới</button>
                       <div className="grid gap-3">
                          {savedPrompts.map(p => (
                             <div key={p.id} className="group p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 hover:accent-bg hover:text-white transition-all cursor-pointer relative" onClick={() => handleUsePrompt(p.content)}>
                                <h3 className="font-bold">{p.title}</h3>
                                <p className="text-xs opacity-70 mt-1 line-clamp-2">{p.content}</p>
                             </div>
                          ))}
                       </div>
                    </>
                 )}
              </div>
           </div>
        </div>
      )}

      {isTerminalOpen && (
        <div className="fixed inset-0 z-[150] bg-black flex flex-col font-mono animate-slide-up">
           <header className="h-12 bg-gray-900 flex items-center justify-between px-4 border-b border-gray-800">
              <div className="flex items-center gap-2 text-emerald-500"><Terminal size={16} /> <span className="text-sm font-bold uppercase tracking-widest">NhutShell Ultimate v1.6</span>{isTerminalLoading && <Zap size={14} className="animate-pulse text-blue-400" />}</div>
              <button onClick={() => setIsTerminalOpen(false)} className="p-1.5 text-gray-500 hover:text-white"><X size={20} /></button>
           </header>
           <div className="flex-1 overflow-y-auto p-4 space-y-2 text-emerald-400 no-scrollbar bg-black">
              {terminalHistory.map((line, i) => <div key={i} className={`whitespace-pre-wrap leading-relaxed ${line.startsWith('[AI]') ? 'text-blue-400' : ''}`}>{line}</div>)}
              <div ref={terminalEndRef} />
           </div>
           <div className="p-4 bg-black border-t border-gray-900 flex items-center gap-2">
              <span className="text-emerald-500 font-bold">$</span>
              <input autoFocus type="text" value={terminalInput} onChange={(e) => setTerminalInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { processTerminalCommand(terminalInput); setTerminalInput(''); } }} className="flex-1 bg-transparent border-none outline-none text-emerald-400 focus:ring-0" placeholder="ai <câu hỏi>" />
           </div>
        </div>
      )}

      {isMemoryOpen && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-white dark:bg-gray-950 w-full max-w-lg rounded-3xl shadow-2xl flex flex-col h-[70vh] border dark:border-gray-800">
              <header className="p-6 border-b dark:border-gray-800 flex justify-between items-center">
                 <h2 className="text-xl font-black text-amber-500 flex items-center gap-2"><Database size={24} /> Trình quản lý bộ nhớ</h2>
                 <button onClick={() => setIsMemoryOpen(false)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><X size={20} /></button>
              </header>
              <div className="flex-1 overflow-y-auto p-6 space-y-3 no-scrollbar">
                 {memoryFacts.map(f => (
                   <div key={f.id} className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 group flex justify-between gap-3">
                      <span className="text-sm font-medium">{f.text}</span>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      {isAdvancedSettingsOpen && (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-black flex flex-col animate-slide-up">
          <header className="h-16 flex items-center justify-between px-6 border-b dark:border-gray-800">
            <button onClick={() => setIsAdvancedSettingsOpen(false)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><ArrowLeft size={24} /></button>
            <h2 className="text-xl font-black uppercase tracking-wider accent-text">Cá nhân hóa</h2>
            <button onClick={() => setIsAdvancedSettingsOpen(false)} className="p-2.5 accent-bg text-white rounded-full shadow-lg"><Check size={24} /></button>
          </header>
          <div className="flex-1 overflow-y-auto p-6 md:p-12 max-w-3xl mx-auto w-full space-y-10 no-scrollbar">
             <section className="space-y-4">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Palette size={14} /> Màu chủ đạo</h3>
                <div className="flex gap-4">
                   {Object.keys(ACCENT_COLORS).map(color => (
                     <button key={color} onClick={() => setAccent(color as AccentColor)} className={`w-12 h-12 rounded-full border-4 transition-all ${accent === color ? 'border-white dark:border-gray-500 scale-110 shadow-xl' : 'border-transparent opacity-50'}`} style={{ backgroundColor: ACCENT_COLORS[color] }} />
                   ))}
                </div>
             </section>
          </div>
        </div>
      )}

      {canvasState.open && (
        <div className={`fixed inset-y-0 right-0 z-[60] bg-white dark:bg-gray-950 border-l dark:border-gray-800 shadow-2xl transition-all duration-500 w-full lg:w-[45%]`}>
           <div className="flex flex-col h-full">
              <header className="h-14 flex items-center justify-between px-4 border-b dark:border-gray-800">
                 <div className="flex items-center gap-2"><Layout size={18} className="accent-text" /><span className="font-black uppercase text-xs">Canvas</span></div>
                 <button onClick={() => setCanvasState(p => ({ ...p, open: false }))} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><X size={20} /></button>
              </header>
              <div className="flex-1 bg-white dark:bg-black relative">
                 {canvasState.lang === 'python' ? (
                   <div className="h-full bg-black p-6 font-mono text-xs text-emerald-400 overflow-y-auto">
                      <pre>{pythonOutput}</pre>
                   </div>
                 ) : (
                   <iframe title="Canvas" srcDoc={canvasState.code} className="w-full h-full border-none" sandbox="allow-scripts" />
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
