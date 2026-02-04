
export const APP_NAME = "NhutAIbot";
export const HACKATHON_INFO = "Nhutcoder Hackathon 2025";

export const TRANSLATIONS = {
  vi: {
    greeting: "Chào mừng bạn đến với NhutAIbot! Mình có thể giúp gì cho bạn hôm nay?",
    newChat: "Cuộc hội thoại mới",
    history: "Lịch sử",
    settings: "Cài đặt AI",
    export: "Xuất chat",
    inputPlaceholder: "Nhắn NhutAIbot...",
    thinking: "Đang suy nghĩ...",
    searching: "Đang tìm kiếm nguồn tin...",
    aiSettings: "Cấu hình AI",
    fineTune: "Tinh chỉnh",
    memory: "Bộ nhớ",
    training: "Huấn luyện",
    model: "Mô hình",
    creativity: "Độ sáng tạo",
    thinkingMode: "Suy nghĩ sâu",
    webSearch: "Tìm kiếm Web",
    clearMemory: "Xóa bộ nhớ",
    systemPrompt: "Chỉ dẫn hệ thống",
    apply: "Áp dụng & Lưu",
    cancel: "Hủy",
    sources: "Nguồn đã duyệt",
    error: "Đã có lỗi xảy ra. Vui lòng thử lại.",
    author: "Tác giả"
  },
  en: {
    greeting: "Welcome to NhutAIbot! How can I assist you today?",
    newChat: "New Conversation",
    history: "History",
    settings: "AI Settings",
    export: "Export Chat",
    inputPlaceholder: "Message NhutAIbot...",
    thinking: "Thinking...",
    searching: "Searching web sources...",
    aiSettings: "AI System Settings",
    fineTune: "Fine-tune",
    memory: "Memory",
    training: "Training",
    model: "Model",
    creativity: "Creativity",
    thinkingMode: "Deep Thinking",
    webSearch: "Web Search",
    clearMemory: "Clear Memory",
    systemPrompt: "System Instruction",
    apply: "Apply & Save",
    cancel: "Cancel",
    sources: "Verified Sources",
    error: "An error occurred. Please try again.",
    author: "Author"
  }
};

export const getSystemInstruction = (lang: string) => {
  if (lang === 'en') {
    return `You are NhutAIbot, a professional AI assistant. Respond in English. Use Markdown. Be helpful and precise. Created by Nhutcoder.`;
  }
  return `Bạn là NhutAIbot, một trợ lý AI chuyên nghiệp. Trả lời bằng tiếng Việt. Sử dụng Markdown. Hãy hữu ích và chính xác. Được tạo bởi Nhutcoder.`;
};

export const MODELS = {
  FLASH: { id: "gemini-3-flash-preview", name: "Gemini 3 Flash" },
  PRO: { id: "gemini-3-pro-preview", name: "Gemini 3 Pro" }
};
