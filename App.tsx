
import React, { useState, useEffect, useRef } from 'react';
import { Send, Moon, Sun, RotateCcw, Download, Bot, User, Cpu, Settings, Zap, Sparkles, Brain, X, ChevronDown, Info, AlertCircle, History, Plus, Trash2, MessageSquare, Menu, Globe, ExternalLink, Github, Code, Award, Search, CheckCircle2 } from 'lucide-react';
import { GenerateContentResponse } from "@google/genai";

import { Message, Role, Theme, ChatSessionData, Source } from './types';
import { APP_NAME, INITIAL_GREETING, MODELS, HACKATHON_INFO } from './constants';
import * as geminiService from './services/geminiService';
import MarkdownRenderer from './components/MarkdownRenderer';
import TypingIndicator from './components/TypingIndicator';

const App: React.FC = () => {
  // Persistence States
  const [sessions, setSessions] = useState<ChatSessionData[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  // UI States
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [theme, setTheme] = useState<Theme>(Theme.DARK);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHackathonModalOpen, setIsHackathonModalOpen] = useState(false);
  
  // Settings State
  const [selectedModel, setSelectedModel] = useState(MODELS.FLASH.id);
  const [isThinkingEnabled, setIsThinkingEnabled] = useState(false);
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showResetNotice, setShowResetNotice] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load from LocalStorage on mount
  useEffect(() => {
    const savedSessions = localStorage.getItem('nhutaibot_sessions');
    if (savedSessions) {
      const parsed = JSON.parse(savedSessions);
      setSessions(parsed);
      if (parsed.length > 0) {
        loadSession(parsed[0].id, parsed);
      } else {
        createNewSession();
      }
    } else {
      createNewSession();
    }

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      setTheme(Theme.LIGHT);
    }
  }, []);

  // Save to LocalStorage whenever sessions change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('nhutaibot_sessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  const createNewSession = () => {
    const newId = Date.now().toString();
    const newSession: ChatSessionData = {
      id: newId,
      title: 'Cuộc trò chuyện mới',
      messages: [{
        id: 'init-' + newId,
        role: Role.MODEL,
        content: INITIAL_GREETING,
        timestamp: new Date().toISOString(),
      }],
      modelId: MODELS.FLASH.id,
      isThinkingEnabled: false,
      isWebSearchEnabled: false,
      lastUpdated: new Date().toISOString(),
    };

    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newId);
    setMessages(newSession.messages);
    setSelectedModel(newSession.modelId);
    setIsThinkingEnabled(newSession.isThinkingEnabled);
    setIsWebSearchEnabled(newSession.isWebSearchEnabled);
    geminiService.initializeChat(newSession.modelId, 0, [], newSession.isWebSearchEnabled);
    setIsSidebarOpen(false);
  };

  const loadSession = (id: string, currentSessions = sessions) => {
    const session = currentSessions.find(s => s.id === id);
    if (session) {
      setCurrentSessionId(id);
      setMessages(session.messages);
      setSelectedModel(session.modelId);
      setIsThinkingEnabled(session.isThinkingEnabled);
      setIsWebSearchEnabled(session.isWebSearchEnabled || false);
      geminiService.initializeChat(
        session.modelId, 
        session.isThinkingEnabled ? 16384 : 0,
        session.messages.slice(0, -1),
        session.isWebSearchEnabled
      );
    }
    setIsSidebarOpen(false);
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
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

  const handleConfigChange = (modelId: string, thinking: boolean, webSearch: boolean) => {
    setSelectedModel(modelId);
    setIsThinkingEnabled(thinking);
    setIsWebSearchEnabled(webSearch);
    
    geminiService.initializeChat(modelId, thinking ? 16384 : 0, messages, webSearch);
    
    setSessions(prev => prev.map(s => s.id === currentSessionId ? {
      ...s,
      modelId,
      isThinkingEnabled: thinking,
      isWebSearchEnabled: webSearch,
      lastUpdated: new Date().toISOString()
    } : s));

    setShowResetNotice(true);
    setTimeout(() => setShowResetNotice(false), 3000);
  };

  useEffect(() => {
    if (theme === Theme.DARK) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, isSearching]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === Theme.DARK ? Theme.LIGHT : Theme.DARK));
  };

  const toggleWebSearch = () => {
    handleConfigChange(selectedModel, isThinkingEnabled, !isWebSearchEnabled);
  };

  const handleReset = () => {
    geminiService.resetChat(selectedModel, isThinkingEnabled ? 16384 : 0, isWebSearchEnabled);
    const resetMsgs = [{
      id: Date.now().toString(),
      role: Role.MODEL,
      content: INITIAL_GREETING,
      timestamp: new Date().toISOString(),
    }];
    setMessages(resetMsgs);
    updateSessionHistory(resetMsgs);
  };

  const updateSessionHistory = (updatedMessages: Message[]) => {
    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        let newTitle = s.title;
        if (s.title === 'Cuộc trò chuyện mới' || s.title === '') {
          const firstUserMsg = updatedMessages.find(m => m.role === Role.USER);
          if (firstUserMsg) {
            newTitle = firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
          }
        }
        return {
          ...s,
          title: newTitle,
          messages: updatedMessages,
          lastUpdated: new Date().toISOString()
        };
      }
      return s;
    }));
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      content: input,
      timestamp: new Date().toISOString(),
    };

    const updatedWithUser = [...messages, userMessage];
    setMessages(updatedWithUser);
    updateSessionHistory(updatedWithUser);
    setInput('');
    setIsLoading(true);
    if (isWebSearchEnabled) setIsSearching(true);

    if (inputRef.current) {
        inputRef.current.style.height = 'auto';
    }

    try {
      const stream = await geminiService.sendMessageStream(userMessage.content);
      
      const botMessageId = (Date.now() + 1).toString();
      let fullContent = '';
      let detectedSources: Source[] = [];

      const initialBotMsg: Message = {
        id: botMessageId,
        role: Role.MODEL,
        content: '',
        timestamp: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, initialBotMsg]);

      for await (const chunk of stream) {
        const chunkObj = chunk as GenerateContentResponse;
        let hasNewMetadata = false;

        // Xử lý metadata nguồn (Grounding) tách biệt với text
        const groundingMetadata = chunkObj.candidates?.[0]?.groundingMetadata;
        if (groundingMetadata) {
            const chunks = groundingMetadata.groundingChunks;
            if (chunks && chunks.length > 0) {
                chunks.forEach((c: any) => {
                    if (c.web) {
                        const source: Source = { uri: c.web.uri, title: c.web.title || c.web.uri };
                        if (!detectedSources.some(s => s.uri === source.uri)) {
                            detectedSources.push(source);
                            hasNewMetadata = true;
                        }
                    }
                });
            }
        }

        const chunkText = chunkObj.text;
        
        // Cập nhật state nếu có text MỚI hoặc có nguồn MỚI
        if (chunkText || hasNewMetadata) {
          if (chunkText) {
            fullContent += chunkText;
            setIsSearching(false); // Đã bắt đầu có kết quả trả về, tắt trạng thái đang tìm
          }
          
          setMessages((prev) => {
            return prev.map((msg) =>
              msg.id === botMessageId 
                ? { 
                    ...msg, 
                    content: fullContent, 
                    sources: detectedSources.length > 0 ? [...detectedSources] : msg.sources 
                  } 
                : msg
            );
          });
        }
      }
      
      setMessages(prev => {
        updateSessionHistory(prev);
        return prev;
      });

    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: Role.MODEL,
        content: "Rất tiếc, đã có lỗi xảy ra. Vui lòng thử lại sau.",
        timestamp: new Date().toISOString(),
        isError: true,
      };
      setMessages(prev => {
        const final = [...prev, errorMsg];
        updateSessionHistory(final);
        return final;
      });
    } finally {
      setIsLoading(false);
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`h-screen w-full transition-colors duration-300 flex overflow-hidden ${
      theme === Theme.DARK 
        ? 'bg-gradient-to-br from-indigo-950 via-slate-900 to-black text-white' 
        : 'bg-gradient-to-br from-indigo-100 via-white to-purple-100 text-slate-800'
    }`}>
      
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } ${theme === Theme.DARK ? 'glass-panel border-r border-white/10' : 'light-mode-glass border-r border-black/5'}`}>
        <div className="flex flex-col h-full p-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <History size={20} className="text-indigo-500" />
              Lịch sử
            </h2>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-1">
              <X size={20} />
            </button>
          </div>

          <button 
            onClick={createNewSession}
            className="flex items-center gap-2 w-full p-3 rounded-xl border border-dashed border-indigo-500/50 text-indigo-500 hover:bg-indigo-500/10 transition-colors mb-4 font-medium"
          >
            <Plus size={18} />
            Cuộc trò chuyện mới
          </button>

          <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-hide">
            {sessions.map((s) => (
              <div 
                key={s.id}
                onClick={() => loadSession(s.id)}
                className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                  currentSessionId === s.id 
                    ? (theme === Theme.DARK ? 'bg-indigo-500/20 border border-indigo-500/30' : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-700')
                    : (theme === Theme.DARK ? 'hover:bg-white/5' : 'hover:bg-black/5')
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <MessageSquare size={16} className={currentSessionId === s.id ? 'text-indigo-500' : 'opacity-40'} />
                  <span className="text-sm truncate font-medium">{s.title}</span>
                </div>
                <button 
                  onClick={(e) => deleteSession(e, s.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className={`mt-auto pt-4 border-t ${theme === Theme.DARK ? 'border-white/10 text-gray-500' : 'border-black/5 text-gray-400'}`}>
            <button 
              onClick={() => setIsHackathonModalOpen(true)}
              className="w-full py-2 group hover:scale-[1.02] transition-transform"
            >
              <p className="text-[10px] font-bold text-center uppercase tracking-widest group-hover:text-indigo-500 transition-colors">
                {HACKATHON_INFO}
              </p>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full relative">
        
        {isSidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>
        )}

        {/* Top Header */}
        <header className={`flex-shrink-0 z-20 w-full px-4 md:px-6 py-4 flex items-center justify-between ${
            theme === Theme.DARK ? 'glass-panel border-b border-white/10' : 'light-mode-glass border-b border-white/40'
        }`}>
          <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-black/5"
              >
                <Menu size={20} />
              </button>
              <div className={`p-2 rounded-xl ${theme === Theme.DARK ? 'bg-indigo-600' : 'bg-indigo-500'} shadow-lg shadow-indigo-500/20`}>
                  <Cpu size={24} className="text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold tracking-tight">{APP_NAME}</h1>
              </div>
          </div>
          
          <div className="flex items-center gap-1.5 md:gap-2">
              {showResetNotice && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-medium shadow-xl animate-bounce flex items-center gap-2">
                  <AlertCircle size={14} /> Cập nhật cài đặt!
                </div>
              )}

              <div className="relative">
                <button
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all border shadow-sm ${
                    isSettingsOpen 
                      ? 'ring-2 ring-indigo-500 bg-indigo-500/10' 
                      : (theme === Theme.DARK ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white/50 border-black/5 hover:bg-white/80')
                  }`}
                >
                  {selectedModel === MODELS.FLASH.id ? <Zap size={16} className="text-yellow-400" /> : <Sparkles size={16} className="text-purple-400" />}
                  <span className="text-sm font-medium hidden xs:inline">
                    {selectedModel === MODELS.FLASH.id ? 'Flash' : 'Pro'}
                  </span>
                  {isThinkingEnabled && <Brain size={14} className="text-blue-400 ml-1" />}
                </button>

                {isSettingsOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsSettingsOpen(false)}></div>
                    <div className={`absolute right-0 top-full mt-2 w-72 rounded-2xl p-4 shadow-2xl z-20 border backdrop-blur-2xl animate-[fadeIn_0.2s_ease-out] ${
                      theme === Theme.DARK 
                        ? 'bg-slate-900/95 border-white/10' 
                        : 'bg-white/95 border-gray-200'
                    }`}>
                      <div className="space-y-5">
                        <div>
                          <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 ${theme === Theme.DARK ? 'text-gray-400' : 'text-gray-500'}`}>Model</h3>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => handleConfigChange(MODELS.FLASH.id, isThinkingEnabled, isWebSearchEnabled)}
                              className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                                selectedModel === MODELS.FLASH.id
                                  ? (theme === Theme.DARK ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-200' : 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-inner')
                                  : (theme === Theme.DARK ? 'bg-white/5 border-transparent hover:bg-white/10' : 'bg-gray-50 border-transparent hover:bg-gray-100')
                              }`}
                            >
                              <Zap size={20} className={selectedModel === MODELS.FLASH.id ? 'text-yellow-400' : 'text-gray-400'} />
                              <span className="text-xs font-bold">Flash</span>
                            </button>
                            <button
                              onClick={() => handleConfigChange(MODELS.PRO.id, isThinkingEnabled, isWebSearchEnabled)}
                              className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                                selectedModel === MODELS.PRO.id
                                  ? (theme === Theme.DARK ? 'bg-purple-600/20 border-purple-500/50 text-purple-200' : 'bg-purple-50 border-purple-200 text-purple-700 shadow-inner')
                                  : (theme === Theme.DARK ? 'bg-white/5 border-transparent hover:bg-white/10' : 'bg-gray-50 border-transparent hover:bg-gray-100')
                              }`}
                            >
                              <Sparkles size={20} className={selectedModel === MODELS.PRO.id ? 'text-purple-400' : 'text-gray-400'} />
                              <span className="text-xs font-bold">Pro 3</span>
                            </button>
                          </div>
                        </div>
                        <div className={`pt-4 border-t ${theme === Theme.DARK ? 'border-white/10' : 'border-black/5'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className={`text-xs font-bold uppercase tracking-wider ${theme === Theme.DARK ? 'text-gray-400' : 'text-gray-500'}`}>Thinking Mode</h3>
                            <button
                               onClick={() => handleConfigChange(selectedModel, !isThinkingEnabled, isWebSearchEnabled)}
                               className={`w-11 h-6 rounded-full relative transition-colors duration-300 shadow-inner ${
                                 isThinkingEnabled ? 'bg-blue-500' : (theme === Theme.DARK ? 'bg-gray-700' : 'bg-gray-300')
                               }`}
                            >
                              <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-md transition-transform duration-300 ${isThinkingEnabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                            </button>
                          </div>
                        </div>
                        <div className={`pt-4 border-t ${theme === Theme.DARK ? 'border-white/10' : 'border-black/5'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className={`text-xs font-bold uppercase tracking-wider ${theme === Theme.DARK ? 'text-gray-400' : 'text-gray-500'}`}>Web Search</h3>
                            <button
                               onClick={() => handleConfigChange(selectedModel, isThinkingEnabled, !isWebSearchEnabled)}
                               className={`w-11 h-6 rounded-full relative transition-colors duration-300 shadow-inner ${
                                 isWebSearchEnabled ? 'bg-cyan-500' : (theme === Theme.DARK ? 'bg-gray-700' : 'bg-gray-300')
                               }`}
                            >
                              <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-md transition-transform duration-300 ${isWebSearchEnabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className={`h-6 w-px mx-1 ${theme === Theme.DARK ? 'bg-white/20' : 'bg-black/10'}`}></div>

              <button 
                  onClick={handleReset}
                  title="Xóa cuộc hội thoại"
                  className={`p-2 rounded-lg transition-colors ${
                      theme === Theme.DARK ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-black/5 text-gray-600'
                  }`}
              >
                  <RotateCcw size={20} />
              </button>
              
              <button 
                  onClick={toggleTheme}
                  className={`p-2 rounded-lg transition-colors ${
                      theme === Theme.DARK ? 'bg-white/10 hover:bg-white/20 text-yellow-300' : 'bg-black/5 hover:bg-black/10 text-indigo-600'
                  }`}
              >
                  {theme === Theme.DARK ? <Sun size={20} /> : <Moon size={20} />}
              </button>
          </div>
        </header>

        {/* Hackathon Banner */}
        <div className={`flex-shrink-0 w-full py-2 px-4 text-center text-[10px] font-bold tracking-[0.2em] uppercase ${
          theme === Theme.DARK ? 'bg-indigo-600/10 text-indigo-400' : 'bg-indigo-500/5 text-indigo-600'
        }`}>
          {HACKATHON_INFO}
        </div>

        {/* Chat Messages */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-6 scroll-smooth">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex w-full ${msg.role === Role.USER ? 'justify-end' : 'justify-start'} animate-[fadeIn_0.3s_ease-out]`}
            >
              <div className={`flex max-w-[90%] md:max-w-[80%] gap-3 ${msg.role === Role.USER ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center mt-1 shadow-md
                  ${msg.role === Role.USER ? 'bg-purple-600 text-white' : 'bg-indigo-600 text-white'}`}>
                  {msg.role === Role.USER ? <User size={18} /> : <Bot size={18} />}
                </div>
                <div className={`relative px-5 py-3.5 rounded-2xl text-sm md:text-base shadow-lg ${
                  msg.role === Role.USER 
                    ? (theme === Theme.DARK ? 'bg-purple-600/90 text-white' : 'bg-purple-600 text-white shadow-purple-200') + ' rounded-tr-sm' 
                    : (theme === Theme.DARK ? 'glass-panel text-gray-100' : 'light-mode-glass text-gray-800 shadow-indigo-100') + ' rounded-tl-sm'
                } ${msg.isError ? 'border border-red-500/50 bg-red-500/10' : ''}`}>
                  {msg.role === Role.USER ? (
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  ) : (
                    <>
                      <MarkdownRenderer content={msg.content} />
                      {msg.sources && msg.sources.length > 0 && (
                        <div className={`mt-5 pt-4 border-t ${theme === Theme.DARK ? 'border-white/10' : 'border-black/10'} animate-[fadeIn_0.5s_ease-out]`}>
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 text-indigo-500">
                                <CheckCircle2 size={12} /> Nguồn đã duyệt ({msg.sources.length})
                            </p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {msg.sources.map((source, idx) => (
                              <a 
                                key={idx} 
                                href={source.uri} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                                  theme === Theme.DARK 
                                    ? 'bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-500/50' 
                                    : 'bg-black/5 hover:bg-black/10 border border-black/5 hover:border-indigo-500/30'
                                }`}
                              >
                                <div className={`p-1.5 rounded-lg ${theme === Theme.DARK ? 'bg-indigo-500/20' : 'bg-indigo-100'} text-indigo-500 group-hover:scale-110 transition-transform`}>
                                    <Globe size={12} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`truncate font-bold mb-0.5 ${theme === Theme.DARK ? 'text-gray-200' : 'text-gray-700'}`}>
                                        {source.title}
                                    </p>
                                    <p className={`truncate opacity-40 text-[10px]`}>
                                        {new URL(source.uri).hostname}
                                    </p>
                                </div>
                                <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 text-indigo-400 transition-opacity flex-shrink-0" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  <span className={`text-[9px] font-medium absolute bottom-1 ${msg.role === Role.USER ? 'left-2 text-purple-200' : 'right-2 opacity-40'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start w-full animate-pulse">
              <div className="flex gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center mt-1">
                  <Bot size={18} />
                </div>
                <div className={`px-4 py-3 rounded-2xl rounded-tl-sm ${theme === Theme.DARK ? 'glass-panel' : 'light-mode-glass'}`}>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                        {isSearching ? (
                            <div className="flex items-center gap-1.5 text-cyan-500 text-[10px] font-bold uppercase tracking-tighter">
                                <Search size={12} className="animate-spin" />
                                Đang tìm kiếm thông tin mới nhất...
                            </div>
                        ) : (
                            <span className="text-[10px] font-bold opacity-50 uppercase tracking-tighter">
                              {isThinkingEnabled ? 'NhutAIbot đang suy nghĩ...' : 'NhutAIbot đang soạn...'}
                            </span>
                        )}
                    </div>
                    <TypingIndicator />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </main>

        {/* Floating Input Area */}
        <footer className={`flex-shrink-0 w-full px-4 py-4 md:py-6 border-t ${
          theme === Theme.DARK ? 'border-white/5' : 'border-black/5'
        }`}>
          <div className="container mx-auto max-w-4xl">
            <div className={`relative rounded-2xl p-2 md:p-3 shadow-2xl backdrop-blur-xl border transition-all duration-300 ${
                theme === Theme.DARK 
                  ? 'bg-black/60 border-white/10 ring-1 ring-white/5 focus-within:ring-indigo-500/50' 
                  : 'bg-white/90 border-white/60 ring-1 ring-black/5 focus-within:ring-indigo-400/50'
            }`}>
              <div className="flex items-end">
                <button
                  onClick={toggleWebSearch}
                  title={isWebSearchEnabled ? "Tắt tìm kiếm Web" : "Bật tìm kiếm Web"}
                  className={`p-2.5 rounded-xl transition-all duration-200 mb-1 ml-1 group relative ${
                    isWebSearchEnabled 
                      ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25' 
                      : (theme === Theme.DARK ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-indigo-600 hover:bg-black/5')
                  }`}
                >
                  <Globe size={18} className={isWebSearchEnabled ? 'animate-pulse' : ''} />
                  {!isWebSearchEnabled && (
                    <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      Tìm kiếm Web
                    </span>
                  )}
                </button>
                
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={isLoading ? "Đang xử lý..." : isWebSearchEnabled ? "Tìm kiếm & Nhắn NhutAIbot..." : "Nhắn NhutAIbot..."}
                  disabled={isLoading}
                  className={`flex-1 bg-transparent border-0 focus:ring-0 resize-none py-3 px-4 max-h-[150px] scrollbar-hide ${
                    theme === Theme.DARK ? 'text-white placeholder-gray-400' : 'text-slate-800 placeholder-gray-500'
                  }`}
                />
                
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className={`p-2.5 rounded-xl transition-all duration-200 mb-1 mr-1
                    ${!input.trim() || isLoading 
                      ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed' 
                      : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:scale-105 active:scale-95'
                    }`}
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
            {isWebSearchEnabled && (
              <p className="text-[10px] text-center mt-2 font-medium text-cyan-500/70 animate-pulse">
                Chế độ tìm kiếm Web đang hoạt động
              </p>
            )}
          </div>
        </footer>
      </div>

      {/* Hackathon Modal */}
      {isHackathonModalOpen && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
          onClick={() => setIsHackathonModalOpen(false)}
        >
          <div 
            className={`w-full max-w-md rounded-3xl p-8 border shadow-2xl animate-[scaleUp_0.3s_ease-out] relative ${
              theme === Theme.DARK ? 'bg-slate-900/90 border-white/10' : 'bg-white/95 border-gray-200'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsHackathonModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center mb-6 shadow-xl shadow-indigo-500/30">
                <Award size={32} className="text-white" />
              </div>
              
              <h2 className="text-2xl font-bold mb-2">Dự án Hackathon</h2>
              <p className={`text-sm mb-6 ${theme === Theme.DARK ? 'text-indigo-400' : 'text-indigo-600'} font-bold uppercase tracking-widest`}>
                Nhutcoder Hackathon 2025
              </p>
              
              <div className={`w-full space-y-4 text-left mb-8 p-4 rounded-2xl ${theme === Theme.DARK ? 'bg-white/5' : 'bg-black/5'}`}>
                <div className="flex items-start gap-3">
                  <div className="mt-1"><Bot size={16} className="text-indigo-500" /></div>
                  <div>
                    <p className="text-xs font-bold uppercase opacity-50 mb-1">Tên dự án</p>
                    <p className="text-sm font-medium">NhutAIbot - Modern Gemini Assistant</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1"><User size={16} className="text-purple-500" /></div>
                  <div>
                    <p className="text-xs font-bold uppercase opacity-50 mb-1">Tác giả</p>
                    <p className="text-sm font-medium">Nhutcoder</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1"><Code size={16} className="text-cyan-500" /></div>
                  <div>
                    <p className="text-xs font-bold uppercase opacity-50 mb-1">Công nghệ</p>
                    <p className="text-sm font-medium">React, Gemini AI, Tailwind, Lucide, Framer</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 w-full">
                <button 
                  onClick={() => setIsHackathonModalOpen(false)}
                  className="flex-1 py-3 px-6 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
                >
                  Đóng
                </button>
                <a 
                  href="https://github.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`flex items-center justify-center p-3 rounded-xl border ${
                    theme === Theme.DARK ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5'
                  } transition-colors`}
                >
                  <Github size={20} />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default App;
