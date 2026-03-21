"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useAiStore, CLAUDE_MODELS } from "@/stores/ai-store";
import type { ClaudeModel } from "@/stores/ai-store";
import { useFunnelStore } from "@/stores/funnel-store";
import { AiChatMessage } from "./AiChatMessage";

const QUICK_SUGGESTIONS = [
  "Create a retreat funnel",
  "Change theme colors",
  "Add a step",
  "What am I missing?",
];

export function AiChatPanel() {
  const {
    messages,
    isStreaming,
    error,
    aiPanelOpen,
    togglePanel,
    sendMessage,
    clearChat,
    accountContext,
    selectedModel,
    setModel,
  } = useAiStore();

  const funnel = useFunnelStore((s) => s.funnel);

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (aiPanelOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [aiPanelOpen]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput("");
    sendMessage(trimmed, funnel);
  }, [input, isStreaming, sendMessage, funnel]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      if (isStreaming) return;
      sendMessage(suggestion, funnel);
    },
    [isStreaming, sendMessage, funnel]
  );

  return (
    <>
      {/* Backdrop */}
      {aiPanelOpen && (
        <div
          className="fixed inset-0 bg-black/10 z-40 lg:hidden"
          onClick={togglePanel}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[360px] bg-white border-l border-outline-variant z-50 flex flex-col shadow-xl transition-transform duration-300 ease-in-out ${
          aiPanelOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="h-14 border-b border-outline-variant px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              className="text-primary"
            >
              <path
                d="M10 2l2.09 4.26L17 7.27l-3.5 3.41.82 4.82L10 13.27l-4.32 2.23.82-4.82L3 7.27l4.91-1.01L10 2z"
                fill="currentColor"
              />
            </svg>
            <span className="text-sm font-semibold text-on-surface">
              AI Assistant
            </span>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-dim transition-colors"
                title="Clear chat"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M2 4h12M5.33 4V2.67a1.33 1.33 0 011.34-1.34h2.66a1.33 1.33 0 011.34 1.34V4m2 0v9.33a1.33 1.33 0 01-1.34 1.34H4.67a1.33 1.33 0 01-1.34-1.34V4h9.34z"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
            <button
              onClick={togglePanel}
              className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-dim transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M4 4l8 8M12 4l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Model selector + Account context bar */}
        <div className="px-4 py-2 bg-surface-dim border-b border-outline-variant space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant shrink-0">Model</span>
            <select
              value={selectedModel}
              onChange={(e) => setModel(e.target.value as ClaudeModel)}
              className="flex-1 text-xs bg-white border border-outline-variant rounded-lg px-2 py-1 focus:outline-none focus:border-primary cursor-pointer"
            >
              {CLAUDE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} — {m.description}
                </option>
              ))}
            </select>
          </div>
          <div className="text-xs text-on-surface-variant">
            {accountContext.venueName ? (
              <span>
                <span className="font-medium text-on-surface">
                  {accountContext.venueName}
                </span>{" "}
                &middot; {accountContext.venueType} &middot; {accountContext.tone}
              </span>
            ) : (
              <span className="italic">
                No venue set &mdash; tell the AI about your venue to get started
              </span>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <svg
                width="40"
                height="40"
                viewBox="0 0 40 40"
                fill="none"
                className="mx-auto mb-3 text-outline-variant"
              >
                <path
                  d="M20 4l4.18 8.52L34 14.54l-7 6.82 1.64 9.64L20 26.54l-8.64 4.46L13 21.36l-7-6.82 9.82-2.02L20 4z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                />
              </svg>
              <p className="text-sm text-on-surface-variant mb-1">
                How can I help with your funnel?
              </p>
              <p className="text-xs text-outline">
                I can create funnels, add steps, update themes, and more.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <AiChatMessage
              key={i}
              message={msg}
              isStreaming={
                isStreaming &&
                i === messages.length - 1 &&
                msg.role === "assistant"
              }
            />
          ))}

          {/* Streaming indicator when no assistant message yet */}
          {isStreaming &&
            messages.length > 0 &&
            messages[messages.length - 1].role === "user" && (
              <div className="flex justify-start">
                <div className="bg-surface-dim px-3.5 py-2.5 rounded-2xl rounded-bl-md">
                  <span className="inline-flex gap-1">
                    <span
                      className="w-1.5 h-1.5 bg-outline rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-outline rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-outline rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </span>
                </div>
              </div>
            )}

          {/* Error */}
          {error && (
            <div className="bg-error-light text-error px-3 py-2 rounded-lg text-xs">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick suggestions */}
        {messages.length === 0 && (
          <div className="px-4 pb-2 flex flex-wrap gap-1.5">
            {QUICK_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSuggestionClick(suggestion)}
                disabled={isStreaming}
                className="px-3 py-1.5 text-xs bg-surface-dim text-on-surface-variant rounded-full hover:bg-surface-container hover:text-on-surface transition-colors disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="border-t border-outline-variant p-3 shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe what you want to build..."
              rows={1}
              className="flex-1 resize-none bg-surface-dim rounded-xl px-3.5 py-2.5 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30 max-h-[120px] overflow-y-auto"
              style={{ minHeight: "40px" }}
              disabled={isStreaming}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="shrink-0 w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary-dark transition-colors disabled:opacity-40 disabled:hover:bg-primary"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                <path
                  d="M14 2L7 9M14 2l-5 12-2-5-5-2 12-5z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
