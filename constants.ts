
export const APP_NAME = "NhutAIbot";
export const HACKATHON_INFO = "Nhutcoder Hackathon 2025";

export const ACCENT_COLORS: Record<string, string> = {
  blue: '#3b82f6',
  emerald: '#10b981',
  rose: '#f43f5e',
  amber: '#f59e0b',
  purple: '#a855f7'
};

export const TRANSLATIONS = {
  vi: {
    greeting: "Chào mừng bạn đến với NhutAIbot Ultimate! Mình có thể giúp gì cho bạn hôm nay?",
    newChat: "Cuộc hội thoại mới",
    history: "Lịch sử",
    settings: "Cài đặt AI",
    personalization: "Cá nhân hóa",
    nickname: "Biệt danh của bạn",
    job: "Nghề nghiệp của bạn",
    memory: "Trình quản lý bộ nhớ",
    memoryDesc: "Những điều AI ghi nhớ về bạn để phục vụ tốt hơn.",
    accent: "Màu chủ đạo",
    export: "Xuất chat",
    stt: "Giọng nói",
    tts: "Phát âm",
    imageGen: "Tạo ảnh",
    language: "Ngôn ngữ",
    inputPlaceholder: "Nhắn NhutAIbot... (Ctrl+Enter để gửi)",
    thinking: "Đang suy nghĩ...",
    checkAnswer: "Đang tự kiểm tra...",
    suggesting: "Đang gợi ý...",
    library: "Thư viện Prompt (Ctrl+K)",
    addPrompt: "Thêm mẫu câu",
    save: "Lưu",
    back: "Quay lại",
    delete: "Xóa",
    modes: {
      standard: "Tiêu chuẩn",
      learning: "Học tập",
      coder: "Lập trình",
      assistant: "Trợ lý"
    },
    // Added missing error message translation
    error: "Có lỗi xảy ra khi kết nối với AI. Vui lòng thử lại!"
  },
  en: {
    greeting: "Welcome to NhutAIbot Ultimate! How can I assist you today?",
    newChat: "New Chat",
    history: "History",
    settings: "Settings",
    personalization: "Personalization",
    nickname: "Nickname",
    job: "Job",
    memory: "Memory Manager",
    memoryDesc: "Things the AI remembers to serve you better.",
    accent: "Accent Color",
    export: "Export Chat",
    stt: "Voice Input",
    tts: "Read Aloud",
    imageGen: "Image Gen",
    language: "Language",
    inputPlaceholder: "Message NhutAIbot... (Ctrl+Enter to send)",
    thinking: "Thinking...",
    checkAnswer: "Checking...",
    suggesting: "Suggesting...",
    library: "Prompt Library (Ctrl+K)",
    addPrompt: "Add Prompt",
    save: "Save",
    back: "Back",
    delete: "Delete",
    modes: {
      standard: "Standard",
      learning: "Learning",
      coder: "Coding",
      assistant: "Assistant"
    },
    // Added missing error message translation
    error: "An error occurred while connecting to AI. Please try again!"
  }
};

export const getSystemInstruction = (lang: string, mode: string = 'standard', facts: string[] = [], custom?: string) => {
  const memoryContext = facts.length > 0 ? `\n\nTHÔNG TIN BẠN ĐÃ GHI NHỚ VỀ NGƯỜI DÙNG:\n- ${facts.join('\n- ')}` : '';
  
  const mermaidInstruction = "\n\nDIAGRAM SUPPORT: Nếu người dùng yêu cầu vẽ sơ đồ, mindmap hoặc flowchart, hãy sử dụng Mermaid.js code blocks với cú pháp: ```mermaid ... ```";
  
  const qualityControl = lang === 'vi'
    ? "\n\nQUY TRÌNH KIỂM SOÁT: Tự rà soát sự thật. Cuối câu trả lời LUÔN gợi ý 3 bước tiếp theo dưới dạng:\n\n**Gợi ý tiếp theo:**\n- [Gợi ý 1]\n- [Gợi ý 2]\n- [Gợi ý 3]"
    : "\n\nQUALITY CONTROL: Verify facts. Always end with 3 follow-up suggestions as:\n\n**Suggested next steps:**\n- [Suggestion 1]\n- [Suggestion 2]\n- [Suggestion 3]";

  const base = lang === 'en' 
    ? "You are NhutAIbot Ultimate. Use Markdown. You can generate images using the tool. You can solve math and run code."
    : "Bạn là NhutAIbot Ultimate. Sử dụng Markdown. Bạn có thể tạo ảnh nghệ thuật, giải toán và chạy mã code chuyên nghiệp.";

  return `${base}${mermaidInstruction}${qualityControl}${custom || ''}${memoryContext}`;
};

export const MODELS = {
  FLASH: { id: "gemini-3-flash-preview", name: "Gemini 3 Flash" },
  PRO: { id: "gemini-3-pro-preview", name: "Gemini 3 Pro" },
  IMAGE: { id: "gemini-2.5-flash-image", name: "Image Engine" }
};