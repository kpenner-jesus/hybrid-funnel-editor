// Anthropic streaming provider

export interface AiStreamChunk {
  type: "text" | "tool_use" | "error" | "done";
  content?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  message?: string;
}

export interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | Array<Record<string, unknown>>;
}

interface AnthropicChatOptions {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  systemPrompt: string;
  messages: AnthropicMessage[];
  tools: Array<{ name: string; description: string; input_schema: unknown }>;
}

export class AnthropicProvider {
  async *chat(options: AnthropicChatOptions): AsyncGenerator<AiStreamChunk> {
    const {
      apiKey,
      model = "claude-sonnet-4-20250514",
      maxTokens = 4096,
      systemPrompt,
      messages,
      tools,
    } = options;

    let response: Response;
    try {
      response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages,
          tools,
          stream: true,
        }),
      });
    } catch {
      yield { type: "error", message: "Connection failed. Check your network." };
      return;
    }

    if (!response.ok) {
      if (response.status === 401) {
        yield { type: "error", message: "Invalid API key. Please check your Anthropic API key." };
        return;
      }
      if (response.status === 429) {
        yield { type: "error", message: "Rate limited. Please wait a moment and try again." };
        return;
      }
      const text = await response.text().catch(() => "");
      yield { type: "error", message: `API error (${response.status}): ${text.slice(0, 200)}` };
      return;
    }

    if (!response.body) {
      yield { type: "error", message: "No response body received." };
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    // Track current tool use being built
    let currentToolId = "";
    let currentToolName = "";
    let toolInputJson = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (!data || data === "[DONE]") continue;

          let event: Record<string, unknown>;
          try {
            event = JSON.parse(data);
          } catch {
            continue;
          }

          const eventType = event.type as string;

          if (eventType === "content_block_start") {
            const block = event.content_block as Record<string, unknown>;
            if (block?.type === "tool_use") {
              currentToolId = (block.id as string) || "";
              currentToolName = (block.name as string) || "";
              toolInputJson = "";
            }
          } else if (eventType === "content_block_delta") {
            const delta = event.delta as Record<string, unknown>;
            if (delta?.type === "text_delta") {
              yield { type: "text", content: delta.text as string };
            } else if (delta?.type === "input_json_delta") {
              toolInputJson += (delta.partial_json as string) || "";
            }
          } else if (eventType === "content_block_stop") {
            if (currentToolName) {
              let input: Record<string, unknown> = {};
              try {
                if (toolInputJson) {
                  input = JSON.parse(toolInputJson);
                }
              } catch {
                // If JSON is malformed, use empty object
              }
              yield {
                type: "tool_use",
                id: currentToolId,
                name: currentToolName,
                input,
              };
              currentToolId = "";
              currentToolName = "";
              toolInputJson = "";
            }
          } else if (eventType === "message_stop") {
            yield { type: "done" };
          } else if (eventType === "error") {
            const err = event.error as Record<string, string>;
            yield { type: "error", message: err?.message || "Unknown stream error" };
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    yield { type: "done" };
  }
}
