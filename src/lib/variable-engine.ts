import type { FunnelDefinition, VariableDefinition } from "./types";

/**
 * Resolved variable store: variableName -> currentValue
 */
export type VariableStore = Record<string, unknown>;

/**
 * Widget outputs store: `${stepId}.${widgetInstanceId}` -> Record<outputName, value>
 */
export type WidgetOutputStore = Record<string, Record<string, unknown>>;

/**
 * Resolve all funnel variables given the current step index and widget outputs.
 * Variables start with their default values. Then, widget output bindings
 * from steps up to (and including) currentStepIndex overwrite them.
 */
export function resolveVariables(
  funnelDef: FunnelDefinition,
  currentStepIndex: number,
  widgetOutputs: WidgetOutputStore
): VariableStore {
  const store: VariableStore = {};

  // Initialize with defaults
  for (const v of funnelDef.variables) {
    store[v.name] = v.defaultValue ?? getTypeDefault(v.type);
  }

  // Apply widget output bindings from steps 0..currentStepIndex
  for (let i = 0; i <= Math.min(currentStepIndex, funnelDef.steps.length - 1); i++) {
    const step = funnelDef.steps[i];
    for (const widget of step.widgets) {
      const outputKey = `${step.id}.${widget.instanceId}`;
      const outputs = widgetOutputs[outputKey];
      if (!outputs) continue;

      for (const [outputName, varName] of Object.entries(widget.bindings.outputs)) {
        if (varName in store && outputName in outputs) {
          store[varName] = outputs[outputName];
        }
      }
    }
  }

  return store;
}

/**
 * Get the resolved input values for a specific widget instance.
 * Looks up the widget's input bindings and resolves each to its current value.
 */
export function getInputsForWidget(
  funnelDef: FunnelDefinition,
  stepId: string,
  widgetInstanceId: string,
  variableStore: VariableStore,
  widgetOutputs: WidgetOutputStore
): Record<string, unknown> {
  const step = funnelDef.steps.find((s) => s.id === stepId);
  if (!step) return {};

  const widget = step.widgets.find((w) => w.instanceId === widgetInstanceId);
  if (!widget) return {};

  const inputs: Record<string, unknown> = {};

  for (const [inputName, source] of Object.entries(widget.bindings.inputs)) {
    if (source.includes(".")) {
      // Direct widget output reference: "stepId.widgetId.outputName"
      const parts = source.split(".");
      if (parts.length === 3) {
        const [srcStepId, srcWidgetId, srcOutputName] = parts;
        const key = `${srcStepId}.${srcWidgetId}`;
        inputs[inputName] = widgetOutputs[key]?.[srcOutputName] ?? undefined;
      }
    } else {
      // Variable reference
      inputs[inputName] = variableStore[source] ?? undefined;
    }
  }

  return inputs;
}

/**
 * Validate all bindings in the funnel definition.
 * Returns an array of error messages.
 */
export function validateBindings(funnelDef: FunnelDefinition): string[] {
  const errors: string[] = [];
  const variableNames = new Set(funnelDef.variables.map((v) => v.name));

  // Build a map of all widget outputs across all steps
  const availableOutputs = new Set<string>();
  for (const step of funnelDef.steps) {
    for (const widget of step.widgets) {
      for (const outputName of Object.keys(widget.bindings.outputs)) {
        availableOutputs.add(`${step.id}.${widget.instanceId}.${outputName}`);
      }
    }
  }

  for (const step of funnelDef.steps) {
    for (const widget of step.widgets) {
      // Validate input bindings
      for (const [inputName, source] of Object.entries(widget.bindings.inputs)) {
        if (source.includes(".")) {
          // Check if the referenced output exists
          if (!availableOutputs.has(source)) {
            errors.push(
              `Widget "${widget.instanceId}" in step "${step.title}": input "${inputName}" references unknown output "${source}"`
            );
          }
        } else {
          // Check if the variable exists
          if (!variableNames.has(source)) {
            errors.push(
              `Widget "${widget.instanceId}" in step "${step.title}": input "${inputName}" references unknown variable "${source}"`
            );
          }
        }
      }

      // Validate output bindings
      for (const [, varName] of Object.entries(widget.bindings.outputs)) {
        if (!variableNames.has(varName)) {
          errors.push(
            `Widget "${widget.instanceId}" in step "${step.title}": output binds to unknown variable "${varName}"`
          );
        }
      }
    }
  }

  return errors;
}

/**
 * Get the data flow graph for visualization.
 * Returns nodes (variables + widgets) and edges between them.
 */
export function getDataFlowGraph(funnelDef: FunnelDefinition) {
  const nodes: Array<{
    id: string;
    type: "variable" | "widget";
    label: string;
    stepId?: string;
  }> = [];

  const edges: Array<{
    from: string;
    to: string;
    label: string;
  }> = [];

  // Add variable nodes
  for (const v of funnelDef.variables) {
    nodes.push({ id: `var:${v.name}`, type: "variable", label: v.label || v.name });
  }

  // Add widget nodes and edges
  for (const step of funnelDef.steps) {
    for (const widget of step.widgets) {
      const widgetNodeId = `widget:${step.id}.${widget.instanceId}`;
      nodes.push({
        id: widgetNodeId,
        type: "widget",
        label: widget.templateId,
        stepId: step.id,
      });

      // Input edges: variable -> widget
      for (const [inputName, source] of Object.entries(widget.bindings.inputs)) {
        if (!source.includes(".")) {
          edges.push({
            from: `var:${source}`,
            to: widgetNodeId,
            label: inputName,
          });
        }
      }

      // Output edges: widget -> variable
      for (const [outputName, varName] of Object.entries(widget.bindings.outputs)) {
        edges.push({
          from: widgetNodeId,
          to: `var:${varName}`,
          label: outputName,
        });
      }
    }
  }

  return { nodes, edges };
}

function getTypeDefault(type: VariableDefinition["type"]): unknown {
  switch (type) {
    case "string": return "";
    case "number": return 0;
    case "boolean": return false;
    case "date": return null;
    case "array": return [];
    case "object": return {};
    default: return null;
  }
}
