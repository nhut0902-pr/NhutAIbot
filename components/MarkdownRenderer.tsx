import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className="prose prose-sm max-w-none dark:prose-invert"
      components={{
        code({ inline, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || '');
          const codeString = String(children).replace(/\n$/, '');
          const id = Math.random().toString(36).substr(2, 9);

          return !inline && match ? (
            <div className="relative group my-4 rounded-lg overflow-hidden border border-white/10 bg-black/30">
              <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
                <span className="text-xs text-gray-400 font-mono uppercase">{match[1]}</span>
                <button
                  onClick={() => handleCopy(codeString, id)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
                  aria-label="Copy code"
                >
                  {copiedIndex === id ? (
                    <>
                      <Check size={14} className="text-green-400" />
                      <span className="text-green-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <div className="p-4 overflow-x-auto">
                <code className={`${className} font-mono text-sm`} {...props}>
                  {children}
                </code>
              </div>
            </div>
          ) : (
            <code className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-sm" {...props}>
              {children}
            </code>
          );
        },
        p({ children }) {
          return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>;
        },
        ul({ children }) {
            return <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>;
        },
        ol({ children }) {
            return <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>;
        },
        a({ href, children }) {
            return <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{children}</a>
        }
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export default MarkdownRenderer;