import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { MODELS, SYSTEM_INSTRUCTION } from '../constants';

let chatSession: Chat | null = null;
let aiInstance: GoogleGenAI | null = null;

const getAIInstance = (): GoogleGenAI => {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return aiInstance;
};

export const initializeChat = (modelId: string = MODELS.FLASH.id, thinkingBudget: number = 0): void => {
  const ai = getAIInstance();
  
  const config: any = {
    systemInstruction: SYSTEM_INSTRUCTION,
  };

  if (thinkingBudget > 0) {
    config.thinkingConfig = { thinkingBudget };
  }

  chatSession = ai.chats.create({
    model: modelId,
    config: config,
  });
};

export const resetChat = (modelId: string, thinkingBudget: number): void => {
  initializeChat(modelId, thinkingBudget);
};

export const sendMessageStream = async (
  message: string
): Promise<AsyncGenerator<GenerateContentResponse, void, unknown>> => {
  if (!chatSession) {
    // Fallback to default if not initialized
    initializeChat();
  }
  
  if (!chatSession) {
    throw new Error("Failed to initialize chat session");
  }

  try {
    const result = await chatSession.sendMessageStream({ message });
    return result;
  } catch (error) {
    console.error("Error sending message to Gemini:", error);
    throw error;
  }
};