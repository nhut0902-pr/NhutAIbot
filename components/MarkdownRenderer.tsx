
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, Play, ExternalLink, X, AlertCircle } from 'lucide-react';
import mermaid from 'mermaid';

// Initialize mermaid once outside to avoid re-initialization loops
mermaid.initialize({ 
  startOnLoad: false, 
  theme: 'dark', 
  securityLevel: 'loose',
  fontFamily: 'Inter, sans-serif'
});

interface MarkdownRendererProps {
  content: string;
}

const MermaidChart: React.FC<{ chart: string }> = ({ chart }) => {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<boolean>(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const renderChart = async () => {
      if (!chart.trim()) return;
      
      try {
        // Sanitize chart string: remove any potential "mermaid" text at start if AI misbehaved
        let cleanChart = chart.trim();
        if (cleanChart.startsWith('mermaid')) {
          cleanChart = cleanChart.substring(7).trim();
        }

        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg: renderedSvg } = await mermaid.render(id, cleanChart);
        setSvg(renderedSvg);
        setError(false);
      } catch (e) {
        console.error('Mermaid render error:', e);
        setError(true);
      }
    };
    renderChart();
  }, [chart]);

  if (error) {
    return (
      <div className="my-6 p-4 rounded-xl bg-red-500/5 border border-red-500/20 flex flex-col items-center gap-2 text-red-400">
        <AlertCircle size={24} />
        <p className="text-xs font-bold uppercase tracking-widest">Biểu đồ gặp lỗi cú pháp</p>
        <pre className="text-[10px] opacity-60 max-w-full overflow-x-auto p-2 bg-black/20 rounded">
          {chart.substring(0, 100)}...
        </pre>
      </div>
    );
  }

  return (
    <div 
      ref={elementRef} 
      className="my-6 p-4 rounded-xl bg-slate-900/50 flex justify-center overflow-x-auto border border-white/10 shadow-inner"
      dangerouslySetInnerHTML={{ __html: svg }} 
    />
  );
};

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [sandboxCode, setSandboxCode] = useState<string | null>(null);

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleRun = (code: string) => {
    setSandboxCode(code);
  };

  return (
    <div className="relative">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        className="prose prose-sm max-w-none dark:prose-invert"
        components={{
          code({ inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const lang = match ? match[1] : '';
            const codeString = String(children).replace(/\n$/, '');
            const id = Math.random().toString(36).substr(2, 9);

            if (lang === 'mermaid') {
              return <MermaidChart chart={codeString} />;
            }

            const isRunnable = lang === 'javascript' || lang === 'js' || lang === 'html';

            return !inline && match ? (
              <div className="relative group my-4 rounded-lg overflow-hidden border border-white/10 bg-black/30">
                <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
                  <span className="text-xs text-gray-400 font-mono uppercase">{lang}</span>
                  <div className="flex items-center gap-3">
                    {isRunnable && (
                      <button
                        onClick={() => handleRun(codeString)}
                        className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        <Play size={12} />
                        <span>Run</span>
                      </button>
                    )}
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

      {/* Sandbox Preview Overlay */}
      {sandboxCode && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex flex-col p-4 md:p-10 animate-in fade-in zoom-in-95">
          <div className="w-full max-w-5xl mx-auto flex flex-col h-full bg-slate-900 rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
            <div className="p-4 bg-slate-800 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-2">
                <Play size={16} className="text-green-400" />
                <h3 className="text-sm font-bold"> NhutAI Sandbox Preview</h3>
              </div>
              <button onClick={() => setSandboxCode(null)} className="p-2 hover:bg-white/10 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 bg-white">
              <iframe
                title="Sandbox Preview"
                srcDoc={sandboxCode.includes('<!DOCTYPE html>') ? sandboxCode : `<html><body><script>${sandboxCode}</script></body></html>`}
                className="w-full h-full border-none"
                sandbox="allow-scripts allow-modals"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarkdownRenderer;
