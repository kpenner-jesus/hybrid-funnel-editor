import type { FunnelDefinition, Step, ThemeConfig, WidgetInstance } from "@/lib/types";
import { createEmptyStep, createEmptyFunnel, createWidgetInstance } from "@/lib/schemas";
import { widgetTemplateRegistry } from "@/lib/widget-templates";

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
            message: `Too many steps (${stepsData.length}). Maximum is 60. Most funnels have 20-30 steps. Please reduce the number of steps and try again.`,
          };
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

            stepWidgets.push(widget);
          }

          step.widgets = stepWidgets;
          newSteps.push(step);
        }

        baseFunnel.steps = newSteps;
        store.setFunnel(baseFunnel);

        return {
          success: true,
          message: `Created funnel "${name}" with ${newSteps.length} steps and ${newSteps.reduce((a, s) => a + s.widgets.length, 0)} widgets.`,
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
        return { success: true, message: `Removed step "${step.title}" (index ${stepIndex}).` };
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
        return { success: true, message: `Moved step from position ${fromIndex} to ${toIndex}.` };
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
        store.setTheme(themeUpdates);
        return { success: true, message: `Updated theme: ${Object.keys(themeUpdates).join(", ")}.` };
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
