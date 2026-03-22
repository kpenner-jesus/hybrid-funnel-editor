# Claude Code Instructions for Hybrid Funnel Editor

## Project Context

This is a **template-driven, AI-assisted funnel builder** for the Everybooking SaaS platform. It produces JSX funnels that hospitality venues embed on their booking websites.

**Read ARCHITECTURE.md first** — it explains every file, data flow, and integration point.

## Critical Rules

1. **Never add `import { useState } from 'react'`** to generated JSX. The Everybooking bundler auto-injects React hooks.
2. **Never hardcode Everybooking category IDs** (like 39 for meeting meals). Always read from widget config.
3. **Meal products MUST include `timeslot` in syncBooking** or they're silently dropped from the invoice.
4. **The preview is an approximation** — the JSX generator output is what actually runs. When in doubt, match the gold standard at `../guest-rooms-widget/examples/wilderness-edge-funnel.jsx`.
5. **localStorage is the only persistence** — no database. The funnel-store saves to `everybooking-funnels` key.
6. **Edge Runtime required** for `/api/ai/chat/route.ts` — Vercel Hobby has 10s timeout for serverless but unlimited for Edge streaming.

## Key Files to Know

| File | Purpose | Complexity |
|------|---------|-----------|
| `src/components/preview/WidgetRenderer.tsx` | All 18 widget preview renderers | ~2400 lines, HIGH |
| `src/lib/jsx-generator.ts` | Generates publishable JSX | ~1500 lines, HIGH |
| `src/stores/funnel-store.ts` | All funnel CRUD + undo/redo | MEDIUM |
| `src/lib/ai/ai-executor.ts` | Maps AI tool calls to store actions | MEDIUM |
| `src/lib/ai/ai-prompts.ts` | System prompt with widget docs | MEDIUM |
| `src/components/preview/FlowPreview.tsx` | Zoomable flow graph with layout engine | HIGH |
| `src/components/ai/AiChatPanel.tsx` | AI chat with dock/undock/minimize | MEDIUM |
| `src/components/editor/WidgetConfig.tsx` | Config editors (visual options, meals) | MEDIUM |

## Everybooking SaaS Reference

The full Everybooking codebase is at `../everybooking-saas/` (READ ONLY). Key reference files:

- `app/services/tools/blocks.rb` — All 27 widget tool definitions (JSON schema + Ruby implementations)
- `app/helpers/surveys_helper.rb` — Widget rendering dispatcher
- `app/components/survey/elements/booking_widget_component.rb` — How booking widgets render
- `app/lib/sdk_documentation.rb` — Widget SDK API docs
- `funnels/` — 30+ example funnel JSON files

## Common Tasks

### Adding a new widget template
1. Create `src/lib/widget-templates/my-widget.ts` with WidgetTemplate interface
2. Register in `src/lib/widget-templates/index.ts`
3. Add preview renderer in `WidgetRenderer.tsx` (new function + case in switch)
4. Add JSX generation in `jsx-generator.ts` (case in generateWidgetJSX switch)
5. Add AI tool support in `ai-tools.ts` + `ai-executor.ts` (if needs special tool)
6. Update `ai-prompts.ts` with documentation (auto-generates from template, but add expert notes)

### Modifying a widget preview
- All previews are in `WidgetRenderer.tsx`
- Each widget is a function: `DatePickerPreview`, `GuestRoomsPreview`, etc.
- They receive `{ config, theme, resolvedInputs, onOutput }`
- Use `useVenueDataStore` for real product data, fall back to `mock-data.ts`

### Modifying the JSX generator
- All generation is in `jsx-generator.ts`
- Widget JSX is in the `generateWidgetJSX` function (big switch statement)
- Helper functions (buildProductEntries, fmtCurrency) are at the top
- Test by creating a funnel → Publish → paste into Everybooking → check F12 console

### Adding an AI tool
1. Define schema in `ai-tools.ts` (Anthropic tool format)
2. Add handler in `ai-executor.ts` (switch case)
3. Document in `ai-prompts.ts` (the AI reads this)

## Testing

See TESTING-GUIDE.md. No test framework is installed yet. Priority:
1. `npm install -D vitest @testing-library/react jsdom`
2. Test JSX generator first (most critical)
3. Test AI executor second
4. Test funnel store third

## Known Issues / Tech Debt

1. **TS warning on WidgetRenderer.tsx** — `Type 'unknown' is not assignable to type 'ReactNode'` on h3 tags with `style={{ fontFamily: theme.headlineFont }}`. Cosmetic, doesn't affect builds.
2. **Option-picker JSX generator** is a stub — produces placeholder comment, not functional code. NEEDS FIXING.
3. **Variant system** is broken for 8 of 9 widgets — changing variant has no effect. Either implement or remove.
4. **Contact-form JSX** ignores showPhone/showCompany/showNotes config — hardcodes all fields.
5. **Flow layout** shows linear after first branch — conditional navigation branches not fully visualized yet.
6. **No E2E tests** exist.

## Git Conventions

- Always include `Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>` in commits
- Use descriptive commit messages with bullet points for changes
- Push to `main` — auto-deploys to Vercel
