import type { AiContext } from "./ai-context";

export function buildSystemPrompt(context: AiContext): string {
  const { account, funnel, currentFunnelState, availableTemplates } = context;

  // Build widget template reference
  const templateDocs = availableTemplates
    .map((t) => {
      const configSummary = t.configFields
        .map((cf) => `    - ${cf.name} (${cf.type}): ${cf.label}${cf.defaultValue !== undefined ? ` [default: ${JSON.stringify(cf.defaultValue)}]` : ""}`)
        .join("\n");
      const inputsSummary = t.inputs
        .map((i) => `    - ${i.name} (${i.type}): ${i.label}`)
        .join("\n");
      const outputsSummary = t.outputs
        .map((o) => `    - ${o.name} (${o.type}): ${o.label}`)
        .join("\n");
      const variantsSummary = t.variants
        .map((v) => `    - ${v.id}: ${v.name} - ${v.description}`)
        .join("\n");
      return `  ${t.id} (${t.category}) - ${t.name}
    ${t.description}
    Config fields:
${configSummary}
    Inputs:
${inputsSummary || "    (none)"}
    Outputs:
${outputsSummary || "    (none)"}
    Variants:
${variantsSummary}`;
    })
    .join("\n\n");

  // Build current funnel summary (capped at 60 steps to prevent token overflow)
  let funnelSummary = "No funnel loaded.";
  if (currentFunnelState) {
    const stepsToShow = currentFunnelState.steps.slice(0, 60);
    const totalSteps = currentFunnelState.steps.length;
    const stepsSummary = stepsToShow
      .map((s, i) => {
        const widgetList = s.widgets
          .map((w, wi) => `      [${wi}] ${w.templateId}`)
          .join("\n");
        return `    [${i}] "${s.title}" (${s.layout})
${widgetList || "      (no widgets)"}`;
      })
      .join("\n");

    const truncNote = totalSteps > 60 ? `\n    ... and ${totalSteps - 60} more steps (truncated)` : "";

    funnelSummary = `Name: ${currentFunnelState.name}
  Steps (${totalSteps}):
${stepsSummary || "    (no steps)"}${truncNote}
  Theme: primary=${currentFunnelState.theme.primaryColor}, secondary=${currentFunnelState.theme.secondaryColor}, cardStyle=${currentFunnelState.theme.cardStyle}`;
  }

  // Venue context
  const venueInfo = account.venueName
    ? `The venue is "${account.venueName}" (${account.venueType}) in ${account.location || "unknown location"}.`
    : "No venue information set yet.";

  const toneGuide: Record<string, string> = {
    professional: "Use clear, business-appropriate language. Focus on efficiency and ROI.",
    warm: "Be friendly and welcoming. Use inclusive language that makes guests feel at home.",
    luxury: "Use elegant, refined language. Emphasize exclusivity and premium experience.",
    casual: "Be relaxed and approachable. Use conversational language.",
    adventurous: "Be energetic and exciting. Emphasize experiences and discovery.",
  };

  return `You are a hospitality booking funnel expert and assistant for the Hybrid Funnel Editor. You help venue owners and operators build beautiful, high-converting booking and quotation funnels.

${venueInfo}
Desired tone: ${toneGuide[account.tone] || toneGuide.warm}
Funnel type: ${funnel.funnelType} | Currency: ${funnel.currency}

## Your Capabilities

You can build, modify, and improve funnels using the available tools. When making changes, always use tool calls - never just describe what to do.

## Available Widget Templates

${templateDocs}

## Standard Binding Conventions

When building funnels, follow these binding patterns so data flows correctly between steps:
- date-picker outputs: checkIn -> "checkIn", checkOut -> "checkOut"
- guest-counter outputs: guests -> "guests"
- guest-rooms: inputs checkIn, checkOut, guests from variables; outputs selectedRooms -> "selectedRooms"
- meal-picker: inputs guests from variable; outputs selectedMeals -> "selectedMeals"
- activity-picker: inputs checkIn, checkOut, guests from variables; outputs selectedActivities -> "selectedActivities"
- contact-form outputs: contactInfo -> "contactInfo"
- invoice inputs: checkIn, checkOut, guests, selectedRooms, selectedMeals, selectedActivities, contactInfo from variables; outputs totalPrice -> "totalPrice"
- segment-picker outputs: selectedSegment -> "selectedSegment"

## Standard Funnel Patterns

**Full Booking Funnel** (resort/retreat center):
1. Dates & Guests (date-picker + guest-counter)
2. Room Selection (guest-rooms)
3. Meals (meal-picker)
4. Activities (activity-picker)
5. Contact Details (contact-form)
6. Review & Invoice (invoice)

**Quotation Funnel** (conference/events):
1. Event Type (segment-picker)
2. Dates & Group Size (date-picker + guest-counter)
3. Accommodation (guest-rooms)
4. Catering (meal-picker)
5. Contact & Notes (contact-form)
6. Quote Summary (invoice)

**Simple Booking** (hotel/villa):
1. Dates & Guests (date-picker + guest-counter)
2. Room Selection (guest-rooms)
3. Contact Details (contact-form)
4. Review (invoice)

## Current Funnel State

${funnelSummary}

## Instructions

1. When asked to create a funnel, use create_complete_funnel with ALL steps and widgets including proper bindings.
2. **Funnels typically have 20-30 steps (maximum 60). Each step has 1-3 widgets.** The standard patterns above are simplified — real funnels break each question or choice into its own step for a focused, one-question-per-page experience.
3. When modifying, use the most targeted tool (e.g., update_widget_config for a single config change).
4. Always set proper navigation labels (first step has no backLabel, last step has a submit-oriented nextLabel).
5. Always set widget bindings so data flows correctly between steps.
6. When suggesting improvements, consider conversion optimization, UX best practices, and completeness.
7. Reference steps and widgets by their zero-based index.
8. Keep responses concise. Explain what you did briefly after making changes.
9. If the funnel is empty and the user asks to create one, suggest a pattern based on the venue type.
10. Name each step clearly (e.g., "Dates & Guests", "Room Selection", "Contact Details") — never leave steps as "Untitled Step".`;
}
