"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";

// ── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "model";
  content: string;
  ts: Date;
}

// ── Markdown-lite renderer ────────────────────────────────────────────────────
// Renders bold, bullets, and line breaks from Gemini's response without
// pulling in a heavy markdown library.

function MarkdownText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) {
          return (
            <p key={i} className="mt-2 text-xs font-bold uppercase tracking-wide text-violet-700">
              {line.slice(3)}
            </p>
          );
        }
        if (line.startsWith("# ")) {
          return (
            <p key={i} className="mt-1 font-semibold text-slate-800">
              {line.slice(2)}
            </p>
          );
        }
        if (line.startsWith("- ") || line.startsWith("• ")) {
          return (
            <div key={i} className="flex gap-1.5">
              <span className="mt-0.5 shrink-0 text-violet-400">•</span>
              <span>{renderInline(line.slice(2))}</span>
            </div>
          );
        }
        if (line.trim() === "") return <div key={i} className="h-1" />;
        return <p key={i}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  // Bold: **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-slate-800">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

// ── Suggested prompts ─────────────────────────────────────────────────────────

const SUGGESTIONS = [
  "How is my net salary calculated?",
  "What is PF and how much is deducted?",
  "How do I apply for leave?",
  "What's the difference between HR and Payroll Officer roles?",
  "Why is my payslip prorated this month?",
];

// ── Main Widget ───────────────────────────────────────────────────────────────

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const sendMessage = api.chat.sendMessage.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "model",
          content: data.reply,
          ts: new Date(),
        },
      ]);
    },
    onError: (err) => {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "model",
          content: `Sorry, something went wrong: ${err.message}`,
          ts: new Date(),
        },
      ]);
    },
  });

  // Scroll to bottom on every new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sendMessage.isPending]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  function handleSend(text?: string) {
    const content = (text ?? input).trim();
    if (!content || sendMessage.isPending) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      ts: new Date(),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");

    sendMessage.mutate({
      messages: nextMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });
  }

  return (
    <>
      {/* ── Floating Action Button ── */}
      <button
        id="chat-fab"
        aria-label="Open EMPAY Assistant"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg shadow-violet-500/40 ring-4 ring-violet-100 transition-all duration-200 hover:scale-105 hover:bg-violet-700 active:scale-95"
        style={{ boxShadow: "0 8px 30px rgba(109,40,217,0.35)" }}
      >
        {open ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        )}
      </button>

      {/* ── Chat Panel ── */}
      <div
        aria-hidden={!open}
        className={`fixed bottom-24 right-6 z-50 flex w-[22rem] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200/80 transition-all duration-300 sm:w-96 ${
          open
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-4 scale-95 opacity-0"
        }`}
        style={{ height: "520px", maxHeight: "calc(100vh - 120px)" }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2z"/><path d="M12 6v6l4 2"/></svg>
          </div>
          <div className="min-w-0">
            <p className="font-semibold leading-tight text-white">EMPAY Assistant</p>
            <p className="text-xs text-violet-200">HR & Payroll Support</p>
          </div>
          <div className="ml-auto flex h-2 w-2 shrink-0 items-center justify-center">
            <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
          </div>
        </div>

        {/* Messages */}
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 text-sm">
          {/* Welcome */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
                <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <div>
                <p className="font-semibold text-slate-800">Hi, I&apos;m your EMPAY Assistant! 👋</p>
                <p className="mt-1 text-xs text-slate-500">Ask me anything about payroll, leaves, salary structures, or roles.</p>
              </div>
              <div className="mt-1 flex w-full flex-col gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="rounded-xl border border-violet-100 bg-violet-50/60 px-3 py-2 text-left text-xs font-medium text-violet-700 transition hover:bg-violet-100"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              {msg.role === "model" && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white text-[10px] font-bold shadow-sm">
                  AI
                </div>
              )}
              <div
                className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                  msg.role === "user"
                    ? "rounded-tr-sm bg-violet-600 text-white"
                    : "rounded-tl-sm bg-slate-100 text-slate-700"
                }`}
              >
                {msg.role === "model" ? (
                  <MarkdownText text={msg.content} />
                ) : (
                  <p>{msg.content}</p>
                )}
                <p
                  className={`mt-1.5 text-right text-[10px] ${
                    msg.role === "user" ? "text-violet-300" : "text-slate-400"
                  }`}
                >
                  {msg.ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {sendMessage.isPending && (
            <div className="flex gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white text-[10px] font-bold shadow-sm">
                AI
              </div>
              <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-3">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "0ms" }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "150ms" }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 border-t border-slate-100 bg-white px-3 py-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              id="chat-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything…"
              disabled={sendMessage.isPending}
              autoComplete="off"
              className="h-10 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!input.trim() || sendMessage.isPending}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-40"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </form>
          <p className="mt-1.5 text-center text-[10px] text-slate-400">
            Powered by Gemini · EMPAY HR Platform
          </p>
        </div>
      </div>
    </>
  );
}
