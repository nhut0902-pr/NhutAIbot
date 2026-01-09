export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: Date | string;
  isError?: boolean;
}

export interface ChatSessionData {
  id: string;
  title: string;
  messages: Message[];
  modelId: string;
  isThinkingEnabled: boolean;
  lastUpdated: string;
}

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark'
}

export interface ChatSessionConfig {
  systemInstruction?: string;
}