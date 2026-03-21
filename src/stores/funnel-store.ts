import { create } from "zustand";
import type { FunnelDefinition, Step, ThemeConfig, WidgetInstance } from "@/lib/types";
import { createEmptyFunnel, createEmptyStep, createWidgetInstance, generateId } from "@/lib/schemas";
import { widgetTemplateRegistry } from "@/lib/widget-templates";
import { mockRooms, mockMeals, mockActivities } from "@/lib/mock-data";

// --- Example Funnel ---

function createExampleFunnel(): FunnelDefinition {
  const funnel = createEmptyFunnel("Wilderness Edge Group Booking");
  funnel.id = "example-wilderness-edge";

  // Step 1: Dates & Guests
  const step1 = createEmptyStep("Dates & Guests");
  const datePicker = createWidgetInstance("date-picker");
  datePicker.config = { title: "When are you visiting?", minStay: 2, maxStay: 14, displayMode: "dual" };
  datePicker.bindings = {
    inputs: {},
    outputs: { checkIn: "checkIn", checkOut: "checkOut" },
  };
  const guestCounter = createWidgetInstance("guest-counter");
  guestCounter.config = { title: "Who's coming?", showInfants: true, maxAdults: 10, maxChildren: 6 };
  guestCounter.bindings = {
    inputs: {},
    outputs: { guests: "guests" },
  };
  step1.widgets = [datePicker, guestCounter];
  step1.navigation = { nextLabel: "Find Rooms", backLabel: "" };

  // Step 2: Room Selection
  const step2 = createEmptyStep("Room Selection");
  const roomPicker = createWidgetInstance("guest-rooms");
  roomPicker.config = { title: "Select Your Rooms", categoryId: 33, showImages: true, showTags: true, layout: "grid" };
  roomPicker.bindings = {
    inputs: { checkIn: "checkIn", checkOut: "checkOut", guests: "guests" },
    outputs: { selectedRooms: "selectedRooms" },
  };
  step2.widgets = [roomPicker];
  step2.navigation = { nextLabel: "Add Meals", backLabel: "Back" };

  // Step 3: Meals
  const step3 = createEmptyStep("Meal Packages");
  const mealPicker = createWidgetInstance("meal-picker");
  mealPicker.config = { title: "Meal Packages", categoryId: 34, meetingMealCategoryId: 39, showDietaryFilters: true, groupByCategory: true, priceDisplay: "per-person" };
  mealPicker.bindings = {
    inputs: { guests: "guests" },
    outputs: { selectedMeals: "selectedMeals" },
  };
  step3.widgets = [mealPicker];
  step3.navigation = { nextLabel: "Add Activities", backLabel: "Back" };

  // Step 4: Activities
  const step4 = createEmptyStep("Activities & Excursions");
  const activityPicker = createWidgetInstance("activity-picker");
  activityPicker.config = { title: "Activities & Excursions", categoryId: 40, showImages: true, showDuration: true, layout: "grid" };
  activityPicker.bindings = {
    inputs: { checkIn: "checkIn", checkOut: "checkOut", guests: "guests" },
    outputs: { selectedActivities: "selectedActivities" },
  };
  step4.widgets = [activityPicker];
  step4.navigation = { nextLabel: "Your Details", backLabel: "Back" };

  // Step 5: Contact
  const step5 = createEmptyStep("Your Details");
  const contactForm = createWidgetInstance("contact-form");
  contactForm.config = { title: "Contact Information", showPhone: true, showCompany: true, showNotes: true, gdprConsent: true };
  contactForm.bindings = {
    inputs: {},
    outputs: { contactInfo: "contactInfo" },
  };
  step5.widgets = [contactForm];
  step5.navigation = { nextLabel: "Review Booking", backLabel: "Back" };

  // Step 6: Invoice
  const step6 = createEmptyStep("Review & Confirm");
  const invoice = createWidgetInstance("invoice");
  invoice.config = { title: "Booking Summary", currency: "CAD", showTax: true, taxRate: 5, showContactSummary: true };
  invoice.bindings = {
    inputs: {
      checkIn: "checkIn",
      checkOut: "checkOut",
      guests: "guests",
      selectedRooms: "selectedRooms",
      selectedMeals: "selectedMeals",
      selectedActivities: "selectedActivities",
      contactInfo: "contactInfo",
    },
    outputs: { totalPrice: "totalPrice" },
  };
  step6.widgets = [invoice];
  step6.navigation = { nextLabel: "Submit Booking", backLabel: "Back" };

  funnel.steps = [step1, step2, step3, step4, step5, step6];

  funnel.actions = [
    {
      id: generateId(),
      type: "submit",
      trigger: "on_complete",
      config: { endpoint: "/api/bookings", method: "POST" },
    },
    {
      id: generateId(),
      type: "email",
      trigger: "on_complete",
      config: { template: "booking-confirmation", to: "{{contactInfo.email}}" },
    },
  ];

  return funnel;
}

// --- Store Helpers ---

function loadFunnelsFromStorage(): FunnelDefinition[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("hybrid-funnel-editor-funnels");
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [];
}

function saveFunnelsToStorage(funnels: FunnelDefinition[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("hybrid-funnel-editor-funnels", JSON.stringify(funnels));
}

// --- Store Interface ---

interface FunnelStore {
  // State
  funnels: FunnelDefinition[];
  funnel: FunnelDefinition | null;
  selectedStepId: string | null;
  selectedWidgetId: string | null;
  previewStep: string | null;
  dataMode: "mock" | "live";
  widgetOutputs: Record<string, Record<string, unknown>>;
  isDirty: boolean;
  initialized: boolean;

  // Init
  initialize: () => void;

  // Funnel CRUD
  loadFunnel: (id: string) => void;
  saveFunnel: () => void;
  createFunnel: (name: string) => string;
  deleteFunnel: (id: string) => void;

  // Step operations
  addStep: (step: Step) => void;
  removeStep: (stepId: string) => void;
  reorderSteps: (fromIdx: number, toIdx: number) => void;
  updateStep: (stepId: string, updates: Partial<Step>) => void;

  // Widget operations
  addWidget: (stepId: string, templateId: string) => void;
  removeWidget: (stepId: string, widgetId: string) => void;
  updateWidgetConfig: (stepId: string, widgetId: string, config: Record<string, unknown>) => void;
  updateWidgetBindings: (stepId: string, widgetId: string, bindings: WidgetInstance["bindings"]) => void;
  updateWidgetVariant: (stepId: string, widgetId: string, variant: string) => void;

  // Theme
  setTheme: (theme: Partial<ThemeConfig>) => void;

  // Variables
  setVariable: (name: string, value: unknown) => void;

  // Selection
  selectStep: (id: string | null) => void;
  selectWidget: (id: string | null) => void;
  setPreviewStep: (id: string | null) => void;

  // Data mode
  setDataMode: (mode: "mock" | "live") => void;

  // Widget outputs (from preview interactions)
  setWidgetOutput: (key: string, outputs: Record<string, unknown>) => void;
}

export const useFunnelStore = create<FunnelStore>((set, get) => ({
  funnels: [],
  funnel: null,
  selectedStepId: null,
  selectedWidgetId: null,
  previewStep: null,
  dataMode: "live",
  widgetOutputs: {},
  isDirty: false,
  initialized: false,

  initialize: () => {
    const stored = loadFunnelsFromStorage();
    if (stored.length === 0) {
      const example = createExampleFunnel();
      saveFunnelsToStorage([example]);
      set({ funnels: [example], initialized: true });
    } else {
      set({ funnels: stored, initialized: true });
    }
  },

  loadFunnel: (id) => {
    const { funnels } = get();
    const funnel = funnels.find((f) => f.id === id) || null;
    set({
      funnel,
      selectedStepId: funnel?.steps[0]?.id || null,
      selectedWidgetId: null,
      previewStep: funnel?.steps[0]?.id || null,
      widgetOutputs: {},
      isDirty: false,
    });
  },

  saveFunnel: () => {
    const { funnel, funnels } = get();
    if (!funnel) return;
    const updated = { ...funnel, updatedAt: new Date().toISOString() };
    const newFunnels = funnels.map((f) => (f.id === updated.id ? updated : f));
    saveFunnelsToStorage(newFunnels);
    set({ funnel: updated, funnels: newFunnels, isDirty: false });
  },

  createFunnel: (name) => {
    const newFunnel = createEmptyFunnel(name);
    const { funnels } = get();
    const newFunnels = [...funnels, newFunnel];
    saveFunnelsToStorage(newFunnels);
    set({ funnels: newFunnels });
    return newFunnel.id;
  },

  deleteFunnel: (id) => {
    const { funnels, funnel } = get();
    const newFunnels = funnels.filter((f) => f.id !== id);
    saveFunnelsToStorage(newFunnels);
    set({
      funnels: newFunnels,
      funnel: funnel?.id === id ? null : funnel,
    });
  },

  addStep: (step) => {
    const { funnel } = get();
    if (!funnel) return;
    const updated = { ...funnel, steps: [...funnel.steps, step] };
    set({ funnel: updated, isDirty: true, selectedStepId: step.id });
  },

  removeStep: (stepId) => {
    const { funnel, selectedStepId } = get();
    if (!funnel) return;
    const updated = { ...funnel, steps: funnel.steps.filter((s) => s.id !== stepId) };
    set({
      funnel: updated,
      isDirty: true,
      selectedStepId: selectedStepId === stepId ? (updated.steps[0]?.id || null) : selectedStepId,
      selectedWidgetId: null,
    });
  },

  reorderSteps: (fromIdx, toIdx) => {
    const { funnel } = get();
    if (!funnel) return;
    const steps = [...funnel.steps];
    const [moved] = steps.splice(fromIdx, 1);
    steps.splice(toIdx, 0, moved);
    set({ funnel: { ...funnel, steps }, isDirty: true });
  },

  updateStep: (stepId, updates) => {
    const { funnel } = get();
    if (!funnel) return;
    const steps = funnel.steps.map((s) => (s.id === stepId ? { ...s, ...updates } : s));
    set({ funnel: { ...funnel, steps }, isDirty: true });
  },

  addWidget: (stepId, templateId) => {
    const { funnel } = get();
    if (!funnel) return;
    const template = widgetTemplateRegistry[templateId];
    if (!template) return;
    const widget = createWidgetInstance(templateId, template.variants[0]?.id || "default");

    // Apply default config from template
    const defaultConfig: Record<string, unknown> = {};
    for (const field of template.configFields) {
      if (field.defaultValue !== undefined) {
        defaultConfig[field.name] = field.defaultValue;
      }
    }
    widget.config = defaultConfig;

    const steps = funnel.steps.map((s) =>
      s.id === stepId ? { ...s, widgets: [...s.widgets, widget] } : s
    );
    set({ funnel: { ...funnel, steps }, isDirty: true, selectedWidgetId: widget.instanceId });
  },

  removeWidget: (stepId, widgetId) => {
    const { funnel, selectedWidgetId } = get();
    if (!funnel) return;
    const steps = funnel.steps.map((s) =>
      s.id === stepId ? { ...s, widgets: s.widgets.filter((w) => w.instanceId !== widgetId) } : s
    );
    set({
      funnel: { ...funnel, steps },
      isDirty: true,
      selectedWidgetId: selectedWidgetId === widgetId ? null : selectedWidgetId,
    });
  },

  updateWidgetConfig: (stepId, widgetId, config) => {
    const { funnel } = get();
    if (!funnel) return;
    const steps = funnel.steps.map((s) =>
      s.id === stepId
        ? {
            ...s,
            widgets: s.widgets.map((w) =>
              w.instanceId === widgetId ? { ...w, config: { ...w.config, ...config } } : w
            ),
          }
        : s
    );
    set({ funnel: { ...funnel, steps }, isDirty: true });
  },

  updateWidgetBindings: (stepId, widgetId, bindings) => {
    const { funnel } = get();
    if (!funnel) return;
    const steps = funnel.steps.map((s) =>
      s.id === stepId
        ? {
            ...s,
            widgets: s.widgets.map((w) =>
              w.instanceId === widgetId ? { ...w, bindings } : w
            ),
          }
        : s
    );
    set({ funnel: { ...funnel, steps }, isDirty: true });
  },

  updateWidgetVariant: (stepId, widgetId, variant) => {
    const { funnel } = get();
    if (!funnel) return;
    const steps = funnel.steps.map((s) =>
      s.id === stepId
        ? {
            ...s,
            widgets: s.widgets.map((w) =>
              w.instanceId === widgetId ? { ...w, variant } : w
            ),
          }
        : s
    );
    set({ funnel: { ...funnel, steps }, isDirty: true });
  },

  setTheme: (theme) => {
    const { funnel } = get();
    if (!funnel) return;
    set({ funnel: { ...funnel, theme: { ...funnel.theme, ...theme } }, isDirty: true });
  },

  setVariable: (name, value) => {
    const { funnel } = get();
    if (!funnel) return;
    const variables = funnel.variables.map((v) =>
      v.name === name ? { ...v, defaultValue: value } : v
    );
    set({ funnel: { ...funnel, variables }, isDirty: true });
  },

  selectStep: (id) => set({ selectedStepId: id, selectedWidgetId: null }),
  selectWidget: (id) => set({ selectedWidgetId: id }),
  setPreviewStep: (id) => set({ previewStep: id }),
  setDataMode: (mode) => set({ dataMode: mode }),
  setWidgetOutput: (key, outputs) =>
    set((state) => ({ widgetOutputs: { ...state.widgetOutputs, [key]: outputs } })),
}));
