
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { MODELS, getSystemInstruction } from '../constants';
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
  isWebSearchEnabled: boolean = false,
  isCodeExecutionEnabled: boolean = false,
  temperature: number = 0.7,
  customSystemInstruction?: string
): void => {
  const ai = getAIInstance();
  
  const tools: any[] = [];
  if (isWebSearchEnabled) {
    tools.push({ googleSearch: {} });
  }
  if (isCodeExecutionEnabled) {
    tools.push({ codeExecution: {} });
  }

  const config: any = {
    systemInstruction: customSystemInstruction || getSystemInstruction('vi'),
    temperature: temperature,
    tools: tools.length > 0 ? tools : undefined,
  };

  if (thinkingBudget > 0) {
    config.thinkingConfig = { thinkingBudget };
  }

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

export const resetChat = (
  modelId: string, 
  thinkingBudget: number, 
  isWebSearchEnabled: boolean,
  isCodeExecutionEnabled: boolean,
  temperature: number,
  customSystemInstruction?: string
): void => {
  initializeChat(modelId, thinkingBudget, [], isWebSearchEnabled, isCodeExecutionEnabled, temperature, customSystemInstruction);
};

export const sendMessageStream = async (
  message: string,
  imagePart?: { inlineData: { data: string, mimeType: string } }
): Promise<AsyncGenerator<GenerateContentResponse, void, unknown>> => {
  if (!chatSession) {
    initializeChat();
  }
  
  if (!chatSession) {
    throw new Error("Không thể khởi tạo phiên chat với Gemini.");
  }

  try {
    const parts: any[] = [{ text: message }];
    if (imagePart) {
      parts.push(imagePart);
    }
    
    const result = await chatSession.sendMessageStream({ message: parts });
    return result;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
