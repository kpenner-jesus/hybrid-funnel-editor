"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useAiStore, CLAUDE_MODELS } from "@/stores/ai-store";
import { HelpTip } from "@/components/shared/Tooltip";
import type { ClaudeModel, ImageAttachment, FileAttachment } from "@/stores/ai-store";
import { useFunnelStore } from "@/stores/funnel-store";
import { AiChatMessage } from "./AiChatMessage";

const QUICK_SUGGESTIONS = [
  "Create a retreat funnel",
  "Change theme colors",
  "Add a step",
  "What am I missing?",
];

const DOCKED_SUGGESTIONS = [
  "Change the title",
  "Add an option",
  "Remove the last option",
  "Make this multi-select",
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
    dockedWidgetId,
    dockedWidgetLabel,
    undockWidget,
  } = useAiStore();

  const funnel = useFunnelStore((s) => s.funnel);

  const [input, setInput] = useState("");
  const [pendingImages, setPendingImages] = useState<ImageAttachment[]>([]);
  const [pendingFiles, setPendingFiles] = useState<FileAttachment[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Drag state
  const isDragging = useRef(false);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 });

  // Resize state
  const isResizing = useRef(false);
  const resizeEdge = useRef<string>(""); // e.g. "n", "se", "w", etc.
  const resizeStart = useRef({ mouseX: 0, mouseY: 0, width: 0, height: 0, posX: 0, posY: 0 });

  // Minimized state — collapses to just the title bar
  const [isMinimized, setIsMinimized] = useState(false);

  // Live position/size during drag/resize for smooth updates
  const [livePos, setLivePos] = useState(undockedPosition);
  const [liveSize, setLiveSize] = useState(undockedSize);

  // Sync live state when store values change (e.g. on mount or external update)
  // Resolve y=-1 sentinel to bottom-left on first render
  useEffect(() => {
    if (!isDragging.current) {
      if (undockedPosition.y === -1 && typeof window !== "undefined") {
        const bottomY = window.innerHeight - undockedSize.height - 20;
        setLivePos({ x: undockedPosition.x, y: Math.max(20, bottomY) });
        setUndockedPosition({ x: undockedPosition.x, y: Math.max(20, bottomY) });
      } else {
        setLivePos(undockedPosition);
      }
    }
  }, [undockedPosition, undockedSize.height, setUndockedPosition]);
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
    const hasAttachments = pendingImages.length > 0 || pendingFiles.length > 0;
    if ((!trimmed && !hasAttachments) || isStreaming) return;
    const imagesToSend = pendingImages.length > 0 ? [...pendingImages] : undefined;
    const filesToSend = pendingFiles.length > 0 ? [...pendingFiles] : undefined;
    setInput("");
    setPendingImages([]);
    setPendingFiles([]);
    const defaultText = pendingFiles.length > 0
      ? "(see attached files)"
      : "(see attached image)";
    sendMessage(trimmed || defaultText, funnel, imagesToSend, filesToSend);
  }, [input, pendingImages, pendingFiles, isStreaming, sendMessage, funnel]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // --- Image paste handler ---
  const processImageFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      if (!base64) return;
      setPendingImages((prev) => {
        if (prev.length >= 5) return prev; // cap check inside updater to avoid stale closure
        return [
          ...prev,
          {
            base64,
            mediaType: file.type,
            thumbnailUrl: base64,
          },
        ];
      });
    };
    reader.readAsDataURL(file);
  }, []);

  // Extract image from clipboard data (checks both items and files APIs)
  const extractPastedImage = useCallback(
    (clipboardData: DataTransfer): boolean => {
      // Method 1: Check clipboardData.items (Chrome, Edge, modern Firefox)
      if (clipboardData.items) {
        for (const item of Array.from(clipboardData.items)) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) {
              processImageFile(file);
              return true;
            }
          }
        }
      }
      // Method 2: Check clipboardData.files (Safari, some Firefox versions)
      if (clipboardData.files && clipboardData.files.length > 0) {
        for (const file of Array.from(clipboardData.files)) {
          if (file.type.startsWith("image/")) {
            processImageFile(file);
            return true;
          }
        }
      }
      return false;
    },
    [processImageFile]
  );

  // Track whether the React onPaste already handled an image
  const pasteHandledRef = useRef(false);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      if (!e.clipboardData) return;
      if (extractPastedImage(e.clipboardData)) {
        e.preventDefault();
        pasteHandledRef.current = true;
        // Reset flag after current event loop so the global listener sees it
        setTimeout(() => { pasteHandledRef.current = false; }, 0);
      }
      // If no image found, let normal text paste happen
    },
    [extractPastedImage]
  );

  // Global paste listener — catches image pastes when textarea isn't focused
  // (e.g. user clicked somewhere in the panel but not the textarea)
  useEffect(() => {
    if (!aiPanelOpen) return;
    const handler = (e: ClipboardEvent) => {
      // Skip if the React onPaste handler already handled this event
      if (pasteHandledRef.current) return;

      // Skip if user is focused on an input/textarea outside our panel
      const active = document.activeElement;
      const isInOurPanel = panelRef.current?.contains(active);
      const isInExternalInput = (active?.tagName === "INPUT" || active?.tagName === "TEXTAREA") && !isInOurPanel;
      if (isInExternalInput) return;

      if (!e.clipboardData) return;
      if (extractPastedImage(e.clipboardData)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("paste", handler);
    return () => window.removeEventListener("paste", handler);
  }, [aiPanelOpen, extractPastedImage]);

  const removeImage = useCallback((index: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // --- File attachment handler ---
  const ACCEPTED_FILE_TYPES = ".csv,.txt,.json,.xml,.md,.pdf,.tsv,.log";
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const MAX_TEXT_SIZE = 500 * 1024; // 500KB for text files (token budget)

  const processFile = useCallback((file: File) => {
    if (pendingFiles.length >= 5) return;
    if (file.size > MAX_FILE_SIZE) {
      alert(`File "${file.name}" is too large (max 10MB).`);
      return;
    }

    const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");

    if (isPdf) {
      // Read PDF as base64 for Claude's native document support
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        if (!dataUrl) return;
        const base64Data = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
        setPendingFiles((prev) => [
          ...prev,
          {
            name: file.name,
            type: "pdf",
            mediaType: "application/pdf",
            base64: base64Data,
            size: file.size,
          },
        ]);
      };
      reader.readAsDataURL(file);
    } else {
      // Read as text (CSV, TXT, JSON, XML, MD, TSV, LOG)
      if (file.size > MAX_TEXT_SIZE) {
        alert(`Text file "${file.name}" is too large (max 500KB). Consider splitting it.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        if (!text) return;
        setPendingFiles((prev) => [
          ...prev,
          {
            name: file.name,
            type: "text",
            mediaType: file.type || "text/plain",
            textContent: text,
            size: file.size,
          },
        ]);
      };
      reader.readAsText(file);
    }
  }, [pendingFiles.length]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      for (const file of Array.from(files)) {
        processFile(file);
      }
      // Reset input so same file can be selected again
      e.target.value = "";
    },
    [processFile]
  );

  const removeFile = useCallback((index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

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

  // --- Resize handlers (all edges & corners) ---
  const onEdgeResizeStart = useCallback(
    (edge: string) => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      isResizing.current = true;
      resizeEdge.current = edge;
      resizeStart.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        width: liveSize.width,
        height: liveSize.height,
        posX: livePos.x,
        posY: livePos.y,
      };

      const onMouseMove = (ev: MouseEvent) => {
        if (!isResizing.current) return;
        const dx = ev.clientX - resizeStart.current.mouseX;
        const dy = ev.clientY - resizeStart.current.mouseY;
        const dir = resizeEdge.current;

        let newW = resizeStart.current.width;
        let newH = resizeStart.current.height;
        let newX = resizeStart.current.posX;
        let newY = resizeStart.current.posY;

        // East side: grow width rightward
        if (dir.includes("e")) {
          newW = resizeStart.current.width + dx;
        }
        // West side: grow width leftward (move x, shrink from left)
        if (dir.includes("w")) {
          newW = resizeStart.current.width - dx;
          newX = resizeStart.current.posX + dx;
        }
        // South side: grow height downward
        if (dir.includes("s")) {
          newH = resizeStart.current.height + dy;
        }
        // North side: grow height upward (move y, shrink from top)
        if (dir.includes("n")) {
          newH = resizeStart.current.height - dy;
          newY = resizeStart.current.posY + dy;
        }

        // Enforce minimums — if clamped, don't move position past the edge
        if (newW < MIN_WIDTH) {
          if (dir.includes("w")) newX = resizeStart.current.posX + resizeStart.current.width - MIN_WIDTH;
          newW = MIN_WIDTH;
        }
        if (newH < MIN_HEIGHT) {
          if (dir.includes("n")) newY = resizeStart.current.posY + resizeStart.current.height - MIN_HEIGHT;
          newH = MIN_HEIGHT;
        }

        // Enforce viewport bounds
        const maxW = window.innerWidth - newX;
        const maxH = window.innerHeight - newY;
        newW = Math.min(newW, maxW);
        newH = Math.min(newH, maxH);
        newX = Math.max(0, newX);
        newY = Math.max(0, newY);

        setLiveSize({ width: newW, height: newH });
        setLivePos({ x: newX, y: newY });
      };

      const onMouseUp = () => {
        if (isResizing.current) {
          isResizing.current = false;
          setLiveSize((size) => {
            setUndockedSize(size);
            return size;
          });
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
    [liveSize, livePos, setUndockedSize, setUndockedPosition]
  );

  // --- Shared sub-components ---

  const isObjectDocked = !!dockedWidgetId;

  const headerContent = (
    <>
      <div className="flex items-center gap-2 min-w-0">
        {isObjectDocked ? (
          <>
            <span className="text-base">🎯</span>
            <div className="min-w-0">
              <div className="flex items-center text-[10px] font-bold uppercase tracking-wider text-amber-600">
                Editing Widget<HelpTip text="AI is focused on this widget only. Your requests will only change this widget. Click Exit to go back to full funnel mode." />
              </div>
              <div className="text-xs font-semibold text-on-surface truncate max-w-[180px]" title={dockedWidgetLabel || ""}>
                {dockedWidgetLabel || "Widget"}
              </div>
            </div>
            <button
              onClick={undockWidget}
              className="ml-1 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded transition-colors"
              title="Exit object edit mode"
            >
              ✕ Exit
            </button>
          </>
        ) : (
          <>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-primary shrink-0">
              <path d="M10 2l2.09 4.26L17 7.27l-3.5 3.41.82 4.82L10 13.27l-4.32 2.23.82-4.82L3 7.27l4.91-1.01L10 2z" fill="currentColor" />
            </svg>
            <span className="text-sm font-semibold text-on-surface">
              AI Assistant
            </span>
          </>
        )}
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
        {/* Minimize toggle */}
        <button
          onClick={() => setIsMinimized((prev) => !prev)}
          className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-dim transition-colors"
          title={isMinimized ? "Expand" : "Minimize"}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            {isMinimized ? (
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d="M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            )}
          </svg>
        </button>
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
        <span className="flex items-center text-[10px] font-bold uppercase tracking-widest text-on-surface-variant shrink-0">Model<HelpTip text="Haiku = fast &amp; cheap for simple edits. Sonnet = smart, best balance. Opus = most capable but slower." /></span>
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

      {/* Streaming / working indicator — shows whenever AI is processing */}
      {isStreaming && (() => {
        const lastMsg = messages[messages.length - 1];
        const lastIsAssistantStreaming = lastMsg?.role === "assistant" && lastMsg.content;
        // Determine status text based on what's happening
        let statusText = "Thinking...";
        if (lastMsg?.role === "tool_result") {
          const toolCount = lastMsg.toolCalls?.length || 0;
          statusText = toolCount > 1
            ? `Executed ${toolCount} actions, continuing...`
            : "Executed action, continuing...";
        } else if (lastMsg?.role === "assistant" && lastMsg.toolCalls?.length) {
          statusText = `Running ${lastMsg.toolCalls.length} action${lastMsg.toolCalls.length > 1 ? "s" : ""}...`;
        } else if (lastIsAssistantStreaming) {
          statusText = ""; // text is actively streaming, no extra indicator needed
        }

        if (!statusText) return null;

        return (
          <div className="flex justify-start">
            <div className="bg-surface-dim px-3.5 py-2.5 rounded-2xl rounded-bl-md flex items-center gap-2">
              <span className="inline-flex gap-1">
                <span
                  className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </span>
              <span className="text-xs text-on-surface-variant">{statusText}</span>
            </div>
          </div>
        );
      })()}

      {/* Error */}
      {error && (
        <div className="bg-error-light text-error px-3 py-2 rounded-lg text-xs">
          {error}
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );

  const activeSuggestions = isObjectDocked ? DOCKED_SUGGESTIONS : QUICK_SUGGESTIONS;
  const suggestions = messages.length === 0 && (
    <div className="px-4 pb-2 flex flex-wrap gap-1.5">
      {activeSuggestions.map((suggestion) => (
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
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES}
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Attachment preview strip (images + files) */}
      {(pendingImages.length > 0 || pendingFiles.length > 0) && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {/* Image thumbnails */}
          {pendingImages.map((img, i) => (
            <div key={`img-${i}`} className="relative group/img">
              <img
                src={img.thumbnailUrl}
                alt={`Attached ${i + 1}`}
                className="w-16 h-16 object-cover rounded-lg border border-outline-variant"
              />
              <button
                onClick={() => removeImage(i)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-error text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover/img:opacity-100 transition-opacity shadow-sm"
                title="Remove image"
              >
                ×
              </button>
            </div>
          ))}
          {/* File chips */}
          {pendingFiles.map((file, i) => (
            <div
              key={`file-${i}`}
              className="relative group/file flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-dim rounded-lg border border-outline-variant"
            >
              <span className="text-sm">
                {file.type === "pdf" ? "📄" : file.name.endsWith(".csv") || file.name.endsWith(".tsv") ? "📊" : "📝"}
              </span>
              <div className="min-w-0">
                <div className="text-xs font-medium text-on-surface truncate max-w-[120px]" title={file.name}>
                  {file.name}
                </div>
                <div className="text-[10px] text-outline">{formatFileSize(file.size)}</div>
              </div>
              <button
                onClick={() => removeFile(i)}
                className="w-4 h-4 bg-error text-white rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover/file:opacity-100 transition-opacity shadow-sm shrink-0"
                title="Remove file"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-end gap-1.5">
        {/* Paperclip / attach button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isStreaming}
          className="shrink-0 w-9 h-9 rounded-xl text-on-surface-variant hover:bg-surface-dim flex items-center justify-center transition-colors disabled:opacity-40"
          title="Attach file (CSV, PDF, TXT...)"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M15.18 8.94l-6.18 6.18a4.25 4.25 0 01-6.01-6.01l6.18-6.18a2.83 2.83 0 014.01 4.01l-6.19 6.18a1.42 1.42 0 01-2-2l5.71-5.72"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={
            pendingFiles.length > 0
              ? "Add context about the attached files..."
              : pendingImages.length > 0
                ? "Describe what's in the image..."
                : "Message... (paste images or attach files)"
          }
          rows={1}
          className="flex-1 resize-none bg-surface-dim rounded-xl px-3.5 py-2.5 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30 max-h-[120px] overflow-y-auto"
          style={{ minHeight: "40px" }}
          disabled={isStreaming}
        />
        <button
          onClick={handleSend}
          disabled={(!input.trim() && pendingImages.length === 0 && pendingFiles.length === 0) || isStreaming}
          className="shrink-0 w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary-dark transition-colors disabled:opacity-40 disabled:hover:bg-primary"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
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
        className={`fixed z-50 flex flex-col bg-white overflow-hidden group/panel transition-all duration-200 ${
          isMinimized ? "rounded-t-xl" : "rounded-2xl"
        }`}
        style={{
          left: isMinimized ? undefined : livePos.x,
          right: isMinimized ? 16 : undefined,
          top: isMinimized ? undefined : livePos.y,
          bottom: isMinimized ? 0 : undefined,
          width: isMinimized ? 280 : liveSize.width,
          height: isMinimized ? 48 : liveSize.height,
          boxShadow: isMinimized
            ? "0 -4px 20px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)"
            : "0 25px 50px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)",
        }}
      >
        {/* Draggable header */}
        <div
          className="h-12 border-b border-outline-variant px-4 flex items-center justify-between shrink-0 bg-surface-dim/60 backdrop-blur-sm"
          style={{ cursor: "grab" }}
          onMouseDown={onDragStart}
          onDoubleClick={() => setIsMinimized((prev) => !prev)}
        >
          {headerContent}
        </div>

        {!isMinimized && (
          <>
            {/* Model selector */}
            {modelBar}

            {/* Messages */}
            {messageList}

            {/* Quick suggestions */}
            {suggestions}

            {/* Input */}
            {inputArea}
          </>
        )}

        {/* Resize edges — invisible 6px hit zones along each side */}
        <div className="absolute top-0 left-2 right-2 h-1.5 cursor-n-resize" onMouseDown={onEdgeResizeStart("n")} />
        <div className="absolute bottom-0 left-2 right-2 h-1.5 cursor-s-resize" onMouseDown={onEdgeResizeStart("s")} />
        <div className="absolute left-0 top-2 bottom-2 w-1.5 cursor-w-resize" onMouseDown={onEdgeResizeStart("w")} />
        <div className="absolute right-0 top-2 bottom-2 w-1.5 cursor-e-resize" onMouseDown={onEdgeResizeStart("e")} />
        {/* Resize corners — 12px hit zones at each corner */}
        <div className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize" onMouseDown={onEdgeResizeStart("nw")} />
        <div className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize" onMouseDown={onEdgeResizeStart("ne")} />
        <div className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize" onMouseDown={onEdgeResizeStart("sw")} />
        <div className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize" onMouseDown={onEdgeResizeStart("se")} />
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
        ref={panelRef}
        className={`fixed right-0 z-50 flex flex-col shadow-xl transition-all duration-300 ease-in-out ${
          aiPanelOpen ? "translate-x-0" : "translate-x-full"
        } ${isMinimized ? "bottom-0 rounded-tl-xl" : "top-0 h-full"} ${
          isObjectDocked ? "bg-amber-50 border-l-2 border-amber-400" : "bg-white border-l border-outline-variant"
        }`}
        style={{ width: isMinimized ? 280 : 360 }}
      >
        {/* Header */}
        <div
          className="h-14 border-b border-outline-variant px-4 flex items-center justify-between shrink-0"
          onDoubleClick={() => setIsMinimized((prev) => !prev)}
        >
          {headerContent}
        </div>

        {!isMinimized && (
          <>
            {/* Model selector */}
            {modelBar}

            {/* Messages */}
            {messageList}

            {/* Quick suggestions */}
            {suggestions}

            {/* Input */}
            {inputArea}
          </>
        )}
      </div>
    </>
  );
}
