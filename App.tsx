
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { 
  Send, Moon, Sun, Bot, User, Settings, Sparkles, Brain, X, Plus, 
  Trash2, MessageSquare, Menu, Globe, Search, Image as ImageIcon, 
  Mic, MicOff, UserCircle, Layers, Database, Beaker, Check, Share2, Info
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
  const [language, setLanguage] = useState<Language>(Language.VI);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAdvancedSettingsOpen, setIsAdvancedSettingsOpen] = useState(false);
  
  const [userName, setUserName] = useState<string | null>(localStorage.getItem('nhutaibot_username'));
  const [tempName, setTempName] = useState('');
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);
  const [isThinkingEnabled, setIsThinkingEnabled] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODELS.FLASH.id);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const [isListening, setIsListening] = useState(false);
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
      recognitionRef.current.lang = 'vi-VN';

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
  }, []);

  const toggleVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
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
      getSystemInstruction(language, userName ? [`Tên là ${userName}`] : [])
    );
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
        <div className="flex items-center gap-3">
          <button onClick={() => setTheme(theme === Theme.DARK ? Theme.LIGHT : Theme.DARK)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500">
            {theme === Theme.DARK ? <Sun size={22} /> : <Moon size={22} />}
          </button>
          <button onClick={() => setIsAdvancedSettingsOpen(true)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500">
            <Settings size={22} />
          </button>
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shadow-md cursor-pointer overflow-hidden border-2 border-white dark:border-gray-700">
            {userName ? userName.charAt(0).toUpperCase() : <UserCircle size={28} />}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 overflow-y-auto no-scrollbar relative flex flex-col">
        {!userName ? (
          <div className="max-w-3xl mx-auto w-full px-6 py-24 flex-1 flex flex-col items-center justify-center text-center">
            <div className="space-y-6 animate-slide-up">
              <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl"><Bot size={40} className="text-white" /></div>
              <h2 className="text-3xl font-bold">Chào mừng bạn!</h2>
              <div className="flex gap-2 max-w-sm">
                <input type="text" value={tempName} onChange={(e) => setTempName(e.target.value)} placeholder="Nhập tên của bạn..." className="flex-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500" />
                <button onClick={() => { setUserName(tempName); localStorage.setItem('nhutaibot_username', tempName); }} className="p-4 bg-blue-600 text-white rounded-xl"><Check size={20} /></button>
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
                    {m.role === Role.USER ? <span className="text-xs font-bold text-white">{userName.charAt(0).toUpperCase()}</span> : <Bot size={24} className="text-blue-500" />}
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
                    placeholder="Hỏi NhutAIbot..." 
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
                    
                    <button onClick={() => setIsThinkingEnabled(!isThinkingEnabled)} className={`p-2 rounded-full transition-all ${isThinkingEnabled ? 'text-blue-500 bg-blue-500/10' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800'}`} title="Suy nghĩ sâu"><Brain size={20} /></button>
                    <button onClick={() => setIsWebSearchEnabled(!isWebSearchEnabled)} className={`p-2 rounded-full transition-all ${isWebSearchEnabled ? 'text-blue-500 bg-blue-500/10' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800'}`} title="Tìm kiếm Web"><Globe size={20} /></button>
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
            <p className="text-center text-[10px] text-gray-400 mt-4 px-4">
              NhutAIbot có thể đưa ra câu trả lời không chính xác. <a href="#" className="underline">Quyền riêng tư</a>
            </p>
          </div>
        </footer>
      )}

      {/* Advanced Settings Modal */}
      {isAdvancedSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/30">
          <div className="relative w-full max-w-4xl bg-white dark:bg-gemini-bgDark rounded-[2rem] shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col md:flex-row overflow-hidden animate-slide-up">
            <aside className="w-full md:w-64 p-8 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
               <h3 className="text-xl font-bold mb-8 flex items-center gap-2 text-blue-600"><Settings size={20} /> Cấu hình AI</h3>
               <nav className="space-y-2">
                 {[{id:'ai', icon: Layers, label: 'Huấn luyện AI'}, {id:'mem', icon: Database, label: 'Bộ nhớ'}, {id:'lab', icon: Beaker, label: 'Thí nghiệm'}].map(tab => (
                   <button key={tab.id} className="w-full flex items-center gap-3 p-3 rounded-xl text-sm font-medium hover:bg-blue-500/10 text-gray-500 hover:text-blue-600 transition-all"><tab.icon size={18} /> {tab.label}</button>
                 ))}
               </nav>
            </aside>
            <main className="flex-1 p-8 md:p-12 space-y-8">
              <div className="flex justify-between items-center">
                <h4 className="text-2xl font-bold">Huấn luyện & Cá nhân hóa</h4>
                <button onClick={() => setIsAdvancedSettingsOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"><X size={24} /></button>
              </div>
              <div className="space-y-6">
                 <div>
                   <label className="text-xs font-bold uppercase text-gray-500 mb-2 block tracking-widest">Tên hiển thị của bạn</label>
                   <input type="text" value={userName || ''} onChange={(e) => setUserName(e.target.value)} className="w-full p-4 rounded-xl bg-gray-100 dark:bg-[#1e1f20] border border-gray-200 dark:border-gray-800 outline-none focus:ring-2 focus:ring-blue-500" />
                 </div>
                 <div className="p-5 rounded-2xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
                   <div className="flex items-center justify-between mb-2">
                     <p className="font-bold text-blue-600 flex items-center gap-2"><Brain size={18} /> Thinking Mode (CoT)</p>
                     <button onClick={() => setIsThinkingEnabled(!isThinkingEnabled)} className={`w-12 h-6 rounded-full relative transition-all ${isThinkingEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}><div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all ${isThinkingEnabled ? 'translate-x-6' : ''}`} /></button>
                   </div>
                   <p className="text-sm text-gray-500 leading-relaxed">Khi bật chế độ này, NhutAIbot sẽ dành thêm thời gian để "suy nghĩ" và phân tích các bài toán phức tạp trước khi trả lời.</p>
                 </div>
                 <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30">
                   <p className="font-bold text-emerald-600 flex items-center gap-2"><Database size={18} /> Long-term Memory</p>
                   <p className="text-sm text-gray-500 mt-1">AI đang học phong cách của bạn để đưa ra các gợi ý chính xác hơn mỗi ngày.</p>
                 </div>
              </div>
              <div className="pt-8 flex justify-end gap-3">
                 <button onClick={() => { localStorage.setItem('nhutaibot_username', userName || ''); setIsAdvancedSettingsOpen(false); }} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all">Lưu cài đặt</button>
              </div>
            </main>
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
                <h2 className="text-lg font-bold tracking-tight">Lịch sử</h2>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full"><X size={20} /></button>
              </div>
              <button onClick={createNewSession} className="flex items-center gap-3 w-full p-4 rounded-2xl bg-white dark:bg-[#1e1f20] border border-gray-200 dark:border-gray-800 mb-6 font-bold hover:shadow-md transition-all">
                <Plus size={20} /> Cuộc trò chuyện mới
              </button>
              <div className="flex-1 overflow-y-auto space-y-1 no-scrollbar">
                {sessions.map(s => (
                  <button key={s.id} onClick={() => loadSession(s.id)} className={`flex items-center gap-3 w-full p-3 rounded-xl text-left text-sm truncate transition-all ${currentSessionId === s.id ? 'bg-blue-500/10 text-blue-600 font-bold' : 'hover:bg-gray-200 dark:hover:bg-[#2d2e30]'}`}>
                    <MessageSquare size={16} className="shrink-0" />
                    <span className="truncate">{s.title}</span>
                  </button>
                ))}
              </div>
              <div className="mt-auto pt-6 border-t border-gray-200 dark:border-gray-800">
                <button onClick={() => setIsAdvancedSettingsOpen(true)} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 text-sm font-medium">
                  <Settings size={18} /> Cài đặt AI
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
