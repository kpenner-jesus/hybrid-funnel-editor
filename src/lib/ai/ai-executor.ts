import type { FunnelDefinition, Step, ThemeConfig, WidgetInstance } from "@/lib/types";
import { createEmptyStep, createEmptyFunnel, createWidgetInstance } from "@/lib/schemas";
import { widgetTemplateRegistry } from "@/lib/widget-templates";
import { useVenueDataStore } from "@/stores/venue-data-store";

export interface ToolCallResult {
  success: boolean;
  message: string;
}

interface StoreActions {
  getFunnel: () => FunnelDefinition | null;
  setFunnel: (funnel: FunnelDefinition) => void;
  addStep: (step: Step) => void;
  removeStep: (stepId: string) => void;
  reorderSteps: (fromIdx: number, toIdx: number) => void;
  updateStep: (stepId: string, updates: Partial<Step>) => void;
  addWidget: (stepId: string, templateId: string) => void;
  removeWidget: (stepId: string, widgetId: string) => void;
  updateWidgetConfig: (stepId: string, widgetId: string, config: Record<string, unknown>) => void;
  updateWidgetBindings: (stepId: string, widgetId: string, bindings: WidgetInstance["bindings"]) => void;
  updateWidgetVariant: (stepId: string, widgetId: string, variant: string) => void;
  setTheme: (theme: Partial<ThemeConfig>) => void;
}

// Default timeslot windows per meal category
function getDefaultTimeslot(category: string): { start: string; end: string } {
  const cat = category.toLowerCase();
  if (cat.includes("breakfast") || cat.includes("brunch")) return { start: "07:00", end: "09:00" };
  if (cat.includes("lunch")) return { start: "12:00", end: "14:00" };
  if (cat.includes("supper") || cat.includes("dinner")) return { start: "17:00", end: "19:00" };
  if (cat.includes("snack") || cat.includes("night")) return { start: "20:00", end: "22:00" };
  if (cat.includes("tea") || cat.includes("afternoon")) return { start: "14:00", end: "16:00" };
  return { start: "12:00", end: "13:00" };
}

// Default day selectability rules per meal category
function getDefaultDayRule(category: string, dayPosition: "checkIn" | "checkOut"): string {
  const cat = category.toLowerCase();
  if (dayPosition === "checkIn") {
    // Breakfast unavailable on check-in day (guests arrive mid-day)
    if (cat.includes("breakfast") || cat.includes("brunch")) return "unselectable";
    return "selectable";
  }
  if (dayPosition === "checkOut") {
    // Supper/snack unavailable on check-out day (guests leave)
    if (cat.includes("supper") || cat.includes("dinner") || cat.includes("snack") || cat.includes("night")) return "unselectable";
    return "selectable";
  }
  return "selectable";
}

function resolveStepByIndex(funnel: FunnelDefinition, stepIndex: number): Step | null {
  if (stepIndex < 0 || stepIndex >= funnel.steps.length) return null;
  return funnel.steps[stepIndex];
}

function resolveWidgetByIndex(step: Step, widgetIndex: number): WidgetInstance | null {
  if (widgetIndex < 0 || widgetIndex >= step.widgets.length) return null;
  return step.widgets[widgetIndex];
}

export function executeAiToolCall(
  toolName: string,
  args: Record<string, unknown>,
  store: StoreActions
): ToolCallResult {
  try {
    const funnel = store.getFunnel();

    switch (toolName) {
      case "create_complete_funnel": {
        const name = (args.name as string) || "New Funnel";
        const themeOverrides = (args.theme as Partial<ThemeConfig>) || {};
        const stepsData = (args.steps as Array<Record<string, unknown>>) || [];

        // Guard: cap at 60 steps max to prevent runaway funnel creation
        if (stepsData.length > 60) {
          return {
            success: false,
            message: `Too many steps (${stepsData.length}). Maximum is 60. Most funnels have 20-30 steps. Keep widget configs compact — do NOT inline huge JSON blobs.`,
          };
        }

        // Guard: prevent nuclear rebuild on existing funnels with content
        if (funnel && funnel.steps.length > 3) {
          const hasWidgets = funnel.steps.some(s => s.widgets.length > 0);
          if (hasWidgets) {
            return {
              success: false,
              message: `BLOCKED: This funnel already has ${funnel.steps.length} steps with widgets. Do NOT rebuild — use update_step or wire_navigation for modifications. Use create_complete_funnel ONLY when starting from empty (0-3 steps). To force a rebuild, the user must first clear all steps.`,
            };
          }
        }

        // Build the new funnel based on the existing one (preserving id, accountId, etc.)
        const baseFunnel = funnel ? { ...funnel } : createEmptyFunnel(name);
        baseFunnel.name = name;
        baseFunnel.theme = { ...baseFunnel.theme, ...themeOverrides };
        baseFunnel.updatedAt = new Date().toISOString();

        const newSteps: Step[] = [];
        for (const sd of stepsData) {
          const step = createEmptyStep((sd.title as string) || "Untitled Step");
          // Allow AI to specify a custom step ID for cross-referencing in branching
          if (sd.id && typeof sd.id === "string") {
            step.id = sd.id;
          }
          if (sd.layout) step.layout = sd.layout as Step["layout"];
          if (sd.navigation) {
            const nav = sd.navigation as Record<string, unknown>;
            step.navigation = {
              ...step.navigation,
              ...(nav.nextLabel !== undefined ? { nextLabel: nav.nextLabel as string } : {}),
              ...(nav.backLabel !== undefined ? { backLabel: nav.backLabel as string } : {}),
              ...(nav.next !== undefined ? { next: nav.next as string } : {}),
              ...(Array.isArray(nav.conditionalNext) ? { conditionalNext: nav.conditionalNext as import("@/lib/types").ConditionalNavRule[] } : {}),
            };
          }

          const widgetsData = (sd.widgets as Array<Record<string, unknown>>) || [];
          const stepWidgets: WidgetInstance[] = [];

          for (const wd of widgetsData) {
            const templateId = wd.templateId as string;
            if (!widgetTemplateRegistry[templateId]) {
              continue; // skip unknown templates
            }
            const template = widgetTemplateRegistry[templateId];
            const variant = (wd.variant as string) || template.variants[0]?.id || "default";
            const widget = createWidgetInstance(templateId, variant);

            // Apply default config from template
            const defaultConfig: Record<string, unknown> = {};
            for (const field of template.configFields) {
              if (field.defaultValue !== undefined) {
                defaultConfig[field.name] = field.defaultValue;
              }
            }
            widget.config = { ...defaultConfig, ...((wd.config as Record<string, unknown>) || {}) };

            if (wd.bindings) {
              const b = wd.bindings as Record<string, Record<string, string>>;
              widget.bindings = {
                inputs: b.inputs || {},
                outputs: b.outputs || {},
              };
            }

            // Auto-populate meal-picker from venue data if meals config not explicitly set
            if (templateId === "meal-picker" && !((wd.config as Record<string, unknown>)?.meals)) {
              const venueData = useVenueDataStore.getState().venueData;
              if (venueData?.meals && venueData.meals.length > 0) {
                const mealDefs = venueData.meals.map((m, i) => ({
                  id: m.id || `meal-${i}`,
                  name: m.name,
                  sortOrder: i + 1,
                  adultPrice: m.pricePerPerson,
                  timeslots: [{ startTime: getDefaultTimeslot(m.category || m.name.toLowerCase()).start, endTime: getDefaultTimeslot(m.category || m.name.toLowerCase()).end }],
                  timeslotLocked: false,
                  allowCheckIn: getDefaultDayRule(m.category || m.name.toLowerCase(), "checkIn"),
                  allowMiddle: "selectable",
                  allowCheckOut: getDefaultDayRule(m.category || m.name.toLowerCase(), "checkOut"),
                  cascadeFrom: [] as string[],
                }));
                widget.config.meals = JSON.stringify(mealDefs, null, 2);
              }
            }

            // Auto-populate guest-counter slider defaults (but NOT youth categories — those are business-specific)
            if (templateId === "guest-counter") {
              // Only set slider defaults if not explicitly provided by the AI
              if (widget.config.showSlider === undefined) widget.config.showSlider = true;
              if (widget.config.sliderMax === undefined) widget.config.sliderMax = 200;
              // Do NOT auto-add youthCategories — the AI decides based on business type.
              // Hospitality gets Children/Youth. Equipment rental gets nothing.
              // The widget renders fine without youthCategories (just shows adults).
            }

            stepWidgets.push(widget);
          }

          step.widgets = stepWidgets;
          newSteps.push(step);
        }

        baseFunnel.steps = newSteps;
        store.setFunnel(baseFunnel);

        return {
          success: true,
          message: `Created funnel "${name}" with ${newSteps.length} steps and ${newSteps.reduce((a, s) => a + s.widgets.length, 0)} widgets.${validateFunnelIntegrity(store.getFunnel()!)}`,
        };
      }

      case "add_step": {
        if (!funnel) return { success: false, message: "No funnel loaded." };
        const title = (args.title as string) || "New Step";
        const step = createEmptyStep(title);
        if (args.layout) step.layout = args.layout as Step["layout"];
        if (args.navigation) {
          const nav = args.navigation as Record<string, string>;
          step.navigation = { ...step.navigation, ...nav };
        }

        store.addStep(step);

        // If position is specified and not at the end, reorder
        const position = args.position as number | undefined;
        if (position !== undefined && position >= 0) {
          const currentIndex = funnel.steps.length; // it was appended
          if (position < currentIndex) {
            store.reorderSteps(currentIndex, position);
          }
        }

        return { success: true, message: `Added step "${title}" to the funnel.` };
      }

      case "remove_step": {
        if (!funnel) return { success: false, message: "No funnel loaded." };
        const stepIndex = args.stepIndex as number;
        const step = resolveStepByIndex(funnel, stepIndex);
        if (!step) {
          return {
            success: false,
            message: `Step index ${stepIndex} is out of range. The funnel has ${funnel.steps.length} steps (0-${funnel.steps.length - 1}).`,
          };
        }
        store.removeStep(step.id);
        const rmWarnings = validateFunnelIntegrity(store.getFunnel()!);
        return { success: true, message: `Removed step "${step.title}" (index ${stepIndex}).${rmWarnings}` };
      }

      case "reorder_steps": {
        if (!funnel) return { success: false, message: "No funnel loaded." };
        const fromIndex = args.fromIndex as number;
        const toIndex = args.toIndex as number;
        if (fromIndex < 0 || fromIndex >= funnel.steps.length) {
          return { success: false, message: `fromIndex ${fromIndex} is out of range.` };
        }
        if (toIndex < 0 || toIndex >= funnel.steps.length) {
          return { success: false, message: `toIndex ${toIndex} is out of range.` };
        }
        store.reorderSteps(fromIndex, toIndex);
        const reorderWarnings = validateFunnelIntegrity(store.getFunnel()!);
        return { success: true, message: `Moved step from position ${fromIndex} to ${toIndex}.${reorderWarnings}` };
      }

      case "add_widget": {
        if (!funnel) return { success: false, message: "No funnel loaded." };
        const stepIdx = args.stepIndex as number;
        const step = resolveStepByIndex(funnel, stepIdx);
        if (!step) {
          return {
            success: false,
            message: `Step index ${stepIdx} is out of range. The funnel has ${funnel.steps.length} steps.`,
          };
        }
        const templateId = args.templateId as string;
        if (!widgetTemplateRegistry[templateId]) {
          return {
            success: false,
            message: `Unknown template "${templateId}". Available: ${Object.keys(widgetTemplateRegistry).join(", ")}`,
          };
        }

        store.addWidget(step.id, templateId);

        // After adding, update config/bindings/variant if provided
        // The widget was appended as the last widget in the step
        const updatedFunnel = store.getFunnel();
        if (updatedFunnel) {
          const updatedStep = updatedFunnel.steps.find((s) => s.id === step.id);
          if (updatedStep) {
            const newWidget = updatedStep.widgets[updatedStep.widgets.length - 1];
            if (newWidget) {
              if (args.config) {
                store.updateWidgetConfig(step.id, newWidget.instanceId, args.config as Record<string, unknown>);
              }
              if (args.bindings) {
                const b = args.bindings as Record<string, Record<string, string>>;
                store.updateWidgetBindings(step.id, newWidget.instanceId, {
                  inputs: b.inputs || {},
                  outputs: b.outputs || {},
                });
              }
              if (args.variant) {
                store.updateWidgetVariant(step.id, newWidget.instanceId, args.variant as string);
              }
            }
          }
        }

        return {
          success: true,
          message: `Added ${templateId} widget to step "${step.title}" (index ${stepIdx}).`,
        };
      }

      case "update_widget_config": {
        if (!funnel) return { success: false, message: "No funnel loaded." };
        const sIdx = args.stepIndex as number;
        const wIdx = args.widgetIndex as number;
        const s = resolveStepByIndex(funnel, sIdx);
        if (!s) return { success: false, message: `Step index ${sIdx} is out of range.` };
        const w = resolveWidgetByIndex(s, wIdx);
        if (!w) return { success: false, message: `Widget index ${wIdx} is out of range in step ${sIdx}.` };
        const config = args.config as Record<string, unknown>;
        store.updateWidgetConfig(s.id, w.instanceId, config);
        return {
          success: true,
          message: `Updated config for ${w.templateId} widget in step "${s.title}".`,
        };
      }

      case "remove_widget": {
        if (!funnel) return { success: false, message: "No funnel loaded." };
        const sIdx2 = args.stepIndex as number;
        const wIdx2 = args.widgetIndex as number;
        const s2 = resolveStepByIndex(funnel, sIdx2);
        if (!s2) return { success: false, message: `Step index ${sIdx2} is out of range.` };
        const w2 = resolveWidgetByIndex(s2, wIdx2);
        if (!w2) return { success: false, message: `Widget index ${wIdx2} is out of range in step ${sIdx2}.` };
        store.removeWidget(s2.id, w2.instanceId);
        return {
          success: true,
          message: `Removed ${w2.templateId} widget from step "${s2.title}".`,
        };
      }

      case "set_theme": {
        if (!funnel) return { success: false, message: "No funnel loaded." };
        const themeUpdates: Partial<ThemeConfig> = {};
        if (args.primaryColor) themeUpdates.primaryColor = args.primaryColor as string;
        if (args.secondaryColor) themeUpdates.secondaryColor = args.secondaryColor as string;
        if (args.surfaceColor) themeUpdates.surfaceColor = args.surfaceColor as string;
        if (args.headlineFont) themeUpdates.headlineFont = args.headlineFont as string;
        if (args.bodyFont) themeUpdates.bodyFont = args.bodyFont as string;
        if (args.borderRadius !== undefined) themeUpdates.borderRadius = args.borderRadius as number;
        if (args.cardStyle) themeUpdates.cardStyle = args.cardStyle as ThemeConfig["cardStyle"];
        if (args.logoUrl) themeUpdates.logoUrl = args.logoUrl as string;
        if (args.accentColor) themeUpdates.accentColor = args.accentColor as string;
        if (args.timezone) themeUpdates.timezone = args.timezone as string;

        // Layout settings
        if (args.layout) {
          const layoutInput = args.layout as Record<string, unknown>;
          const currentLayout = funnel.theme.layout || {
            desktopHeader: "journey-icons", tabletHeader: "auto", mobileHeader: "progress-bar",
            footerStyle: "frosted-glass", showRunningTotal: false, showTrustBadges: true,
            showTimeEstimate: true, showStepCounter: true, useContextualNextLabels: true, showMicroCelebrations: true,
          };
          themeUpdates.layout = {
            ...currentLayout,
            ...Object.fromEntries(Object.entries(layoutInput).filter(([, v]) => v !== undefined)),
          } as import("@/lib/types").FunnelLayout;
        }

        store.setTheme(themeUpdates);
        const updatedFields = Object.keys(themeUpdates);
        if (themeUpdates.layout) updatedFields.push(...Object.keys(args.layout as Record<string, unknown>).map(k => `layout.${k}`));
        return { success: true, message: `Updated theme: ${updatedFields.join(", ")}.` };
      }

      case "configure_segment_picker": {
        if (!funnel) return { success: false, message: "No funnel loaded." };
        const spStepIdx = args.stepIndex as number;
        const spWidgetIdx = args.widgetIndex as number;
        const spStep = resolveStepByIndex(funnel, spStepIdx);
        if (!spStep) return { success: false, message: `Step index ${spStepIdx} is out of range.` };
        const spWidget = resolveWidgetByIndex(spStep, spWidgetIdx);
        if (!spWidget) return { success: false, message: `Widget index ${spWidgetIdx} is out of range.` };
        if (spWidget.templateId !== "segment-picker") {
          return {
            success: false,
            message: `Widget at index ${spWidgetIdx} is a ${spWidget.templateId}, not a segment-picker.`,
          };
        }
        const options = args.options as Array<Record<string, string>>;
        store.updateWidgetConfig(spStep.id, spWidget.instanceId, {
          options: JSON.stringify(options, null, 2),
        });
        return {
          success: true,
          message: `Configured segment picker with ${options.length} options.`,
        };
      }

      case "configure_meal_widget": {
        if (!funnel) return { success: false, message: "No funnel loaded." };
        const mwStepIdx = args.stepIndex as number;
        const mwWidgetIdx = args.widgetIndex as number;
        const mwStep = resolveStepByIndex(funnel, mwStepIdx);
        if (!mwStep) return { success: false, message: `Step index ${mwStepIdx} is out of range.` };
        const mwWidget = resolveWidgetByIndex(mwStep, mwWidgetIdx);
        if (!mwWidget) return { success: false, message: `Widget index ${mwWidgetIdx} is out of range.` };
        if (mwWidget.templateId !== "meal-picker") {
          return { success: false, message: `Widget at index ${mwWidgetIdx} is a ${mwWidget.templateId}, not a meal-picker.` };
        }

        // Build meal definitions with defaults
        const mealDefs = (args.meals as Array<Record<string, unknown>>).map((m, i) => ({
          id: (m.id as string) || `meal-${i}`,
          name: (m.name as string) || `Meal ${i + 1}`,
          sortOrder: (m.sortOrder as number) || i + 1,
          adultPrice: (m.adultPrice as number) || 15,
          timeslots: (m.timeslots as Array<{ startTime: string; endTime: string }>) || [{ startTime: "12:00", endTime: "13:00" }],
          timeslotLocked: !!(m.timeslotLocked),
          allowCheckIn: (m.allowCheckIn as string) || "selectable",
          allowMiddle: (m.allowMiddle as string) || "selectable",
          allowCheckOut: (m.allowCheckOut as string) || "selectable",
          cascadeFrom: (m.cascadeFrom as string[]) || [],
        }));

        // Build config update
        const mealConfig: Record<string, unknown> = {
          meals: JSON.stringify(mealDefs, null, 2),
        };
        if (args.title) mealConfig.title = args.title;
        if (args.subtitle) mealConfig.subtitle = args.subtitle;
        if (args.currency) mealConfig.currency = args.currency;
        if (args.singleDate !== undefined) mealConfig.singleDate = args.singleDate;
        if (args.kidsEnabled !== undefined) mealConfig.kidsEnabled = args.kidsEnabled;
        if (args.kidsPricingModel) mealConfig.kidsPricingModel = args.kidsPricingModel;
        if (args.kidsPercentage !== undefined) mealConfig.kidsPercentage = args.kidsPercentage;
        if (args.kidsAgeMultiplier !== undefined) mealConfig.kidsAgeMultiplier = args.kidsAgeMultiplier;

        store.updateWidgetConfig(mwStep.id, mwWidget.instanceId, mealConfig);

        const priceList = mealDefs.map((m) => `${m.name} $${m.adultPrice}`).join(", ");
        return {
          success: true,
          message: `Configured meal widget with ${mealDefs.length} meals: ${priceList}. Kids meals: ${args.kidsEnabled !== false ? "enabled" : "disabled"}.`,
        };
      }

      case "search_images": {
        // This is handled async in the AI store (ai-store.ts), not here
        // Return a placeholder — the real result is injected by the store
        return { success: true, message: "Searching for images..." };
      }

      case "update_step": {
        if (!funnel) return { success: false, message: "No funnel loaded." };
        const stepIdx = args.stepIndex as number;
        const step = resolveStepByIndex(funnel, stepIdx);
        if (!step) return { success: false, message: `Invalid step index: ${stepIdx}. Funnel has ${funnel.steps.length} steps.` };

        const updates: Partial<Step> = {};
        if (args.title && typeof args.title === "string") updates.title = args.title;
        if (args.navigation) {
          const navInput = args.navigation as Record<string, unknown>;
          const currentNav = { ...step.navigation };
          if (navInput.next !== undefined) currentNav.next = navInput.next as string | null;
          if (navInput.nextLabel !== undefined) currentNav.nextLabel = navInput.nextLabel as string;
          if (navInput.backLabel !== undefined) currentNav.backLabel = navInput.backLabel as string;
          if (navInput.hideBack !== undefined) currentNav.hideBack = navInput.hideBack as boolean;
          if (navInput.conditionalNext !== undefined) {
            currentNav.conditionalNext = (navInput.conditionalNext as Array<Record<string, unknown>>)?.map(r => ({
              variable: r.variable as string,
              operator: r.operator as "equals" | "not_equals" | "contains",
              value: r.value as string,
              targetStepId: r.targetStepId as string,
              label: r.label as string | undefined,
            })) || undefined;
          }
          updates.navigation = currentNav;
        }

        store.updateStep(step.id, updates);

        // Post-operation validation
        const warnings = validateFunnelIntegrity(store.getFunnel()!);
        const msg = `Updated step "${step.title}" (index ${stepIdx}).${warnings}`;
        return { success: true, message: msg };
      }

      case "wire_navigation": {
        if (!funnel) return { success: false, message: "No funnel loaded." };
        const updates = (args.updates as Array<Record<string, unknown>>) || [];
        if (updates.length === 0) return { success: false, message: "No updates provided." };

        const results: string[] = [];
        for (const upd of updates) {
          const idx = upd.stepIndex as number;
          const step = resolveStepByIndex(funnel, idx);
          if (!step) {
            results.push(`[${idx}] SKIP: invalid index`);
            continue;
          }

          const stepUpdates: Partial<Step> = {};
          if (upd.title && typeof upd.title === "string") stepUpdates.title = upd.title;
          if (upd.navigation) {
            const navInput = upd.navigation as Record<string, unknown>;
            const currentNav = { ...step.navigation };
            if (navInput.next !== undefined) currentNav.next = navInput.next as string | null;
            if (navInput.nextLabel !== undefined) currentNav.nextLabel = navInput.nextLabel as string;
            if (navInput.backLabel !== undefined) currentNav.backLabel = navInput.backLabel as string;
            if (navInput.hideBack !== undefined) currentNav.hideBack = navInput.hideBack as boolean;
            if (navInput.conditionalNext !== undefined) {
              currentNav.conditionalNext = (navInput.conditionalNext as Array<Record<string, unknown>>)?.map(r => ({
                variable: r.variable as string,
                operator: r.operator as "equals" | "not_equals" | "contains",
                value: r.value as string,
                targetStepId: r.targetStepId as string,
                label: r.label as string | undefined,
              })) || undefined;
            }
            stepUpdates.navigation = currentNav;
          }

          store.updateStep(step.id, stepUpdates);
          results.push(`[${idx}] "${step.title}" updated`);
        }

        // Post-operation validation
        const warnings = validateFunnelIntegrity(store.getFunnel()!);
        return { success: true, message: `Updated ${results.length} steps:\n${results.join("\n")}${warnings}` };
      }

      case "suggest_improvements": {
        // This tool doesn't modify the funnel - the AI just returns text
        return {
          success: true,
          message: "Suggestions provided in the response text.",
        };
      }

      default:
        return { success: false, message: `Unknown tool: ${toolName}` };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return { success: false, message: `Error executing ${toolName}: ${errorMessage}` };
  }
}

// --- Post-operation validation ---
// Checks funnel integrity after any modification and returns warning strings
function validateFunnelIntegrity(funnel: FunnelDefinition): string {
  const warnings: string[] = [];
  const stepIds = new Set(funnel.steps.map(s => s.id));

  // Check for orphan steps (not reachable from step 0)
  const reachable = new Set<string>();
  const queue = [funnel.steps[0]?.id].filter(Boolean);
  const stepMap = new Map(funnel.steps.map((s, i) => [s.id, { step: s, index: i }]));

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (reachable.has(id)) continue;
    reachable.add(id);
    const entry = stepMap.get(id);
    if (!entry) continue;
    const { step: s, index: idx } = entry;

    // Segment picker branches
    const segW = s.widgets.find(w => w.templateId === "segment-picker");
    if (segW) {
      try {
        const raw = (segW.config as Record<string, unknown>).options;
        const opts = typeof raw === "string" ? JSON.parse(raw) : Array.isArray(raw) ? raw : [];
        for (const opt of opts) {
          if (opt.nextStep && stepIds.has(opt.nextStep)) queue.push(opt.nextStep);
        }
      } catch {}
    }

    // conditionalNext
    if (s.navigation.conditionalNext) {
      for (const rule of s.navigation.conditionalNext) {
        if (stepIds.has(rule.targetStepId)) queue.push(rule.targetStepId);
      }
    }

    // navigation.next
    if (s.navigation.next && stepIds.has(s.navigation.next)) {
      queue.push(s.navigation.next);
    } else if (idx < funnel.steps.length - 1) {
      queue.push(funnel.steps[idx + 1].id);
    }
  }

  const orphans = funnel.steps.filter(s => !reachable.has(s.id));
  if (orphans.length > 0) {
    warnings.push(`\n⚠️ WARNING: ${orphans.length} DISCONNECTED steps found: ${orphans.map(s => `"${s.title}"`).join(", ")}. These steps are not reachable. Fix with update_step or wire_navigation.`);
  }

  // Check for broken navigation references
  for (const s of funnel.steps) {
    if (s.navigation.next && !stepIds.has(s.navigation.next)) {
      warnings.push(`\n⚠️ WARNING: Step "${s.title}" has navigation.next pointing to non-existent step ID "${s.navigation.next}".`);
    }
    if (s.navigation.conditionalNext) {
      for (const rule of s.navigation.conditionalNext) {
        if (!stepIds.has(rule.targetStepId)) {
          warnings.push(`\n⚠️ WARNING: Step "${s.title}" has conditionalNext pointing to non-existent step ID "${rule.targetStepId}".`);
        }
      }
    }
    // Check segment picker nextStep references
    const segW = s.widgets.find(w => w.templateId === "segment-picker");
    if (segW) {
      try {
        const raw = (segW.config as Record<string, unknown>).options;
        const opts = typeof raw === "string" ? JSON.parse(raw) : Array.isArray(raw) ? raw : [];
        for (const opt of opts) {
          if (opt.nextStep && !stepIds.has(opt.nextStep)) {
            warnings.push(`\n⚠️ WARNING: Segment option "${opt.label || opt.id}" has nextStep pointing to non-existent step ID "${opt.nextStep}".`);
          }
        }
      } catch {}
    }
  }

  return warnings.join("");
}
