
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { MODELS, SYSTEM_INSTRUCTION } from '../constants';
import { Message, Role } from '../types';

let chatSession: Chat | null = null;
let aiInstance: GoogleGenAI | null = null;

const getAIInstance = (): GoogleGenAI => {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return aiInstance;
};

export const initializeChat = (
  modelId: string = MODELS.FLASH.id, 
  thinkingBudget: number = 0,
  history: Message[] = [],
  isWebSearchEnabled: boolean = false
): void => {
  const ai = getAIInstance();
  
  const config: any = {
    systemInstruction: SYSTEM_INSTRUCTION,
    temperature: 0.7,
  };

  if (thinkingBudget > 0) {
    config.thinkingConfig = { thinkingBudget };
  }

  if (isWebSearchEnabled) {
    config.tools = [{ googleSearch: {} }];
  }

  // Convert app messages to Gemini history format
  const geminiHistory = history.map(msg => ({
    role: msg.role === Role.USER ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));

  chatSession = ai.chats.create({
    model: modelId,
    config: config,
    history: geminiHistory,
  });
};

export const resetChat = (modelId: string, thinkingBudget: number, isWebSearchEnabled: boolean): void => {
  initializeChat(modelId, thinkingBudget, [], isWebSearchEnabled);
};

export const sendMessageStream = async (
  message: string
): Promise<AsyncGenerator<GenerateContentResponse, void, unknown>> => {
  if (!chatSession) {
    initializeChat();
  }
  
  if (!chatSession) {
    throw new Error("Không thể khởi tạo phiên chat với Gemini.");
  }

  try {
    const result = await chatSession.sendMessageStream({ message });
    return result;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
