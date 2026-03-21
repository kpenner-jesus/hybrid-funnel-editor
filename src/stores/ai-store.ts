import { create } from "zustand";
import type { FunnelDefinition } from "@/lib/types";
import type { AccountContext, FunnelContext } from "@/lib/ai/ai-context";
import { defaultAccountContext, defaultFunnelContext, buildAiContext } from "@/lib/ai/ai-context";
import { executeAiToolCall } from "@/lib/ai/ai-executor";
import type { AiStreamChunk } from "@/lib/ai/ai-providers";
import { useFunnelStore } from "@/stores/funnel-store";
import { useVenueDataStore } from "@/stores/venue-data-store";
import type { VenueData } from "@/stores/venue-data-store";

// --- Message Types ---

export interface ToolCallInfo {
  id: string;
  name: string;
  input: Record<string, unknown>;
  result?: { success: boolean; message: string };
  generating?: boolean; // true while Claude is still building the tool input JSON
  progress?: number;    // approximate chars generated so far
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

      // --- Helper: read an SSE response stream and return parsed content + tool calls ---
      const decoder = new TextDecoder();

      async function readStream(
        body: ReadableStream<Uint8Array>
      ): Promise<{ content: string; toolCalls: ToolCallInfo[] }> {
        const reader = body.getReader();
        let buffer = "";
        let assistantContent = "";
        const streamToolCalls: ToolCallInfo[] = [];

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
                  toolCalls: [...streamToolCalls],
                };
                set({ messages: updated });
              } else {
                set({
                  messages: [
                    ...currentMessages,
                    { role: "assistant", content: assistantContent, toolCalls: [...streamToolCalls] },
                  ],
                });
              }
            } else if (chunk.type === "tool_generating" && chunk.name) {
              // Show a "generating" placeholder so the user sees activity
              const existingIdx = streamToolCalls.findIndex(tc => tc.id === chunk.id && tc.generating);
              const genToolCall: ToolCallInfo = {
                id: chunk.id || "",
                name: chunk.name,
                input: {},
                generating: true,
                progress: chunk.progress || 0,
              };

              const updatedCalls = [...streamToolCalls];
              if (existingIdx >= 0) {
                updatedCalls[existingIdx] = genToolCall;
              } else if (!streamToolCalls.some(tc => tc.id === chunk.id)) {
                updatedCalls.push(genToolCall);
              }

              // Update assistant message to show the generating card
              const currentMessages = get().messages;
              const lastMsg = currentMessages[currentMessages.length - 1];
              if (lastMsg?.role === "assistant") {
                const updated = [...currentMessages];
                updated[updated.length - 1] = {
                  ...lastMsg,
                  content: assistantContent,
                  toolCalls: updatedCalls,
                };
                set({ messages: updated });
              } else {
                set({
                  messages: [
                    ...currentMessages,
                    { role: "assistant", content: assistantContent, toolCalls: updatedCalls },
                  ],
                });
              }

            } else if (chunk.type === "tool_use" && chunk.name) {
              // Remove any "generating" placeholder for this tool
              const genIdx = streamToolCalls.findIndex(tc => tc.id === chunk.id && tc.generating);
              if (genIdx >= 0) {
                streamToolCalls.splice(genIdx, 1);
              }
              // Skip duplicate tool_use IDs (SSE dedup)
              if (chunk.id && streamToolCalls.some(tc => tc.id === chunk.id)) continue;

              const toolCall: ToolCallInfo = {
                id: chunk.id || "",
                name: chunk.name,
                input: chunk.input || {},
              };

              // Handle set_venue_products directly (it's a store-level op, not funnel)
              let result;
              if (chunk.name === "set_venue_products") {
                try {
                  const input = chunk.input || {};
                  const venueData: VenueData = {
                    venueName: (input.venueName as string) || "",
                    currency: (input.currency as string) || "USD",
                    taxRates: (input.taxRates as VenueData["taxRates"]) || [],
                    rooms: ((input.rooms as Array<Record<string, unknown>>) || []).map((r) => ({
                      id: (r.id as string) || `room-${Math.random().toString(36).slice(2, 8)}`,
                      name: (r.name as string) || "Room",
                      description: (r.description as string) || "",
                      imageUrl: (r.imageUrl as string) || "",
                      pricePerNight: (r.pricePerNight as number) || 0,
                      currency: (input.currency as string) || "USD",
                      tags: (r.tags as string[]) || [],
                      maxAdults: (r.maxAdults as number) || 2,
                      maxChildren: (r.maxChildren as number) || 0,
                      stock: (r.stock as number) || 10,
                    })),
                    meals: ((input.meals as Array<Record<string, unknown>>) || []).map((m) => ({
                      id: (m.id as string) || `meal-${Math.random().toString(36).slice(2, 8)}`,
                      name: (m.name as string) || "Meal",
                      description: (m.description as string) || "",
                      pricePerPerson: (m.pricePerPerson as number) || 0,
                      currency: (input.currency as string) || "USD",
                      category: (m.category as "breakfast" | "lunch" | "dinner" | "snack") || "dinner",
                      dietaryOptions: (m.dietaryOptions as string[]) || [],
                    })),
                    activities: ((input.activities as Array<Record<string, unknown>>) || []).map((a) => ({
                      id: (a.id as string) || `act-${Math.random().toString(36).slice(2, 8)}`,
                      name: (a.name as string) || "Activity",
                      description: (a.description as string) || "",
                      imageUrl: (a.imageUrl as string) || "",
                      pricePerPerson: (a.pricePerPerson as number) || 0,
                      currency: (input.currency as string) || "USD",
                      durationMinutes: (a.durationMinutes as number) || 120,
                      maxParticipants: (a.maxParticipants as number) || 20,
                    })),
                    genericProducts: {},
                    categories: [],
                  };
                  useVenueDataStore.getState().setVenueData(venueData);
                  const counts = [
                    venueData.rooms.length > 0 ? `${venueData.rooms.length} rooms` : null,
                    venueData.meals.length > 0 ? `${venueData.meals.length} meals` : null,
                    venueData.activities.length > 0 ? `${venueData.activities.length} activities` : null,
                  ].filter(Boolean).join(", ");
                  result = { success: true, message: `Loaded venue data for "${venueData.venueName}": ${counts}. Preview now shows real products.` };
                } catch (err) {
                  result = { success: false, message: `Failed to set venue data: ${err instanceof Error ? err.message : "unknown error"}` };
                }
                toolCall.result = result;
                streamToolCalls.push(toolCall);
              } else {
              // Execute the tool call against the funnel store
              // IMPORTANT: use lambda wrappers that call getState() fresh each time
              // to avoid stale closures when multiple tool calls execute in sequence
              result = executeAiToolCall(chunk.name, chunk.input || {}, {
                getFunnel: () => useFunnelStore.getState().funnel,
                setFunnel: (f) => {
                  useFunnelStore.setState({ funnel: f, isDirty: true });
                },
                addStep: (...a) => useFunnelStore.getState().addStep(...a),
                removeStep: (...a) => useFunnelStore.getState().removeStep(...a),
                reorderSteps: (...a) => useFunnelStore.getState().reorderSteps(...a),
                updateStep: (...a) => useFunnelStore.getState().updateStep(...a),
                addWidget: (...a) => useFunnelStore.getState().addWidget(...a),
                removeWidget: (...a) => useFunnelStore.getState().removeWidget(...a),
                updateWidgetConfig: (...a) => useFunnelStore.getState().updateWidgetConfig(...a),
                updateWidgetBindings: (...a) => useFunnelStore.getState().updateWidgetBindings(...a),
                updateWidgetVariant: (...a) => useFunnelStore.getState().updateWidgetVariant(...a),
                setTheme: (...a) => useFunnelStore.getState().setTheme(...a),
              });

              toolCall.result = result;
              streamToolCalls.push(toolCall);
              } // end else (non-venue-data tool calls)

              // Update or create assistant message with tool calls
              const currentMessages = get().messages;
              const lastMsg = currentMessages[currentMessages.length - 1];
              if (lastMsg?.role === "assistant") {
                const updated = [...currentMessages];
                updated[updated.length - 1] = {
                  ...lastMsg,
                  content: assistantContent,
                  toolCalls: [...streamToolCalls],
                };
                set({ messages: updated });
              } else {
                // Continuation started with tool_use (no text first) — create assistant message
                set({
                  messages: [
                    ...currentMessages,
                    { role: "assistant", content: assistantContent, toolCalls: [...streamToolCalls] },
                  ],
                });
              }
            } else if (chunk.type === "error") {
              set({ error: chunk.message || "Unknown error" });
            }
          }
        }

        return { content: assistantContent, toolCalls: streamToolCalls };
      }

      // --- Main stream + multi-turn tool call loop ---
      // After each response, if there are tool calls, send results back and continue.
      // Loop up to 5 rounds to prevent infinite loops.
      let currentResponse = response;
      const MAX_TOOL_ROUNDS = 5;

      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        if (!currentResponse.body) break;

        const { toolCalls } = await readStream(currentResponse.body);

        // No tool calls — conversation turn is complete
        if (toolCalls.length === 0) break;

        // Add tool_result message with all results from this round
        const toolResultMessage: AiMessage = {
          role: "tool_result",
          content: toolCalls
            .map((tc) =>
              tc.result
                ? `${tc.name}: ${tc.result.success ? "✓" : "✗"} ${tc.result.message}`
                : `${tc.name}: executed`
            )
            .join("\n"),
          toolCalls: [...toolCalls],
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

        if (!contResponse.ok || !contResponse.body) break;
        currentResponse = contResponse;
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
      let tcs = msg.toolCalls;

      // Legacy fallback: if no toolCalls attached, look at the immediately preceding assistant message
      if (!tcs || tcs.length === 0) {
        for (let j = i - 1; j >= 0; j--) {
          if (messages[j].role === "assistant" && messages[j].toolCalls?.length) {
            tcs = messages[j].toolCalls;
            break;
          }
          // Stop searching if we hit another user/tool_result — don't cross conversation turns
          if (messages[j].role === "user" || messages[j].role === "tool_result") break;
        }
      }

      if (tcs && tcs.length > 0) {
        // Deduplicate by tool_use_id — Claude requires exactly one result per tool_use
        const seen = new Set<string>();
        const toolResults: Array<Record<string, unknown>> = [];
        for (const tc of tcs) {
          if (seen.has(tc.id)) continue;
          seen.add(tc.id);
          toolResults.push({
            type: "tool_result",
            tool_use_id: tc.id,
            content: tc.result
              ? `${tc.result.success ? "Success" : "Failed"}: ${tc.result.message}`
              : "Tool executed.",
          });
        }
        if (toolResults.length > 0) {
          apiMessages.push({ role: "user", content: toolResults });
        }
      }
    }
  }

  return apiMessages;
}
