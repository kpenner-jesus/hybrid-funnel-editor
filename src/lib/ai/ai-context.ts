import type { FunnelDefinition } from "@/lib/types";
import { widgetTemplateRegistry } from "@/lib/widget-templates";

// --- Account Context ---

export interface AccountContext {
  venueName: string;
  venueType: "resort" | "hotel" | "retreat-center" | "conference-center" | "camp" | "villa" | "other";
  location: string;
  brandColors: { primary: string; secondary: string };
  tone: "professional" | "warm" | "luxury" | "casual" | "adventurous";
  websiteUrl: string;
}

// --- Funnel Context ---

export interface FunnelContext {
  funnelType: "quotation" | "booking";
  categoryIds: { rooms?: number; meals?: number; activities?: number };
  currency: string;
}

// --- Step Context ---

export interface StepContext {
  stepId: string;
  aiNotes: string;
}

// --- Widget Context ---

export interface WidgetContext {
  widgetInstanceId: string;
  aiNotes: string;
}

// --- Full AI Context ---

export interface AiContext {
  account: AccountContext;
  funnel: FunnelContext;
  steps: StepContext[];
  widgets: WidgetContext[];
  currentFunnelState: FunnelDefinition | null;
  availableTemplates: Array<{
    id: string;
    name: string;
    category: string;
    description: string;
    configFields: Array<{ name: string; type: string; label: string; defaultValue?: unknown }>;
    inputs: Array<{ name: string; type: string; label: string }>;
    outputs: Array<{ name: string; type: string; label: string }>;
    variants: Array<{ id: string; name: string; description: string }>;
  }>;
}

// --- Default Contexts ---

export const defaultAccountContext: AccountContext = {
  venueName: "",
  venueType: "resort",
  location: "",
  brandColors: { primary: "#006c4b", secondary: "#795828" },
  tone: "warm",
  websiteUrl: "",
};

export const defaultFunnelContext: FunnelContext = {
  funnelType: "quotation",
  categoryIds: {},
  currency: "USD",
};

// --- Builder ---

export function buildAiContext(
  funnel: FunnelDefinition | null,
  accountContext: AccountContext,
  funnelContext: FunnelContext
): AiContext {
  const steps: StepContext[] = (funnel?.steps ?? []).map((s) => ({
    stepId: s.id,
    aiNotes: "",
  }));

  const widgets: WidgetContext[] = (funnel?.steps ?? []).flatMap((s) =>
    s.widgets.map((w) => ({
      widgetInstanceId: w.instanceId,
      aiNotes: "",
    }))
  );

  const availableTemplates = Object.values(widgetTemplateRegistry).map((t) => ({
    id: t.id,
    name: t.name,
    category: t.category,
    description: t.description,
    configFields: t.configFields.map((cf) => ({
      name: cf.name,
      type: cf.type,
      label: cf.label,
      defaultValue: cf.defaultValue,
    })),
    inputs: t.inputs.map((i) => ({
      name: i.name,
      type: i.type,
      label: i.label,
    })),
    outputs: t.outputs.map((o) => ({
      name: o.name,
      type: o.type,
      label: o.label,
    })),
    variants: t.variants.map((v) => ({
      id: v.id,
      name: v.name,
      description: v.description,
    })),
  }));

  return {
    account: accountContext,
    funnel: funnelContext,
    steps,
    widgets,
    currentFunnelState: funnel,
    availableTemplates,
  };
}
