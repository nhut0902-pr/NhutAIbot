
import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Moon, Sun, RotateCcw, Bot, User, Cpu, Settings, Zap, 
  Sparkles, Brain, X, History, Plus, Trash2, MessageSquare, 
  Menu, Globe, ExternalLink, Award, Search, CheckCircle2, 
  Image as ImageIcon, FileText, Sliders, Database, Beaker, Languages
} from 'lucide-react';
import { GenerateContentResponse } from "@google/genai";

import { Message, Role, Theme, ChatSessionData, Source, Language } from './types';
import { APP_NAME, TRANSLATIONS, MODELS, HACKATHON_INFO, getSystemInstruction } from './constants';
import * as geminiService from './services/geminiService';
import MarkdownRenderer from './components/MarkdownRenderer';
import TypingIndicator from './components/TypingIndicator';

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSessionData[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [theme, setTheme] = useState<Theme>(Theme.DARK);
  const [language, setLanguage] = useState<Language>(Language.VI);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAdvancedSettingsOpen, setIsAdvancedSettingsOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'ai' | 'memory' | 'training'>('ai');
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedModel, setSelectedModel] = useState(MODELS.FLASH.id);
  const [isThinkingEnabled, setIsThinkingEnabled] = useState(false);
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [customInstruction, setCustomInstruction] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const t = TRANSLATIONS[language];

  useEffect(() => {
    const savedSessions = localStorage.getItem('nhutaibot_sessions');
    if (savedSessions) {
      const parsed = JSON.parse(savedSessions);
      setSessions(parsed);
      if (parsed.length > 0) loadSession(parsed[0].id, parsed);
      else createNewSession();
    } else {
      createNewSession();
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      setTheme(Theme.LIGHT);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('nhutaibot_sessions', JSON.stringify(sessions));
  }, [sessions]);

  const createNewSession = () => {
    const newId = Date.now().toString();
    const newSession: ChatSessionData = {
      id: newId,
      title: t.newChat,
      messages: [{
        id: 'init-' + newId,
        role: Role.MODEL,
        content: t.greeting,
        timestamp: new Date().toISOString(),
      }],
      modelId: MODELS.FLASH.id,
      isThinkingEnabled: false,
      isWebSearchEnabled: false,
      temperature: 0.7,
      language: language,
      lastUpdated: new Date().toISOString(),
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newId);
    setMessages(newSession.messages);
    geminiService.initializeChat(newSession.modelId, 0, [], false, 0.7, getSystemInstruction(language));
    setIsSidebarOpen(false);
  };

  const loadSession = (id: string, currentSessions = sessions) => {
    const session = currentSessions.find(s => s.id === id);
    if (session) {
      setCurrentSessionId(id);
      setMessages(session.messages);
      setSelectedModel(session.modelId);
      setIsThinkingEnabled(session.isThinkingEnabled);
      setIsWebSearchEnabled(session.isWebSearchEnabled);
      setTemperature(session.temperature);
      setLanguage(session.language || Language.VI);
      geminiService.initializeChat(
        session.modelId, 
        session.isThinkingEnabled ? 16384 : 0,
        session.messages.slice(0, -1),
        session.isWebSearchEnabled,
        session.temperature,
        session.customSystemInstruction || getSystemInstruction(session.language || language)
      );
    }
    setIsSidebarOpen(false);
  };

  const toggleLanguage = () => {
    const newLang = language === Language.VI ? Language.EN : Language.VI;
    setLanguage(newLang);
    // Cập nhật hướng dẫn hệ thống ngay lập tức
    geminiService.initializeChat(
      selectedModel,
      isThinkingEnabled ? 16384 : 0,
      messages,
      isWebSearchEnabled,
      temperature,
      getSystemInstruction(newLang)
    );
  };

  const handleApplySettings = () => {
    geminiService.initializeChat(
      selectedModel, isThinkingEnabled ? 16384 : 0, messages, isWebSearchEnabled, temperature, customInstruction || getSystemInstruction(language)
    );
    setSessions(prev => prev.map(s => s.id === currentSessionId ? {
      ...s, modelId: selectedModel, isThinkingEnabled, isWebSearchEnabled, temperature, customSystemInstruction: customInstruction, language, lastUpdated: new Date().toISOString()
    } : s));
    setIsAdvancedSettingsOpen(false);
  };

  // Fixed: Implemented deleteSession
  const deleteSession = (e: React.MouseEvent, id: string) => {
    const updatedSessions = sessions.filter(s => s.id !== id);
    setSessions(updatedSessions);
    if (currentSessionId === id) {
      if (updatedSessions.length > 0) {
        loadSession(updatedSessions[0].id, updatedSessions);
      } else {
        createNewSession();
      }
    }
  };

  // Fixed: Implemented handleExport
  const handleExport = () => {
    const session = sessions.find(s => s.id === currentSessionId);
    const exportData = {
      ...session,
      messages: messages,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nhutaibot-chat-${currentSessionId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSend = async () => {
    if (!input.trim() && !selectedImage) return;
    if (isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    if (isWebSearchEnabled) setIsSearching(true);

    const imageToSend = selectedImage ? { inlineData: { data: selectedImage.split(',')[1], mimeType: 'image/png' } } : undefined;
    setSelectedImage(null);

    try {
      const stream = await geminiService.sendMessageStream(userMessage.content, imageToSend);
      const botMessageId = Date.now().toString();
      let fullContent = '';
      let detectedSources: Source[] = [];

      setMessages(prev => [...prev, { id: botMessageId, role: Role.MODEL, content: '', timestamp: new Date().toISOString() }]);

      for await (const chunk of stream) {
        const chunkObj = chunk as GenerateContentResponse;
        const grounding = chunkObj.candidates?.[0]?.groundingMetadata;
        if (grounding?.groundingChunks) {
          grounding.groundingChunks.forEach((c: any) => {
            if (c.web) detectedSources.push({ uri: c.web.uri, title: c.web.title || c.web.uri });
          });
        }

        const text = chunkObj.text;
        if (text || detectedSources.length > 0) {
          if (text) { fullContent += text; setIsSearching(false); }
          setMessages(prev => prev.map(m => m.id === botMessageId ? { ...m, content: fullContent, sources: detectedSources.length > 0 ? [...detectedSources] : m.sources } : m));
        }
      }
    } catch (e) {
      setMessages(prev => [...prev, { id: 'err', role: Role.MODEL, content: t.error, timestamp: new Date().toISOString(), isError: true }]);
    } finally {
      setIsLoading(false);
      setIsSearching(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (theme === Theme.DARK) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [messages, theme]);

  return (
    <div className={`h-screen w-full flex overflow-hidden transition-all duration-500 ${theme === Theme.DARK ? 'bg-[#0f172a] text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* Sidebar - Mobile Responsive */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${theme === Theme.DARK ? 'bg-[#1e293b] border-r border-slate-800' : 'bg-white border-r border-slate-200'}`}>
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <History size={20} className="text-indigo-500" /> {t.history}
            </h2>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 hover:bg-slate-700/20 rounded-full">
              <X size={20} />
            </button>
          </div>

          <button onClick={createNewSession} className="flex items-center gap-3 w-full p-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-lg shadow-indigo-500/20 mb-6">
            <Plus size={20} /> {t.newChat}
          </button>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
            {sessions.map(s => (
              <div key={s.id} onClick={() => loadSession(s.id)} className={`group flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all ${currentSessionId === s.id ? 'bg-indigo-500/10 border border-indigo-500/30' : 'hover:bg-slate-500/5'}`}>
                <div className="flex items-center gap-3 overflow-hidden">
                  <MessageSquare size={16} className={currentSessionId === s.id ? 'text-indigo-500' : 'opacity-40'} />
                  <span className="text-sm truncate font-medium">{s.title}</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); deleteSession(e, s.id); }} className="opacity-0 group-hover:opacity-100 hover:text-red-500 p-1"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>

          <div className="mt-auto pt-6 border-t border-slate-800 flex flex-col gap-3">
             <button onClick={handleExport} className="flex items-center gap-2 text-sm font-bold opacity-60 hover:opacity-100 transition-opacity">
               <FileText size={16} /> {t.export}
             </button>
             <div className="text-[10px] font-bold opacity-40 uppercase tracking-widest">{HACKATHON_INFO}</div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col relative h-full">
        {isSidebarOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>}

        {/* Header */}
        <header className={`h-16 flex-shrink-0 flex items-center justify-between px-4 md:px-8 border-b ${theme === Theme.DARK ? 'bg-[#0f172a]/80 border-slate-800' : 'bg-white/80 border-slate-200'} backdrop-blur-md z-30`}>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 hover:bg-slate-500/10 rounded-lg"><Menu size={20} /></button>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500"><Cpu size={20} className="text-white" /></div>
              <h1 className="font-bold text-lg hidden sm:block">{APP_NAME}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={toggleLanguage} className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-700/50 text-xs font-bold hover:bg-indigo-500/10 transition-all uppercase">
              <Languages size={14} /> {language}
            </button>
            
            <button onClick={() => setTheme(theme === Theme.DARK ? Theme.LIGHT : Theme.DARK)} className="p-2 rounded-full hover:bg-slate-500/10 transition-all">
              {theme === Theme.DARK ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-indigo-600" />}
            </button>

            <button onClick={() => setIsAdvancedSettingsOpen(true)} className="p-2 rounded-full hover:bg-indigo-500/10 text-indigo-500 transition-all">
              <Settings size={20} />
            </button>
          </div>
        </header>

        {/* Chat Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
          {messages.map(m => (
            <div key={m.id} className={`flex ${m.role === Role.USER ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div className={`flex gap-3 md:gap-4 max-w-[95%] md:max-w-[85%] ${m.role === Role.USER ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg ${m.role === Role.USER ? 'bg-indigo-600' : 'bg-slate-700 border border-slate-600'}`}>
                  {m.role === Role.USER ? <User size={18} className="text-white" /> : <Bot size={18} className="text-indigo-400" />}
                </div>
                <div className={`px-4 md:px-6 py-3.5 rounded-2xl text-sm md:text-base shadow-sm relative ${m.role === Role.USER ? 'bg-indigo-600 text-white rounded-tr-none' : (theme === Theme.DARK ? 'bg-slate-800 border border-slate-700 text-slate-200' : 'bg-white border border-slate-200 text-slate-800') + ' rounded-tl-none'}`}>
                  <MarkdownRenderer content={m.content} />
                  
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-500/20">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-2 flex items-center gap-1">
                        <CheckCircle2 size={12} /> {t.sources}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {m.sources.map((s, idx) => (
                          <a key={idx} href={s.uri} target="_blank" rel="noopener" className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-500/10 text-[10px] hover:bg-indigo-500/20 transition-all border border-transparent hover:border-indigo-500/30">
                            <Globe size={10} /> {s.title}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600"><Bot size={18} className="text-indigo-400" /></div>
              <div className={`px-6 py-4 rounded-2xl rounded-tl-none ${theme === Theme.DARK ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}`}>
                <div className="flex items-center gap-2 text-xs font-bold opacity-40 uppercase tracking-tighter mb-2">
                  {isSearching ? <><Search size={14} className="animate-spin" /> {t.searching}</> : t.thinking}
                </div>
                <TypingIndicator />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </main>

        {/* Input area optimized for mobile */}
        <footer className={`p-4 md:p-8 flex-shrink-0 ${theme === Theme.DARK ? 'bg-[#0f172a]' : 'bg-slate-50'}`}>
          <div className="max-w-4xl mx-auto relative">
            {selectedImage && (
              <div className="absolute -top-20 left-0 bg-slate-800 p-2 rounded-xl border border-slate-700 shadow-2xl animate-in zoom-in-50">
                <img src={selectedImage} alt="Preview" className="h-14 w-14 object-cover rounded-lg" />
                <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"><X size={10} /></button>
              </div>
            )}
            <div className={`flex items-end gap-2 p-2 rounded-2xl border transition-all duration-300 ${theme === Theme.DARK ? 'bg-slate-800 border-slate-700 focus-within:border-indigo-500/50' : 'bg-white border-slate-200 focus-within:border-indigo-500/50'} shadow-xl`}>
              <button onClick={() => fileInputRef.current?.click()} className="p-3 hover:bg-slate-500/10 rounded-xl text-slate-400 transition-all"><ImageIcon size={20} /></button>
              <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const r = new FileReader();
                  r.onload = (ev) => setSelectedImage(ev.target?.result as string);
                  r.readAsDataURL(file);
                }
              }} />
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                placeholder={t.inputPlaceholder}
                className="flex-1 bg-transparent border-none focus:ring-0 py-3 text-sm md:text-base resize-none max-h-48 min-h-[40px] scrollbar-hide"
                rows={1}
              />
              <button onClick={handleSend} disabled={!input.trim() && !selectedImage || isLoading} className={`p-3 rounded-xl transition-all ${!input.trim() && !selectedImage || isLoading ? 'text-slate-600 bg-slate-500/10' : 'bg-indigo-600 text-white hover:scale-105 active:scale-95 shadow-lg shadow-indigo-600/30'}`}>
                <Send size={20} />
              </button>
            </div>
          </div>
        </footer>

        {/* Settings Modal (Professional & Mobile Optimized) */}
        {isAdvancedSettingsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsAdvancedSettingsOpen(false)}>
            <div className={`w-full max-w-3xl h-full md:h-[85vh] flex flex-col md:rounded-3xl border shadow-2xl overflow-hidden transition-all duration-300 ${theme === Theme.DARK ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-200'}`} onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-700/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-500 shadow-lg"><Settings size={20} className="text-white" /></div>
                  <h2 className="text-xl font-bold">{t.aiSettings}</h2>
                </div>
                <button onClick={() => setIsAdvancedSettingsOpen(false)} className="p-2 hover:bg-slate-500/10 rounded-full"><X size={20} /></button>
              </div>

              <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
                <nav className={`w-full md:w-56 p-4 space-y-2 border-b md:border-b-0 md:border-r ${theme === Theme.DARK ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  {[ 
                    { id: 'ai', icon: Sliders, label: t.fineTune },
                    { id: 'memory', icon: Database, label: t.memory },
                    { id: 'training', icon: Beaker, label: t.training }
                  ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveSettingsTab(tab.id as any)} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all font-bold text-sm ${activeSettingsTab === tab.id ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-indigo-500/10'}`}>
                      <tab.icon size={18} /> {tab.label}
                    </button>
                  ))}
                </nav>

                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
                  {activeSettingsTab === 'ai' && (
                    <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-4">{t.model}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {[MODELS.FLASH, MODELS.PRO].map(m => (
                            <button key={m.id} onClick={() => setSelectedModel(m.id)} className={`p-4 rounded-2xl border text-left transition-all ${selectedModel === m.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700/50 hover:border-slate-500'}`}>
                              <p className="font-bold">{m.name}</p>
                              <p className="text-[10px] opacity-40">{m.id === MODELS.FLASH.id ? 'Fast & Efficient' : 'Smart & Logical'}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-500">{t.creativity}</h3>
                          <span className="text-xs font-bold bg-indigo-500 px-2 py-1 rounded text-white">{temperature}</span>
                        </div>
                        <input type="range" min="0" max="1" step="0.1" value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                      </div>

                      <div className="space-y-3">
                         <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-500/5 border border-slate-700/50">
                           <div className="flex items-center gap-3"><Brain size={18} className="text-blue-400" /> <span className="text-sm font-bold">{t.thinkingMode}</span></div>
                           <button onClick={() => setIsThinkingEnabled(!isThinkingEnabled)} className={`w-11 h-6 rounded-full relative transition-all ${isThinkingEnabled ? 'bg-indigo-500' : 'bg-slate-700'}`}><div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all ${isThinkingEnabled ? 'translate-x-5' : ''}`} /></button>
                         </div>
                         <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-500/5 border border-slate-700/50">
                           <div className="flex items-center gap-3"><Globe size={18} className="text-cyan-400" /> <span className="text-sm font-bold">{t.webSearch}</span></div>
                           <button onClick={() => setIsWebSearchEnabled(!isWebSearchEnabled)} className={`w-11 h-6 rounded-full relative transition-all ${isWebSearchEnabled ? 'bg-indigo-500' : 'bg-slate-700'}`}><div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all ${isWebSearchEnabled ? 'translate-x-5' : ''}`} /></button>
                         </div>
                      </div>
                    </div>
                  )}

                  {activeSettingsTab === 'memory' && (
                    <div className="space-y-6 text-center py-8">
                       <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4"><Database size={40} className="text-indigo-500" /></div>
                       <h3 className="text-xl font-bold">{t.memory}</h3>
                       <p className="text-sm opacity-60">AI hiện đang ghi nhớ ngữ cảnh của {messages.length} tin nhắn.</p>
                       <button onClick={() => { setMessages([{ id: 'init', role: Role.MODEL, content: t.greeting, timestamp: new Date().toISOString() }]); handleApplySettings(); }} className="w-full p-4 rounded-2xl bg-red-500/10 text-red-500 font-bold border border-red-500/20 hover:bg-red-500/20 transition-all">
                         <Trash2 size={18} className="inline mr-2" /> {t.clearMemory}
                       </button>
                    </div>
                  )}

                  {activeSettingsTab === 'training' && (
                    <div className="space-y-4">
                       <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-500">{t.systemPrompt}</h3>
                       <textarea value={customInstruction} onChange={(e) => setCustomInstruction(e.target.value)} placeholder="Nhập hướng dẫn huấn luyện AI tại đây..." className="w-full h-64 p-4 rounded-2xl bg-slate-500/5 border border-slate-700/50 focus:border-indigo-500 outline-none text-sm font-mono transition-all" />
                       <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-[10px] text-yellow-500 font-bold uppercase leading-relaxed">Lưu ý: Thay đổi chỉ dẫn hệ thống có thể khiến AI phản ứng khác hoàn toàn so với thiết lập mặc định.</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-slate-700/20 flex gap-3">
                <button onClick={() => setIsAdvancedSettingsOpen(false)} className="flex-1 p-3.5 rounded-xl font-bold hover:bg-slate-500/10 transition-all">{t.cancel}</button>
                <button onClick={handleApplySettings} className="flex-[2] p-3.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-600/30 transition-all">{t.apply}</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default App;
