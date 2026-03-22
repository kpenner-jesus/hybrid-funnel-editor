// ============================================================
// Core Types for the Hybrid Funnel Editor
// ============================================================

// --- Theme ---

export interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  surfaceColor: string;
  headlineFont: string;
  bodyFont: string;
  borderRadius: number; // px
  cardStyle: "flat" | "elevated" | "outlined";
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
  category: "input" | "display" | "selection" | "form" | "layout";
  description: string;
  icon: string; // emoji or icon identifier
  inputs: TemplateInput[];
  outputs: TemplateOutput[];
  themeSlots: ThemeSlot[];
  configFields: ConfigField[];
  variants: WidgetVariant[];
  rules: BusinessRule[];
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
  type: "submit" | "email" | "webhook" | "redirect";
  trigger: "on_complete" | "on_step_enter" | "on_step_exit";
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
}

// --- Saved Funnel Metadata (for home page list) ---

export interface FunnelMeta {
  id: string;
  name: string;
  stepCount: number;
  updatedAt: string;
}
