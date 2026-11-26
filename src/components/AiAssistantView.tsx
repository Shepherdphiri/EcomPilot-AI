import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Loader2, MessageSquare, Send, User } from 'lucide-react';
import { ChatChartBar, ChatMessage, UserRole } from '../types/ecom';
import { postJson } from '../utils/api';

interface AiAssistantViewProps {
  activeRole: UserRole;
  storeContext: unknown;
  initialPrompt?: string | null;
  onConsumeInitialPrompt: () => void;
}

const SUGGESTED_QUESTIONS = [
  'Why are sales down?',
  'Which products need restocking?',
  'What listings need optimization?',
  'Which SKUs have low margins?',
  'What products are not selling?',
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
        'Good morning. I am your EcomPilot AI Business Analyst monitoring Shopify, Takealot, Makro, Amazon, and WooCommerce. Ask me why sales moved, which SKU will stock out next, which listings need optimization, or where margins are leaking.',
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
      const data = await postJson<{
        reply: string;
        chartTitle?: string;
        chartBars?: ChatChartBar[];
      }>('/api/ai/chat', {
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
        chartTitle: data.chartTitle,
        chartBars: data.chartBars,
        timestamp: new Date().toLocaleTimeString('en-ZA', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      setMessages((prev) => [...prev, replyMsg]);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to connect to AI Business Analyst.'
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
    <div className="flex h-[calc(100vh-11.5rem)] min-h-[520px] flex-col rounded-xl border border-white/[0.08] bg-[#121620] lg:h-[calc(100vh-8.5rem)]">
      <div className="border-b border-white/[0.08] px-5 py-4 lg:px-6">
        <h1 className="font-display text-lg font-bold text-slate-100">
          AI Business Analyst
        </h1>
        <p className="text-xs text-slate-400">
          Natural-language operational intelligence grounded in live inventory, pricing margins, listings, and channel telemetry.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => sendMessage(q)}
              disabled={loading}
              className="rounded-lg border border-white/[0.08] bg-[#0B0D12] px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-blue-500/40 hover:bg-blue-600/10 hover:text-blue-300 disabled:opacity-50 whitespace-nowrap"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 lg:px-6">
        {messages.map((msg) => {
          const maxBarVal =
            msg.chartBars && msg.chartBars.length > 0
              ? Math.max(...msg.chartBars.map((b) => Math.abs(b.value)), 1)
              : 1;

          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <MessageSquare className="h-4 w-4" />
                </div>
              )}
              <div
                className={`max-w-2xl rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'border border-white/[0.08] bg-[#0E1118] text-slate-200'
                }`}
              >
                <p className="whitespace-pre-line">{msg.content}</p>

                {msg.chartBars && msg.chartBars.length > 0 && (
                  <div className="mt-3 rounded-lg border border-white/[0.08] bg-[#121620] p-3">
                    {msg.chartTitle && (
                      <p className="mb-2 text-xs font-semibold text-slate-200">
                        {msg.chartTitle}
                      </p>
                    )}
                    <div className="space-y-2">
                      {msg.chartBars.map((bar, idx) => {
                        const pct = Math.max(
                          6,
                          Math.min(100, Math.round((Math.abs(bar.value) / maxBarVal) * 100))
                        );
                        return (
                          <div key={idx} className="text-xs">
                            <div className="flex items-center justify-between gap-2 text-slate-300">
                              <span className="truncate">{bar.label}</span>
                              <span className="font-semibold text-slate-100 tabular-nums whitespace-nowrap">
                                {bar.formattedValue}
                              </span>
                            </div>
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                              <div
                                className="h-full rounded-full bg-blue-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <p
                  className={`mt-1.5 text-[11px] tabular-nums ${
                    msg.role === 'user' ? 'text-blue-200' : 'text-slate-500'
                  }`}
                >
                  {msg.timestamp}
                </p>
              </div>
              {msg.role === 'user' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-[#161B26] text-slate-300">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#0E1118] px-4 py-2.5 text-sm text-slate-300">
              <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
              Analyzing live operational telemetry...
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
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
        className="flex items-center gap-3 border-t border-white/[0.08] px-5 py-3.5 lg:px-6"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask why sales dropped, which SKU stocks out next, or which SKUs have low margins..."
          className="flex-1 rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50 whitespace-nowrap"
        >
          <Send className="h-3.5 w-3.5" />
          Analyze
        </button>
      </form>
    </div>
  );
};
