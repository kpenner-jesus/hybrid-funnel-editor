import { AnthropicProvider } from "@/lib/ai/ai-providers";
import { aiTools } from "@/lib/ai/ai-tools";
import { buildSystemPrompt } from "@/lib/ai/ai-prompts";
import { buildAiContext } from "@/lib/ai/ai-context";
import type { AiContext } from "@/lib/ai/ai-context";

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured on the server." }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }

  let body: {
    messages: Array<{ role: string; content: string | Array<Record<string, unknown>> }>;
    context: AiContext;
    model?: string;
  };

  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid request body." }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  if (!body.messages || !Array.isArray(body.messages)) {
    return new Response(
      JSON.stringify({ error: "messages array is required." }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  // Build the context and system prompt
  const context = body.context || buildAiContext(null, {
    venueName: "",
    venueType: "resort",
    location: "",
    brandColors: { primary: "#006c4b", secondary: "#795828" },
    tone: "warm",
    websiteUrl: "",
  }, {
    funnelType: "quotation",
    categoryIds: {},
    currency: "USD",
  });

  const systemPrompt = buildSystemPrompt(context);

  // Format messages for Anthropic API
  const anthropicMessages = body.messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const provider = new AnthropicProvider();
  const stream = provider.chat({
    apiKey,
    model: body.model || "claude-sonnet-4-20250514",
    systemPrompt,
    messages: anthropicMessages,
    tools: aiTools,
  });

  // Create SSE response stream
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const data = `data: ${JSON.stringify(chunk)}\n\n`;
          controller.enqueue(encoder.encode(data));
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Stream error";
        const data = `data: ${JSON.stringify({ type: "error", message: errorMessage })}\n\n`;
        controller.enqueue(encoder.encode(data));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    },
  });
}
