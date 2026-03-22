# Hybrid Funnel Editor — Architecture Guide

> **For developers continuing this codebase.** This document explains every architectural decision, data flow, and integration point. Read this before making changes.

## Overview

The Hybrid Funnel Editor is a **template-driven, AI-assisted funnel builder** for Everybooking SaaS. It produces JSX funnels that run on venue websites via the Everybooking React Funnel system. The editor runs on Next.js (Vercel) and uses Claude AI for conversational funnel building.

**Key distinction:** The editor preview is an *approximation* — the published JSX is what actually runs on venue websites using `window.__EverybookingAPI`.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| State | Zustand (3 stores) |
| AI | Anthropic Claude API (Sonnet 4.6 / Opus 4.6 / Haiku 4.5) |
| Styling | Tailwind CSS + inline styles |
| Hosting | Vercel (Hobby plan — Edge Runtime for AI streaming) |
| Auth | Simple password gate via middleware |
| Persistence | localStorage (no database) |

## Directory Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── page.tsx                  # Landing page (funnel list, create, clone)
│   ├── login/page.tsx            # Password gate login
│   ├── editor/[id]/page.tsx      # Main editor (sidebar + preview + AI)
│   ├── api/
│   │   ├── ai/chat/route.ts      # POST streaming AI endpoint (Edge Runtime)
│   │   └── auth/login/route.ts   # Password verification
│   └── layout.tsx                # Root layout + viewport config
│
├── stores/                       # Zustand state management
│   ├── funnel-store.ts           # Funnel CRUD, steps, widgets, undo/redo
│   ├── ai-store.ts               # AI messages, streaming, docking, model selection
│   └── venue-data-store.ts       # Real venue product catalog (rooms, meals, activities)
│
├── lib/                          # Core logic (no React)
│   ├── types.ts                  # All TypeScript interfaces
│   ├── schemas.ts                # Factory functions (createEmptyFunnel, createEmptyStep, etc.)
│   ├── jsx-generator.ts          # Generates publishable JSX from FunnelDefinition
│   ├── mock-data.ts              # Fallback data when venue store is empty
│   ├── theme-presets.ts          # Color theme presets
│   ├── variable-engine.ts        # Variable binding resolution
│   ├── widget-templates/         # 18 widget template definitions
│   │   ├── index.ts              # Registry (widgetTemplateRegistry)
│   │   ├── segment-picker.ts     # Branching segment selection
│   │   ├── option-picker.ts      # Multiple choice cards
│   │   ├── date-picker.ts        # Date range selection
│   │   ├── guest-counter.ts      # Adults/children counter
│   │   ├── guest-rooms.ts        # Room selection with unique inventory
│   │   ├── meal-picker.ts        # Timeslot-based meal grid
│   │   ├── activity-picker.ts    # Activity selection
│   │   ├── category-picker.ts    # Grouped product selection
│   │   ├── contact-form.ts       # Contact details form
│   │   ├── invoice.ts            # Quote/invoice display
│   │   ├── hero-section.ts       # Full-width hero image
│   │   ├── headline.ts           # Section heading
│   │   ├── text-block.ts         # Rich text content
│   │   ├── image-block.ts        # Inline image
│   │   ├── text-input.ts         # Single-line text field
│   │   ├── booking-widget.ts     # Hidden booking integration
│   │   └── payment-widget.ts     # Payment/deposit collection
│   └── ai/                       # AI system
│       ├── ai-tools.ts           # Tool definitions (Anthropic format)
│       ├── ai-executor.ts        # Maps tool calls to store actions
│       ├── ai-prompts.ts         # System prompt builder
│       ├── ai-providers.ts       # Claude API streaming provider
│       └── ai-context.ts         # Context builder for AI
│
├── components/
│   ├── preview/                  # Funnel preview renderers
│   │   ├── FunnelPreview.tsx     # Step/Flow mode toggle + step-by-step view
│   │   ├── FlowPreview.tsx       # Zoomable flow graph with full card rendering
│   │   ├── WidgetRenderer.tsx    # All 18 widget preview renderers (~2400 lines)
│   │   └── ImageCarousel.tsx     # Reusable: carousel, price display, availability
│   ├── editor/                   # Left sidebar editor panels
│   │   ├── StepList.tsx          # Step list with drag reorder
│   │   ├── WidgetConfig.tsx      # Config editor (visual options, meal config, etc.)
│   │   ├── ThemeEditor.tsx       # Theme color/font editor
│   │   ├── VariableFlow.tsx      # Variable binding visualization
│   │   ├── DiagnosticsPanel.tsx  # Debug dump for diagnostics
│   │   ├── PublishModal.tsx      # JSX export modal
│   │   ├── FlowGraph.tsx         # React Flow graph (sidebar tab)
│   │   └── TemplateGallery.tsx   # Widget template browser
│   ├── ai/                       # AI chat interface
│   │   ├── AiChatPanel.tsx       # Dockable/undockable chat with minimize
│   │   └── AiChatMessage.tsx     # Message bubbles with tool result cards
│   └── shared/                   # Shared UI components
│       ├── Button.tsx
│       └── Header.tsx
```

## Data Flow

### 1. Funnel Definition → Preview

```
FunnelDefinition (funnel-store)
  → FunnelPreview (step mode or flow mode)
    → WidgetRenderer (per widget)
      → Reads widget.config + widget.variant
      → Checks venue-data-store for real products
      → Falls back to mock-data if no venue data
      → Renders interactive preview
      → Emits outputs via onOutput callback
        → Stored as funnel variables
          → Resolved as inputs to downstream widgets
```

### 2. Funnel Definition → Published JSX

```
FunnelDefinition (funnel-store)
  → jsx-generator.ts :: generateFunnelJSX()
    → Collects category IDs from widget configs
    → Generates theme constants, helper functions
    → Generates state declarations per widget type
    → Generates useEffect for API data loading
    → Generates syncBooking with products array
    → Generates step components with M3 styling
    → Output: Complete JSX file string
      → User copies from Publish modal
        → Pastes into Everybooking React Funnel editor
          → Runs with window.__EverybookingAPI
```

### 3. AI Chat → Funnel Modification

```
User message → AiChatPanel
  → POST /api/ai/chat (Edge Runtime, streaming SSE)
    → buildSystemPrompt(context) includes:
      - Widget template docs (auto-generated from registry)
      - Current funnel state summary
      - Venue data summary
      - Docked widget context (if in object-edit mode)
    → Claude responds with text + tool_use blocks
      → SSE stream parsed in ai-store
        → Tool calls executed by ai-executor.ts
          → Maps to funnel-store actions
            → Preview updates in real-time
    → Multi-round: if tool_use returned, auto-continues
```

### 4. Venue Data Flow

```
User pastes venue info into AI chat
  → AI calls set_venue_products tool
    → ai-executor stores in venue-data-store
      → Persisted to localStorage
        → Widget previews read from store
          → Real room names, prices, images shown
```

## Three Zustand Stores

### funnel-store.ts
**Purpose:** All funnel CRUD, step/widget operations, undo/redo, persistence.

Key state:
- `funnels: FunnelDefinition[]` — all saved funnels (localStorage)
- `funnel: FunnelDefinition | null` — currently loaded funnel
- `previewStep: string` — which step is shown in preview
- `selectedStepId / selectedWidgetId` — editor selection
- `undoStack / redoStack` — undo/redo history

Key actions:
- `createFunnel`, `cloneFunnel`, `renameFunnel`, `deleteFunnel`
- `addStep`, `removeStep`, `reorderSteps`
- `addWidget`, `removeWidget`, `updateWidgetConfig`, `updateWidgetBindings`
- `setTheme`, `undo`, `redo`
- `saveFunnel` — persists to localStorage

### ai-store.ts
**Purpose:** AI chat state, streaming, model selection, docking.

Key state:
- `messages: AiMessage[]` — conversation history
- `isStreaming: boolean` — SSE stream active
- `selectedModel` — claude-sonnet-4-20250514 / opus / haiku
- `aiPanelOpen`, `isDocked` (sidebar vs floating)
- `isMinimized` — collapsed to title bar
- `dockedStepId`, `dockedWidgetId`, `dockedFocusedItem` — object-edit mode
- `accountContext` — venue name, type, colors (persisted)

Key actions:
- `sendMessage(content, images?, files?)` — sends to API with streaming
- `dockToWidget(stepId, widgetId, label, itemLabel?)` — enters object-edit mode
- `undockWidget()` — exits object-edit mode
- `clearMessages()` — resets conversation

### venue-data-store.ts
**Purpose:** Real venue product catalog for preview rendering.

Key state:
- `venueData.rooms: RoomProduct[]`
- `venueData.meals: MealProduct[]`
- `venueData.activities: ActivityProduct[]`
- `venueData.genericProducts: Record<string, GenericProduct[]>`
- `venueData.taxRates, currency, venueName`

Persisted to localStorage. Populated by AI's `set_venue_products` tool.

## AI System Architecture

### Tools (ai-tools.ts)
13 tools available to Claude:

| Tool | Purpose |
|------|---------|
| `create_complete_funnel` | Build entire funnel from scratch |
| `add_step` | Add single step |
| `remove_step` | Remove step by index |
| `reorder_steps` | Move step to new position |
| `add_widget` | Add widget to step |
| `update_widget_config` | Modify widget config fields |
| `remove_widget` | Remove widget from step |
| `set_theme` | Update theme colors/fonts |
| `configure_segment_picker` | Set segment options with branching |
| `configure_meal_widget` | Configure meals with timeslots/kids/cascade |
| `set_venue_products` | Load venue product catalog |
| `suggest_improvements` | Return text suggestions |

### Executor (ai-executor.ts)
Maps tool names to funnel-store actions. Handles:
- Index-based step/widget references → ID resolution
- Step ID references for branching (`navigation.next`, `conditionalNext`)
- JSON string configs for options/meals/categories
- Venue data store population

### Prompts (ai-prompts.ts)
System prompt includes:
- Auto-generated widget template reference (from registry)
- Standard binding conventions
- Content widget documentation
- Meal widget expert guide (timeslots, kids, cascade)
- Transaction widget specs
- Funnel patterns (Full Booking, Quotation, Simple)
- Proactive branching intelligence rules
- Conditional navigation documentation
- Current funnel state summary
- Venue data summary
- Response format rules (terse, no emoji checklists)

### Object-Docked Mode
When user double-clicks a widget in flow view:
1. AI panel docks to that widget (orange header, scoped context)
2. System prompt injects widget's full config + focused item label
3. AI only modifies that specific widget (rules enforced in prompt)
4. Widget stays highlighted until undock
5. If a specific item was clicked (e.g., "Manitoba Room"), AI knows the exact item

## Widget Template System

### Template Structure (types.ts → WidgetTemplate)
```typescript
{
  id: string;           // e.g., "meal-picker"
  name: string;         // e.g., "Meal Widget"
  category: string;     // "selection" | "content" | "transaction" | "layout"
  description: string;  // For AI context
  icon: string;         // Emoji
  inputs: IOField[];    // What data this widget needs
  outputs: IOField[];   // What data this widget produces
  themeSlots: ThemeSlot[];  // Customizable CSS properties
  configFields: ConfigField[];  // Editor-configurable settings
  variants: Variant[];  // Visual variant options
  rules: Rule[];        // Business logic rules
}
```

### Config Field Types
- `text` — single line input
- `textarea` — multi-line
- `number` — numeric input
- `boolean` — toggle
- `select` — dropdown with options
- `color` — color picker
- `json` — JSON editor (with visual editors for options/meals)

### Visual Config Editors
Three JSON fields have visual editors instead of raw textarea:
1. **segment-picker `options`** → `VisualOptionsEditor` (card list with branching)
2. **option-picker `options`** → `VisualOptionsEditor` (same component)
3. **meal-picker `meals`** → `MealConfigEditor` (Easy/Pro toggle with meal cards)

## JSX Generator (jsx-generator.ts)

### What It Produces
A complete, self-contained JSX file (~700-1500 lines) that:
- Imports only from `widget-sdk/*` and `@rails/actioncable`
- Uses `window.__EverybookingAPI` for data
- Follows M3 (Material Design 3) styling
- Is responsive (mobile → 4K)
- Handles full booking flow: rooms → meals → activities → invoice → payment

### Key Functions
- `generateFunnelJSX(funnel)` — main entry point
- `collectCategoryInfo(funnel)` — extracts category IDs from widget configs
- `generateStepComponent(step, theme)` — per-step JSX
- `generateWidgetJSX(widget)` — per-widget JSX within a step

### Critical: Timeslot Data
Meal products MUST include `timeslot` in syncBooking or they're silently dropped:
```javascript
{ sku: product.sku, startDate, endDate, quantities: { qty: 2, timeslot: 0 }, bookingUnit: 'timeslot' }
```

### Known Gaps
1. `option-picker` JSX is a stub (produces placeholder comment)
2. Preview uses simplified types; JSX uses Everybooking API types
3. Some widget variants don't affect generated output

## Navigation System

### Step Navigation
Each step has:
```typescript
navigation: {
  next?: string | null;          // Step ID to jump to
  back?: string | null;          // Step ID for back button
  nextLabel?: string;            // Button text
  backLabel?: string;
  conditionalNext?: Array<{      // Variable-based routing
    variable: string;            // e.g., "eventSegment"
    operator: "equals" | "not_equals" | "contains";
    value: string;               // e.g., "Wedding"
    targetStepId: string;        // Step ID to jump to
  }>;
}
```

### Segment Picker Branching
Options can have `nextStep` field pointing to a step ID:
```json
{ "id": "retreat", "label": "Group Retreat", "nextStep": "retreat-type" }
```

### Conditional Navigation
Used for mid-funnel routing (e.g., after Group Size → Wedding gets Venue Space, Conference gets Meeting Rooms):
```json
conditionalNext: [
  { "variable": "eventSegment", "operator": "equals", "value": "Wedding", "targetStepId": "venue-space" }
]
```

## Flow Preview System

### Layout Engine (FlowPreview.tsx)
1. Derives connections from segment-picker `nextStep`, `navigation.next`, `conditionalNext`, and default (sequential)
2. Traces paths from step 0 through all branches
3. Tags each step with which branch paths reach it
4. Groups steps into layout rows:
   - **Single row:** Step reachable from all paths (convergence point)
   - **Parallel row:** Steps with non-overlapping branch sets (side-by-side)
   - **Orphan:** Steps not reachable from step 0 (⚠️ warning indicator, offset right)
5. Renders full widget content per step (not abstract nodes)

### SVG Connections
Bezier curves drawn between step cards with:
- Color coding per segment branch
- Labels on curves showing branch name
- Dashed lines for branch connections

## Persistence

### localStorage Keys
- `everybooking-funnels` — Array of FunnelDefinition (all saved funnels)
- `everybooking-venue-data` — VenueData object
- `ai-account-context` — AI store account context
- `ai-selected-model` — Selected Claude model
- `step-rail-width` — Step rail panel width preference

### No Backend Database
Everything is in localStorage. The "Save" button persists the current funnel to the funnels array. Funnels persist across browser refreshes but are browser-specific.

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `ANTHROPIC_API_KEY` | Yes | Claude API key for AI chat |
| `EDITOR_PASSWORD` | Yes | Password for the auth gate |

Set both in Vercel Dashboard → Settings → Environment Variables.

## Deployment

- Push to `main` branch → auto-deploys to Vercel
- Edge Runtime for `/api/ai/chat` (no timeout for streaming)
- Serverless for all other routes
- Hobby plan: 10s timeout for non-Edge, unlimited for Edge streaming

## Integration with Everybooking SaaS

### Widget SDK
The generated JSX imports from:
- `widget-sdk/InvoiceWidget` — Server-rendered invoice
- `widget-sdk/utils` — `buildParameterTree`, `initQuantities`, `clampQuantity`

### API Methods (window.__EverybookingAPI)
- `ready()` → Promise (waits for API initialization)
- `getCategories()` → categories with products
- `getProducts()` → all products
- `getAvailability(productId, startDate, endDate)` → availability data
- `syncBooking({ products, customerInfo })` → syncs selections to booking
- `generateInvoice()` → creates invoice from synced products
- `completeBooking()` → finalizes booking
- `getSessionId()` → session ID for InvoiceWidget

### Booking Data Format
```javascript
api.syncBooking({
  products: [
    { sku: "room-sku", startDate, endDate, quantities: { rooms: 2, adults: 4 },
      bookingUnit: "Nights", units: [{ unitId: "42", adults: [{name: "John"}] }] },
    { sku: "meal-sku", startDate, endDate, quantities: { qty: 4, timeslot: 0 },
      bookingUnit: "timeslot" },
    { sku: "activity-sku", startDate, endDate, quantities: { qty: 6 } }
  ],
  customerInfo: { first_name, last_name, email, phone }
})
```
