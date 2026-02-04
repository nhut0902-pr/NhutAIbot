
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
    author: "Tác giả",
    library: "Thư viện Prompt",
    share: "Chia sẻ",
    run: "Chạy thử",
    longTermMemory: "Ghi nhớ dài hạn",
    factsKnown: "Sự thật AI biết về bạn"
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
    author: "Author",
    library: "Prompt Library",
    share: "Share",
    run: "Run Sandbox",
    longTermMemory: "Long-term Memory",
    factsKnown: "AI Knowledge about you"
  }
};

export const PROMPT_LIBRARY = [
  {
    id: 'expert-coder',
    icon: 'Code',
    title: { vi: 'Chuyên gia Lập trình', en: 'Expert Coder' },
    prompt: 'You are an expert software architect and developer. Provide clean, optimized, and secure code. Explain complex logic simply. Use mermaid diagrams to visualize system architecture if applicable.'
  },
  {
    id: 'creative-writer',
    icon: 'PenTool',
    title: { vi: 'Nhà văn Sáng tạo', en: 'Creative Writer' },
    prompt: 'You are a multi-award winning creative writer. Use rich metaphors, engaging pacing, and vivid descriptions. Help me expand on characters or plot points.'
  },
  {
    id: 'english-tutor',
    icon: 'Languages',
    title: { vi: 'Gia sư Tiếng Anh', en: 'English Tutor' },
    prompt: 'You are a friendly English teacher. Correct my grammar, explain new vocabulary in context, and help me practice natural conversation. Provide feedback after each response.'
  },
  {
    id: 'data-analyst',
    icon: 'BarChart3',
    title: { vi: 'Chuyên gia Dữ liệu', en: 'Data Analyst' },
    prompt: 'You are a senior data scientist. Help me interpret data, suggest statistical methods, and visualize trends using mermaid charts when possible.'
  }
];

export const getSystemInstruction = (lang: string, facts: string[] = []) => {
  const memoryContext = facts.length > 0 ? `\n\nLONG-TERM MEMORY ABOUT THE USER:\n- ${facts.join('\n- ')}` : '';
  
  const mermaidStrict = `
  MERMAID RULES:
  - ALWAYS start with a valid type (e.g., 'graph TD', 'sequenceDiagram', 'pie', 'gantt').
  - DO NOT use unescaped special characters (like parentheses or quotes) inside node labels unless wrapped in "".
  - Keep it simple and robust. Use 'graph TD' for general flows.
  - DO NOT include the word "mermaid" inside the code block itself.
  `;

  if (lang === 'en') {
    return `You are NhutAIbot, a professional AI assistant. Respond in English. Use Markdown. Be helpful and precise.
    VISUAL THINKING: When explaining complex systems, ALWAYS use Mermaid diagrams (wrapped in \`\`\`mermaid code blocks). ${mermaidStrict}
    CODING: When providing code, prefer high-quality, modern syntax.${memoryContext}`;
  }
  return `Bạn là NhutAIbot, một trợ lý AI chuyên nghiệp. Trả lời bằng tiếng Việt. Sử dụng Markdown. Hãy hữu ích và chính xác.
  TRỰC QUAN HÓA: Khi giải thích các hệ thống phức tạp, hãy LUÔN sử dụng sơ đồ Mermaid (bao quanh bởi khối code \`\`\`mermaid). ${mermaidStrict}
  LẬP TRÌNH: Cung cấp code chất lượng cao, cú pháp hiện đại.${memoryContext}`;
};

export const MODELS = {
  FLASH: { id: "gemini-3-flash-preview", name: "Gemini 3 Flash" },
  PRO: { id: "gemini-3-pro-preview", name: "Gemini 3 Pro" }
};
