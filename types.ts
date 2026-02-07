
export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export enum Language {
  VI = 'vi',
  EN = 'en'
}

export interface Source {
  uri: string;
  title: string;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: Date | string;
  isError?: boolean;
  isImage?: boolean;
  sources?: Source[];
}

export interface ChatSessionData {
  id: string;
  title: string;
  messages: Message[];
  modelId: string;
  isThinkingEnabled: boolean;
  isWebSearchEnabled: boolean;
  temperature: number;
  customSystemInstruction?: string;
  language: Language;
  lastUpdated: string;
}

export interface SavedPrompt {
  id: string;
  title: string;
  content: string;
  category: string;
}

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark'
}

export type AccentColor = 'blue' | 'emerald' | 'rose' | 'amber' | 'purple';

export interface MemoryFact {
  id: string;
  text: string;
  timestamp: string;
}
