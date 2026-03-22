import { AnthropicProvider } from "@/lib/ai/ai-providers";
import { aiTools } from "@/lib/ai/ai-tools";
import { buildSystemPrompt } from "@/lib/ai/ai-prompts";
import { buildAiContext } from "@/lib/ai/ai-context";
import type { AiContext } from "@/lib/ai/ai-context";

// Edge Runtime — no timeout for streaming responses (works on Vercel Hobby plan)
export const runtime = "edge";

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
    dockedContext?: { stepId: string; widgetId: string; label: string; stepIndex: number; widgetIndex: number; focusedItemLabel?: string } | null;
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

  let systemPrompt = buildSystemPrompt(context);

  // If docked to a widget, prepend a scoped instruction WITH the widget's current config
  if (body.dockedContext) {
    const dc = body.dockedContext;

    // Extract the widget's current config from the funnel state
    let widgetConfigDump = "(config not available)";
    try {
      const funnelState = context.currentFunnelState;
      if (funnelState && funnelState.steps[dc.stepIndex]) {
        const step = funnelState.steps[dc.stepIndex];
        const widget = step.widgets[dc.widgetIndex];
        if (widget) {
          // Include the full config so the AI can see products, prices, options, etc.
          const configStr = JSON.stringify(widget.config, null, 2);
          // Cap at 3000 chars to prevent token overflow
          widgetConfigDump = configStr.length > 3000 ? configStr.slice(0, 3000) + "\n... (truncated)" : configStr;
        }
      }
    } catch {}

    // Check if user docked to a specific item within the widget
    const focusedItem = dc.focusedItemLabel || null;
    const focusedItemSection = focusedItem
      ? `\n**Focused item:** "${focusedItem}" — The user double-clicked THIS specific item. ALL commands apply to this item unless they explicitly say otherwise.\n`
      : "";

    // Extract step title and venue context for image search intelligence
    let stepTitle = "";
    let stepContext = "";
    try {
      const funnelState = context.currentFunnelState;
      if (funnelState && funnelState.steps[dc.stepIndex]) {
        const step = funnelState.steps[dc.stepIndex];
        stepTitle = step.title || "";
        // Build context from all widgets on this step
        stepContext = step.widgets.map((w: Record<string, unknown>) => {
          const cfg = w.config as Record<string, unknown>;
          return [cfg?.title, cfg?.headline, cfg?.text, cfg?.subtitle].filter(Boolean).join(" ");
        }).join(" ").slice(0, 500);
      }
    } catch {}

    const venueContext = context.account || {};
    const venueName = (venueContext as Record<string, unknown>).venueName || "";
    const venueType = (venueContext as Record<string, unknown>).venueType || "";
    const location = (venueContext as Record<string, unknown>).location || "";

    systemPrompt = `## OBJECT EDIT MODE — SCOPED TO A SINGLE WIDGET

You are in OBJECT EDIT MODE. The user has docked the AI to a specific widget and expects ALL commands to apply ONLY to this widget.

**Docked widget:** ${dc.label}
**Step index:** ${dc.stepIndex} (use this for tool calls)
**Widget index:** ${dc.widgetIndex} (use this for tool calls)
**Step title:** "${stepTitle}"
${stepContext ? `**Step context:** ${stepContext.slice(0, 300)}\n` : ""}
${venueName ? `**Venue:** ${venueName}` : ""}${venueType ? ` (${venueType})` : ""}${location ? ` — ${location}` : ""}
${focusedItemSection}
**Current widget config (this is what the widget currently contains):**
\`\`\`json
${widgetConfigDump}
\`\`\`

RULES:
1. ONLY use update_widget_config with stepIndex=${dc.stepIndex} and widgetIndex=${dc.widgetIndex}
2. Do NOT create, remove, or modify other steps or widgets
3. Do NOT use create_complete_funnel, add_step, remove_step, or add_widget
4. Focus exclusively on modifying THIS widget's config
5. Be conversational — the user is talking TO this widget, not about the whole funnel
6. ${focusedItem ? `The user is focused on "${focusedItem}". When they say "change the price", "update the description", etc., apply it to "${focusedItem}" specifically. Find it in the config JSON and modify only that item.` : "When the user refers to a specific product, option, or item, find it in the config above and modify it."}
7. When modifying options/categories JSON, preserve the existing structure and only change the specific field requested. Output the COMPLETE updated JSON string, not just the changed field.
8. **NEVER use suggest_improvements when docked.** You are here to EDIT this widget, not analyze the whole funnel. If the user's request is unclear, ask a clarifying question instead.
9. **For image search:** Use \`search_images\` to find professional stock photos. When crafting search queries, use the step title, step context, and venue info above to find RELEVANT images. Examples:
   - Step "What type of retreat?" for a lakeside venue → search "retreat center lakeside nature"
   - Step "Select Catered Meals" → search "chef buffet dining hall group catering"
   - Step "Add Activities" for a Manitoba venue → search "outdoor adventure kayaking nature"
   - Hero section for a wedding venue → search "wedding venue outdoor tented reception"
   After getting results, pick the BEST match and apply it with update_widget_config. For hero-section use backgroundImageUrl, for image-block use imageUrl or url.
10. **For any widget:** If the user's edit request requires information you don't have (a price, a name), ASK for it. Do not guess or use placeholder data.

---

${systemPrompt}`;
  }

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
