export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: Date;
  isError?: boolean;
}

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark'
}

export interface ChatSessionConfig {
  systemInstruction?: string;
}