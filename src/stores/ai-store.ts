import { create } from "zustand";
import type { FunnelDefinition } from "@/lib/types";
import type { AccountContext, FunnelContext } from "@/lib/ai/ai-context";
import { defaultAccountContext, defaultFunnelContext, buildAiContext } from "@/lib/ai/ai-context";
import { executeAiToolCall } from "@/lib/ai/ai-executor";
import type { AiStreamChunk } from "@/lib/ai/ai-providers";
import { useFunnelStore } from "@/stores/funnel-store";

// --- Message Types ---

export interface ToolCallInfo {
  id: string;
  name: string;
  input: Record<string, unknown>;
  result?: { success: boolean; message: string };
}

export interface ImageAttachment {
  base64: string;       // data URL (data:image/png;base64,...)
  mediaType: string;    // "image/png", "image/jpeg", etc.
  thumbnailUrl: string; // same as base64 for display
}

export interface FileAttachment {
  name: string;           // original filename
  type: "text" | "pdf";   // how to send to Claude
  mediaType: string;       // MIME type (text/csv, application/pdf, etc.)
  textContent?: string;    // for text/csv/json/txt — the raw text
  base64?: string;         // for PDFs — raw base64 data (no data: prefix)
  size: number;            // file size in bytes
}

export interface AiMessage {
  role: "user" | "assistant" | "tool_result";
  content: string;
  images?: ImageAttachment[];
  files?: FileAttachment[];
  toolCalls?: ToolCallInfo[];
}

// --- Store Interface ---

export type ClaudeModel =
  | "claude-sonnet-4-20250514"
  | "claude-opus-4-20250514"
  | "claude-haiku-4-20250514";

export const CLAUDE_MODELS: { id: ClaudeModel; label: string; description: string }[] = [
  { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4.6", description: "Fast & capable — best balance" },
  { id: "claude-opus-4-20250514", label: "Claude Opus 4.6", description: "Most powerful — complex tasks" },
  { id: "claude-haiku-4-20250514", label: "Claude Haiku 4.5", description: "Fastest — simple edits" },
];

interface AiStore {
  messages: AiMessage[];
  isStreaming: boolean;
  selectedModel: ClaudeModel;
  accountContext: AccountContext;
  funnelContext: FunnelContext;
  error: string | null;
  aiPanelOpen: boolean;

  // Undocked (floating window) state
  isUndocked: boolean;
  undockedPosition: { x: number; y: number };
  undockedSize: { width: number; height: number };

  togglePanel: () => void;
  toggleDock: () => void;
  setUndockedPosition: (pos: { x: number; y: number }) => void;
  setUndockedSize: (size: { width: number; height: number }) => void;
  setModel: (model: ClaudeModel) => void;
  sendMessage: (content: string, funnel: FunnelDefinition | null, images?: ImageAttachment[], files?: FileAttachment[]) => Promise<void>;
  clearChat: () => void;
  setAccountContext: (ctx: Partial<AccountContext>) => void;
  setFunnelContext: (ctx: Partial<FunnelContext>) => void;
}

// Load account context from localStorage
function loadAccountContext(): AccountContext {
  if (typeof window === "undefined") return defaultAccountContext;
  try {
    const raw = localStorage.getItem("ai-account-context");
    if (raw) return { ...defaultAccountContext, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return defaultAccountContext;
}

function saveAccountContext(ctx: AccountContext) {
  if (typeof window === "undefined") return;
  localStorage.setItem("ai-account-context", JSON.stringify(ctx));
}

function loadSelectedModel(): ClaudeModel {
  if (typeof window === "undefined") return "claude-sonnet-4-20250514";
  try {
    const raw = localStorage.getItem("ai-selected-model");
    if (raw && CLAUDE_MODELS.some(m => m.id === raw)) return raw as ClaudeModel;
  } catch { /* ignore */ }
  return "claude-sonnet-4-20250514";
}

// --- Undocked state persistence ---

const DEFAULT_UNDOCKED_POSITION = { x: 100, y: 100 };
const DEFAULT_UNDOCKED_SIZE = { width: 400, height: 600 };

function loadUndockedState(): {
  isUndocked: boolean;
  undockedPosition: { x: number; y: number };
  undockedSize: { width: number; height: number };
} {
  if (typeof window === "undefined") {
    return {
      isUndocked: false,
      undockedPosition: DEFAULT_UNDOCKED_POSITION,
      undockedSize: DEFAULT_UNDOCKED_SIZE,
    };
  }
  try {
    const raw = localStorage.getItem("ai-undocked-state");
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        isUndocked: !!parsed.isUndocked,
        undockedPosition: parsed.undockedPosition ?? DEFAULT_UNDOCKED_POSITION,
        undockedSize: parsed.undockedSize ?? DEFAULT_UNDOCKED_SIZE,
      };
    }
  } catch { /* ignore */ }
  return {
    isUndocked: false,
    undockedPosition: DEFAULT_UNDOCKED_POSITION,
    undockedSize: DEFAULT_UNDOCKED_SIZE,
  };
}

function saveUndockedState(
  isUndocked: boolean,
  undockedPosition: { x: number; y: number },
  undockedSize: { width: number; height: number }
) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    "ai-undocked-state",
    JSON.stringify({ isUndocked, undockedPosition, undockedSize })
  );
}

export const useAiStore = create<AiStore>((set, get) => {
  const undockedInit = loadUndockedState();
  return {
  messages: [],
  isStreaming: false,
  selectedModel: loadSelectedModel(),
  accountContext: loadAccountContext(),
  funnelContext: defaultFunnelContext,
  error: null,
  aiPanelOpen: false,

  // Undocked state
  isUndocked: undockedInit.isUndocked,
  undockedPosition: undockedInit.undockedPosition,
  undockedSize: undockedInit.undockedSize,

  togglePanel: () => set((s) => ({ aiPanelOpen: !s.aiPanelOpen })),

  toggleDock: () => {
    const s = get();
    const next = !s.isUndocked;
    saveUndockedState(next, s.undockedPosition, s.undockedSize);
    set({ isUndocked: next, aiPanelOpen: true });
  },

  setUndockedPosition: (pos) => {
    const s = get();
    saveUndockedState(s.isUndocked, pos, s.undockedSize);
    set({ undockedPosition: pos });
  },

  setUndockedSize: (size) => {
    const s = get();
    saveUndockedState(s.isUndocked, s.undockedPosition, size);
    set({ undockedSize: size });
  },

  setModel: (model) => {
    if (typeof window !== "undefined") localStorage.setItem("ai-selected-model", model);
    set({ selectedModel: model });
  },

  clearChat: () => set({ messages: [], error: null }),

  setAccountContext: (ctx) => {
    const updated = { ...get().accountContext, ...ctx };
    saveAccountContext(updated);
    set({ accountContext: updated });
  },

  setFunnelContext: (ctx) => {
    set({ funnelContext: { ...get().funnelContext, ...ctx } });
  },

  sendMessage: async (content: string, funnel: FunnelDefinition | null, images?: ImageAttachment[], files?: FileAttachment[]) => {
    const state = get();
    if (state.isStreaming) return;

    // Add user message (with optional images and files)
    const userMessage: AiMessage = {
      role: "user",
      content,
      ...(images && images.length > 0 ? { images } : {}),
      ...(files && files.length > 0 ? { files } : {}),
    };
    const updatedMessages = [...state.messages, userMessage];
    set({ messages: updatedMessages, isStreaming: true, error: null });

    // Build context
    const aiContext = buildAiContext(funnel, state.accountContext, state.funnelContext);

    // Format messages for API -- include tool results in conversation
    const apiMessages = buildApiMessages(updatedMessages);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          context: aiContext,
          model: get().selectedModel,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Request failed" }));
        set({
          isStreaming: false,
          error: errorData.error || `HTTP ${response.status}`,
        });
        return;
      }

      if (!response.body) {
        set({ isStreaming: false, error: "No response body" });
        return;
      }

      // Read SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      let assistantContent = "";
      const toolCalls: ToolCallInfo[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (!data) continue;

          let chunk: AiStreamChunk;
          try {
            chunk = JSON.parse(data);
          } catch {
            continue;
          }

          if (chunk.type === "text" && chunk.content) {
            assistantContent += chunk.content;
            // Update the assistant message in real-time
            const currentMessages = get().messages;
            const lastMsg = currentMessages[currentMessages.length - 1];
            if (lastMsg?.role === "assistant") {
              const updated = [...currentMessages];
              updated[updated.length - 1] = {
                ...lastMsg,
                content: assistantContent,
                toolCalls: [...toolCalls],
              };
              set({ messages: updated });
            } else {
              set({
                messages: [
                  ...currentMessages,
                  { role: "assistant", content: assistantContent, toolCalls: [...toolCalls] },
                ],
              });
            }
          } else if (chunk.type === "tool_use" && chunk.name) {
            const toolCall: ToolCallInfo = {
              id: chunk.id || "",
              name: chunk.name,
              input: chunk.input || {},
            };

            // Execute the tool call against the funnel store
            const funnelStore = useFunnelStore.getState();
            const result = executeAiToolCall(chunk.name, chunk.input || {}, {
              getFunnel: () => funnelStore.funnel,
              setFunnel: (f) => {
                // Directly update the funnel in the store
                useFunnelStore.setState({ funnel: f, isDirty: true });
              },
              addStep: funnelStore.addStep,
              removeStep: funnelStore.removeStep,
              reorderSteps: funnelStore.reorderSteps,
              updateStep: funnelStore.updateStep,
              addWidget: funnelStore.addWidget,
              removeWidget: funnelStore.removeWidget,
              updateWidgetConfig: funnelStore.updateWidgetConfig,
              updateWidgetBindings: funnelStore.updateWidgetBindings,
              updateWidgetVariant: funnelStore.updateWidgetVariant,
              setTheme: funnelStore.setTheme,
            });

            toolCall.result = result;
            toolCalls.push(toolCall);

            // Update assistant message with tool calls
            const currentMessages = get().messages;
            const lastMsg = currentMessages[currentMessages.length - 1];
            if (lastMsg?.role === "assistant") {
              const updated = [...currentMessages];
              updated[updated.length - 1] = {
                ...lastMsg,
                content: assistantContent,
                toolCalls: [...toolCalls],
              };
              set({ messages: updated });
            }
          } else if (chunk.type === "error") {
            set({ error: chunk.message || "Unknown error" });
          }
        }
      }

      // If there were tool calls, we need to send tool results back to continue the conversation
      if (toolCalls.length > 0) {
        // Add ONE combined tool_result message carrying all results
        // Attach the toolCalls info so buildApiMessages can pair each result to its tool_use_id
        const toolResultMessage: AiMessage = {
          role: "tool_result",
          content: toolCalls
            .map((tc) =>
              tc.result
                ? `${tc.name}: ${tc.result.success ? "✓" : "✗"} ${tc.result.message}`
                : `${tc.name}: executed`
            )
            .join("\n"),
          toolCalls: [...toolCalls], // carry the full info for buildApiMessages
        };

        const allMessages = [...get().messages, toolResultMessage];
        set({ messages: allMessages });

        // Continue the conversation with tool results
        const updatedFunnel = useFunnelStore.getState().funnel;
        const continuationContext = buildAiContext(updatedFunnel, state.accountContext, state.funnelContext);
        const continuationApiMessages = buildApiMessages(allMessages);

        const contResponse = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            messages: continuationApiMessages,
            context: continuationContext,
            model: get().selectedModel,
          }),
        });

        if (contResponse.ok && contResponse.body) {
          const contReader = contResponse.body.getReader();
          let contBuffer = "";
          let contContent = "";

          while (true) {
            const { done, value } = await contReader.read();
            if (done) break;

            contBuffer += decoder.decode(value, { stream: true });
            const contLines = contBuffer.split("\n");
            contBuffer = contLines.pop() || "";

            for (const line of contLines) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6).trim();
              if (!data) continue;

              let chunk: AiStreamChunk;
              try {
                chunk = JSON.parse(data);
              } catch {
                continue;
              }

              if (chunk.type === "text" && chunk.content) {
                contContent += chunk.content;
                const currentMessages = get().messages;
                const lastMsg = currentMessages[currentMessages.length - 1];
                if (lastMsg?.role === "assistant" && !lastMsg.toolCalls?.length) {
                  const updated = [...currentMessages];
                  updated[updated.length - 1] = { ...lastMsg, content: contContent };
                  set({ messages: updated });
                } else {
                  set({
                    messages: [...currentMessages, { role: "assistant", content: contContent }],
                  });
                }
              }
            }
          }
        }
      }

      set({ isStreaming: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      set({ isStreaming: false, error: `Connection failed: ${errorMessage}` });
    }
  },
};});

// Build API message format from our internal messages
function buildApiMessages(
  messages: AiMessage[]
): Array<{ role: string; content: string | Array<Record<string, unknown>> }> {
  const apiMessages: Array<{ role: string; content: string | Array<Record<string, unknown>> }> = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];

    if (msg.role === "user") {
      const hasImages = msg.images && msg.images.length > 0;
      const hasFiles = msg.files && msg.files.length > 0;

      if (hasImages || hasFiles) {
        // Build multi-part content with files, images, and text
        const blocks: Array<Record<string, unknown>> = [];

        // Add file content blocks first
        if (msg.files) {
          for (const file of msg.files) {
            if (file.type === "pdf" && file.base64) {
              // PDFs sent as document blocks (Claude native PDF support)
              blocks.push({
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: file.base64,
                },
              });
            } else if (file.type === "text" && file.textContent) {
              // Text/CSV/JSON — inject as labeled text block
              blocks.push({
                type: "text",
                text: `--- File: ${file.name} ---\n${file.textContent}\n--- End of ${file.name} ---`,
              });
            }
          }
        }

        // Add image blocks
        if (msg.images) {
          for (const img of msg.images) {
            const base64Data = img.base64.includes(",")
              ? img.base64.split(",")[1]
              : img.base64;
            blocks.push({
              type: "image",
              source: {
                type: "base64",
                media_type: img.mediaType,
                data: base64Data,
              },
            });
          }
        }

        // Add the user's text message last
        blocks.push({ type: "text", text: msg.content || "Please review the attached files." });
        apiMessages.push({ role: "user", content: blocks });
      } else {
        apiMessages.push({ role: "user", content: msg.content });
      }
    } else if (msg.role === "assistant") {
      // Build assistant content blocks
      const blocks: Array<Record<string, unknown>> = [];
      if (msg.content) {
        blocks.push({ type: "text", text: msg.content });
      }
      if (msg.toolCalls) {
        for (const tc of msg.toolCalls) {
          blocks.push({
            type: "tool_use",
            id: tc.id,
            name: tc.name,
            input: tc.input,
          });
        }
      }
      if (blocks.length > 0) {
        apiMessages.push({ role: "assistant", content: blocks });
      }
    } else if (msg.role === "tool_result") {
      // The tool_result message carries toolCalls[] with id + result from the preceding assistant turn.
      // Each tool_use_id must appear exactly once as a tool_result block.
      const tcs = msg.toolCalls;
      if (tcs && tcs.length > 0) {
        const toolResults = tcs.map((tc) => ({
          type: "tool_result",
          tool_use_id: tc.id,
          content: tc.result
            ? `${tc.result.success ? "Success" : "Failed"}: ${tc.result.message}`
            : "Tool executed.",
        }));
        apiMessages.push({ role: "user", content: toolResults });
      } else {
        // Legacy: if no toolCalls attached, look at preceding assistant
        const prevAssistant = [...messages].slice(0, i).reverse().find((m) => m.role === "assistant" && m.toolCalls?.length);
        if (prevAssistant?.toolCalls) {
          const toolResults = prevAssistant.toolCalls.map((tc) => ({
            type: "tool_result",
            tool_use_id: tc.id,
            content: tc.result
              ? `${tc.result.success ? "Success" : "Failed"}: ${tc.result.message}`
              : "Tool executed.",
          }));
          apiMessages.push({ role: "user", content: toolResults });
        }
      }
    }
  }

  return apiMessages;
}
