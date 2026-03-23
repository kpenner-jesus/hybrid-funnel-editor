// ============================================================
// Core Types for the Hybrid Funnel Editor
// ============================================================

// --- Theme ---

export type HeaderPreset = "journey-icons" | "sticky-bar" | "hero-banner" | "sidebar-nav" | "immersive" | "magazine";
export type FooterPreset = "frosted-glass" | "action-bar" | "floating-buttons" | "progress-footer";
export type MobileHeaderPreset = "progress-bar" | "dots" | "minimal" | "hidden";

export interface FunnelLayout {
  // Header
  desktopHeader: HeaderPreset;
  tabletHeader: HeaderPreset | "auto"; // "auto" = follow desktop
  mobileHeader: MobileHeaderPreset;
  // Footer
  footerStyle: FooterPreset;
  showRunningTotal: boolean;
  showTrustBadges: boolean; // trust bar on payment step
  showTimeEstimate: boolean; // "~3 min left" in header
  showStepCounter: boolean; // "Step 3 of 22"
  // Contextual labels
  useContextualNextLabels: boolean; // auto "Choose Your Rooms →" etc.
  // Celebrations
  showMicroCelebrations: boolean;
}

export const DEFAULT_LAYOUT: FunnelLayout = {
  desktopHeader: "journey-icons",
  tabletHeader: "auto",
  mobileHeader: "progress-bar",
  footerStyle: "frosted-glass",
  showRunningTotal: false,
  showTrustBadges: true,
  showTimeEstimate: true,
  showStepCounter: true,
  useContextualNextLabels: true,
  showMicroCelebrations: true,
};

export interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string; // e.g., amber/gold #F5A623
  surfaceColor: string;
  headlineFont: string;
  bodyFont: string;
  borderRadius: number; // px
  cardStyle: "flat" | "elevated" | "outlined";
  logoUrl?: string; // account/venue logo URL
  timezone?: string; // e.g., "America/Chicago"
  layout?: FunnelLayout; // header/footer/navigation presets
}

// --- Variables ---

export interface VariableDefinition {
  name: string;
  type: "string" | "number" | "boolean" | "date" | "array" | "object";
  defaultValue?: unknown;
  label?: string;
  description?: string;
}

// --- Widget Template ---

export interface TemplateInput {
  name: string;
  type: "string" | "number" | "boolean" | "date" | "array" | "object";
  label: string;
  required?: boolean;
  defaultValue?: unknown;
  description?: string;
}

export interface TemplateOutput {
  name: string;
  type: "string" | "number" | "boolean" | "date" | "array" | "object";
  label: string;
  description?: string;
}

export interface ThemeSlot {
  name: string;
  cssProperty: string;
  defaultValue: string;
  label: string;
}

export interface WidgetVariant {
  id: string;
  name: string;
  description: string;
  previewPlaceholder?: string; // placeholder description for rendering
}

export interface BusinessRule {
  id: string;
  description: string;
  condition: string; // expression placeholder
  action: string;
}

export interface ConfigField {
  name: string;
  type: "text" | "number" | "color" | "select" | "boolean" | "textarea" | "json";
  label: string;
  defaultValue?: unknown;
  options?: { value: string; label: string }[]; // for select type
  description?: string;
  required?: boolean;
}

export interface WidgetTemplate {
  id: string;
  name: string;
  category: "input" | "display" | "selection" | "form" | "layout" | "pricing" | "transaction" | "content";
  description: string;
  icon: string; // emoji or icon identifier
  inputs: TemplateInput[];
  outputs: TemplateOutput[];
  themeSlots: ThemeSlot[];
  configFields: ConfigField[];
  variants: WidgetVariant[];
  rules: BusinessRule[];

  // --- Rich Registry Metadata (for catalog, AI selection, and search) ---

  /** Detailed description for AI — explains WHEN to use this widget and WHY */
  aiDescription?: string;
  /** Explicit notes for AI on what NOT to confuse this with */
  aiConfusionNotes?: string;
  /** Business scenarios this widget is best for (searchable) */
  bestFor?: string[];
  /** Business scenarios this widget should NOT be used for */
  notFor?: string[];
  /** System tags for search and filtering (business types, functions, features) */
  tags?: string[];
  /** Widget IDs that this widget could be swapped with (for carousel) */
  swappableWith?: string[];
  /** What upstream data this widget needs to function correctly */
  requiresInputs?: string[];
  /** Complexity level for Joe to understand difficulty */
  complexity?: "simple" | "moderate" | "complex";
  /** Which industries commonly use this widget */
  industries?: string[];
  /** Pricing model this widget uses (for compound pricing engine) */
  pricingModel?: "flat" | "per-person" | "per-hour" | "per-person-per-hour" | "per-unit" | "tiered" | "calculated" | "none";
  /** Subcategory for finer grouping in catalog */
  subcategory?: string;
  /** Why this widget is needed — business value explanation for Joe */
  whyNeeded?: string;
  /** Can we work around not having this widget? What's the alternative? */
  workaround?: string;
}

// --- Variable Binding ---

export interface VariableBinding {
  inputs: Record<string, string>; // widgetInputName -> variableName or "stepId.widgetId.outputName"
  outputs: Record<string, string>; // widgetOutputName -> variableName
}

// --- Widget Instance ---

export interface WidgetInstance {
  instanceId: string;
  templateId: string;
  variant: string;
  config: Record<string, unknown>;
  bindings: VariableBinding;
  themeOverrides: Record<string, string>;
}

// --- Step ---

export interface ConditionalNavRule {
  variable: string;      // funnel variable name, e.g. "eventSegment"
  operator: "equals" | "not_equals" | "contains";
  value: string;         // value to compare against
  targetStepId: string;  // step ID to navigate to if condition matches
  label?: string;        // optional label for flow visualization
}

export interface StepNavigation {
  next?: string | null; // step id or null for last (default fallback)
  back?: string | null;
  nextLabel?: string;
  backLabel?: string;
  hideBack?: boolean; // if true, Back button is hidden — user cannot go backward past this step
  conditionalNext?: ConditionalNavRule[]; // evaluated in order, first match wins
}

export interface Step {
  id: string;
  title: string;
  layout: "single" | "two-column" | "stacked";
  visibleIf?: string; // expression or empty
  widgets: WidgetInstance[];
  navigation: StepNavigation;
}

// --- Actions ---

export interface FunnelAction {
  id: string;
  type: "submit" | "email" | "webhook" | "redirect" | "generate_invoice";
  trigger: "on_complete" | "on_step_enter" | "on_step_exit" | "on_button_click";
  config: Record<string, unknown>;
}

// --- Funnel Definition ---

export interface FunnelDefinition {
  id: string;
  name: string;
  accountId: string;
  createdAt: string;
  updatedAt: string;
  theme: ThemeConfig;
  variables: VariableDefinition[];
  steps: Step[];
  actions: FunnelAction[];
}

// --- Product Types for Mock Data ---

export interface RoomProduct {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  pricePerNight: number;
  currency: string;
  tags: string[];
  maxAdults: number;
  maxChildren: number;
  stock: number;
}

export interface MealProduct {
  id: string;
  name: string;
  description: string;
  pricePerPerson: number;
  currency: string;
  category: "breakfast" | "lunch" | "dinner" | "snack";
  dietaryOptions: string[];
}

export interface ActivityProduct {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  pricePerPerson: number;
  currency: string;
  durationMinutes: number;
  maxParticipants: number;
  tags?: string[];
  timeslots?: Array<{ start: string; end: string }>; // e.g., [{start:"09:00", end:"12:00"}]
}

// --- Saved Funnel Metadata (for home page list) ---

export interface FunnelMeta {
  id: string;
  name: string;
  stepCount: number;
  updatedAt: string;
}
