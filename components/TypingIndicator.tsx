
import React from 'react';

const TypingIndicator: React.FC = () => {
  return (
    <div className="flex items-center space-x-1 p-2">
      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s] shadow-[0_0_8px_#34d399]"></div>
      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s] shadow-[0_0_8px_#34d399]"></div>
      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce shadow-[0_0_8px_#34d399]"></div>
    </div>
  );
};

export default TypingIndicator;
