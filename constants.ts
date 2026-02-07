
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
    codeExecution: "Thực thi mã",
    codeExecutionDesc: "Bot tự chạy mã để giải quyết vấn đề phức tạp",
    canvas: "Canvas",
    canvasDesc: "Làm việc trên văn bản và mã",
    terminal: "Terminal ảo",
    terminalDesc: "Chạy lệnh và cài đặt script",
    language: "Ngôn ngữ",
    inputPlaceholder: "Nhắn NhutAIbot...",
    thinking: "Đang suy nghĩ...",
    checkAnswer: "Đang tự kiểm tra câu trả lời...",
    suggesting: "Đang tạo gợi ý tiếp theo...",
    thinkingMode: "Suy nghĩ sâu",
    searching: "Đang tìm kiếm nguồn tin...",
    error: "Đã có lỗi xảy ra. Vui lòng thử lại.",
    save: "Lưu",
    back: "Quay lại",
    privacy: "Quyền riêng tư",
    privacyTitle: "Chính sách Quyền riêng tư NhutAIbot",
    privacyHackathon: "NhutAIbot được tạo ra để tham gia Nhutcoder Hackathon 2025.",
    privacyContent: "Dữ liệu được lưu trữ cục bộ (Local Storage). Chúng tôi không lưu trữ dữ liệu cá nhân trên máy chủ riêng.",
    library: "Thư viện Prompt",
    addPrompt: "Thêm mẫu câu",
    promptTitle: "Tiêu đề",
    promptContent: "Nội dung lệnh",
    promptCategory: "Danh mục",
    usePrompt: "Sử dụng",
    delete: "Xóa",
    modes: {
      standard: "Tiêu chuẩn",
      learning: "Học tập + Bài tập",
      coder: "Code Interpreter",
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
    codeExecution: "Code Execution",
    codeExecutionDesc: "Bot runs code to solve complex problems",
    canvas: "Canvas",
    canvasDesc: "Collaborate on text and code",
    terminal: "Virtual Terminal",
    terminalDesc: "Run commands and install scripts",
    language: "Language",
    inputPlaceholder: "Message NhutAIbot...",
    thinking: "Thinking...",
    checkAnswer: "Self-checking answer...",
    suggesting: "Generating suggestions...",
    thinkingMode: "Deep Thinking",
    searching: "Searching web sources...",
    error: "An error occurred. Please try again.",
    save: "Save",
    back: "Back",
    privacy: "Privacy",
    privacyTitle: "NhutAIbot Privacy Policy",
    privacyHackathon: "NhutAIbot was created for Nhutcoder Hackathon 2025.",
    privacyContent: "Data is stored locally (Local Storage). We do not store personal data on private servers.",
    library: "Prompt Library",
    addPrompt: "Add Prompt",
    promptTitle: "Title",
    promptContent: "Prompt Content",
    promptCategory: "Category",
    usePrompt: "Use",
    delete: "Delete",
    modes: {
      standard: "Standard",
      learning: "Tutor + Exercises",
      coder: "Code Interpreter",
      assistant: "AI Assistant"
    },
    safetyNotice: "If unsure, NhutAIbot will clarify rather than hallucinate.",
    dismiss: "Got it"
  }
};

export const getSystemInstruction = (lang: string, mode: string = 'standard', facts: string[] = [], custom?: string) => {
  const memoryContext = facts.length > 0 ? `\n\nLONG-TERM MEMORY ABOUT THE USER:\n- ${facts.join('\n- ')}` : '';
  const customContext = custom ? `\n\nUSER CUSTOM INSTRUCTIONS:\n${custom}` : '';
  
  // Logic Self-Check và Auto Suggest
  const qualityControl = lang === 'vi'
    ? "\n\nQUY TRÌNH KIỂM SOÁT CHẤT LƯỢNG (SELF-CHECK & AUTO-SUGGEST):" +
      "\n1. SELF-CHECK: Trước khi đưa ra câu trả lời cuối cùng, hãy tự rà soát lại thông tin. Nếu không chắc chắn về sự thật, hãy nói rõ 'Tôi không chắc chắn' thay vì bịa đặt." +
      "\n2. AUTO-SUGGEST: Ở CUỐI câu trả lời, hãy LUÔN LUÔN đưa ra 3 gợi ý ngắn gọn để người dùng có thể hỏi tiếp. Định dạng như sau:\n\n**Gợi ý tiếp theo:**\n- [Gợi ý 1]\n- [Gợi ý 2]\n- [Gợi ý 3]"
    : "\n\nQUALITY CONTROL PROCESS (SELF-CHECK & AUTO-SUGGEST):" +
      "\n1. SELF-CHECK: Before outputting, verify your facts. If unsure, explicitly state it rather than hallucinating." +
      "\n2. AUTO-SUGGEST: AT THE END of your response, ALWAYS provide 3 short, relevant follow-up options. Format as:\n\n**Suggested next steps:**\n- [Suggestion 1]\n- [Suggestion 2]\n- [Suggestion 3]";

  let modeInstruction = "";
  if (mode === 'learning') {
    modeInstruction = lang === 'vi' 
      ? "\nCHẾ ĐỘ HỌC TẬP (CÓ BÀI TẬP): Bạn là một giáo viên tương tác. Sau khi giải thích một khái niệm, hãy CHỦ ĐỘNG ra một bài tập nhỏ hoặc câu hỏi kiểm tra cho người dùng. Khi họ trả lời, hãy CHẤM ĐIỂM, chỉ ra lỗi sai và gợi ý cách sửa. Hãy tạo không khí học tập sôi nổi."
      : "\nLEARNING MODE (WITH EXERCISES): You are an interactive tutor. After explaining a concept, PROACTIVELY give a small exercise or test question to the user. When they answer, GRADE it, point out mistakes, and suggest corrections. Keep the learning atmosphere engaging.";
  } else if (mode === 'coder') {
    modeInstruction = lang === 'vi'
      ? "\nCHẾ ĐỘ CODE INTERPRETER: Bạn có quyền thực thi mã Python. Hãy sử dụng công cụ `codeExecution` để giải các bài toán, xử lý dữ liệu Excel/CSV, vẽ biểu đồ hoặc kiểm tra thuật toán một cách thực tế. Luôn chạy thử mã để đảm bảo kết quả chính xác trước khi trả lời."
      : "\nCODE INTERPRETER MODE: You have the ability to execute Python code. Use the `codeExecution` tool to solve math problems, process Excel/CSV data, create charts, or test algorithms realistically. Always run the code to ensure accuracy before responding.";
  } else if (mode === 'assistant') {
    modeInstruction = lang === 'vi'
      ? "\nTRỢ LÝ AI: Tóm tắt nội dung dài, viết lại cho dễ hiểu, lập kế hoạch và gợi ý ý tưởng chuyên sâu."
      : "\nAI ASSISTANT: Summarize long content, rewrite for clarity, create detailed plans, and suggest deep ideas.";
  }

  const base = lang === 'en' 
    ? "You are NhutAIbot, a pro AI assistant powered by Gemini 3. Use Markdown."
    : "Bạn là NhutAIbot, trợ lý AI chuyên nghiệp được hỗ trợ bởi Gemini 3. Sử dụng Markdown.";

  return `${base}${modeInstruction}${qualityControl}${customContext}${memoryContext}`;
};

export const MODELS = {
  FLASH: { id: "gemini-3-flash-preview", name: "Gemini 3 Flash" },
  PRO: { id: "gemini-3-pro-preview", name: "Gemini 3 Pro" }
};
