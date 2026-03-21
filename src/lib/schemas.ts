import type { FunnelDefinition, ThemeConfig, Step, WidgetInstance } from "./types";

// --- Default Theme ---

export const defaultTheme: ThemeConfig = {
  primaryColor: "#006c4b",
  secondaryColor: "#795828",
  surfaceColor: "#f9f9ff",
  headlineFont: "Noto Serif",
  bodyFont: "Inter",
  borderRadius: 12,
  cardStyle: "elevated",
};

// --- Generators ---

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyStep(title: string): Step {
  return {
    id: generateId(),
    title,
    layout: "single",
    widgets: [],
    navigation: {
      nextLabel: "Continue",
      backLabel: "Back",
    },
  };
}

export function createWidgetInstance(
  templateId: string,
  variant: string = "default"
): WidgetInstance {
  return {
    instanceId: generateId(),
    templateId,
    variant,
    config: {},
    bindings: { inputs: {}, outputs: {} },
    themeOverrides: {},
  };
}

export function createEmptyFunnel(name: string): FunnelDefinition {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name,
    accountId: "demo-account",
    createdAt: now,
    updatedAt: now,
    theme: { ...defaultTheme },
    variables: [
      { name: "checkIn", type: "date", label: "Check-in Date" },
      { name: "checkOut", type: "date", label: "Check-out Date" },
      { name: "guests", type: "object", label: "Guest Count", defaultValue: { adults: 2, children: 0 } },
      { name: "selectedRooms", type: "array", label: "Selected Rooms", defaultValue: [] },
      { name: "selectedMeals", type: "array", label: "Selected Meals", defaultValue: [] },
      { name: "selectedActivities", type: "array", label: "Selected Activities", defaultValue: [] },
      { name: "totalPrice", type: "number", label: "Total Price", defaultValue: 0 },
      { name: "contactInfo", type: "object", label: "Contact Information" },
    ],
    steps: [],
    actions: [],
  };
}

// --- Validation ---

export function validateFunnelDefinition(funnel: FunnelDefinition): string[] {
  const errors: string[] = [];

  if (!funnel.name.trim()) {
    errors.push("Funnel must have a name.");
  }

  if (funnel.steps.length === 0) {
    errors.push("Funnel must have at least one step.");
  }

  const stepIds = new Set<string>();
  for (const step of funnel.steps) {
    if (stepIds.has(step.id)) {
      errors.push(`Duplicate step ID: ${step.id}`);
    }
    stepIds.add(step.id);

    if (!step.title.trim()) {
      errors.push(`Step "${step.id}" must have a title.`);
    }

    const widgetIds = new Set<string>();
    for (const widget of step.widgets) {
      if (widgetIds.has(widget.instanceId)) {
        errors.push(`Duplicate widget instance ID: ${widget.instanceId} in step "${step.title}"`);
      }
      widgetIds.add(widget.instanceId);
    }
  }

  return errors;
}

export function validateWidgetBindings(
  funnel: FunnelDefinition,
  stepId: string,
  widgetId: string
): string[] {
  const errors: string[] = [];
  const step = funnel.steps.find((s) => s.id === stepId);
  if (!step) {
    errors.push(`Step "${stepId}" not found.`);
    return errors;
  }

  const widget = step.widgets.find((w) => w.instanceId === widgetId);
  if (!widget) {
    errors.push(`Widget "${widgetId}" not found in step "${stepId}".`);
    return errors;
  }

  const variableNames = new Set(funnel.variables.map((v) => v.name));

  for (const [, varName] of Object.entries(widget.bindings.inputs)) {
    if (!varName.includes(".") && !variableNames.has(varName)) {
      errors.push(`Input binding references unknown variable: "${varName}"`);
    }
  }

  for (const [, varName] of Object.entries(widget.bindings.outputs)) {
    if (!variableNames.has(varName)) {
      errors.push(`Output binding references unknown variable: "${varName}"`);
    }
  }

  return errors;
}
