"use client";

import React from "react";
import { useFunnelStore } from "@/stores/funnel-store";
import { widgetTemplateRegistry } from "@/lib/widget-templates";
import type { ConfigField, WidgetTemplate } from "@/lib/types";

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
  const { funnel, selectedStepId, selectedWidgetId, updateWidgetConfig, updateWidgetVariant } =
    useFunnelStore();

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
    <div className="space-y-5">
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
        {template.configFields.map((field) => (
          <div key={field.name}>
            <label className="block text-xs text-on-surface-variant mb-1">
              {field.label}
              {field.required && <span className="text-error ml-0.5">*</span>}
            </label>
            <ConfigFieldInput
              field={field}
              value={widget.config[field.name]}
              onChange={(val) =>
                updateWidgetConfig(selectedStepId, selectedWidgetId, {
                  [field.name]: val,
                })
              }
            />
            {field.description && (
              <p className="text-[10px] text-outline mt-0.5">{field.description}</p>
            )}
          </div>
        ))}
      </div>

      {/* Bindings */}
      <div className="pt-2 border-t border-outline-variant">
        <div className="text-xs font-medium text-on-surface-variant mb-3">Variable Bindings</div>
        <BindingsEditor template={template} bindings={widget.bindings} funnel={funnel} />
      </div>
    </div>
  );
}
