
export const APP_NAME = "NhutAIbot";
export const HACKATHON_INFO = "Nhutcoder Hackathon 2025";

export const TRANSLATIONS = {
  vi: {
    greeting: "Chào mừng bạn đến với NhutAIbot! Mình có thể giúp gì cho bạn hôm nay?",
    newChat: "Cuộc hội thoại mới",
    history: "Lịch sử",
    settings: "Cài đặt AI",
    personalization: "Cá nhân hóa",
    nickname: "Biệt danh của bạn",
    job: "Nghề nghiệp của bạn",
    extraInfo: "Thêm thông tin về bạn",
    traits: "Đặc điểm",
    addTraits: "Thêm đặc điểm",
    customInstructions: "Hướng dẫn tùy chỉnh",
    memory: "Bộ nhớ",
    advanced: "Nâng cao",
    webSearch: "Tìm kiếm web",
    webSearchDesc: "Tìm kiếm web để tìm câu trả lời",
    codeExecution: "Mã",
    codeExecutionDesc: "Thực thi mã bằng Trình thông dịch mã",
    canvas: "Canvas",
    canvasDesc: "Cùng với NhutAIbot làm việc trên văn bản và mã",
    language: "Ngôn ngữ",
    inputPlaceholder: "Nhắn NhutAIbot...",
    thinking: "Đang suy nghĩ...",
    searching: "Đang tìm kiếm nguồn tin...",
    error: "Đã có lỗi xảy ra. Vui lòng thử lại.",
    save: "Lưu",
    back: "Quay lại",
    privacy: "Quyền riêng tư",
    privacyTitle: "Chính sách Quyền riêng tư NhutAIbot",
    privacyHackathon: "NhutAIbot được tạo ra nhằm mục đích tham gia cuộc thi Nhutcoder Hackathon 2025.",
    privacyContent: "Chúng tôi tôn trọng quyền riêng tư của bạn. Mọi dữ liệu hội thoại của bạn được lưu trữ cục bộ trên trình duyệt của bạn (Local Storage) và chỉ được gửi đến API Google Gemini để xử lý phản hồi. Chúng tôi không lưu trữ dữ liệu cá nhân của bạn trên bất kỳ máy chủ riêng nào."
  },
  en: {
    greeting: "Welcome to NhutAIbot! How can I assist you today?",
    newChat: "New Conversation",
    history: "History",
    settings: "AI Settings",
    personalization: "Personalization",
    nickname: "Your nickname",
    job: "Your profession",
    extraInfo: "Add info about you",
    traits: "Traits",
    addTraits: "Add traits",
    customInstructions: "Custom instructions",
    memory: "Memory",
    advanced: "Advanced",
    webSearch: "Web search",
    webSearchDesc: "Search the web for answers",
    codeExecution: "Code",
    codeExecutionDesc: "Execute code using Code Interpreter",
    canvas: "Canvas",
    canvasDesc: "Collaborate with NhutAIbot on text and code",
    language: "Language",
    inputPlaceholder: "Message NhutAIbot...",
    thinking: "Thinking...",
    searching: "Searching web sources...",
    error: "An error occurred. Please try again.",
    save: "Save",
    back: "Back",
    privacy: "Privacy",
    privacyTitle: "NhutAIbot Privacy Policy",
    privacyHackathon: "NhutAIbot was created for the purpose of participating in Nhutcoder Hackathon 2025.",
    privacyContent: "We respect your privacy. All your conversation data is stored locally on your browser (Local Storage) and only sent to the Google Gemini API to process responses. We do not store your personal data on any private servers."
  }
};

export const getSystemInstruction = (lang: string, facts: string[] = [], custom?: string) => {
  const memoryContext = facts.length > 0 ? `\n\nLONG-TERM MEMORY ABOUT THE USER:\n- ${facts.join('\n- ')}` : '';
  const customContext = custom ? `\n\nUSER CUSTOM INSTRUCTIONS:\n${custom}` : '';
  
  const mermaidStrict = `
  MERMAID RULES:
  - ALWAYS start with a valid type (e.g., 'graph TD', 'sequenceDiagram').
  - DO NOT use unescaped special characters inside node labels.
  - DO NOT include the word "mermaid" inside the code block itself.
  `;

  if (lang === 'en') {
    return `You are NhutAIbot, a professional AI assistant. Respond in English. Use Markdown. Be helpful and precise.${customContext}${memoryContext}\n${mermaidStrict}`;
  }
  return `Bạn là NhutAIbot, một trợ lý AI chuyên nghiệp. Trả lời bằng tiếng Việt. Sử dụng Markdown. Hãy hữu ích và chính xác.${customContext}${memoryContext}\n${mermaidStrict}`;
};

export const MODELS = {
  FLASH: { id: "gemini-3-flash-preview", name: "Gemini 3 Flash" },
  PRO: { id: "gemini-3-pro-preview", name: "Gemini 3 Pro" }
};
