
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { 
  Send, Moon, Sun, Bot, User, Settings, Sparkles, Brain, X, Plus, 
  MessageSquare, Menu, Globe, UserCircle, Layers, Database, Check, 
  ArrowLeft, ChevronDown, ChevronUp, Languages, Layout, Shield, AlertCircle,
  BookOpen, Code, Lightbulb, Zap, Trash2, Image as ImageIcon
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAdvancedSettingsOpen, setIsAdvancedSettingsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(() => localStorage.getItem('nhutaibot_privacy_read') !== 'true');
  
  // States for Personalization
  const [userName, setUserName] = useState<string>(localStorage.getItem('nhutaibot_username') || '');
  const [currentMode, setCurrentMode] = useState<string>('standard');
  const [userJob, setUserJob] = useState<string>(localStorage.getItem('nhutaibot_job') || '');
  const [userBio, setUserBio] = useState<string>(localStorage.getItem('nhutaibot_bio') || '');
  const [customInstructions, setCustomInstructions] = useState<string>(localStorage.getItem('nhutaibot_custom') || '');
  const [traits, setTraits] = useState<string>(localStorage.getItem('nhutaibot_traits') || '');
  
  // Feature States
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(localStorage.getItem('nhutaibot_websearch') === 'true');
  const [isThinkingEnabled, setIsThinkingEnabled] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODELS.FLASH.id);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = TRANSLATIONS[language];

  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', theme === Theme.DARK);
    localStorage.setItem('nhutaibot_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('nhutaibot_lang', language);
  }, [language]);

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

  const toggleLanguage = () => setLanguage(prev => prev === Language.VI ? Language.EN : Language.VI);

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
      0.7, 
      getSystemInstruction(language, currentMode, [userName, userJob, userBio].filter(Boolean), customInstructions + "\n" + traits)
    );
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    localStorage.setItem('nhutaibot_sessions', JSON.stringify(updated));
    if (currentSessionId === id) {
      if (updated.length > 0) loadSession(updated[0].id, updated);
      else createNewSession();
    }
  };

  const handleModeChange = (modeId: string) => {
    setCurrentMode(modeId);
    if (currentSessionId) {
      const session = sessions.find(s => s.id === currentSessionId);
      if (session) reinitChat(session);
    }
  };

  const savePersonalization = () => {
    localStorage.setItem('nhutaibot_username', userName);
    localStorage.setItem('nhutaibot_job', userJob);
    localStorage.setItem('nhutaibot_bio', userBio);
    localStorage.setItem('nhutaibot_custom', customInstructions);
    localStorage.setItem('nhutaibot_traits', traits);
    localStorage.setItem('nhutaibot_websearch', isWebSearchEnabled.toString());
    
    if (currentSessionId) {
      const session = sessions.find(s => s.id === currentSessionId);
      if (session) reinitChat(session);
    }
    setIsAdvancedSettingsOpen(false);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setSelectedImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
    // Reset input to allow selecting same file again
    e.target.value = '';
  };

  const handleSend = async (overrideInput?: string) => {
    const textToSend = overrideInput || input;
    if ((!textToSend.trim() && !selectedImage) || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: Role.USER, content: textToSend, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    
    const imageToSend = selectedImage ? { 
      inlineData: { 
        data: selectedImage.split(',')[1], 
        mimeType: 'image/png' 
      } 
    } : undefined;

    setInput('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      const stream = await geminiService.sendMessageStream(textToSend, imageToSend);
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

  const modes = [
    { id: 'standard', icon: Zap, label: t.modes.standard, color: 'text-blue-500' },
    { id: 'learning', icon: BookOpen, label: t.modes.learning, color: 'text-emerald-500' },
    { id: 'coder', icon: Code, label: t.modes.coder, color: 'text-purple-500' },
    { id: 'assistant', icon: Lightbulb, label: t.modes.assistant, color: 'text-amber-500' },
  ];

  return (
    <div className={`h-screen w-full flex flex-col transition-colors overflow-hidden ${theme === Theme.DARK ? 'bg-black text-gray-200' : 'bg-white text-gray-900'}`}>
      
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-4 z-30 border-b dark:border-gray-800 bg-opacity-70 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"><Menu size={24} /></button>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent">NhutAIbot</span>
        </div>

        {/* Desktop Mode Selector */}
        <div className="hidden md:flex items-center bg-gray-100 dark:bg-gray-900 p-1 rounded-2xl">
          {modes.map(m => (
            <button key={m.id} onClick={() => handleModeChange(m.id)} className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${currentMode === m.id ? 'bg-white dark:bg-gray-800 shadow-sm ' + m.color : 'text-gray-500'}`}>
              <m.icon size={14} className="inline mr-1" /> {m.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={toggleLanguage} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full font-bold text-[10px] uppercase">{language}</button>
          <button onClick={() => setTheme(theme === Theme.DARK ? Theme.LIGHT : Theme.DARK)} className="p-2">{theme === Theme.DARK ? <Sun size={20} /> : <Moon size={20} />}</button>
          <button onClick={() => setIsAdvancedSettingsOpen(true)} className="p-2"><Settings size={20} /></button>
          <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">{userName?.charAt(0).toUpperCase() || "U"}</div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 overflow-y-auto no-scrollbar relative flex flex-col">
        {(!userName && !isAdvancedSettingsOpen) ? (
          <div className="max-w-3xl mx-auto w-full px-6 py-24 flex-1 flex flex-col items-center justify-center text-center animate-slide-up">
            <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mb-6 shadow-2xl"><Bot size={40} className="text-white" /></div>
            <h2 className="text-3xl font-bold mb-6">Chào mừng bạn!</h2>
            <div className="flex gap-2 w-full max-w-sm">
              <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Tên của bạn..." className="flex-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 outline-none border border-transparent dark:border-gray-700 focus:border-blue-500" />
              <button onClick={() => { localStorage.setItem('nhutaibot_username', userName); savePersonalization(); }} className="p-4 bg-blue-600 text-white rounded-xl"><Check size={20} /></button>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto w-full px-4 md:px-6 py-8 space-y-8 flex-1">
             {/* Mobile Mode Selector */}
            <div className="md:hidden grid grid-cols-2 gap-2 mt-4">
              {modes.map(m => (
                <button key={m.id} onClick={() => handleModeChange(m.id)} className={`flex items-center gap-2 p-3 rounded-2xl border transition-all ${currentMode === m.id ? 'bg-blue-600/10 border-blue-500/50 ' + m.color : 'bg-gray-100 dark:bg-gray-900 border-transparent text-gray-500'}`}>
                  <m.icon size={16} /> <span className="text-[10px] font-bold">{m.label}</span>
                </button>
              ))}
            </div>

            {messages.length === 0 && (
              <div className="py-12 text-center">
                 <h1 className="text-4xl font-bold mb-4">Xin chào {userName}!</h1>
                 <p className="text-gray-500">{t.greeting}</p>
              </div>
            )}

            {messages.map(m => (
              <div key={m.id} className={`flex ${m.role === Role.USER ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-4 max-w-[90%] ${m.role === Role.USER ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${m.role === Role.USER ? 'bg-blue-600' : 'bg-transparent text-blue-500'}`}>{m.role === Role.USER ? <span className="text-xs text-white">U</span> : <Bot size={24} />}</div>
                  <div className={`p-4 rounded-2xl ${m.role === Role.USER ? 'bg-blue-600/10 dark:bg-blue-600/20' : 'bg-transparent'}`}><MarkdownRenderer content={m.content} /></div>
                </div>
              </div>
            ))}
            {isLoading && <div className="flex justify-start gap-4"><Bot size={24} className="text-blue-500 animate-pulse" /><TypingIndicator /></div>}
            <div ref={messagesEndRef} className="h-24" />
          </div>
        )}

        {/* Privacy Notice (Toast styled) */}
        {showPrivacyNotice && userName && !isPrivacyOpen && (
          <div className="fixed top-20 right-4 left-4 md:left-auto md:w-80 bg-white dark:bg-gray-900 border border-blue-500/20 p-4 rounded-2xl shadow-2xl z-50 animate-slide-up">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-blue-500 shrink-0 mt-1" size={18} />
              <div className="flex-1">
                <p className="text-[11px] text-gray-500 leading-tight">
                  {t.privacyHackathon} Vui lòng đọc qua <button onClick={() => setIsPrivacyOpen(true)} className="text-blue-600 underline">quyền riêng tư</button>.
                </p>
              </div>
              <button onClick={() => setShowPrivacyNotice(false)} className="p-1"><X size={14} /></button>
            </div>
          </div>
        )}
      </main>

      {/* Footer / Input Bar */}
      <footer className="w-full px-4 pb-6 flex flex-col items-center z-40">
        <div className="max-w-3xl w-full">
           {/* Image Preview */}
           {selectedImage && (
             <div className="relative inline-block mb-2 animate-slide-up">
               <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-blue-500 shadow-xl">
                 <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
                 <button onClick={() => setSelectedImage(null)} className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors">
                   <X size={14} />
                 </button>
               </div>
             </div>
           )}

           <div className={`flex flex-col gap-1 p-3 rounded-[2rem] transition-all bg-gray-100 dark:bg-gray-900 ${isLoading ? 'opacity-50' : ''}`}>
              <textarea 
                ref={inputRef} 
                value={input} 
                onChange={(e) => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px'; }} 
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} 
                placeholder={t.inputPlaceholder} 
                className="bg-transparent border-none focus:ring-0 py-2 px-3 text-lg resize-none no-scrollbar" 
                rows={1} 
              />
              <div className="flex items-center justify-between px-2">
                <div className="flex gap-1">
                  <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:text-blue-500 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-all">
                    <Plus size={22} />
                  </button>
                  <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageSelect} />
                  
                  <button onClick={() => setIsThinkingEnabled(!isThinkingEnabled)} className={`p-2 rounded-full ${isThinkingEnabled ? 'text-blue-500' : 'text-gray-500'}`} title={t.thinkingMode}><Brain size={20} /></button>
                  <button onClick={() => setIsWebSearchEnabled(!isWebSearchEnabled)} className={`p-2 rounded-full ${isWebSearchEnabled ? 'text-blue-500' : 'text-gray-500'}`} title={t.webSearch}><Globe size={20} /></button>
                </div>
                <button onClick={() => handleSend()} className={`p-2 rounded-full ${input.trim() || selectedImage ? 'text-blue-500' : 'text-gray-400'}`}><Sparkles size={24} /></button>
              </div>
           </div>
        </div>
      </footer>

      {/* Sidebar / History */}
      {isSidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
          <aside className={`fixed inset-y-0 left-0 w-72 z-50 transform transition-all p-6 ${theme === Theme.DARK ? 'bg-gray-950 border-r border-gray-800' : 'bg-gray-50 border-r border-gray-200'} ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
             <div className="flex items-center justify-between mb-8">
                <h2 className="text-lg font-bold">{t.history}</h2>
                <button onClick={() => setIsSidebarOpen(false)}><X size={20} /></button>
             </div>
             <button onClick={createNewSession} className="w-full p-4 rounded-2xl bg-blue-600 text-white font-bold flex items-center justify-center gap-2 mb-6 shadow-lg shadow-blue-500/20"><Plus size={18} /> {t.newChat}</button>
             <div className="space-y-2 overflow-y-auto max-h-[70vh] no-scrollbar">
                {sessions.map(s => (
                  <div key={s.id} onClick={() => loadSession(s.id)} className={`group relative flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${currentSessionId === s.id ? 'bg-blue-500/10 text-blue-500' : 'hover:bg-gray-200 dark:hover:bg-gray-800'}`}>
                    <div className="flex items-center gap-3 overflow-hidden">
                      <MessageSquare size={16} className="shrink-0" />
                      <span className="text-sm truncate">{s.title}</span>
                    </div>
                    <button onClick={(e) => deleteSession(e, s.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                ))}
             </div>
          </aside>
        </>
      )}

      {/* Settings Modal */}
      {isAdvancedSettingsOpen && (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-black flex flex-col animate-slide-up">
          <div className="flex items-center justify-between px-4 h-16 border-b dark:border-gray-800 bg-opacity-70 backdrop-blur-md">
            <button onClick={() => setIsAdvancedSettingsOpen(false)}><ArrowLeft size={24} /></button>
            <h2 className="text-xl font-bold">{t.personalization}</h2>
            <button onClick={savePersonalization} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-blue-500"><Check size={24} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full space-y-8">
             <div className="space-y-4">
               <label className="text-sm font-bold text-gray-500">{t.modes.standard}</label>
               <div className="grid grid-cols-2 gap-2">
                  {modes.map(m => (
                    <button key={m.id} onClick={() => setCurrentMode(m.id)} className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${currentMode === m.id ? 'bg-blue-600 text-white border-blue-600 shadow-xl' : 'bg-gray-50 dark:bg-gray-900 border-transparent'}`}>
                       <m.icon size={24} /> <span className="text-xs font-bold">{m.label}</span>
                    </button>
                  ))}
               </div>
             </div>
             <div className="space-y-4">
                <label className="text-sm font-bold text-gray-500">{t.nickname}</label>
                <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} className="w-full p-4 bg-gray-100 dark:bg-gray-900 rounded-2xl outline-none" />
                <label className="text-sm font-bold text-gray-500">{t.job}</label>
                <input type="text" value={userJob} onChange={(e) => setUserJob(e.target.value)} className="w-full p-4 bg-gray-100 dark:bg-gray-900 rounded-2xl outline-none" />
                <label className="text-sm font-bold text-gray-500">{t.customInstructions}</label>
                <textarea rows={4} value={customInstructions} onChange={(e) => setCustomInstructions(e.target.value)} className="w-full p-4 bg-gray-100 dark:bg-gray-900 rounded-2xl outline-none resize-none" />
             </div>
          </div>
        </div>
      )}

      {/* Privacy Modal */}
      {isPrivacyOpen && (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-black flex flex-col animate-slide-up">
          <div className="flex items-center justify-between px-4 h-16 border-b dark:border-gray-800">
            <button onClick={() => setIsPrivacyOpen(false)}><ArrowLeft size={24} /></button>
            <h2 className="text-xl font-bold">{t.privacy}</h2>
            <div className="w-10" />
          </div>
          <div className="p-8 max-w-2xl mx-auto w-full space-y-8">
             <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto"><Shield size={40} className="text-blue-600" /></div>
                <h1 className="text-2xl font-bold">{t.privacyTitle}</h1>
                <p className="text-lg text-blue-600 font-bold">{t.privacyHackathon}</p>
             </div>
             <p className="text-gray-500 text-center leading-relaxed">{t.privacyContent}</p>
             <button onClick={() => { setIsPrivacyOpen(false); localStorage.setItem('nhutaibot_privacy_read', 'true'); setShowPrivacyNotice(false); }} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-xl shadow-blue-500/20">{t.dismiss}</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
