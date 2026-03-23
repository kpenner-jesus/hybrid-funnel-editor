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
| Persistence | Vercel KV (Redis) + localStorage fallback |
| Image Search | Pexels API (stock photos for AI) |

## Directory Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── page.tsx                  # Landing page (funnel list, create, clone)
│   ├── login/page.tsx            # Password gate login
│   ├── editor/[id]/page.tsx      # Main editor (sidebar + preview + AI)
│   ├── api/
│   │   ├── ai/chat/route.ts      # POST streaming AI endpoint (Edge Runtime)
│   │   ├── auth/login/route.ts   # Password verification
│   │   ├── funnels/route.ts      # GET/POST Vercel KV funnel persistence
│   │   └── images/route.ts       # GET Pexels image search proxy
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

### Published Funnel Navigation Features
The generated JSX includes a rich navigation system:
- **ProgressJourney:** Icon-based step journey map (desktop), gradient bar (mobile)
- **StepIcon:** Emoji per step type (📅🛏️🍽️🏔️💳🎉) with completed/active/upcoming states
- **Contextual Next Labels:** "Choose Your Rooms →", "Select Meals →" based on next step content
- **Smart Back:** History stack for correct back navigation in branching funnels
- **Back Tooltip:** Hover preview showing "← Back to Room Selection"
- **MicroCelebration:** Ping animation on step completion
- **TrustBar:** Security badges on payment step (SSL, encrypted, contact)
- **MealTimeslotGrid:** Date × meal grid with availability bars and timeslot dropdowns
- **hideBack:** Per-step toggle to prevent backward navigation

### API-First Widget Pattern

All product-based widgets follow a two-layer pattern:

| Widget | API Source (production) | Config Fallback (preview) |
|--------|----------------------|--------------------------|
| Guest Rooms | `roomProducts` from `getCategories()` | venue data store rooms |
| Meal Picker | `mealProducts` from `getCategories()` | widget config `meals` JSON |
| Activity Picker | `activityProducts` from `getCategories()` | venue data store activities |
| Category Picker | TODO: `getCategories()` by categoryId | widget config `categories` JSON |
| Guest Counter | TODO: product parameters from API | widget config `youthCategories` JSON |

**The rule:** Published JSX should ALWAYS prefer API data when available. Widget config data is the fallback for preview/standalone mode. The API returns real SKUs, real pricing, real parameters — the config is an approximation.

**For CTO integrating with Rails:** The `MealTimeslotGrid` component already accepts both `mealProducts` (API) and `meals` (config). When `mealProducts` is populated from `getCategories()`, it overrides the config meals. Same pattern should be applied to Category Picker when wiring to real Everybooking categories.

### Known Gaps
1. Preview uses simplified data types; JSX uses Everybooking API types (architectural by design)
2. Some widget variants don't affect generated output (segment-picker variants work, others are cosmetic)
3. Running total needs wiring from actual price calculations to BottomNav
4. Mobile floating action island not yet built
5. Category picker not yet wired to API — uses config data only (works, but no real SKUs for syncBooking)

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

### Vercel KV (Redis) Persistence
Funnels are persisted to Vercel KV so they're shared across devices:
- `/api/funnels` GET — returns all funnels from KV
- `/api/funnels` POST — saves funnel to KV (keyed by funnel ID)
- localStorage used as fallback when KV is unavailable
- Auto-syncs on save with 3-second debounce

### localStorage Keys (browser-local cache)
- `everybooking-funnels` — Cached funnel array
- `everybooking-venue-data` — VenueData object
- `ai-account-context` — AI store account context
- `ai-selected-model` — Selected Claude model
- `step-rail-width` — Step rail panel width preference

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `ANTHROPIC_API_KEY` | Yes | Claude API key for AI chat |
| `EDITOR_PASSWORD` | Yes | Password for the auth gate |
| `KV_REST_API_URL` | Yes (auto) | Vercel KV endpoint (auto-set by Vercel) |
| `KV_REST_API_TOKEN` | Yes (auto) | Vercel KV auth token (auto-set by Vercel) |
| `PEXELS_API_KEY` | No | Pexels API key for image search (optional) |

Vercel KV variables are auto-injected when you connect a KV store to the project.
Set `ANTHROPIC_API_KEY` and `EDITOR_PASSWORD` manually in Vercel Dashboard → Settings → Environment Variables.

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

### CRITICAL ARCHITECTURE PRINCIPLE: Thin Client

**The editor is a THIN CLIENT. Everybooking is the single source of truth.**

The editor does NOT maintain its own:
- Parameter registry (age categories, pricing tiers)
- Inventory system (stock counts, availability)
- Pricing engine (base prices, group pricing, age multipliers)
- Product catalog (beyond preview approximations)

All of these live in the Everybooking database and are exposed via the API. The editor's job is:
1. **COLLECT** — user selections (dates, quantities, room choices)
2. **DISPLAY** — preview approximations using venue data store
3. **PASS** — selections to `syncBooking()` with correct `{ sku, quantities: { [report_id]: value } }`
4. **LET EVERYBOOKING CALCULATE** — pricing, taxes, invoices, inventory

### Everybooking Parameter System (DO NOT REBUILD)

Parameters are per-account records with:
- `report_id` — machine identifier (e.g., "adults", "kids_age", "qty")
- `pricing: boolean` — if true, parameter value multiplies with base_price
- `controls_inventory: boolean` — if true, decrements stock
- `min/max` — stored in `resource.rules["param"][report_id]`
- Parent/child hierarchy via `parent_id` on ParameterAssignment

Products return their parameters via `getCategories()`:
```javascript
product.parameters = [
  { report_id: "adults", name: "Adults", controls_inventory: true, min: 1, max: 400 },
  { report_id: "kids_age", name: "Kids Age", pricing: true, min: 0, max: 17 }
]
product.price = {
  "adults": { "base_price": "50.00", "group_price": {...} },
  "kids_age": { "base_price": "1.50" }  // $1.50 × age — server calculates
}
```

The editor never needs to know the pricing formula. It collects `kids_age: 8` from the user and passes it to `syncBooking()`. The server calculates `$1.50 × 8 = $12.00`.

### Preview vs Production Data Flow

**Preview (standalone editor on Vercel):**
```
Venue data store (manual/AI populated)
  → Widget preview renderers use simplified types
  → Approximate display for Zoom demos
  → No real pricing, no real inventory
```

**Production (embedded in Rails/Heroku):**
```
Everybooking API (getCategories, getProducts)
  → Published JSX reads real products with parameters
  → Real pricing from product.price JSONB
  → Real inventory from stock counts
  → Real timeslots from product timeslot records
  → syncBooking sends { sku, quantities: { [report_id]: value } }
  → Server calculates totals, generates invoice
```

### Guest Counter: Two Modes

**Preview mode (venue data store):**
- Uses `youthCategories` config for visual display
- Approximate — shows adults + children/youth counters
- Age collection is preview-only (average slider / individual boxes)

**Production mode (API-driven):**
- Reads product parameters from `getCategories()`
- Dynamically builds counters based on which `report_id` values exist
- Passes collected values directly to `syncBooking()`
- No local pricing — server handles everything

### Rails Integration Hooks (rails-integration.ts)
Pre-built mapping functions for when this editor is embedded in the Heroku Rails app:

```typescript
// Convert Rails product records to editor venue data
railsProductsToRooms(products: RailsProduct[]): RoomProduct[]
railsProductsToActivities(products: RailsProduct[]): ActivityProduct[]
railsMealsToWidgetConfig(mealProducts: RailsProduct[], options): MealWidgetConfig

// Convert editor funnel to Rails-compatible format
funnelToRailsSurvey(funnel: FunnelDefinition): RailsSurveyData
```

When embedded in Rails:
1. Replace localStorage/KV persistence with Rails API calls
2. Replace `set_venue_products` AI tool with direct database reads via `getCategories()`
3. Products come from the venue's actual Everybooking inventory (real SKUs, stock, prices, parameters)
4. Guest counter reads parameters from products — no local age category registry needed
5. Published JSX is saved directly to the `Funnel` model's `component_code` field
6. No more copy-paste workflow — Publish writes to database
7. Parameters are NOT created by the editor — they're managed in Everybooking's admin or created during product setup

## Testing Strategy

### Unit Tests (Recommended Priority)

| File | What to Test | Priority |
|------|-------------|----------|
| `jsx-generator.ts` | Generated JSX compiles, has correct step count, proper branching | **Critical** |
| `ai-executor.ts` | Tool calls map correctly to store actions | **Critical** |
| `funnel-store.ts` | CRUD operations, undo/redo, step reordering | **High** |
| `schemas.ts` | Factory functions produce valid defaults | **High** |
| `variable-engine.ts` | Variable binding resolution | **Medium** |
| `ai-prompts.ts` | System prompt includes expected sections | **Medium** |
| Widget templates | Each template has valid configFields, inputs, outputs | **Medium** |

### Integration Tests

| Flow | What to Test |
|------|-------------|
| AI → Funnel creation | Send "create a retreat funnel" → verify steps/widgets created |
| AI → Widget config | Dock to widget, send edit → verify config updated |
| Funnel → JSX | Create funnel → publish → verify JSX compiles without errors |
| Branching | Create branching funnel → verify no orphan steps |
| Meal widget | Configure meals → verify timeslot grid renders with correct dates |

### Testing the Generated JSX
The most critical test: does the published JSX actually work on Everybooking?

1. Create a funnel in the editor
2. Click Publish → copy JSX
3. Paste into Everybooking's React Funnel editor for a test venue
4. Verify: rooms load, meals show timeslot grid, activities display, invoice generates, payment works

### Snapshot Tests
Consider snapshot tests for `jsx-generator.ts` output — create a reference funnel definition and snapshot the generated JSX. Any change to the generator shows up as a diff.

```typescript
// Example test
test('generates valid JSX for Wilderness Edge funnel', () => {
  const funnel = createTestFunnel(); // 22-step branching funnel
  const jsx = generateFunnelJSX(funnel);
  expect(jsx).toMatchSnapshot();
  // Verify no syntax errors
  expect(() => new Function(jsx)).not.toThrow(); // basic syntax check
});
```
