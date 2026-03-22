"use client";

import React, { useState } from "react";
import { useFunnelStore } from "@/stores/funnel-store";
import { widgetTemplateRegistry } from "@/lib/widget-templates";
import type { ConfigField, WidgetTemplate } from "@/lib/types";

// --- Visual Options Editor for segment-picker and option-picker ---
interface OptionItem {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  nextStep?: string;
}

function VisualOptionsEditor({
  value,
  onChange,
  showNextStep,
}: {
  value: unknown;
  onChange: (val: string) => void;
  showNextStep?: boolean;
}) {
  const funnel = useFunnelStore((s) => s.funnel);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Parse current options
  let options: OptionItem[] = [];
  try {
    if (typeof value === "string") options = JSON.parse(value);
    else if (Array.isArray(value)) options = value as OptionItem[];
  } catch { /* ignore */ }

  const save = (newOptions: OptionItem[]) => {
    onChange(JSON.stringify(newOptions, null, 2));
  };

  const updateOption = (index: number, updates: Partial<OptionItem>) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], ...updates };
    save(newOptions);
  };

  const addOption = () => {
    const newId = `option-${Date.now().toString(36)}`;
    save([...options, { id: newId, label: "New Option", description: "" }]);
  };

  const removeOption = (index: number) => {
    save(options.filter((_, i) => i !== index));
  };

  const moveOption = (from: number, to: number) => {
    if (to < 0 || to >= options.length) return;
    const newOptions = [...options];
    const [moved] = newOptions.splice(from, 1);
    newOptions.splice(to, 0, moved);
    save(newOptions);
  };

  if (showAdvanced) {
    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <button
            onClick={() => setShowAdvanced(false)}
            className="text-[10px] text-primary hover:underline"
          >
            ← Back to visual editor
          </button>
        </div>
        <textarea
          value={typeof value === "string" ? value : JSON.stringify(value ?? [], null, 2)}
          onChange={(e) => {
            try { JSON.parse(e.target.value); onChange(e.target.value); } catch { onChange(e.target.value); }
          }}
          rows={8}
          className="w-full px-3 py-1.5 text-[11px] border border-outline-variant rounded-lg focus:outline-none focus:border-primary bg-white font-mono resize-y"
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {options.map((opt, i) => (
        <div
          key={opt.id || i}
          className="border border-gray-200 rounded-lg p-2.5 bg-white hover:border-gray-300 transition-colors"
        >
          <div className="flex items-start gap-2">
            {/* Icon */}
            <input
              type="text"
              value={opt.icon || ""}
              onChange={(e) => updateOption(i, { icon: e.target.value })}
              placeholder="🔹"
              className="w-10 h-8 text-center text-lg border border-gray-200 rounded focus:outline-none focus:border-primary bg-gray-50"
              title="Icon (emoji)"
            />
            {/* Label + Description */}
            <div className="flex-1 min-w-0 space-y-1">
              <input
                type="text"
                value={opt.label}
                onChange={(e) => updateOption(i, { label: e.target.value })}
                placeholder="Option label"
                className="w-full px-2 py-1 text-sm font-medium border border-gray-200 rounded focus:outline-none focus:border-primary"
              />
              <input
                type="text"
                value={opt.description || ""}
                onChange={(e) => updateOption(i, { description: e.target.value })}
                placeholder="Short description (optional)"
                className="w-full px-2 py-1 text-xs text-gray-500 border border-gray-100 rounded focus:outline-none focus:border-primary"
              />
              {/* Next Step dropdown */}
              {showNextStep && funnel && (
                <select
                  value={opt.nextStep || ""}
                  onChange={(e) => updateOption(i, { nextStep: e.target.value })}
                  className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-primary bg-gray-50"
                >
                  <option value="">→ Next step (default)</option>
                  {funnel.steps.map((step, si) => (
                    <option key={step.id} value={step.id}>
                      → Step {si + 1}: {step.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {/* Move + Delete buttons */}
            <div className="flex flex-col gap-0.5 shrink-0">
              <button
                onClick={() => moveOption(i, i - 1)}
                disabled={i === 0}
                className="w-6 h-5 text-[10px] text-gray-400 hover:text-gray-600 disabled:opacity-20"
                title="Move up"
              >▲</button>
              <button
                onClick={() => moveOption(i, i + 1)}
                disabled={i === options.length - 1}
                className="w-6 h-5 text-[10px] text-gray-400 hover:text-gray-600 disabled:opacity-20"
                title="Move down"
              >▼</button>
              <button
                onClick={() => removeOption(i)}
                className="w-6 h-5 text-[10px] text-red-400 hover:text-red-600"
                title="Remove"
              >✕</button>
            </div>
          </div>
        </div>
      ))}

      {/* Add + Advanced buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={addOption}
          className="flex-1 py-1.5 text-xs font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
        >
          + Add Option
        </button>
        <button
          onClick={() => setShowAdvanced(true)}
          className="px-2 py-1.5 text-[10px] text-gray-400 hover:text-gray-600"
          title="Edit raw JSON"
        >
          { }
        </button>
      </div>
    </div>
  );
}

function ConfigFieldInput({
  field,
  value,
  onChange,
}: {
  field: ConfigField;
  value: unknown;
  onChange: (val: unknown) => void;
}) {
  switch (field.type) {
    case "text":
      return (
        <input
          type="text"
          value={(value as string) ?? field.defaultValue ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-1.5 text-sm border border-outline-variant rounded-lg focus:outline-none focus:border-primary bg-white"
        />
      );
    case "textarea":
      return (
        <textarea
          value={(value as string) ?? field.defaultValue ?? ""}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full px-3 py-1.5 text-sm border border-outline-variant rounded-lg focus:outline-none focus:border-primary bg-white resize-y"
        />
      );
    case "number":
      return (
        <input
          type="number"
          value={(value as number) ?? field.defaultValue ?? 0}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full px-3 py-1.5 text-sm border border-outline-variant rounded-lg focus:outline-none focus:border-primary bg-white"
        />
      );
    case "color":
      return (
        <div className="flex gap-2 items-center">
          <input
            type="color"
            value={(value as string) ?? field.defaultValue ?? "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="w-8 h-8 rounded border border-outline-variant cursor-pointer"
          />
          <input
            type="text"
            value={(value as string) ?? field.defaultValue ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 px-3 py-1.5 text-sm border border-outline-variant rounded-lg focus:outline-none focus:border-primary bg-white font-mono"
          />
        </div>
      );
    case "boolean":
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              checked={(value as boolean) ?? field.defaultValue ?? false}
              onChange={(e) => onChange(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-outline-variant rounded-full peer-checked:bg-primary transition-colors" />
            <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4 shadow-sm" />
          </div>
          <span className="text-xs text-on-surface-variant">
            {(value as boolean) ?? field.defaultValue ? "Enabled" : "Disabled"}
          </span>
        </label>
      );
    case "select":
      return (
        <select
          value={(value as string) ?? field.defaultValue ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-1.5 text-sm border border-outline-variant rounded-lg focus:outline-none focus:border-primary bg-white"
        >
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    case "json":
      return (
        <textarea
          value={typeof value === "string" ? value : JSON.stringify(value ?? field.defaultValue ?? {}, null, 2)}
          onChange={(e) => {
            try {
              onChange(JSON.parse(e.target.value));
            } catch {
              onChange(e.target.value);
            }
          }}
          rows={4}
          className="w-full px-3 py-1.5 text-sm border border-outline-variant rounded-lg focus:outline-none focus:border-primary bg-white font-mono resize-y"
        />
      );
    default:
      return null;
  }
}

function BindingsEditor({
  template,
  bindings,
  funnel,
}: {
  template: WidgetTemplate;
  bindings: { inputs: Record<string, string>; outputs: Record<string, string> };
  funnel: { variables: { name: string; label?: string }[] };
}) {
  const { selectedStepId, selectedWidgetId, updateWidgetBindings } = useFunnelStore();

  const variableOptions = funnel.variables.map((v) => ({
    value: v.name,
    label: v.label || v.name,
  }));

  const updateBinding = (direction: "inputs" | "outputs", key: string, value: string) => {
    if (!selectedStepId || !selectedWidgetId) return;
    const newBindings = {
      ...bindings,
      [direction]: { ...bindings[direction], [key]: value },
    };
    if (!value) {
      delete newBindings[direction][key];
    }
    updateWidgetBindings(selectedStepId, selectedWidgetId, newBindings);
  };

  return (
    <div className="space-y-3">
      {/* Inputs */}
      {template.inputs.length > 0 && (
        <div>
          <div className="text-xs font-medium text-on-surface-variant mb-2 flex items-center gap-1.5">
            <span className="text-primary">&#8592;</span> Input Bindings
          </div>
          <div className="space-y-2">
            {template.inputs.map((input) => (
              <div key={input.name} className="flex items-center gap-2">
                <span className="text-xs text-on-surface-variant w-28 truncate" title={input.label}>
                  {input.label}
                </span>
                <select
                  value={bindings.inputs[input.name] || ""}
                  onChange={(e) => updateBinding("inputs", input.name, e.target.value)}
                  className="flex-1 px-2 py-1 text-xs border border-outline-variant rounded bg-white focus:outline-none focus:border-primary"
                >
                  <option value="">-- None --</option>
                  {variableOptions.map((v) => (
                    <option key={v.value} value={v.value}>{v.label}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Outputs */}
      {template.outputs.length > 0 && (
        <div>
          <div className="text-xs font-medium text-on-surface-variant mb-2 flex items-center gap-1.5">
            <span className="text-secondary">&#8594;</span> Output Bindings
          </div>
          <div className="space-y-2">
            {template.outputs.map((output) => (
              <div key={output.name} className="flex items-center gap-2">
                <span className="text-xs text-on-surface-variant w-28 truncate" title={output.label}>
                  {output.label}
                </span>
                <select
                  value={bindings.outputs[output.name] || ""}
                  onChange={(e) => updateBinding("outputs", output.name, e.target.value)}
                  className="flex-1 px-2 py-1 text-xs border border-outline-variant rounded bg-white focus:outline-none focus:border-primary"
                >
                  <option value="">-- None --</option>
                  {variableOptions.map((v) => (
                    <option key={v.value} value={v.value}>{v.label}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function WidgetConfig() {
  const configRef = React.useRef<HTMLDivElement>(null);
  const { funnel, selectedStepId, selectedWidgetId, updateWidgetConfig, updateWidgetVariant } =
    useFunnelStore();

  // Auto-scroll config panel into view when a widget is selected
  React.useEffect(() => {
    if (selectedWidgetId && configRef.current) {
      configRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedWidgetId]);

  if (!funnel || !selectedStepId || !selectedWidgetId) {
    return (
      <div className="text-center py-8 text-sm text-on-surface-variant">
        Select a widget to configure it.
      </div>
    );
  }

  const step = funnel.steps.find((s) => s.id === selectedStepId);
  const widget = step?.widgets.find((w) => w.instanceId === selectedWidgetId);

  if (!step || !widget) {
    return (
      <div className="text-center py-8 text-sm text-on-surface-variant">
        Widget not found.
      </div>
    );
  }

  const template = widgetTemplateRegistry[widget.templateId];
  if (!template) {
    return (
      <div className="text-center py-8 text-sm text-error">
        Unknown template: {widget.templateId}
      </div>
    );
  }

  return (
    <div ref={configRef} className="space-y-5">
      {/* Template header */}
      <div className="flex items-center gap-3 pb-3 border-b border-outline-variant">
        <span className="text-2xl">{template.icon}</span>
        <div>
          <div className="font-medium text-sm">{template.name}</div>
          <div className="text-[10px] uppercase tracking-wider text-on-surface-variant">
            {template.category}
          </div>
        </div>
      </div>

      {/* Variant selector */}
      {template.variants.length > 1 && (
        <div>
          <label className="block text-xs font-medium text-on-surface-variant mb-1.5">
            Variant
          </label>
          <select
            value={widget.variant}
            onChange={(e) =>
              updateWidgetVariant(selectedStepId, selectedWidgetId, e.target.value)
            }
            className="w-full px-3 py-1.5 text-sm border border-outline-variant rounded-lg focus:outline-none focus:border-primary bg-white"
          >
            {template.variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-on-surface-variant mt-1">
            {template.variants.find((v) => v.id === widget.variant)?.description}
          </p>
        </div>
      )}

      {/* Config fields */}
      <div className="space-y-3">
        <div className="text-xs font-medium text-on-surface-variant">Configuration</div>
        {template.configFields.map((field) => {
          // Use visual editor for "options" field on segment-picker and option-picker
          const isOptionsField = field.name === "options" && field.type === "json" &&
            (widget.templateId === "segment-picker" || widget.templateId === "option-picker");

          return (
            <div key={field.name}>
              <label className="block text-xs text-on-surface-variant mb-1">
                {field.label}
                {field.required && <span className="text-error ml-0.5">*</span>}
              </label>
              {isOptionsField ? (
                <VisualOptionsEditor
                  value={widget.config[field.name]}
                  onChange={(val) =>
                    updateWidgetConfig(selectedStepId, selectedWidgetId, {
                      [field.name]: val,
                    })
                  }
                  showNextStep={widget.templateId === "segment-picker"}
                />
              ) : (
                <ConfigFieldInput
                  field={field}
                  value={widget.config[field.name]}
                  onChange={(val) =>
                    updateWidgetConfig(selectedStepId, selectedWidgetId, {
                      [field.name]: val,
                    })
                  }
                />
              )}
              {field.description && !isOptionsField && (
                <p className="text-[10px] text-outline mt-0.5">{field.description}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Bindings */}
      <div className="pt-2 border-t border-outline-variant">
        <div className="text-xs font-medium text-on-surface-variant mb-3">Variable Bindings</div>
        <BindingsEditor template={template} bindings={widget.bindings} funnel={funnel} />
      </div>

      {/* Step Navigation Labels */}
      <StepNavigationEditor stepId={selectedStepId} step={step} />
    </div>
  );
}

function StepNavigationEditor({ stepId, step }: { stepId: string; step: import("@/lib/types").Step }) {
  const { updateStep } = useFunnelStore();

  return (
    <div className="pt-2 border-t border-outline-variant space-y-3">
      <div className="text-xs font-medium text-on-surface-variant">Step Navigation</div>
      <div>
        <label className="block text-xs text-on-surface-variant mb-1">
          Next Button Label
        </label>
        <input
          type="text"
          value={step.navigation.nextLabel || ""}
          onChange={(e) =>
            updateStep(stepId, {
              navigation: { ...step.navigation, nextLabel: e.target.value },
            })
          }
          placeholder="Continue"
          className="w-full px-3 py-1.5 text-sm border border-outline-variant rounded-lg focus:outline-none focus:border-primary bg-white"
        />
      </div>
      <div>
        <label className="block text-xs text-on-surface-variant mb-1">
          Back Button Label
        </label>
        <input
          type="text"
          value={step.navigation.backLabel || ""}
          onChange={(e) =>
            updateStep(stepId, {
              navigation: { ...step.navigation, backLabel: e.target.value },
            })
          }
          placeholder="Back"
          className="w-full px-3 py-1.5 text-sm border border-outline-variant rounded-lg focus:outline-none focus:border-primary bg-white"
        />
      </div>
    </div>
  );
}
