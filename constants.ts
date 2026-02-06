
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
    canvasDesc: "Làm việc trên văn bản và mã",
    language: "Ngôn ngữ",
    inputPlaceholder: "Nhắn NhutAIbot...",
    thinking: "Đang suy nghĩ...",
    thinkingMode: "Suy nghĩ sâu",
    searching: "Đang tìm kiếm nguồn tin...",
    error: "Đã có lỗi xảy ra. Vui lòng thử lại.",
    save: "Lưu",
    back: "Quay lại",
    privacy: "Quyền riêng tư",
    privacyTitle: "Chính sách Quyền riêng tư NhutAIbot",
    privacyHackathon: "NhutAIbot được tạo ra để tham gia Nhutcoder Hackathon 2025.",
    privacyContent: "Dữ liệu được lưu trữ cục bộ (Local Storage). Chúng tôi không lưu trữ dữ liệu cá nhân trên máy chủ riêng.",
    modes: {
      standard: "Tiêu chuẩn",
      learning: "Học tập",
      coder: "Coder Mode",
      assistant: "Trợ lý AI"
    },
    safetyNotice: "Nếu không chắc chắn, NhutAIbot sẽ nói rõ thay vì bịa đặt.",
    dismiss: "Đã hiểu"
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
    canvasDesc: "Collaborate on text and code",
    language: "Language",
    inputPlaceholder: "Message NhutAIbot...",
    thinking: "Thinking...",
    thinkingMode: "Deep Thinking",
    searching: "Searching web sources...",
    error: "An error occurred. Please try again.",
    save: "Save",
    back: "Back",
    privacy: "Privacy",
    privacyTitle: "NhutAIbot Privacy Policy",
    privacyHackathon: "NhutAIbot was created for Nhutcoder Hackathon 2025.",
    privacyContent: "Data is stored locally (Local Storage). We do not store personal data on private servers.",
    modes: {
      standard: "Standard",
      learning: "Learning",
      coder: "Coder Mode",
      assistant: "AI Assistant"
    },
    safetyNotice: "If unsure, NhutAIbot will clarify rather than hallucinate.",
    dismiss: "Got it"
  }
};

export const getSystemInstruction = (lang: string, mode: string = 'standard', facts: string[] = [], custom?: string) => {
  const memoryContext = facts.length > 0 ? `\n\nLONG-TERM MEMORY ABOUT THE USER:\n- ${facts.join('\n- ')}` : '';
  const customContext = custom ? `\n\nUSER CUSTOM INSTRUCTIONS:\n${custom}` : '';
  
  let modeInstruction = "";
  if (mode === 'learning') {
    modeInstruction = lang === 'vi' 
      ? "\nCHẾ ĐỘ HỌC TẬP: Giải thích từng bước, tạo quiz/flashcard, hướng dẫn lộ trình học."
      : "\nLEARNING MODE: Explain step-by-step, create quizzes, and provide learning roadmaps.";
  } else if (mode === 'coder') {
    modeInstruction = lang === 'vi'
      ? "\nCODER MODE: Highlight code, debug lỗi, giải thích code dòng nào sai. Ưu tiên độ chính xác cao."
      : "\nCODER MODE: Highlight code, debug errors, explain logic. Prioritize technical precision.";
  } else if (mode === 'assistant') {
    modeInstruction = lang === 'vi'
      ? "\nTRỢ LÝ AI: Tóm tắt nội dung dài, viết lại cho dễ hiểu, lập kế hoạch và gợi ý ý tưởng."
      : "\nAI ASSISTANT: Summarize content, rewrite for clarity, create plans and suggest ideas.";
  }

  const safetyRules = lang === 'vi'
    ? "\nQUY TẮC AN TOÀN: Khi không chắc chắn -> nói rõ. Không bịa đặt thông tin."
    : "\nSAFETY RULES: If unsure -> clarify. Do not hallucinate.";

  const base = lang === 'en' 
    ? "You are NhutAIbot, a pro AI assistant. Use Markdown."
    : "Bạn là NhutAIbot, trợ lý AI chuyên nghiệp. Sử dụng Markdown.";

  return `${base}${modeInstruction}${customContext}${memoryContext}${safetyRules}`;
};

export const MODELS = {
  FLASH: { id: "gemini-3-flash-preview", name: "Gemini 3 Flash" },
  PRO: { id: "gemini-3-pro-preview", name: "Gemini 3 Pro" }
};
