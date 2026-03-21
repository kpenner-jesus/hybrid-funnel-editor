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

const MIN_WIDTH = 320;
const MIN_HEIGHT = 400;

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
    isUndocked,
    undockedPosition,
    undockedSize,
    toggleDock,
    setUndockedPosition,
    setUndockedSize,
  } = useAiStore();

  const funnel = useFunnelStore((s) => s.funnel);

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Drag state
  const isDragging = useRef(false);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 });

  // Resize state
  const isResizing = useRef(false);
  const resizeStart = useRef({ mouseX: 0, mouseY: 0, width: 0, height: 0 });

  // Live position/size during drag/resize for smooth updates
  const [livePos, setLivePos] = useState(undockedPosition);
  const [liveSize, setLiveSize] = useState(undockedSize);

  // Sync live state when store values change (e.g. on mount or external update)
  useEffect(() => {
    if (!isDragging.current) setLivePos(undockedPosition);
  }, [undockedPosition]);
  useEffect(() => {
    if (!isResizing.current) setLiveSize(undockedSize);
  }, [undockedSize]);

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

  // --- Drag handlers ---
  const onDragStart = useCallback(
    (e: React.MouseEvent) => {
      // Don't start drag on buttons
      if ((e.target as HTMLElement).closest("button")) return;
      e.preventDefault();
      isDragging.current = true;
      dragStart.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        posX: livePos.x,
        posY: livePos.y,
      };

      const onMouseMove = (ev: MouseEvent) => {
        if (!isDragging.current) return;
        const dx = ev.clientX - dragStart.current.mouseX;
        const dy = ev.clientY - dragStart.current.mouseY;
        let newX = dragStart.current.posX + dx;
        let newY = dragStart.current.posY + dy;
        // Clamp to viewport
        const maxX = window.innerWidth - liveSize.width;
        const maxY = window.innerHeight - liveSize.height;
        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));
        setLivePos({ x: newX, y: newY });
      };

      const onMouseUp = () => {
        if (isDragging.current) {
          isDragging.current = false;
          // Persist final position
          setLivePos((pos) => {
            setUndockedPosition(pos);
            return pos;
          });
        }
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [livePos, liveSize.width, liveSize.height, setUndockedPosition]
  );

  // --- Resize handlers ---
  const onResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      isResizing.current = true;
      resizeStart.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        width: liveSize.width,
        height: liveSize.height,
      };

      const onMouseMove = (ev: MouseEvent) => {
        if (!isResizing.current) return;
        const dx = ev.clientX - resizeStart.current.mouseX;
        const dy = ev.clientY - resizeStart.current.mouseY;
        let newW = resizeStart.current.width + dx;
        let newH = resizeStart.current.height + dy;
        // Enforce min/max
        const maxW = window.innerWidth - livePos.x;
        const maxH = window.innerHeight - livePos.y;
        newW = Math.max(MIN_WIDTH, Math.min(newW, maxW));
        newH = Math.max(MIN_HEIGHT, Math.min(newH, maxH));
        setLiveSize({ width: newW, height: newH });
      };

      const onMouseUp = () => {
        if (isResizing.current) {
          isResizing.current = false;
          setLiveSize((size) => {
            setUndockedSize(size);
            return size;
          });
        }
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [liveSize, livePos.x, livePos.y, setUndockedSize]
  );

  // --- Shared sub-components ---

  const headerContent = (
    <>
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
        {/* Dock/Undock toggle */}
        <button
          onClick={toggleDock}
          className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-dim transition-colors"
          title={isUndocked ? "Dock to sidebar" : "Undock as floating window"}
        >
          {isUndocked ? (
            // Dock icon (arrow pointing into box / ↙)
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M10 2v4h4M10 6l4-4M2 2h6v12H2V2zm8 8v4h4v-4h-4z"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            // Undock icon (arrow pointing out of box / ↗)
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M6 2H2v12h6V8M10 2h4v4M14 2l-6 6"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
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
    </>
  );

  const modelBar = (
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
  );

  const messageList = (
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
  );

  const suggestions = messages.length === 0 && (
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
  );

  const inputArea = (
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
  );

  // ========================
  // UNDOCKED (floating) mode
  // ========================
  if (isUndocked) {
    if (!aiPanelOpen) return null;

    return (
      <div
        ref={panelRef}
        className="fixed z-50 flex flex-col bg-white rounded-2xl overflow-hidden"
        style={{
          left: livePos.x,
          top: livePos.y,
          width: liveSize.width,
          height: liveSize.height,
          boxShadow:
            "0 25px 50px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)",
        }}
      >
        {/* Draggable header */}
        <div
          className="h-14 border-b border-outline-variant px-4 flex items-center justify-between shrink-0 bg-surface-dim/60 backdrop-blur-sm"
          style={{ cursor: "grab" }}
          onMouseDown={onDragStart}
        >
          {headerContent}
        </div>

        {/* Model selector */}
        {modelBar}

        {/* Messages */}
        {messageList}

        {/* Quick suggestions */}
        {suggestions}

        {/* Input */}
        {inputArea}

        {/* Resize handle (bottom-right corner) */}
        <div
          className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize flex items-end justify-end p-0.5"
          onMouseDown={onResizeStart}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            className="text-outline-variant"
          >
            <path
              d="M10 2v8H2M6 2v8M10 6H2"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              opacity="0.5"
            />
          </svg>
        </div>
      </div>
    );
  }

  // ========================
  // DOCKED (sidebar) mode
  // ========================
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
          {headerContent}
        </div>

        {/* Model selector */}
        {modelBar}

        {/* Messages */}
        {messageList}

        {/* Quick suggestions */}
        {suggestions}

        {/* Input */}
        {inputArea}
      </div>
    </>
  );
}
