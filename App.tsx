import React, { useState, useEffect, useRef } from 'react';
import { Send, Moon, Sun, RotateCcw, Download, Bot, User, Cpu, Settings, Zap, Sparkles, Brain, X, ChevronDown } from 'lucide-react';
import { GenerateContentResponse } from "@google/genai";

import { Message, Role, Theme } from './types';
import { APP_NAME, INITIAL_GREETING, MODELS } from './constants';
import * as geminiService from './services/geminiService';
import MarkdownRenderer from './components/MarkdownRenderer';
import TypingIndicator from './components/TypingIndicator';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState<Theme>(Theme.DARK);
  
  // Settings State
  const [selectedModel, setSelectedModel] = useState(MODELS.FLASH.id);
  const [isThinkingEnabled, setIsThinkingEnabled] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize chat and theme
  useEffect(() => {
    // Initial setup with defaults
    geminiService.initializeChat(selectedModel, isThinkingEnabled ? 2048 : 0);
    
    // Set initial greeting
    setMessages([
      {
        id: 'init-1',
        role: Role.MODEL,
        content: INITIAL_GREETING,
        timestamp: new Date(),
      },
    ]);

    // Check system preference for theme
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      setTheme(Theme.LIGHT);
    }
  }, []); // Run once on mount

  // Re-initialize chat when settings change
  useEffect(() => {
    // Note: Changing settings resets the underlying Gemini session context
    geminiService.initializeChat(selectedModel, isThinkingEnabled ? 2048 : 0);
  }, [selectedModel, isThinkingEnabled]);

  // Theme effect
  useEffect(() => {
    if (theme === Theme.DARK) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Scroll to bottom effect
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === Theme.DARK ? Theme.LIGHT : Theme.DARK));
  };

  const handleReset = () => {
    geminiService.resetChat(selectedModel, isThinkingEnabled ? 2048 : 0);
    setMessages([
      {
        id: Date.now().toString(),
        role: Role.MODEL,
        content: INITIAL_GREETING,
        timestamp: new Date(),
      },
    ]);
  };

  const handleExport = () => {
    const exportText = messages
      .map((m) => `[${m.timestamp.toLocaleString()}] ${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');
    
    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${APP_NAME}-chat-export.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Reset textarea height
    if (inputRef.current) {
        inputRef.current.style.height = 'auto';
    }

    try {
      const stream = await geminiService.sendMessageStream(userMessage.content);
      
      const botMessageId = (Date.now() + 1).toString();
      let fullContent = '';

      // Initialize bot message
      setMessages((prev) => [
        ...prev,
        {
          id: botMessageId,
          role: Role.MODEL,
          content: '',
          timestamp: new Date(),
        },
      ]);

      for await (const chunk of stream) {
        const chunkText = (chunk as GenerateContentResponse).text;
        if (chunkText) {
          fullContent += chunkText;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMessageId ? { ...msg, content: fullContent } : msg
            )
          );
        }
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: Role.MODEL,
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date(),
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
      e.target.style.height = 'auto';
      e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
  };

  const handleModelSelect = (modelId: string) => {
    if (modelId !== selectedModel) {
      setSelectedModel(modelId);
      // Optional: auto-reset chat or show notification that context is reset
    }
  };

  return (
    <div className={`min-h-screen w-full transition-colors duration-300 flex flex-col ${
      theme === Theme.DARK 
        ? 'bg-gradient-to-br from-indigo-950 via-slate-900 to-black text-white' 
        : 'bg-gradient-to-br from-indigo-100 via-white to-purple-100 text-slate-800'
    }`}>
      
      {/* Header */}
      <header className={`sticky top-0 z-30 w-full px-4 md:px-6 py-4 flex items-center justify-between ${
          theme === Theme.DARK ? 'glass-panel border-b border-white/10' : 'light-mode-glass border-b border-white/40'
      }`}>
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${theme === Theme.DARK ? 'bg-indigo-600' : 'bg-indigo-500'} shadow-lg shadow-indigo-500/20`}>
                <Cpu size={24} className="text-white" />
            </div>
            <div className="hidden md:block">
              <h1 className="text-xl font-bold tracking-tight">{APP_NAME}</h1>
            </div>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-2">
            
            {/* Settings Toggle */}
            <div className="relative">
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors border ${
                  theme === Theme.DARK 
                    ? 'bg-white/5 border-white/10 hover:bg-white/10' 
                    : 'bg-white/50 border-black/5 hover:bg-white/80'
                }`}
              >
                {selectedModel === MODELS.FLASH.id ? <Zap size={16} className="text-yellow-400" /> : <Sparkles size={16} className="text-purple-400" />}
                <span className="text-sm font-medium hidden sm:inline">
                  {selectedModel === MODELS.FLASH.id ? 'Flash' : 'Pro'}
                </span>
                {isThinkingEnabled && <Brain size={14} className="text-blue-400 ml-1" />}
                <ChevronDown size={14} className={`transition-transform duration-200 ${isSettingsOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Settings Dropdown */}
              {isSettingsOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsSettingsOpen(false)}></div>
                  <div className={`absolute right-0 top-full mt-2 w-72 rounded-xl p-4 shadow-2xl z-20 border backdrop-blur-xl animate-[fadeIn_0.2s_ease-out] ${
                    theme === Theme.DARK 
                      ? 'bg-slate-900/95 border-white/10' 
                      : 'bg-white/95 border-gray-200'
                  }`}>
                    <div className="space-y-4">
                      {/* Model Selection */}
                      <div>
                        <h3 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${theme === Theme.DARK ? 'text-gray-400' : 'text-gray-500'}`}>Model</h3>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleModelSelect(MODELS.FLASH.id)}
                            className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${
                              selectedModel === MODELS.FLASH.id
                                ? (theme === Theme.DARK ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-200' : 'bg-indigo-50 border-indigo-200 text-indigo-700')
                                : (theme === Theme.DARK ? 'bg-white/5 border-transparent hover:bg-white/10' : 'bg-gray-50 border-transparent hover:bg-gray-100')
                            }`}
                          >
                            <Zap size={20} className={selectedModel === MODELS.FLASH.id ? 'text-yellow-400' : 'text-gray-400'} />
                            <span className="text-xs font-medium">Flash</span>
                          </button>
                          <button
                            onClick={() => handleModelSelect(MODELS.PRO.id)}
                            className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${
                              selectedModel === MODELS.PRO.id
                                ? (theme === Theme.DARK ? 'bg-purple-600/20 border-purple-500/50 text-purple-200' : 'bg-purple-50 border-purple-200 text-purple-700')
                                : (theme === Theme.DARK ? 'bg-white/5 border-transparent hover:bg-white/10' : 'bg-gray-50 border-transparent hover:bg-gray-100')
                            }`}
                          >
                            <Sparkles size={20} className={selectedModel === MODELS.PRO.id ? 'text-purple-400' : 'text-gray-400'} />
                            <span className="text-xs font-medium">Pro</span>
                          </button>
                        </div>
                      </div>

                      {/* Thinking Toggle */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className={`text-xs font-semibold uppercase tracking-wider ${theme === Theme.DARK ? 'text-gray-400' : 'text-gray-500'}`}>Thinking Mode</h3>
                          <button
                             onClick={() => setIsThinkingEnabled(!isThinkingEnabled)}
                             className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${
                               isThinkingEnabled 
                                 ? 'bg-blue-500' 
                                 : (theme === Theme.DARK ? 'bg-gray-700' : 'bg-gray-300')
                             }`}
                          >
                            <div className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full shadow-sm transition-transform duration-300 ${isThinkingEnabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                          </button>
                        </div>
                        <p className={`text-[10px] leading-relaxed ${theme === Theme.DARK ? 'text-gray-500' : 'text-gray-400'}`}>
                          Enables extended reasoning capabilities. Responses may take longer but will be more thorough.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className={`h-6 w-px mx-1 ${theme === Theme.DARK ? 'bg-white/20' : 'bg-black/10'}`}></div>

            <button 
                onClick={handleReset}
                title="Reset Conversation"
                className={`p-2 rounded-lg transition-colors ${
                    theme === Theme.DARK ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-black/5 text-gray-600'
                }`}
            >
                <RotateCcw size={20} />
            </button>
            <button 
                onClick={handleExport}
                title="Export Chat"
                className={`p-2 rounded-lg transition-colors ${
                    theme === Theme.DARK ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-black/5 text-gray-600'
                }`}
            >
                <Download size={20} />
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

      {/* Main Chat Area */}
      <main className="flex-1 container mx-auto max-w-4xl p-4 md:p-6 pb-32 flex flex-col gap-6 overflow-y-auto">
        {messages.map((msg, index) => {
            const isUser = msg.role === Role.USER;
            return (
                <div 
                    key={msg.id} 
                    className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} animate-[fadeIn_0.3s_ease-out]`}
                >
                    <div className={`flex max-w-[85%] md:max-w-[75%] gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                        {/* Avatar */}
                        <div className={`flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center mt-1 shadow-md
                            ${isUser 
                                ? 'bg-purple-600 text-white' 
                                : 'bg-indigo-600 text-white'
                            }`}>
                            {isUser ? <User size={18} /> : <Bot size={18} />}
                        </div>

                        {/* Bubble */}
                        <div className={`
                            relative px-5 py-3.5 rounded-2xl text-sm md:text-base shadow-lg
                            ${isUser 
                                ? (theme === Theme.DARK ? 'bg-purple-600/90 text-white' : 'bg-purple-600 text-white') + ' rounded-tr-sm' 
                                : (theme === Theme.DARK ? 'glass-panel text-gray-100' : 'light-mode-glass text-gray-800') + ' rounded-tl-sm'
                            }
                            ${msg.isError ? 'border border-red-500/50 bg-red-500/10' : ''}
                        `}>
                            {isUser ? (
                                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                            ) : (
                                <MarkdownRenderer content={msg.content} />
                            )}
                            
                            <span className={`text-[10px] absolute bottom-1 ${isUser ? 'left-2 text-purple-200' : 'right-2 opacity-50'}`}>
                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                </div>
            );
        })}
        
        {isLoading && (
            <div className="flex justify-start w-full animate-pulse">
                <div className="flex gap-3">
                     <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center mt-1 shadow-md">
                        <Bot size={18} />
                    </div>
                    <div className={`px-4 py-3 rounded-2xl rounded-tl-sm ${theme === Theme.DARK ? 'glass-panel' : 'light-mode-glass'}`}>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs opacity-70">
                                {isThinkingEnabled ? 'Thinking...' : 'Typing...'}
                            </span>
                          </div>
                          <TypingIndicator />
                        </div>
                    </div>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input Area */}
      <footer className="fixed bottom-0 w-full z-10 px-4 py-4 md:py-6">
        <div className="container mx-auto max-w-4xl">
            <div className={`relative rounded-2xl p-2 md:p-3 shadow-2xl backdrop-blur-xl border transition-all duration-300 ${
                theme === Theme.DARK 
                    ? 'bg-black/40 border-white/10 ring-1 ring-white/5' 
                    : 'bg-white/80 border-white/60 ring-1 ring-black/5'
            }`}>
                <textarea
                    ref={inputRef}
                    rows={1}
                    value={input}
                    onChange={handleInputResize}
                    onKeyDown={handleKeyDown}
                    placeholder={`Ask ${selectedModel === MODELS.FLASH.id ? 'Gemini Flash' : 'Gemini Pro'} anything...`}
                    className={`w-full bg-transparent border-0 focus:ring-0 resize-none py-3 pl-4 pr-12 max-h-[150px] scrollbar-hide ${
                        theme === Theme.DARK ? 'text-white placeholder-gray-400' : 'text-slate-800 placeholder-gray-500'
                    }`}
                />
                
                <button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className={`absolute right-3 bottom-3 p-2 rounded-xl transition-all duration-200 flex items-center justify-center
                        ${!input.trim() || isLoading 
                            ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-105 active:scale-95'
                        }`}
                >
                    <Send size={18} className={isLoading ? 'opacity-0' : 'opacity-100'} />
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        </div>
                    )}
                </button>
            </div>
            <p className={`text-center text-xs mt-3 ${theme === Theme.DARK ? 'text-gray-500' : 'text-gray-400'}`}>
                {selectedModel === MODELS.FLASH.id ? 'Flash' : 'Pro'} {isThinkingEnabled ? '+ Thinking' : ''} active. NhutAIbot can make mistakes.
            </p>
        </div>
      </footer>
    </div>
  );
};

export default App;