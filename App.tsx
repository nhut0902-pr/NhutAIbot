
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { 
  Send, Moon, Sun, Bot, User, Settings, Sparkles, Brain, X, Plus, 
  Trash2, MessageSquare, Menu, Globe, Search, Image as ImageIcon, 
  Mic, MicOff, UserCircle, Layers, Database, Beaker, Check, Share2, 
  Info, ArrowLeft, ChevronDown, ChevronUp, Languages, CreditCard, Layout, Shield, AlertCircle
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
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('nhutaibot_theme') as Theme) || Theme.DARK);
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('nhutaibot_lang') as Language) || Language.VI);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAdvancedSettingsOpen, setIsAdvancedSettingsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(() => localStorage.getItem('nhutaibot_privacy_read') !== 'true');
  
  // Personalization States
  const [userName, setUserName] = useState<string>(localStorage.getItem('nhutaibot_username') || '');
  const [userJob, setUserJob] = useState<string>(localStorage.getItem('nhutaibot_job') || '');
  const [userBio, setUserBio] = useState<string>(localStorage.getItem('nhutaibot_bio') || '');
  const [customInstructions, setCustomInstructions] = useState<string>(localStorage.getItem('nhutaibot_custom') || '');
  const [traits, setTraits] = useState<string>(localStorage.getItem('nhutaibot_traits') || '');
  
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(localStorage.getItem('nhutaibot_websearch') === 'true');
  const [isCodeExecutionEnabled, setIsCodeExecutionEnabled] = useState(localStorage.getItem('nhutaibot_code') === 'true');
  const [isCanvasEnabled, setIsCanvasEnabled] = useState(localStorage.getItem('nhutaibot_canvas') === 'true');
  
  const [isThinkingEnabled, setIsThinkingEnabled] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODELS.FLASH.id);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const [isListening, setIsListening] = useState(false);
  const [isAdvancedExpanded, setIsAdvancedExpanded] = useState(true);
  
  const recognitionRef = useRef<any>(null);
  const interimTranscriptRef = useRef('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = TRANSLATIONS[language];

  // Theme synchronization
  useLayoutEffect(() => {
    if (theme === Theme.DARK) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('nhutaibot_theme', theme);
  }, [theme]);

  // Language synchronization
  useEffect(() => {
    localStorage.setItem('nhutaibot_lang', language);
  }, [language]);

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

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = language === Language.VI ? 'vi-VN' : 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setInput(prev => prev + finalTranscript + ' ');
        }
        interimTranscriptRef.current = interim;
      };

      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, [language]);

  const toggleVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === Language.VI ? Language.EN : Language.VI);
  };

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
      0.7, 
      getSystemInstruction(language, [userName, userJob, userBio].filter(Boolean), customInstructions + "\n" + traits)
    );
  };

  const savePersonalization = () => {
    localStorage.setItem('nhutaibot_username', userName);
    localStorage.setItem('nhutaibot_job', userJob);
    localStorage.setItem('nhutaibot_bio', userBio);
    localStorage.setItem('nhutaibot_custom', customInstructions);
    localStorage.setItem('nhutaibot_traits', traits);
    localStorage.setItem('nhutaibot_websearch', isWebSearchEnabled.toString());
    localStorage.setItem('nhutaibot_code', isCodeExecutionEnabled.toString());
    localStorage.setItem('nhutaibot_canvas', isCanvasEnabled.toString());
    
    if (currentSessionId) {
      const session = sessions.find(s => s.id === currentSessionId);
      if (session) reinitChat(session);
    }
    
    setIsAdvancedSettingsOpen(false);
  };

  const dismissPrivacyNotice = () => {
    localStorage.setItem('nhutaibot_privacy_read', 'true');
    setShowPrivacyNotice(false);
  };

  const handleSend = async (overrideInput?: string) => {
    const textToSend = overrideInput || input;
    if (!textToSend.trim() && !selectedImage) return;
    if (isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      content: textToSend,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const imageToSend = selectedImage ? { inlineData: { data: selectedImage.split(',')[1], mimeType: 'image/png' } } : undefined;
    setSelectedImage(null);

    try {
      const stream = await geminiService.sendMessageStream(textToSend, imageToSend);
      const botMessageId = (Date.now() + 1).toString();
      let fullContent = '';
      let sources: Source[] = [];

      setMessages(prev => [...prev, { id: botMessageId, role: Role.MODEL, content: '', timestamp: new Date().toISOString() }]);

      for await (const chunk of stream) {
        const chunkObj = chunk as GenerateContentResponse;
        const text = chunkObj.text;
        const grounding = chunkObj.candidates?.[0]?.groundingMetadata;
        if (grounding?.groundingChunks) {
          grounding.groundingChunks.forEach((c: any) => {
            if (c.web) sources.push({ uri: c.web.uri, title: c.web.title || c.web.uri });
          });
        }
        if (text) {
          fullContent += text;
          setMessages(prev => prev.map(m => m.id === botMessageId ? { 
            ...m, 
            content: fullContent,
            sources: sources.length > 0 ? Array.from(new Map(sources.map(s => [s.uri, s])).values()) : m.sources 
          } : m));
        }
      }

      setSessions(prev => prev.map(s => s.id === currentSessionId ? { 
        ...s, 
        title: messages.length === 0 ? textToSend.substring(0, 30) : s.title, 
        messages: [...messages, userMessage, { id: botMessageId, role: Role.MODEL, content: fullContent, timestamp: new Date().toISOString(), sources: sources.length > 0 ? Array.from(new Map(sources.map(s => [s.uri, s])).values()) : undefined }] 
      } : s));
    } catch (e) {
      setMessages(prev => [...prev, { id: 'err-' + Date.now(), role: Role.MODEL, content: t.error, timestamp: new Date().toISOString(), isError: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const quickActions = [
    { label: "🪄 Tạo hình ảnh", prompt: "Hãy tạo một hình ảnh về một chú mèo phi hành gia trên mặt trăng.", icon: "🎨" },
    { label: "📄 Viết bất cứ thứ gì", prompt: "Viết một bài luận ngắn về tầm quan trọng của AI trong tương lai.", icon: "✍️" },
    { label: "📚 Giúp tôi học", prompt: "Giải thích khái niệm Quantum Physics một cách dễ hiểu cho học sinh lớp 10.", icon: "📖" }
  ];

  return (
    <div className={`h-screen w-full flex flex-col transition-colors duration-500 overflow-hidden ${theme === Theme.DARK ? 'bg-black text-gray-200' : 'bg-white text-gray-900'}`}>
      
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-4 md:px-6 z-30 border-b dark:border-gray-800">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all">
            <Menu size={24} />
          </button>
          <span className="text-xl font-medium tracking-tight">NhutAIbot</span>
        </div>
        <div className="flex items-center gap-1 md:gap-3">
          <button onClick={toggleLanguage} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500 flex items-center gap-1" title={t.language}>
            <Languages size={20} />
            <span className="text-[10px] font-bold uppercase hidden md:inline">{language}</span>
          </button>
          <button onClick={() => setTheme(theme === Theme.DARK ? Theme.LIGHT : Theme.DARK)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500">
            {theme === Theme.DARK ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button onClick={() => setIsAdvancedSettingsOpen(true)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500">
            <Settings size={20} />
          </button>
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shadow-md cursor-pointer overflow-hidden border-2 border-white dark:border-gray-700">
            {userName ? userName.charAt(0).toUpperCase() : <UserCircle size={28} />}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 overflow-y-auto no-scrollbar relative flex flex-col">
        {(!userName && !isAdvancedSettingsOpen && !isPrivacyOpen) ? (
          <div className="max-w-3xl mx-auto w-full px-6 py-24 flex-1 flex flex-col items-center justify-center text-center">
            <div className="space-y-6 animate-slide-up">
              <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl"><Bot size={40} className="text-white" /></div>
              <h2 className="text-3xl font-bold">Chào mừng bạn!</h2>
              <div className="flex gap-2 max-w-sm">
                <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Nhập tên của bạn..." className="flex-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500 border border-transparent dark:border-gray-800" />
                <button onClick={() => { localStorage.setItem('nhutaibot_username', userName); savePersonalization(); }} className="p-4 bg-blue-600 text-white rounded-xl shadow-lg"><Check size={20} /></button>
              </div>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="max-w-3xl mx-auto w-full px-6 py-12 md:py-24 flex-1">
            <div className="space-y-8 animate-slide-up">
              <h1 className="text-4xl md:text-5xl font-medium leading-tight">
                <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 bg-clip-text text-transparent">Xin chào {userName}!</span><br />
                Chúng ta nên bắt đầu từ đâu nhỉ?
              </h1>
              <div className="flex flex-col gap-3 max-w-sm mt-12">
                {quickActions.map((action, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => handleSend(action.prompt)} 
                    className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-gray-50 dark:bg-[#1e1f20] hover:bg-gray-100 dark:hover:bg-[#2d2e30] border border-gray-200 dark:border-gray-800 transition-all text-left shadow-sm"
                  >
                    <span className="text-xl">{action.icon}</span>
                    <span className="text-base font-medium">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto w-full px-4 md:px-6 py-8 space-y-10 flex-1">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === Role.USER ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-4 max-w-[90%] ${m.role === Role.USER ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${m.role === Role.USER ? 'bg-blue-600' : 'bg-transparent'}`}>
                    {m.role === Role.USER ? <span className="text-xs font-bold text-white">{userName?.charAt(0).toUpperCase() || 'U'}</span> : <Bot size={24} className="text-blue-500" />}
                  </div>
                  <div className="flex flex-col gap-2 overflow-hidden">
                    <div className={`prose prose-sm md:prose-base dark:prose-invert max-w-none ${m.role === Role.USER ? 'bg-gray-100 dark:bg-[#1e1f20] p-4 rounded-2xl' : ''}`}>
                      <MarkdownRenderer content={m.content} />
                    </div>
                    {m.sources && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {m.sources.map((s, i) => (
                          <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold border border-blue-500/20 hover:bg-blue-500/20"><Globe size={10} /> {s.title}</a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start gap-4">
                <div className="w-8 h-8"><Bot size={24} className="text-blue-500 animate-pulse" /></div>
                <TypingIndicator />
              </div>
            )}
            <div ref={messagesEndRef} className="h-32" />
          </div>
        )}

        {/* Floating Privacy Notice Toast/Banner */}
        {showPrivacyNotice && userName && (
          <div className="fixed bottom-32 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-900/50 p-4 rounded-2xl shadow-2xl z-[60] flex items-start gap-4 animate-slide-up">
            <AlertCircle className="text-blue-500 shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <p className="text-sm font-medium mb-1">{t.privacyTitle}</p>
              <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-tight">
                {t.privacyHackathon} Vui lòng đọc qua <button onClick={() => { setIsPrivacyOpen(true); }} className="text-blue-600 underline">quyền riêng tư</button> để bắt đầu.
              </p>
            </div>
            <button onClick={dismissPrivacyNotice} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
              <X size={16} />
            </button>
          </div>
        )}
      </main>

      {/* Floating Pill Input Bar */}
      {userName && (
        <footer className="w-full px-4 pb-6 md:pb-8 flex flex-col items-center z-40 bg-transparent">
          <div className="max-w-3xl w-full">
            <div className="relative">
              {selectedImage && (
                <div className="absolute bottom-full mb-4 left-4 bg-white dark:bg-[#1e1f20] p-2 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl">
                  <img src={selectedImage} alt="Preview" className="h-24 w-24 object-cover rounded-xl" />
                  <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"><X size={14} /></button>
                </div>
              )}
              
              <div className={`input-bar-container flex flex-col gap-1 p-3 rounded-[2rem] transition-all duration-300 ${theme === Theme.DARK ? 'bg-[#1e1f20]' : 'bg-[#f0f4f9]'} ${isLoading ? 'opacity-70 pointer-events-none' : ''}`}>
                <div className="flex items-center gap-3 pl-2">
                  <textarea
                    ref={inputRef} value={input}
                    onChange={(e) => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 192) + 'px'; }}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                    placeholder={t.inputPlaceholder} 
                    className="flex-1 bg-transparent border-none focus:ring-0 py-2 text-lg resize-none max-h-48 font-normal placeholder:text-gray-500 no-scrollbar" rows={1}
                  />
                </div>

                <div className="flex items-center justify-between mt-1 px-1">
                  <div className="flex items-center gap-1">
                    <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:text-blue-500 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-all"><Plus size={22} /></button>
                    <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={(e) => {
                       const f = e.target.files?.[0];
                       if (f) { const r = new FileReader(); r.onload = (ev) => setSelectedImage(ev.target?.result as string); r.readAsDataURL(f); }
                    }} />
                    
                    <button onClick={() => setIsThinkingEnabled(!isThinkingEnabled)} className={`p-2 rounded-full transition-all ${isThinkingEnabled ? 'text-blue-500 bg-blue-500/10' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800'}`} title={t.thinkingMode}><Brain size={20} /></button>
                    <button onClick={() => setIsWebSearchEnabled(!isWebSearchEnabled)} className={`p-2 rounded-full transition-all ${isWebSearchEnabled ? 'text-blue-500 bg-blue-500/10' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800'}`} title={t.webSearch}><Globe size={20} /></button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => {
                        const nextModel = selectedModel === MODELS.FLASH.id ? MODELS.PRO.id : MODELS.FLASH.id;
                        setSelectedModel(nextModel);
                        reinitChat({...sessions.find(s => s.id === currentSessionId)!, modelId: nextModel});
                      }} 
                      className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${selectedModel === MODELS.PRO.id ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'}`}
                    >
                      {selectedModel === MODELS.FLASH.id ? 'Flash' : 'Pro'}
                    </button>

                    <button onClick={toggleVoice} className={`p-2 transition-all rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 ${isListening ? 'text-red-500 animate-pulse' : 'text-gray-500'}`}>
                      {isListening ? <MicOff size={22} /> : <Mic size={22} />}
                    </button>
                    <button onClick={() => handleSend()} className={`p-2 rounded-full transition-all ${input.trim() || selectedImage ? 'text-blue-500' : 'text-gray-400'}`}>
                      <Sparkles size={24} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-center text-[10px] text-gray-400 mt-4 px-4 flex justify-center gap-4">
              <span>NhutAIbot có thể đưa ra câu trả lời không chính xác.</span>
              <button onClick={() => setIsPrivacyOpen(true)} className="underline hover:text-blue-500">{t.privacy}</button>
            </div>
          </div>
        </footer>
      )}

      {/* Redesigned Settings Modal (Personalization) */}
      {isAdvancedSettingsOpen && (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-black overflow-y-auto no-scrollbar flex flex-col animate-slide-up">
          <div className="sticky top-0 z-10 flex items-center justify-between px-4 h-16 bg-white/80 dark:bg-black/80 backdrop-blur-md">
            <button onClick={() => setIsAdvancedSettingsOpen(false)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
              <ArrowLeft size={24} />
            </button>
            <h2 className="text-xl font-bold">{t.personalization}</h2>
            <button onClick={savePersonalization} className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm">
              <Check size={24} />
            </button>
          </div>

          <div className="max-w-2xl mx-auto w-full px-4 py-6 space-y-8 pb-20">
            {/* Basic Style Accordion */}
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
               <button className="w-full flex items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-900/50">
                 <div className="text-left">
                   <p className="font-medium">Phong cách và giọng điệu cơ bản</p>
                   <p className="text-xs text-gray-400">Mặc định</p>
                 </div>
                 <ChevronDown size={20} className="text-gray-400" />
               </button>
            </div>
            <p className="text-[13px] text-gray-400 px-1 leading-relaxed">
              Đây là giọng nói và tông giọng chính mà NhutAIbot sử dụng trong các cuộc trò chuyện của bạn. Điều này không ảnh hưởng đến khả năng của NhutAIbot.
            </p>

            {/* Traits Section */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-500 px-1">{t.traits}</label>
              <input 
                type="text" 
                placeholder={t.addTraits}
                value={traits}
                onChange={(e) => setTraits(e.target.value)}
                className="w-full p-4 bg-gray-50 dark:bg-[#1e1f20] rounded-2xl outline-none focus:ring-1 focus:ring-blue-500 text-base border border-transparent dark:border-gray-800"
              />
              <p className="text-[13px] text-gray-400 px-1 leading-relaxed">
                Chọn một số tùy chỉnh bổ sung ngoài phong cách và tông giọng cơ bản của bạn.
              </p>
            </div>

            {/* Custom Instructions Section */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-500 px-1">{t.customInstructions}</label>
              <textarea 
                placeholder="Ví dụ: Xưng hô giỏi về Lập trình, coder, AI, thích về lập trình AI, xưng hô thân mật"
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                rows={4}
                className="w-full p-4 bg-gray-50 dark:bg-[#1e1f20] rounded-2xl outline-none focus:ring-1 focus:ring-blue-500 text-base resize-none border border-transparent dark:border-gray-800"
              />
            </div>

            {/* Nickname, Job, Bio Inputs */}
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-500 px-1">{t.nickname}</label>
                <input 
                  type="text" 
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full p-4 bg-gray-50 dark:bg-[#1e1f20] rounded-2xl outline-none text-base border border-transparent dark:border-gray-800"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-500 px-1">{t.job}</label>
                <input 
                  type="text" 
                  value={userJob}
                  onChange={(e) => setUserJob(e.target.value)}
                  className="w-full p-4 bg-gray-50 dark:bg-[#1e1f20] rounded-2xl outline-none text-base border border-transparent dark:border-gray-800"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-500 px-1">{t.extraInfo}</label>
                <input 
                  type="text" 
                  value={userBio}
                  onChange={(e) => setUserBio(e.target.value)}
                  className="w-full p-4 bg-gray-50 dark:bg-[#1e1f20] rounded-2xl outline-none text-base border border-transparent dark:border-gray-800"
                />
              </div>
            </div>

            {/* Memory Button */}
            <button className="w-full flex items-center gap-4 p-5 bg-gray-50 dark:bg-[#1e1f20] rounded-2xl group active:scale-[0.98] transition-all border border-transparent dark:border-gray-800">
              <Database size={24} className="text-gray-500 group-hover:text-blue-500 transition-colors" />
              <span className="font-medium text-lg flex-1 text-left">{t.memory}</span>
            </button>

            {/* Advanced Section */}
            <div className="pt-4">
              <button 
                onClick={() => setIsAdvancedExpanded(!isAdvancedExpanded)}
                className="w-full flex items-center justify-between py-4 group"
              >
                <span className="text-lg font-medium text-gray-600 dark:text-gray-300">{t.advanced}</span>
                {isAdvancedExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
              </button>

              {isAdvancedExpanded && (
                <div className="space-y-3 animate-slide-up">
                  {/* Web Search Switch */}
                  <div className="flex items-center gap-4 p-5 bg-gray-50 dark:bg-[#1e1f20] rounded-2xl border border-transparent dark:border-gray-800">
                    <Globe size={24} className="text-gray-500" />
                    <div className="flex-1">
                      <p className="font-medium">{t.webSearch}</p>
                      <p className="text-xs text-gray-400">{t.webSearchDesc}</p>
                    </div>
                    <button 
                      onClick={() => setIsWebSearchEnabled(!isWebSearchEnabled)}
                      className={`w-14 h-8 rounded-full relative transition-all duration-300 ${isWebSearchEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'}`}
                    >
                      <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${isWebSearchEnabled ? 'translate-x-6' : ''}`} />
                    </button>
                  </div>

                  {/* Code Interpreter Switch */}
                  <div className="flex items-center gap-4 p-5 bg-gray-50 dark:bg-[#1e1f20] rounded-2xl border border-transparent dark:border-gray-800">
                    <Layers size={24} className="text-gray-500" />
                    <div className="flex-1">
                      <p className="font-medium">{t.codeExecution}</p>
                      <p className="text-xs text-gray-400">{t.codeExecutionDesc}</p>
                    </div>
                    <button 
                      onClick={() => setIsCodeExecutionEnabled(!isCodeExecutionEnabled)}
                      className={`w-14 h-8 rounded-full relative transition-all duration-300 ${isCodeExecutionEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'}`}
                    >
                      <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${isCodeExecutionEnabled ? 'translate-x-6' : ''}`} />
                    </button>
                  </div>

                  {/* Canvas Switch */}
                  <div className="flex items-center gap-4 p-5 bg-gray-50 dark:bg-[#1e1f20] rounded-2xl border border-transparent dark:border-gray-800">
                    <Layout size={24} className="text-gray-500" />
                    <div className="flex-1">
                      <p className="font-medium">{t.canvas}</p>
                      <p className="text-xs text-gray-400">{t.canvasDesc}</p>
                    </div>
                    <button 
                      onClick={() => setIsCanvasEnabled(!isCanvasEnabled)}
                      className={`w-14 h-8 rounded-full relative transition-all duration-300 ${isCanvasEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'}`}
                    >
                      <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${isCanvasEnabled ? 'translate-x-6' : ''}`} />
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Language Selection inside settings as a toggle button */}
            <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
               <label className="text-sm font-medium text-gray-500 mb-4 block">{t.language}</label>
               <button 
                onClick={toggleLanguage}
                className="w-full flex items-center justify-between p-5 bg-gray-50 dark:bg-[#1e1f20] rounded-2xl group border border-transparent dark:border-gray-800"
               >
                 <div className="flex items-center gap-4">
                   <Languages size={24} className="text-gray-500" />
                   <span className="font-medium text-lg">{language === Language.VI ? 'Tiếng Việt' : 'English'}</span>
                 </div>
                 <div className="text-blue-600 font-bold uppercase text-sm tracking-widest">{language === Language.VI ? 'VI' : 'EN'}</div>
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Modal */}
      {isPrivacyOpen && (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-black overflow-y-auto no-scrollbar flex flex-col animate-slide-up">
          <div className="sticky top-0 z-10 flex items-center justify-between px-4 h-16 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b dark:border-gray-800">
            <button onClick={() => setIsPrivacyOpen(false)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
              <ArrowLeft size={24} />
            </button>
            <h2 className="text-xl font-bold">{t.privacy}</h2>
            <div className="w-10" />
          </div>
          <div className="max-w-2xl mx-auto w-full px-6 py-10 space-y-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-3xl">
                <Shield size={48} className="text-blue-600 dark:text-blue-400" />
              </div>
              <h1 className="text-3xl font-bold">{t.privacyTitle}</h1>
              <p className="text-lg text-blue-600 dark:text-blue-400 font-medium">
                {t.privacyHackathon}
              </p>
            </div>
            <div className="space-y-6 prose dark:prose-invert max-w-none">
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg">
                {t.privacyContent}
              </p>
              <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800">
                <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                  <Info size={20} className="text-blue-500" /> {t.advanced}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Trình duyệt của bạn giữ toàn bộ quyền kiểm soát. NhutAIbot không sử dụng cookies theo dõi hay phân tích hành vi người dùng bên thứ ba. Tất cả đều là mã nguồn mở và được thiết kế cho sự kiện Hackathon.
                </p>
              </div>
            </div>
            <div className="pt-10 flex justify-center">
              <button onClick={() => { setIsPrivacyOpen(false); dismissPrivacyNotice(); }} className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all">
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      {isSidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity" onClick={() => setIsSidebarOpen(false)} />
          <aside className={`fixed inset-y-0 left-0 w-72 z-50 transform transition-transform duration-300 ease-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${theme === Theme.DARK ? 'bg-[#131314]' : 'bg-[#f0f4f9]'}`}>
            <div className="p-6 flex flex-col h-full">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-lg font-bold tracking-tight">{t.history}</h2>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full"><X size={20} /></button>
              </div>
              <button onClick={createNewSession} className="flex items-center gap-3 w-full p-4 rounded-2xl bg-white dark:bg-[#1e1f20] border border-gray-200 dark:border-gray-800 mb-6 font-bold hover:shadow-md transition-all">
                <Plus size={20} /> {t.newChat}
              </button>
              <div className="flex-1 overflow-y-auto space-y-1 no-scrollbar">
                {sessions.map(s => (
                  <button key={s.id} onClick={() => loadSession(s.id)} className={`flex items-center gap-3 w-full p-3 rounded-xl text-left text-sm truncate transition-all ${currentSessionId === s.id ? 'bg-blue-500/10 text-blue-600 font-bold' : 'hover:bg-gray-200 dark:hover:bg-[#2d2e30]'}`}>
                    <MessageSquare size={16} className="shrink-0" />
                    <span className="truncate">{s.title}</span>
                  </button>
                ))}
              </div>
              <div className="mt-auto pt-6 border-t border-gray-200 dark:border-gray-800 space-y-2">
                <button onClick={() => setIsAdvancedSettingsOpen(true)} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 text-sm font-medium">
                  <Settings size={18} /> {t.settings}
                </button>
                <button onClick={() => setIsPrivacyOpen(true)} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 text-sm font-medium">
                  <Shield size={18} /> {t.privacy}
                </button>
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  );
};

export default App;
