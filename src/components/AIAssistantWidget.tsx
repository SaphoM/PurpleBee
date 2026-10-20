import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { Bot, Send, Minus, X } from 'lucide-react';

/**
 * In-app assistant for the AI Insights page ONLY.
 * Talks exclusively to our own POST /api/chat endpoint (server.js), which
 * holds the LLM key server-side — the browser never sees provider details.
 */

interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const GREETING: AssistantMessage = {
  id: 'greeting',
  role: 'assistant',
  content:
    "Hi! 👋 I'm the PurpleBee assistant. Ask me anything about how to use the app — tasks, projects, chat, statuses, or what the insights on this page mean.",
};

export const AIAssistantWidget: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [open, messages, loading]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setError(null);
    const history = [...messages, { id: `u-${Date.now()}`, role: 'user' as const, content: text }];
    setMessages(history);
    setInput('');
    setLoading(true);
    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history
            .slice(-10)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await resp.json().catch(() => ({} as { reply?: string; error?: string }));
      if (!resp.ok || !data.reply) {
        setError(data.error || 'Something went wrong, please try again');
      } else {
        setMessages((cur) => [
          ...cur,
          { id: `a-${Date.now()}`, role: 'assistant', content: data.reply as string },
        ]);
      }
    } catch {
      setError('Something went wrong, please try again');
    } finally {
      setLoading(false);
    }
  };

  // ── Collapsed: friendly bubble ──
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={clsx(
          'fixed bottom-6 right-6 z-[250] flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-full',
          'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700',
          'text-white text-sm font-medium shadow-lg shadow-purple-500/25',
          'transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5'
        )}
        title="Open the PurpleBee assistant"
      >
        <Bot size={18} />
        <span>Hello there 👋 Ask me anything</span>
      </button>
    );
  }

  // ── Expanded: chat window ──
  return (
    <div
      className={clsx(
        'fixed bottom-6 right-6 z-[250] w-[21rem] sm:w-[24rem]',
        'flex flex-col overflow-hidden rounded-2xl',
        'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700',
        'shadow-2xl shadow-black/20',
        'h-[30rem] max-h-[calc(100vh-6rem)]'
      )}
      role="dialog"
      aria-label="PurpleBee assistant"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white flex-shrink-0">
        <div className="flex items-center gap-2">
          <Bot size={18} />
          <div className="leading-tight">
            <p className="text-sm font-semibold">PurpleBee Assistant</p>
            <p className="text-[10px] text-purple-100">Ask how to use the app</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg hover:bg-white/15 transition-colors"
            title="Minimise"
          >
            <Minus size={15} />
          </button>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg hover:bg-white/15 transition-colors"
            title="Close"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50 dark:bg-slate-900/50"
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={clsx('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            <div
              className={clsx(
                'max-w-[85%] px-3.5 py-2.5 text-sm whitespace-pre-wrap break-words',
                m.role === 'user'
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl rounded-br-sm'
                  : 'bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 border border-gray-100 dark:border-slate-600 rounded-2xl rounded-bl-sm'
              )}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-slate-700 border border-gray-100 dark:border-slate-600 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-purple-400 dark:bg-purple-300 animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex justify-center text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 rounded-lg px-3 py-2"
          >
            {error}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-3 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="Ask about the app…"
          className={clsx(
            'flex-1 px-3 py-2 text-sm rounded-xl',
            'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-100',
            'placeholder-gray-400 dark:placeholder-slate-400',
            'border border-transparent focus:border-purple-400 dark:focus:border-purple-500',
            'outline-none transition-colors'
          )}
          disabled={loading}
        />
        <button
          onClick={() => void send()}
          disabled={loading || !input.trim()}
          className={clsx(
            'p-2.5 rounded-xl transition-colors',
            loading || !input.trim()
              ? 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white'
          )}
          title="Send"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};
