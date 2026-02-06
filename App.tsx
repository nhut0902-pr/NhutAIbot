
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { 
  Send, Moon, Sun, Bot, User, Settings, Sparkles, Brain, X, Plus, 
  MessageSquare, Menu, Globe, UserCircle, Layers, Database, Check, 
  ArrowLeft, ChevronDown, ChevronUp, Languages, Layout, Shield, AlertCircle,
  BookOpen, Code, Lightbulb, Zap, Trash2, Image as ImageIcon, Terminal, Play, Cpu, History
} from 'lucide-react';
import { GenerateContentResponse } from "@google/genai";

import { Message, Role, Theme, ChatSessionData, Source, Language } from './types';
import { TRANSLATIONS, MODELS, getSystemInstruction } from './constants';
import * as geminiService from './services/geminiService';
import MarkdownRenderer from './components/MarkdownRenderer';
import TypingIndicator from './components/TypingIndicator';

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSessionData[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('nhutaibot_theme') as Theme) || Theme.DARK);
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('nhutaibot_lang') as Language) || Language.VI);
  
  // Modal/Panel states
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAdvancedSettingsOpen, setIsAdvancedSettingsOpen] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  
  // Canvas State
  const [canvasState, setCanvasState] = useState<{ open: boolean, code: string, lang: string }>({ open: false, code: '', lang: '' });
  const [pythonOutput, setPythonOutput] = useState<string>('');
  const [isPythonLoading, setIsPythonLoading] = useState(false);

  // Terminal State
  const [terminalHistory, setTerminalHistory] = useState<string[]>(['Chào mừng tới NhutShell v1.0. Gõ "help" để bắt đầu.']);
  const [terminalInput, setTerminalInput] = useState('');
  const [installedCommands, setInstalledCommands] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('nhut_installed_cmds');
    return saved ? JSON.parse(saved) : {};
  });

  // User personalization states
  const [userName, setUserName] = useState<string>(localStorage.getItem('nhutaibot_username') || '');
  const [userJob, setUserJob] = useState<string>(localStorage.getItem('nhutaibot_job') || '');
  const [customInstructions, setCustomInstructions] = useState<string>(localStorage.getItem('nhutaibot_custom') || '');
  
  // Feature States
  const [currentMode, setCurrentMode] = useState<string>(localStorage.getItem('nhutaibot_mode') || 'standard');
  const [selectedModel, setSelectedModel] = useState<string>(localStorage.getItem('nhutaibot_model') || MODELS.FLASH.id);
  const [isCodeExecutionEnabled, setIsCodeExecutionEnabled] = useState(localStorage.getItem('nhutaibot_code') === 'true');
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(localStorage.getItem('nhutaibot_websearch') === 'true');
  const [isThinkingEnabled, setIsThinkingEnabled] = useState(localStorage.getItem('nhutaibot_thinking') === 'true');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pyodideRef = useRef<any>(null);
  const t = TRANSLATIONS[language];

  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', theme === Theme.DARK);
    localStorage.setItem('nhutaibot_theme', theme);
  }, [theme]);

  useEffect(() => {
    const saved = localStorage.getItem('nhutaibot_sessions');
    if (saved) {
      const parsed = JSON.parse(saved);
      setSessions(parsed);
      if (parsed.length > 0) loadSession(parsed[0].id, parsed);
      else createNewSession();
    } else {
      createNewSession();
    }
  }, []);

  const createNewSession = () => {
    const newId = Date.now().toString();
    const newSession: ChatSessionData = {
      id: newId,
      title: t.newChat,
      messages: [],
      modelId: selectedModel,
      isThinkingEnabled: isThinkingEnabled,
      isWebSearchEnabled: isWebSearchEnabled,
      temperature: 0.7,
      language: language,
      lastUpdated: new Date().toISOString(),
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
      session.modelId, 
      session.isThinkingEnabled ? 16384 : 0, 
      session.messages, 
      session.isWebSearchEnabled,
      isCodeExecutionEnabled,
      0.7, 
      getSystemInstruction(language, currentMode, [userName, userJob].filter(Boolean), customInstructions)
    );
  };

  const handleSaveSettings = () => {
    localStorage.setItem('nhutaibot_username', userName);
    localStorage.setItem('nhutaibot_job', userJob);
    localStorage.setItem('nhutaibot_custom', customInstructions);
    localStorage.setItem('nhutaibot_mode', currentMode);
    localStorage.setItem('nhutaibot_model', selectedModel);
    localStorage.setItem('nhutaibot_thinking', isThinkingEnabled.toString());
    localStorage.setItem('nhutaibot_websearch', isWebSearchEnabled.toString());
    localStorage.setItem('nhutaibot_code', isCodeExecutionEnabled.toString());
    
    if (currentSessionId) {
      const updated = sessions.map(s => s.id === currentSessionId ? {
        ...s,
        modelId: selectedModel,
        isThinkingEnabled,
        isWebSearchEnabled
      } : s);
      setSessions(updated);
      reinitChat(updated.find(s => s.id === currentSessionId)!);
    }
    setIsAdvancedSettingsOpen(false);
  };

  const handleRunCode = async (code: string, lang: string) => {
    setCanvasState({ open: true, code, lang });
    if (lang === 'python') {
      setPythonOutput('Đang khởi tạo Python VM...');
      await runPython(code);
    }
  };

  const runPython = async (code: string) => {
    try {
      setIsPythonLoading(true);
      if (!pyodideRef.current) {
        // @ts-ignore
        pyodideRef.current = await window.loadPyodide();
      }
      const py = pyodideRef.current;
      py.runPython(`
import sys
import io
sys.stdout = io.StringIO()
      `);
      await py.runPythonAsync(code);
      const stdout = py.runPython("sys.stdout.getvalue()");
      setPythonOutput(stdout || "Chạy thành công (Không có output)");
      return stdout || "Thực thi hoàn tất.";
    } catch (err: any) {
      setPythonOutput(`LỖI PYTHON:\n${err.message}`);
      return `ERROR: ${err.message}`;
    } finally {
      setIsPythonLoading(false);
    }
  };

  const processTerminalCommand = async (cmd: string) => {
    const fullCmd = cmd.trim();
    if (!fullCmd) return;
    
    setTerminalHistory(prev => [...prev, `> ${fullCmd}`]);
    const args = fullCmd.split(' ');
    const command = args[0].toLowerCase();

    // Handle Integrated Commands
    if (command === 'help') {
      setTerminalHistory(prev => [...prev, 
        'Danh sách lệnh:',
        '- help: Hiển thị hướng dẫn này',
        '- clear: Xóa màn hình',
        '- ls: Danh sách lệnh đã cài đặt',
        '- py <mã>: Thực thi Python',
        '- js <mã>: Thực thi Javascript',
        '- install-cmd <tên> "<mã>": Cài đặt lệnh mới',
        '- whoami: Thông tin người dùng',
        '- date: Thời gian hiện tại'
      ]);
    } else if (command === 'clear') {
      setTerminalHistory(['NhutShell v1.0']);
    } else if (command === 'whoami') {
      setTerminalHistory(prev => [...prev, `User: ${userName || 'Khách'}, Job: ${userJob || 'N/A'}`]);
    } else if (command === 'date') {
      setTerminalHistory(prev => [...prev, new Date().toLocaleString()]);
    } else if (command === 'ls') {
      const keys = Object.keys(installedCommands);
      setTerminalHistory(prev => [...prev, keys.length ? `Lệnh đã cài: ${keys.join(', ')}` : 'Chưa cài lệnh nào.']);
    } else if (command === 'py') {
      const code = fullCmd.substring(3);
      const res = await runPython(code);
      setTerminalHistory(prev => [...prev, res]);
    } else if (command === 'js') {
      const code = fullCmd.substring(3);
      try {
        const res = eval(code);
        setTerminalHistory(prev => [...prev, String(res)]);
      } catch (e: any) {
        setTerminalHistory(prev => [...prev, `JS ERROR: ${e.message}`]);
      }
    } else if (command === 'install-cmd') {
      const name = args[1];
      const script = fullCmd.match(/"([^"]+)"/)?.[1];
      if (name && script) {
        const newCmds = { ...installedCommands, [name]: script };
        setInstalledCommands(newCmds);
        localStorage.setItem('nhut_installed_cmds', JSON.stringify(newCmds));
        setTerminalHistory(prev => [...prev, `Đã cài đặt lệnh '${name}' thành công.`]);
      } else {
        setTerminalHistory(prev => [...prev, 'Sai cú pháp. VD: install-cmd hi "echo Hello"']);
      }
    } else if (installedCommands[command]) {
      // Execute installed command
      processTerminalCommand(installedCommands[command]);
    } else if (command === 'echo') {
      setTerminalHistory(prev => [...prev, args.slice(1).join(' ')]);
    } else {
      setTerminalHistory(prev => [...prev, `Lệnh '${command}' không tồn tại. Gõ 'help' để xem danh sách.`]);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;
    const textToSend = input;
    const userMsg: Message = { id: Date.now().toString(), role: Role.USER, content: textToSend, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const imagePart = selectedImage ? { inlineData: { data: selectedImage.split(',')[1], mimeType: 'image/png' } } : undefined;
      const stream = await geminiService.sendMessageStream(textToSend, imagePart);
      setSelectedImage(null);
      const botMsgId = (Date.now() + 1).toString();
      let fullContent = '';
      setMessages(prev => [...prev, { id: botMsgId, role: Role.MODEL, content: '', timestamp: new Date().toISOString() }]);

      for await (const chunk of stream) {
        if (chunk.text) {
          fullContent += chunk.text;
          setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, content: fullContent } : m));
        }
      }

      const updatedSessions = sessions.map(s => s.id === currentSessionId ? { 
        ...s, 
        title: s.messages.length === 0 ? textToSend.substring(0, 30) : s.title,
        messages: [...s.messages, userMsg, { id: botMsgId, role: Role.MODEL, content: fullContent, timestamp: new Date().toISOString() }]
      } : s);
      setSessions(updatedSessions);
      localStorage.setItem('nhutaibot_sessions', JSON.stringify(updatedSessions));
    } catch (e) {
      setMessages(prev => [...prev, { id: 'err', role: Role.MODEL, content: t.error, timestamp: new Date().toISOString(), isError: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);
  useEffect(() => { terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [terminalHistory]);

  const modes = [
    { id: 'standard', icon: Zap, label: t.modes.standard, color: 'text-blue-500' },
    { id: 'learning', icon: BookOpen, label: t.modes.learning, color: 'text-emerald-500' },
    { id: 'coder', icon: Terminal, label: t.modes.coder, color: 'text-purple-500' },
    { id: 'assistant', icon: Lightbulb, label: t.modes.assistant, color: 'text-amber-500' },
  ];

  return (
    <div className={`h-screen w-full flex transition-colors overflow-hidden ${theme === Theme.DARK ? 'bg-black text-gray-200' : 'bg-white text-gray-900'}`}>
      
      {/* Sidebar Content */}
      <aside className={`fixed lg:static inset-y-0 left-0 w-72 z-50 transform transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${theme === Theme.DARK ? 'bg-gray-950 border-r border-gray-800' : 'bg-gray-50 border-r border-gray-200'} p-4 flex flex-col shadow-2xl lg:shadow-none`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-bold text-lg flex items-center gap-2 text-blue-500"><MessageSquare size={18} /> {t.history}</h2>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2"><X size={20} /></button>
        </div>
        <button onClick={createNewSession} className="w-full flex items-center justify-center gap-2 p-3 bg-blue-600 text-white rounded-xl font-bold mb-4 shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all"><Plus size={18} /> {t.newChat}</button>
        
        <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar mb-4">
          {sessions.map(s => (
            <div key={s.id} onClick={() => loadSession(s.id)} className={`p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between group ${currentSessionId === s.id ? 'bg-blue-600/10 text-blue-500' : 'hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500'}`}>
              <span className="truncate text-sm font-medium">{s.title}</span>
              <Trash2 size={14} className="opacity-0 group-hover:opacity-100 text-red-500 hover:scale-125 transition-all" onClick={(e) => { e.stopPropagation(); /* delete logic */ }} />
            </div>
          ))}
        </div>

        <div className="pt-4 border-t dark:border-gray-800 space-y-1">
           <button onClick={() => setIsTerminalOpen(true)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 transition-all font-bold text-sm text-purple-500">
              <Terminal size={18} /> NhutShell Virtual
           </button>
           <button onClick={() => setIsAdvancedSettingsOpen(true)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 transition-all font-bold text-sm text-gray-500">
              <Settings size={18} /> {t.settings}
           </button>
        </div>
      </aside>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-500 ${canvasState.open ? 'lg:mr-[40%]' : ''}`}>
        <header className="h-16 flex items-center justify-between px-4 border-b dark:border-gray-800 bg-opacity-70 backdrop-blur-md z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 lg:hidden"><Menu size={24} /></button>
            <span className="text-xl font-black bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent">NhutAIbot</span>
          </div>
          
          <div className="hidden lg:flex items-center bg-gray-100 dark:bg-gray-900 p-1 rounded-2xl border dark:border-gray-800">
            {Object.entries(MODELS).map(([key, model]) => (
              <button key={model.id} onClick={() => setSelectedModel(model.id)} className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${selectedModel === model.id ? 'bg-white dark:bg-gray-800 shadow-sm text-blue-500' : 'text-gray-500 hover:text-gray-300'}`}>
                {model.name.replace('Gemini 3 ', '')}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 md:gap-3">
            <button onClick={() => setTheme(theme === Theme.DARK ? Theme.LIGHT : Theme.DARK)} className="p-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">{theme === Theme.DARK ? <Sun size={20} /> : <Moon size={20} />}</button>
            <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-black text-sm shadow-lg">{userName.charAt(0).toUpperCase() || "U"}</div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-8 space-y-6">
          {messages.length === 0 && (
             <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-6 animate-slide-up">
                <div className="w-20 h-20 bg-blue-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl rotate-3"><Bot size={40} className="text-white" /></div>
                <h1 className="text-4xl font-black tracking-tight italic">Xin chào {userName || 'bạn'}!</h1>
                <p className="text-gray-500 font-medium">Bật <b>NhutShell</b> để thực thi lệnh hoặc dùng <b>Canvas</b> để thiết kế trực tiếp.</p>
                <div className="flex flex-wrap justify-center gap-2">
                   {modes.map(m => (
                     <button key={m.id} onClick={() => setCurrentMode(m.id)} className={`px-4 py-2 rounded-2xl border text-xs font-bold transition-all ${currentMode === m.id ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-900 border-transparent text-gray-500'}`}>{m.label}</button>
                   ))}
                </div>
             </div>
          )}
          {messages.map(m => (
            <div key={m.id} className={`flex ${m.role === Role.USER ? 'justify-end' : 'justify-start'} animate-slide-up`}>
              <div className={`flex gap-4 max-w-[90%] md:max-w-[85%] ${m.role === Role.USER ? 'flex-row-reverse' : ''}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-1 shadow-md ${m.role === Role.USER ? 'bg-blue-600' : 'bg-gray-100 dark:bg-gray-900 text-blue-500'}`}>{m.role === Role.USER ? <span className="text-xs text-white font-bold">U</span> : <Bot size={24} />}</div>
                <div className={`p-1 ${m.role === Role.USER ? 'bg-blue-600/5 dark:bg-blue-600/10 rounded-2xl' : ''}`}>
                  <MarkdownRenderer content={m.content} onRunCode={handleRunCode} />
                </div>
              </div>
            </div>
          ))}
          {isLoading && <div className="flex justify-start gap-4"><Bot size={24} className="text-blue-500 animate-pulse" /><TypingIndicator /></div>}
          <div ref={messagesEndRef} className="h-20" />
        </main>

        <footer className="p-4 md:pb-8 bg-transparent z-40">
           <div className="max-w-3xl mx-auto w-full">
             {selectedImage && (
               <div className="relative inline-block mb-3 animate-slide-up">
                 <img src={selectedImage} className="w-24 h-24 object-cover rounded-2xl border-2 border-blue-500 shadow-2xl" alt="Preview" />
                 <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg"><X size={14} /></button>
               </div>
             )}
             <div className="flex flex-col p-2 bg-gray-100 dark:bg-gray-900 rounded-[2.5rem] shadow-2xl border border-transparent dark:border-gray-800 focus-within:border-blue-500/50 transition-all">
                <textarea 
                  value={input} 
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                  placeholder={t.inputPlaceholder} 
                  className="bg-transparent border-none focus:ring-0 p-4 text-lg resize-none no-scrollbar h-auto min-h-[56px] max-h-40 font-medium"
                  rows={1}
                />
                <div className="flex items-center justify-between px-3 pb-2">
                   <div className="flex gap-1 md:gap-2">
                      <button onClick={() => fileInputRef.current?.click()} className="p-2.5 text-gray-500 hover:text-blue-500 rounded-full transition-all hover:bg-white/10"><ImageIcon size={22} /></button>
                      <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => setSelectedImage(ev.target?.result as string);
                          reader.readAsDataURL(file);
                        }
                      }} />
                      <button onClick={() => setIsThinkingEnabled(!isThinkingEnabled)} className={`p-2.5 rounded-full transition-all ${isThinkingEnabled ? 'text-blue-500 bg-blue-500/10' : 'text-gray-500 hover:bg-white/10'}`} title="Thinking Mode"><Brain size={22} /></button>
                      <button onClick={() => setIsCodeExecutionEnabled(!isCodeExecutionEnabled)} className={`p-2.5 rounded-full transition-all ${isCodeExecutionEnabled ? 'text-purple-500 bg-purple-500/10' : 'text-gray-500 hover:bg-white/10'}`} title="Code Interpreter"><Terminal size={22} /></button>
                      <button onClick={() => setIsWebSearchEnabled(!isWebSearchEnabled)} className={`p-2.5 rounded-full transition-all ${isWebSearchEnabled ? 'text-blue-500 bg-blue-500/10' : 'text-gray-500 hover:bg-white/10'}`} title="Web Search"><Globe size={22} /></button>
                   </div>
                   <button onClick={handleSend} className={`p-3.5 rounded-full transition-all ${input.trim() || selectedImage ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'}`}><Send size={20} /></button>
                </div>
             </div>
           </div>
        </footer>
      </div>

      {/* Virtual Terminal Overlay */}
      {isTerminalOpen && (
        <div className="fixed inset-0 z-[110] bg-black flex flex-col animate-slide-up font-mono">
           <header className="h-12 bg-gray-900 flex items-center justify-between px-4 border-b border-gray-800">
              <div className="flex items-center gap-2 text-emerald-500">
                 <Terminal size={16} />
                 <span className="text-sm font-bold tracking-tighter uppercase">NhutShell Terminal v1.0</span>
              </div>
              <button onClick={() => setIsTerminalOpen(false)} className="p-1.5 text-gray-500 hover:text-white"><X size={20} /></button>
           </header>
           <div className="flex-1 overflow-y-auto p-4 space-y-1 text-emerald-400 no-scrollbar bg-black">
              {terminalHistory.map((line, i) => (
                <div key={i} className="whitespace-pre-wrap break-all leading-relaxed">{line}</div>
              ))}
              <div ref={terminalEndRef} />
           </div>
           <div className="p-4 bg-black border-t border-gray-900 flex items-center gap-2">
              <span className="text-emerald-500 font-bold">$</span>
              <input 
                autoFocus
                type="text" 
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    processTerminalCommand(terminalInput);
                    setTerminalInput('');
                  }
                }}
                className="flex-1 bg-transparent border-none outline-none text-emerald-400 focus:ring-0"
              />
           </div>
        </div>
      )}

      {/* Settings Modal (Personalization & Advanced) */}
      {isAdvancedSettingsOpen && (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-black flex flex-col animate-slide-up">
          <header className="h-16 flex items-center justify-between px-6 border-b dark:border-gray-800">
            <button onClick={() => setIsAdvancedSettingsOpen(false)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><ArrowLeft size={24} /></button>
            <h2 className="text-xl font-black uppercase italic tracking-wider text-blue-500">{t.personalization}</h2>
            <button onClick={handleSaveSettings} className="p-2.5 bg-blue-600 text-white rounded-full shadow-lg shadow-blue-500/20"><Check size={24} /></button>
          </header>
          
          <div className="flex-1 overflow-y-auto p-6 md:p-12 max-w-3xl mx-auto w-full space-y-10">
             <section className="space-y-4">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Cpu size={14} /> AI Engine</h3>
                <div className="grid grid-cols-2 gap-3">
                   {Object.entries(MODELS).map(([key, model]) => (
                     <button key={model.id} onClick={() => setSelectedModel(model.id)} className={`p-4 rounded-3xl border-2 text-left transition-all ${selectedModel === model.id ? 'border-blue-600 bg-blue-600/5' : 'border-gray-100 dark:border-gray-800'}`}>
                        <div className={`font-black ${selectedModel === model.id ? 'text-blue-500' : 'text-gray-500'}`}>{model.name}</div>
                        <div className="text-[10px] text-gray-400 font-bold mt-1 uppercase">{model.id.includes('pro') ? 'Thích hợp cho tư duy cao' : 'Xử lý tốc độ cao'}</div>
                     </button>
                   ))}
                </div>
             </section>

             <section className="space-y-4">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><User size={14} /> Hồ sơ cá nhân</h3>
                <div className="space-y-4">
                   <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-500">Biệt danh của bạn</label>
                      <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl outline-none focus:ring-2 ring-blue-500/20 font-bold" placeholder="VD: Nhut Coder" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-500">Nghề nghiệp / Lĩnh vực quan tâm</label>
                      <input type="text" value={userJob} onChange={(e) => setUserJob(e.target.value)} className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl outline-none focus:ring-2 ring-blue-500/20 font-bold" placeholder="VD: Full-stack Developer" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-500">Hướng dẫn tùy chỉnh cho AI</label>
                      <textarea rows={4} value={customInstructions} onChange={(e) => setCustomInstructions(e.target.value)} className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl outline-none focus:ring-2 ring-blue-500/20 font-medium resize-none" placeholder="Hãy luôn trả lời tôi một cách hài hước và sử dụng ví dụ về lập trình..." />
                   </div>
                </div>
             </section>

             <section className="space-y-4 pb-12">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Layers size={14} /> Chế độ hoạt động</h3>
                <div className="grid grid-cols-2 gap-3">
                   {modes.map(m => (
                     <button key={m.id} onClick={() => setCurrentMode(m.id)} className={`flex items-center gap-3 p-4 rounded-3xl border-2 transition-all ${currentMode === m.id ? 'border-blue-600 bg-blue-600/5 text-blue-500' : 'border-gray-100 dark:border-gray-800 text-gray-500'}`}>
                        <m.icon size={20} />
                        <span className="font-black text-sm">{m.label}</span>
                     </button>
                   ))}
                </div>
             </section>
          </div>
        </div>
      )}

      {/* Canvas Sidebar Panel */}
      <div className={`fixed inset-y-0 right-0 z-[60] bg-white dark:bg-gray-950 border-l dark:border-gray-800 shadow-2xl canvas-panel ${canvasState.open ? 'translate-x-0 w-full lg:w-[45%]' : 'translate-x-full w-0'}`}>
         <div className="flex flex-col h-full">
            <header className="h-14 flex items-center justify-between px-4 border-b dark:border-gray-800">
               <div className="flex items-center gap-2">
                  <Layout size={18} className="text-blue-500" />
                  <span className="font-black uppercase text-xs tracking-tighter">NhutAIbot Canvas</span>
                  <span className="text-[10px] px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded-full uppercase font-black">{canvasState.lang}</span>
               </div>
               <div className="flex items-center gap-2">
                  {canvasState.lang === 'python' && <button onClick={() => runPython(canvasState.code)} className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg"><Play size={18} fill="currentColor" /></button>}
                  <button onClick={() => setCanvasState(p => ({ ...p, open: false }))} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><X size={20} /></button>
               </div>
            </header>
            <div className="flex-1 relative bg-white overflow-hidden">
               {canvasState.lang === 'html' || canvasState.lang === 'javascript' || canvasState.lang === 'js' || canvasState.lang === 'css' ? (
                  <iframe 
                    title="Canvas Preview"
                    srcDoc={canvasState.lang === 'html' ? canvasState.code : `<html><head><script src="https://cdn.tailwindcss.com"></script></head><body><script>${canvasState.code}</script></body></html>`}
                    className="w-full h-full border-none"
                    sandbox="allow-scripts"
                  />
               ) : canvasState.lang === 'python' ? (
                  <div className="h-full bg-gray-950 p-6 font-mono text-sm overflow-y-auto">
                     <div className="flex items-center gap-2 text-gray-500 mb-4 border-b border-gray-800 pb-2">
                        <Terminal size={14} /> <span>Python Output</span>
                     </div>
                     {isPythonLoading ? (
                        <div className="flex items-center gap-2 text-blue-400 animate-pulse font-black"><Zap size={14} className="animate-spin" /> ĐANG TÍNH TOÁN...</div>
                     ) : (
                        <pre className="text-gray-100 whitespace-pre-wrap">{pythonOutput || "> Sẵn sàng."}</pre>
                     )}
                  </div>
               ) : (
                  <div className="h-full flex items-center justify-center text-gray-500 font-bold">
                     Định dạng {canvasState.lang} chưa hỗ trợ Live Preview.
                  </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
};

export default App;
