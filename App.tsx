
import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Moon, Sun, RotateCcw, Download, Bot, User, Cpu, Settings, Zap, 
  Sparkles, Brain, X, ChevronDown, Info, AlertCircle, History, Plus, 
  Trash2, MessageSquare, Menu, Globe, ExternalLink, Github, Code, Award, 
  Search, CheckCircle2, Image as ImageIcon, FileText, Sliders, Database, Beaker
} from 'lucide-react';
import { GenerateContentResponse } from "@google/genai";

import { Message, Role, Theme, ChatSessionData, Source } from './types';
import { APP_NAME, INITIAL_GREETING, MODELS, HACKATHON_INFO, SYSTEM_INSTRUCTION } from './constants';
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
  const [isAdvancedSettingsOpen, setIsAdvancedSettingsOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'ai' | 'memory' | 'training'>('ai');
  
  // Vision States
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Configuration States
  const [selectedModel, setSelectedModel] = useState(MODELS.FLASH.id);
  const [isThinkingEnabled, setIsThinkingEnabled] = useState(false);
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [customInstruction, setCustomInstruction] = useState(SYSTEM_INSTRUCTION);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
      temperature: 0.7,
      customSystemInstruction: SYSTEM_INSTRUCTION,
      lastUpdated: new Date().toISOString(),
    };

    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newId);
    setMessages(newSession.messages);
    setSelectedModel(newSession.modelId);
    setIsThinkingEnabled(newSession.isThinkingEnabled);
    setIsWebSearchEnabled(newSession.isWebSearchEnabled);
    setTemperature(newSession.temperature);
    setCustomInstruction(newSession.customSystemInstruction || SYSTEM_INSTRUCTION);
    
    geminiService.initializeChat(
      newSession.modelId, 
      0, 
      [], 
      newSession.isWebSearchEnabled, 
      newSession.temperature, 
      newSession.customSystemInstruction
    );
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
      setTemperature(session.temperature || 0.7);
      setCustomInstruction(session.customSystemInstruction || SYSTEM_INSTRUCTION);

      geminiService.initializeChat(
        session.modelId, 
        session.isThinkingEnabled ? 16384 : 0,
        session.messages.slice(0, -1),
        session.isWebSearchEnabled,
        session.temperature || 0.7,
        session.customSystemInstruction
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

  const handleApplySettings = () => {
    geminiService.initializeChat(
      selectedModel, 
      isThinkingEnabled ? 16384 : 0, 
      messages, 
      isWebSearchEnabled,
      temperature,
      customInstruction
    );
    
    setSessions(prev => prev.map(s => s.id === currentSessionId ? {
      ...s,
      modelId: selectedModel,
      isThinkingEnabled,
      isWebSearchEnabled,
      temperature,
      customSystemInstruction: customInstruction,
      lastUpdated: new Date().toISOString()
    } : s));

    setIsAdvancedSettingsOpen(false);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === Theme.DARK ? Theme.LIGHT : Theme.DARK));
  };

  const handleReset = () => {
    geminiService.resetChat(selectedModel, isThinkingEnabled ? 16384 : 0, isWebSearchEnabled, temperature, customInstruction);
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
        setImageMimeType(file.type);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if (!input.trim() && !selectedImage) return;
    if (isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      content: input + (selectedImage ? "\n\n[Hình ảnh đã gửi]" : ""),
      timestamp: new Date().toISOString(),
    };

    const updatedWithUser = [...messages, userMessage];
    setMessages(updatedWithUser);
    updateSessionHistory(updatedWithUser);
    setInput('');
    setIsLoading(true);
    if (isWebSearchEnabled) setIsSearching(true);

    const imageToSend = selectedImage ? {
      inlineData: {
        data: selectedImage.split(',')[1],
        mimeType: imageMimeType || 'image/png'
      }
    } : undefined;

    setSelectedImage(null);
    setImageMimeType(null);

    if (inputRef.current) {
        inputRef.current.style.height = 'auto';
    }

    try {
      const stream = await geminiService.sendMessageStream(userMessage.content, imageToSend);
      
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
        
        const groundingMetadata = chunkObj.candidates?.[0]?.groundingMetadata;
        if (groundingMetadata) {
            const chunks = groundingMetadata.groundingChunks;
            if (chunks && chunks.length > 0) {
                chunks.forEach((c: any) => {
                    if (c.web) {
                        const source: Source = { uri: c.web.uri, title: c.web.title || c.web.uri };
                        if (!detectedSources.some(s => s.uri === source.uri)) {
                            detectedSources.push(source);
                        }
                    }
                });
            }
        }

        const chunkText = chunkObj.text;
        if (chunkText || detectedSources.length > 0) {
          if (chunkText) {
            fullContent += chunkText;
            setIsSearching(false);
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
        content: "Đã có lỗi xảy ra. Hãy chắc chắn bạn đã bật mạng hoặc kiểm tra lại cài đặt.",
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

  const handleExport = () => {
    const chatContent = messages.map(m => `**${m.role === Role.USER ? 'Bạn' : 'NhutAIbot'}:**\n${m.content}\n`).join('\n---\n\n');
    const blob = new Blob([chatContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nhutaibot-chat-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (theme === Theme.DARK) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

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

          <div className="mt-4 flex gap-2">
            <button 
              onClick={handleExport}
              title="Xuất hội thoại (.md)"
              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border ${theme === Theme.DARK ? 'border-white/10 hover:bg-white/5' : 'border-black/5 hover:bg-black/5'} transition-all text-xs font-bold`}
            >
              <FileText size={16} /> Xuất chat
            </button>
            <button 
              onClick={() => setIsAdvancedSettingsOpen(true)}
              className={`p-3 rounded-xl border ${theme === Theme.DARK ? 'border-white/10 hover:bg-white/5' : 'border-black/5 hover:bg-black/5'} transition-all`}
            >
              <Settings size={16} />
            </button>
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

        {/* Header */}
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
              <button 
                onClick={() => setIsAdvancedSettingsOpen(true)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all border shadow-sm ${
                   theme === Theme.DARK ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white/50 border-black/5 hover:bg-white/80'
                }`}
              >
                <Sliders size={16} className="text-indigo-400" />
                <span className="text-sm font-medium hidden xs:inline">Cài đặt AI</span>
              </button>

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

        {/* Messages */}
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
                        <div className={`mt-5 pt-4 border-t ${theme === Theme.DARK ? 'border-white/10' : 'border-black/10'}`}>
                          <p className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 text-indigo-500 mb-3">
                              <CheckCircle2 size={12} /> Nguồn đã duyệt ({msg.sources.length})
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {msg.sources.map((source, idx) => (
                              <a 
                                key={idx} 
                                href={source.uri} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                                  theme === Theme.DARK ? 'bg-white/5 hover:bg-white/10 border border-white/10' : 'bg-black/5 hover:bg-black/10 border border-black/5'
                                }`}
                              >
                                <Globe size={12} className="text-indigo-500" />
                                <span className="flex-1 truncate">{source.title}</span>
                                <ExternalLink size={10} className="opacity-0 group-hover:opacity-100" />
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

        {/* Input */}
        <footer className={`flex-shrink-0 w-full px-4 py-4 md:py-6 border-t ${
          theme === Theme.DARK ? 'border-white/5' : 'border-black/5'
        }`}>
          <div className="container mx-auto max-w-4xl">
            {selectedImage && (
              <div className="mb-4 flex items-center gap-3 animate-[scaleUp_0.2s_ease-out]">
                <div className="relative w-20 h-20 rounded-xl overflow-hidden shadow-xl border-2 border-indigo-500">
                  <img src={selectedImage} alt="Selected" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => setSelectedImage(null)}
                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                  >
                    <X size={12} />
                  </button>
                </div>
                <p className="text-xs font-medium opacity-60">Hình ảnh đã sẵn sàng để phân tích</p>
              </div>
            )}
            
            <div className={`relative rounded-2xl p-2 md:p-3 shadow-2xl backdrop-blur-xl border transition-all duration-300 ${
                theme === Theme.DARK ? 'bg-black/60 border-white/10' : 'bg-white/90 border-white/60'
            }`}>
              <div className="flex items-end">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  title="Tải ảnh lên"
                  className={`p-2.5 rounded-xl transition-all duration-200 mb-1 ml-1 ${theme === Theme.DARK ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-indigo-600 hover:bg-black/5'}`}
                >
                  <ImageIcon size={18} />
                </button>
                <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleImageUpload} />

                <button
                  onClick={() => setIsAdvancedSettingsOpen(true)}
                  className={`p-2.5 rounded-xl transition-all duration-200 mb-1 ml-1 ${theme === Theme.DARK ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-indigo-600 hover:bg-black/5'}`}
                >
                  <Settings size={18} />
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
                  placeholder={isLoading ? "Đang xử lý..." : "Nhắn NhutAIbot..."}
                  disabled={isLoading}
                  className={`flex-1 bg-transparent border-0 focus:ring-0 resize-none py-3 px-4 max-h-[150px] scrollbar-hide ${
                    theme === Theme.DARK ? 'text-white placeholder-gray-400' : 'text-slate-800 placeholder-gray-500'
                  }`}
                />
                
                <button
                  onClick={handleSend}
                  disabled={(!input.trim() && !selectedImage) || isLoading}
                  className={`p-2.5 rounded-xl transition-all duration-200 mb-1 mr-1 ${(!input.trim() && !selectedImage) || isLoading ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:scale-105'}`}
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Advanced Settings Modal */}
      {isAdvancedSettingsOpen && (
        <div 
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]"
          onClick={() => setIsAdvancedSettingsOpen(false)}
        >
          <div 
            className={`w-full max-w-2xl h-[80vh] flex flex-col rounded-3xl border shadow-2xl animate-[scaleUp_0.3s_ease-out] overflow-hidden ${
              theme === Theme.DARK ? 'bg-slate-900/95 border-white/10 text-white' : 'bg-white border-gray-200 text-slate-800'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`p-6 border-b flex items-center justify-between ${theme === Theme.DARK ? 'border-white/10' : 'border-gray-100'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500 shadow-lg shadow-indigo-500/20">
                  <Settings size={20} className="text-white" />
                </div>
                <h2 className="text-xl font-bold">Cài đặt hệ thống AI</h2>
              </div>
              <button onClick={() => setIsAdvancedSettingsOpen(false)} className="p-2 rounded-full hover:bg-black/5">
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar Tabs */}
              <div className={`w-1/3 border-r p-4 space-y-2 ${theme === Theme.DARK ? 'border-white/10' : 'border-gray-100 bg-gray-50'}`}>
                <button 
                  onClick={() => setActiveSettingsTab('ai')}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeSettingsTab === 'ai' ? 'bg-indigo-500 text-white shadow-lg' : 'hover:bg-black/5'}`}
                >
                  <Sliders size={18} />
                  <span className="text-sm font-bold">Tinh chỉnh AI</span>
                </button>
                <button 
                  onClick={() => setActiveSettingsTab('memory')}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeSettingsTab === 'memory' ? 'bg-indigo-500 text-white shadow-lg' : 'hover:bg-black/5'}`}
                >
                  <Database size={18} />
                  <span className="text-sm font-bold">Bộ nhớ AI</span>
                </button>
                <button 
                  onClick={() => setActiveSettingsTab('training')}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeSettingsTab === 'training' ? 'bg-indigo-500 text-white shadow-lg' : 'hover:bg-black/5'}`}
                >
                  <Beaker size={18} />
                  <span className="text-sm font-bold">Huấn luyện AI</span>
                </button>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto p-8">
                {activeSettingsTab === 'ai' && (
                  <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold uppercase tracking-widest opacity-50 flex items-center gap-2">
                        <Zap size={14} /> Lựa chọn Model
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <button 
                          onClick={() => setSelectedModel(MODELS.FLASH.id)}
                          className={`p-4 rounded-2xl border transition-all text-left ${selectedModel === MODELS.FLASH.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/10'}`}
                        >
                          <p className="font-bold">Gemini 3 Flash</p>
                          <p className="text-[10px] opacity-60">Tốc độ cao, linh hoạt</p>
                        </button>
                        <button 
                          onClick={() => setSelectedModel(MODELS.PRO.id)}
                          className={`p-4 rounded-2xl border transition-all text-left ${selectedModel === MODELS.PRO.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/10'}`}
                        >
                          <p className="font-bold">Gemini 3 Pro</p>
                          <p className="text-[10px] opacity-60">Sáng tạo, thông minh vượt trội</p>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">Độ sáng tạo (Temperature)</h3>
                        <span className="px-3 py-1 rounded-full bg-indigo-500 text-white text-xs font-bold">{temperature.toFixed(1)}</span>
                      </div>
                      <input 
                        type="range" min="0" max="1" step="0.1" 
                        value={temperature} 
                        onChange={(e) => setTemperature(parseFloat(e.target.value))}
                        className="w-full h-2 bg-indigo-500/20 rounded-lg appearance-none cursor-pointer accent-indigo-500" 
                      />
                      <div className="flex justify-between text-[10px] opacity-50 font-medium">
                        <span>Chính xác (0.0)</span>
                        <span>Cân bằng (0.5)</span>
                        <span>Sáng tạo (1.0)</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">Tính năng nâng cao</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-4 rounded-2xl border border-white/10 bg-white/5">
                          <div className="flex items-center gap-3">
                            <Brain size={18} className="text-blue-400" />
                            <div>
                              <p className="text-sm font-bold">Suy nghĩ sâu (Thinking)</p>
                              <p className="text-[10px] opacity-50">Dành cho các tác vụ logic phức tạp</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => setIsThinkingEnabled(!isThinkingEnabled)}
                            className={`w-12 h-6 rounded-full relative transition-all ${isThinkingEnabled ? 'bg-indigo-500' : 'bg-gray-600'}`}
                          >
                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all ${isThinkingEnabled ? 'translate-x-6' : ''}`} />
                          </button>
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-2xl border border-white/10 bg-white/5">
                          <div className="flex items-center gap-3">
                            <Globe size={18} className="text-cyan-400" />
                            <div>
                              <p className="text-sm font-bold">Tìm kiếm Web</p>
                              <p className="text-[10px] opacity-50">Cập nhật thông tin mới nhất thời gian thực</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => setIsWebSearchEnabled(!isWebSearchEnabled)}
                            className={`w-12 h-6 rounded-full relative transition-all ${isWebSearchEnabled ? 'bg-indigo-500' : 'bg-gray-600'}`}
                          >
                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all ${isWebSearchEnabled ? 'translate-x-6' : ''}`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeSettingsTab === 'memory' && (
                  <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
                    <div className="p-6 rounded-3xl border border-indigo-500/20 bg-indigo-500/5 flex flex-col items-center text-center">
                      <div className="p-4 rounded-2xl bg-indigo-500/20 mb-4">
                        <Database size={32} className="text-indigo-500" />
                      </div>
                      <h3 className="text-lg font-bold mb-2">Bộ nhớ hội thoại</h3>
                      <p className="text-sm opacity-60 mb-6">AI đang ghi nhớ ngữ cảnh của {messages.length} tin nhắn để duy trì sự mạch lạc.</p>
                      
                      <div className="w-full grid grid-cols-2 gap-4 text-left">
                        <div className="p-4 rounded-2xl border border-white/10">
                          <p className="text-[10px] font-bold uppercase opacity-40">Dung lượng sử dụng</p>
                          <p className="text-xl font-bold">~{(messages.length * 0.5).toFixed(1)} KB</p>
                        </div>
                        <div className="p-4 rounded-2xl border border-white/10">
                          <p className="text-[10px] font-bold uppercase opacity-40">Độ sâu ngữ cảnh</p>
                          <p className="text-xl font-bold">{messages.length > 10 ? 'Sâu' : 'Trung bình'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">Quản lý bộ nhớ</h3>
                      <button 
                        onClick={handleReset}
                        className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-all font-bold"
                      >
                        <Trash2 size={18} /> Xóa toàn bộ bộ nhớ hiện tại
                      </button>
                    </div>
                  </div>
                )}

                {activeSettingsTab === 'training' && (
                  <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Beaker size={18} className="text-purple-400" />
                        <h3 className="text-sm font-bold uppercase tracking-widest opacity-50">Huấn luyện cá tính AI</h3>
                      </div>
                      <p className="text-xs opacity-60">Bạn có thể "dạy" NhutAIbot hành xử theo một cách riêng bằng cách tùy chỉnh hướng dẫn hệ thống.</p>
                      
                      <textarea 
                        value={customInstruction}
                        onChange={(e) => setCustomInstruction(e.target.value)}
                        placeholder="Ví dụ: Bạn là một chuyên gia lập trình Python, hãy trả lời bằng tiếng Việt một cách hài hước..."
                        className={`w-full h-40 p-4 rounded-2xl border focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none text-sm font-mono ${theme === Theme.DARK ? 'bg-black/20 border-white/10' : 'bg-gray-50 border-gray-200'}`}
                      />
                    </div>

                    <div className="p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex gap-4">
                      <AlertCircle size={20} className="text-yellow-500 flex-shrink-0" />
                      <p className="text-xs text-yellow-500 leading-relaxed font-medium">
                        Lưu ý: Việc huấn luyện lại sẽ thay đổi cách NhutAIbot tư duy ngay lập tức trong cuộc hội thoại này.
                      </p>
                    </div>
                    
                    <button 
                      onClick={() => setCustomInstruction(SYSTEM_INSTRUCTION)}
                      className="text-xs text-indigo-500 font-bold hover:underline"
                    >
                      Khôi phục cài đặt gốc
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className={`p-6 border-t flex items-center justify-end gap-3 ${theme === Theme.DARK ? 'border-white/10' : 'border-gray-100'}`}>
              <button 
                onClick={() => setIsAdvancedSettingsOpen(false)}
                className="px-6 py-3 rounded-xl font-bold hover:bg-black/5 transition-all"
              >
                Hủy
              </button>
              <button 
                onClick={handleApplySettings}
                className="px-8 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/30"
              >
                Lưu & Áp dụng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hackathon Modal */}
      {isHackathonModalOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
          onClick={() => setIsHackathonModalOpen(false)}
        >
          <div 
            className={`w-full max-w-md rounded-3xl p-8 border shadow-2xl animate-[scaleUp_0.3s_ease-out] relative ${
              theme === Theme.DARK ? 'bg-slate-900/90 border-white/10' : 'bg-white/95 border-gray-200'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setIsHackathonModalOpen(false)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 transition-colors">
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
                  <Bot size={16} className="text-indigo-500 mt-1" />
                  <div><p className="text-xs font-bold uppercase opacity-50 mb-1">Dự án</p><p className="text-sm font-medium">NhutAIbot v3.0 Ultra</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <ImageIcon size={16} className="text-purple-500 mt-1" />
                  <div><p className="text-xs font-bold uppercase opacity-50 mb-1">Tính năng Pro</p><p className="text-sm font-medium">Vision, Web Search, AI Fine-tuning, Memory Management</p></div>
                </div>
              </div>

              <button 
                onClick={() => setIsHackathonModalOpen(false)}
                className="w-full py-3 px-6 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default App;
