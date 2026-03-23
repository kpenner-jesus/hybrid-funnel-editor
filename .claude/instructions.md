# Claude Code Instructions for Hybrid Funnel Editor

## Project Context

This is a **template-driven, AI-assisted funnel builder** for the Everybooking SaaS platform. It produces JSX funnels that hospitality venues embed on their booking websites.

**Read ARCHITECTURE.md first** — it explains every file, data flow, and integration point.

## Critical Rules

1. **THIN CLIENT PRINCIPLE:** The editor does NOT maintain its own parameter registry, pricing engine, or inventory system. Everybooking is the single source of truth. The editor collects user selections, displays preview approximations, and passes data to `syncBooking()`. All pricing/inventory/parameter logic lives in Everybooking. Do NOT build features that duplicate Everybooking's Parameter model, pricing JSONB, or inventory system.
2. **Never add `import { useState } from 'react'`** to generated JSX. The Everybooking bundler auto-injects React hooks.
3. **Never hardcode Everybooking category IDs** (like 39 for meeting meals). Always read from widget config.
4. **Meal products MUST include `timeslot` in syncBooking** or they're silently dropped from the invoice.
5. **The preview is an approximation** — the JSX generator output is what actually runs. When in doubt, match the gold standard at `../guest-rooms-widget/examples/wilderness-edge-funnel.jsx`.
6. **Vercel KV is the primary persistence** for funnels (shared across devices). localStorage is a fallback cache.
7. **Edge Runtime required** for `/api/ai/chat/route.ts` — Vercel Hobby has 10s timeout for serverless but unlimited for Edge streaming.
8. **Function names in generated JSX** must not start with numbers. The generator sanitizes funnel names to valid JS identifiers.
9. **Single quotes in step titles** break generated JSX strings. The `escapeJsString` function handles this — always use it for user-provided text in generated code.
10. **Parameters are Everybooking's domain.** Products return their parameters via `getCategories()` with `report_id`, `pricing`, `controls_inventory`, `min`, `max`. The editor reads these — never creates or manages parameters. The guest counter's `youthCategories` config is a preview-only approximation; in production, parameters come from the API.

## Key Files to Know

| File | Purpose | Lines | Complexity |
|------|---------|-------|-----------|
| `src/components/preview/WidgetRenderer.tsx` | All 18 widget preview renderers | ~2400 | HIGH |
| `src/lib/jsx-generator.ts` | Generates publishable JSX with full navigation system | ~1900 | HIGH |
| `src/stores/funnel-store.ts` | All funnel CRUD + undo/redo + KV sync | ~690 | MEDIUM |
| `src/stores/ai-store.ts` | AI messages, streaming, docking, model selection | ~850 | HIGH |
| `src/lib/ai/ai-executor.ts` | Maps AI tool calls to store actions | ~420 | MEDIUM |
| `src/lib/ai/ai-prompts.ts` | System prompt with widget docs + branching intelligence | ~420 | MEDIUM |
| `src/components/preview/FlowPreview.tsx` | Zoomable flow graph with branching layout engine | ~900 | HIGH |
| `src/components/ai/AiChatPanel.tsx` | AI chat with dock/undock/minimize/object-edit mode | ~940 | HIGH |
| `src/components/editor/WidgetConfig.tsx` | Config editors (visual options, meals, conditional nav) | ~1000 | MEDIUM |
| `src/lib/rails-integration.ts` | Rails product mapping functions for Heroku embed | ~100 | LOW |

## Everybooking SaaS Reference

The full Everybooking codebase is at `../everybooking-saas/` (READ ONLY). Key reference files:

- `app/services/tools/blocks.rb` — All 27 widget tool definitions (JSON schema + Ruby implementations). The HARDCODED_MEALS constant (line 9) defines the standard 4-meal structure.
- `app/helpers/surveys_helper.rb` — Widget rendering dispatcher
- `app/components/survey/elements/booking_widget_component.rb` — How booking widgets render (276 lines, creates React props from DB products)
- `app/javascript/components/editor/BookingWidget.jsx` — The actual React booking widget (~1600 lines) that renders the meal timeslot grid, room cards, and product selection
- `app/javascript/components/widget_sdk/api.js` — Widget SDK with `getTimeslots()`, `syncBooking()`, `getAvailability()`
- `funnels/` — 30+ example funnel JSON files

## Architecture Quick Reference

### Three Stores
- **funnel-store** — Funnel CRUD, steps, widgets, undo/redo, KV persistence
- **ai-store** — AI chat, streaming, model selection, object-docking
- **venue-data-store** — Real venue products (rooms, meals, activities) from AI

### Two Rendering Pipelines
1. **Preview** (WidgetRenderer.tsx) — Interactive preview in the editor using venue data store + mock data
2. **Published** (jsx-generator.ts) — Self-contained JSX that runs on Everybooking with `window.__EverybookingAPI`

### Navigation System
- **StepNavigation.next** — explicit next step ID
- **StepNavigation.conditionalNext** — variable-based routing (wedding → venue space, conference → meeting rooms)
- **StepNavigation.hideBack** — disable Back button on payment/confirmation steps
- **History stack** — goBack() pops the last visited step, not the previous list item
- **Contextual labels** — Next button auto-labels based on upcoming step content
- **ProgressJourney** — emoji icon strip on desktop, gradient bar on mobile

### AI Object-Docked Mode
Double-click widget in flow → AI docks to that widget → scoped editing. The docked prompt includes the widget's full config and the focused item label if a specific item was clicked.

## Common Tasks

### Adding a new widget template
1. Create `src/lib/widget-templates/my-widget.ts` with WidgetTemplate interface
2. Register in `src/lib/widget-templates/index.ts`
3. Add preview renderer in `WidgetRenderer.tsx` (new function + case in switch)
4. Add JSX generation in `jsx-generator.ts` (case in generateWidgetJSX switch)
5. Add `data-item-label` attributes to interactive elements (for double-click docking)
6. Add AI tool support in `ai-tools.ts` + `ai-executor.ts` (if needs special tool)
7. Update `ai-prompts.ts` with documentation (auto-generates from template, but add expert notes for complex widgets)

### Modifying a widget preview
- All previews are in `WidgetRenderer.tsx`
- Each widget is a function: `DatePickerPreview`, `GuestRoomsPreview`, `MealPickerPreview`, etc.
- They receive `{ config, theme, resolvedInputs, onOutput }`
- Use `useVenueDataStore` for real product data, fall back to `mock-data.ts`
- Add `data-item-label="Item Name"` to clickable items for AI object-docking

### Modifying the JSX generator
- All generation is in `jsx-generator.ts`
- Widget JSX is in the `generateWidgetJSX` function (big switch statement)
- Shared components at top: BottomNav, TypeformStep, ProgressJourney, StepIcon, MealTimeslotGrid, TrustBar, MicroCelebration
- Helper functions: buildProductEntries, fmtCurrency, escapeJsx, escapeJsString
- Test by creating a funnel → Publish → paste into Everybooking → check F12 console
- **CRITICAL:** Use `escapeJsString()` for all user-provided text in generated JS strings (handles apostrophes, quotes, newlines)

### Adding an AI tool
1. Define schema in `ai-tools.ts` (Anthropic tool format with JSON Schema)
2. Add handler in `ai-executor.ts` (switch case mapping tool name to store action)
3. Document in `ai-prompts.ts` (the AI reads this to know when/how to use the tool)
4. Update docked mode prompt in `/api/ai/chat/route.ts` if the tool is relevant to object-editing

### Integrating with Rails
See `src/lib/rails-integration.ts` for pre-built mapping functions:
- `railsProductsToRooms()` — converts Rails Product records to editor RoomProduct type
- `railsProductsToActivities()` — same for activities
- `railsMealsToWidgetConfig()` — converts meal products to the meal widget config format
- `funnelToRailsSurvey()` — converts editor funnel to Rails Survey JSONB format

When embedding in Heroku:
1. Replace KV/localStorage persistence with Rails API calls
2. Replace `set_venue_products` with direct database reads
3. Products come from venue's actual inventory (real SKUs, stock, unique items)
4. Published JSX saves to `Funnel.component_code` column directly

## Testing

No test framework installed yet. Recommended setup:
```bash
npm install -D vitest @testing-library/react jsdom
```

### Priority test targets:
1. **jsx-generator.ts** — Generated JSX compiles without errors, has correct step count, proper branching, escape characters work
2. **ai-executor.ts** — Tool calls map correctly to store actions, index-to-ID resolution works
3. **funnel-store.ts** — CRUD operations, undo/redo, step reordering, KV sync
4. **schemas.ts** — Factory functions produce valid defaults

### Testing generated JSX
```typescript
test('generates valid JSX', () => {
  const funnel = createTestFunnel();
  const jsx = generateFunnelJSX(funnel);
  // Check no syntax errors
  expect(jsx).not.toContain("'undefined'");
  expect(jsx).not.toContain("NaN");
  // Check required components present
  expect(jsx).toContain('BottomNav');
  expect(jsx).toContain('ProgressJourney');
  expect(jsx).toContain('MealTimeslotGrid'); // if has meal-picker
});
```

## Known Issues / Tech Debt

1. **Infinite re-render risk** — Widget `onOutput` callbacks can cause loops if not ref-guarded. All onOutput calls should check if the value actually changed before updating state.
2. **Variant system** partially broken — only segment-picker variants (cards/pills) work. Other widget variants are cosmetic only.
3. **Flow layout** shows linear after first branch level — conditional navigation branches not fully visualized in parallel columns.
4. **Running total** component exists but not wired to actual price calculations in the published JSX.
5. **No E2E tests** exist.

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `ANTHROPIC_API_KEY` | Yes | Claude API key for AI chat |
| `EDITOR_PASSWORD` | Yes | Password for the auth gate |
| `KV_REST_API_URL` | Auto | Vercel KV endpoint |
| `KV_REST_API_TOKEN` | Auto | Vercel KV auth token |
| `PEXELS_API_KEY` | No | Pexels image search for AI |

## Git Conventions

- Always include `Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>` in commits
- Use descriptive commit messages with bullet points for changes
- Push to `main` — auto-deploys to Vercel
- Never force-push to main
