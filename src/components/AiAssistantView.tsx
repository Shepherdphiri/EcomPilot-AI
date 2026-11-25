import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Loader2, MessageSquare, Send, User } from 'lucide-react';
import { ChatMessage, UserRole } from '../types/ecom';
import { postJson } from '../utils/api';

interface AiAssistantViewProps {
  activeRole: UserRole;
  storeContext: unknown;
  initialPrompt?: string | null;
  onConsumeInitialPrompt: () => void;
}

const SUGGESTED_QUESTIONS = [
  'What needs attention today?',
  'Which products are low on stock?',
  'Why were sales down yesterday?',
  'Which listings need optimization?',
  'Which orders are delayed?',
];

export const AiAssistantView: React.FC<AiAssistantViewProps> = ({
  activeRole,
  storeContext,
  initialPrompt,
  onConsumeInitialPrompt,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Good morning. I am monitoring your Shopify store and Takealot Seller account. Ask me anything about today’s priorities, low-stock cover, price mismatches, or delayed shipments.',
      timestamp: '06:00 SAST',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toLocaleTimeString('en-ZA', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    setErrorMsg(null);

    try {
      const data = await postJson<{ reply: string }>('/api/ai/chat', {
        message: trimmed,
        role: activeRole,
        storeContext,
        history: nextMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });
      const replyMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toLocaleTimeString('en-ZA', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      setMessages((prev) => [...prev, replyMsg]);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to connect to AI Assistant.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialPrompt) {
      sendMessage(initialPrompt);
      onConsumeInitialPrompt();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  return (
    <div className="flex h-[calc(100vh-8.5rem)] min-h-[540px] flex-col rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-6 py-4">
        <h1 className="font-display text-lg font-bold text-slate-900">
          EcomPilot Operations Assistant
        </h1>
        <p className="text-xs text-slate-500">
          Plain-business-language answers grounded in your live inventory, listings, pricing, and courier data.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => sendMessage(q)}
              disabled={loading}
              className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800 disabled:opacity-50 whitespace-nowrap"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.role === 'assistant' && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-700 text-white">
                <MessageSquare className="h-4 w-4" />
              </div>
            )}
            <div
              className={`max-w-2xl rounded-lg px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-200 bg-slate-50 text-slate-800'
              }`}
            >
              <p className="whitespace-pre-line">{msg.content}</p>
              <p
                className={`mt-1.5 font-mono text-[11px] ${
                  msg.role === 'user' ? 'text-slate-300' : 'text-slate-400'
                }`}
              >
                {msg.timestamp}
              </p>
            </div>
            {msg.role === 'user' && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-700 text-white">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin text-blue-700" />
              Analyzing live marketplace snapshot...
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
        }}
        className="flex items-center gap-3 border-t border-slate-200 px-6 py-3.5"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about stockouts, suppressed listings, price mismatches, or delayed waybills..."
          className="flex-1 rounded-md border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap"
        >
          <Send className="h-4 w-4" />
          Send
        </button>
      </form>
    </div>
  );
};
