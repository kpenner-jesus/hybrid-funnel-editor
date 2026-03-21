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

export interface AiMessage {
  role: "user" | "assistant" | "tool_result";
  content: string;
  toolCalls?: ToolCallInfo[];
}

// --- Store Interface ---

export type ClaudeModel = "claude-sonnet-4-20250514" | "claude-opus-4-20250514" | "claude-haiku-4-20250514";

export const CLAUDE_MODELS: { id: ClaudeModel; label: string; description: string }[] = [
  { id: "claude-sonnet-4-20250514", label: "Sonnet 4", description: "Fast & capable" },
  { id: "claude-opus-4-20250514", label: "Opus 4", description: "Most powerful" },
  { id: "claude-haiku-4-20250514", label: "Haiku 4", description: "Fastest & cheapest" },
];

interface AiStore {
  messages: AiMessage[];
  isStreaming: boolean;
  selectedModel: ClaudeModel;
  accountContext: AccountContext;
  funnelContext: FunnelContext;
  error: string | null;
  aiPanelOpen: boolean;

  togglePanel: () => void;
  setModel: (model: ClaudeModel) => void;
  sendMessage: (content: string, funnel: FunnelDefinition | null) => Promise<void>;
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

export const useAiStore = create<AiStore>((set, get) => ({
  messages: [],
  isStreaming: false,
  selectedModel: loadSelectedModel(),
  accountContext: loadAccountContext(),
  funnelContext: defaultFunnelContext,
  error: null,
  aiPanelOpen: false,

  togglePanel: () => set((s) => ({ aiPanelOpen: !s.aiPanelOpen })),

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

  sendMessage: async (content: string, funnel: FunnelDefinition | null) => {
    const state = get();
    if (state.isStreaming) return;

    // Add user message
    const userMessage: AiMessage = { role: "user", content };
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
        // Add the tool results as follow-up and continue the conversation
        const toolResultMessages = toolCalls.map((tc) => ({
          role: "tool_result" as const,
          content: tc.result
            ? `${tc.result.success ? "Success" : "Failed"}: ${tc.result.message}`
            : "Tool executed.",
          toolCalls: undefined,
        }));

        // Build a continuation request with tool results
        const allMessages = [...get().messages, ...toolResultMessages];
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
}));

// Build API message format from our internal messages
function buildApiMessages(
  messages: AiMessage[]
): Array<{ role: string; content: string | Array<Record<string, unknown>> }> {
  const apiMessages: Array<{ role: string; content: string | Array<Record<string, unknown>> }> = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];

    if (msg.role === "user") {
      apiMessages.push({ role: "user", content: msg.content });
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
      // Find the preceding assistant message's tool calls to get the tool_use_id
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

  return apiMessages;
}
