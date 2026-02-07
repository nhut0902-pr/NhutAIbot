
import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, ExternalLink, Play, Maximize2 } from 'lucide-react';
// @ts-ignore
import mermaid from 'mermaid';

interface MarkdownRendererProps {
  content: string;
  onRunCode?: (code: string, language: string) => void;
}

const MermaidBlock: React.FC<{ code: string }> = ({ code }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) {
      mermaid.initialize({ startOnLoad: true, theme: 'dark', securityLevel: 'loose' });
      mermaid.render(`mermaid-${Math.random().toString(36).substr(2, 9)}`, code).then((result: any) => {
        if (ref.current) ref.current.innerHTML = result.svg;
      });
    }
  }, [code]);
  return <div ref={ref} className="bg-white/5 p-4 rounded-2xl my-4 flex justify-center overflow-x-auto" />;
};

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, onRunCode }) => {
  const [copiedIndex, setCopiedIndex] = React.useState<string | null>(null);

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className="max-w-none prose dark:prose-invert prose-p:leading-relaxed prose-pre:bg-gray-50 dark:prose-pre:bg-gray-950 prose-pre:rounded-2xl prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-gray-800"
      components={{
        code({ inline, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || '');
          const lang = match ? match[1].toLowerCase() : '';
          const codeString = String(children).replace(/\n$/, '');
          const id = Math.random().toString(36).substr(2, 9);
          
          if (lang === 'mermaid') return <MermaidBlock code={codeString} />;

          const isRunnable = ['html', 'python', 'javascript', 'js', 'css'].includes(lang);

          return !inline && match ? (
            <div className="relative group my-4">
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                {isRunnable && onRunCode && (
                  <button onClick={() => onRunCode(codeString, lang)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 shadow-lg text-xs font-bold">
                    <Play size={12} fill="currentColor" /> Chạy
                  </button>
                )}
                <button onClick={() => handleCopy(codeString, id)} className="p-2 bg-white/10 backdrop-blur-md rounded-lg hover:bg-white/20">
                  {copiedIndex === id ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                </button>
              </div>
              <pre className="p-5 overflow-x-auto">
                <code className={className} {...props}>{children}</code>
              </pre>
            </div>
          ) : (
            <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-blue-500 font-medium" {...props}>
              {children}
            </code>
          );
        },
        a({ href, children }) {
          return <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline inline-flex items-center gap-1 font-medium">{children} <ExternalLink size={12} /></a>;
        }
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export default MarkdownRenderer;
