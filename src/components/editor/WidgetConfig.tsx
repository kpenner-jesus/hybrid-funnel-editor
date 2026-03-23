"use client";

import React, { useState } from "react";
import { useFunnelStore } from "@/stores/funnel-store";
import { widgetTemplateRegistry } from "@/lib/widget-templates";
import { HelpTip } from "@/components/shared/Tooltip";
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

// --- Visual Meal Config Editor ---

interface MealItem {
  id: string;
  name: string;
  sortOrder: number;
  adultPrice: number;
  timeslots: Array<{ startTime: string; endTime: string }>;
  timeslotLocked?: boolean;
  allowCheckIn: string;
  allowMiddle: string;
  allowCheckOut: string;
  cascadeFrom?: string[];
}

const DAY_OPTIONS = [
  { value: "selectable", label: "✅ Available" },
  { value: "unselectable", label: "❌ Unavailable" },
  { value: "preselected", label: "🔵 Pre-selected" },
];

const MEAL_PRESETS = [
  { id: "breakfast", name: "Breakfast", price: 18, time: "07:00-09:00", checkIn: "unselectable", middle: "selectable", checkOut: "selectable" },
  { id: "brunch", name: "Brunch", price: 22, time: "10:00-12:00", checkIn: "selectable", middle: "selectable", checkOut: "selectable" },
  { id: "lunch", name: "Lunch", price: 20, time: "12:00-14:00", checkIn: "selectable", middle: "selectable", checkOut: "selectable" },
  { id: "afternoon-tea", name: "Afternoon Tea", price: 12, time: "14:00-16:00", checkIn: "selectable", middle: "selectable", checkOut: "unselectable" },
  { id: "supper", name: "Supper", price: 25, time: "17:00-19:00", checkIn: "selectable", middle: "selectable", checkOut: "unselectable" },
  { id: "night-snack", name: "Night Snack", price: 8, time: "20:00-22:00", checkIn: "selectable", middle: "selectable", checkOut: "unselectable" },
  { id: "nutrition-break", name: "Nutrition Break", price: 6, time: "10:00-10:30", checkIn: "selectable", middle: "selectable", checkOut: "unselectable" },
];

function MealConfigEditor({
  value,
  onChange,
  allMeals,
}: {
  value: unknown;
  onChange: (val: string) => void;
  allMeals?: MealItem[];
}) {
  const [mode, setMode] = useState<"easy" | "pro">("easy");
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);

  let meals: MealItem[] = [];
  try {
    if (typeof value === "string") meals = JSON.parse(value);
    else if (Array.isArray(value)) meals = value as MealItem[];
  } catch { /* ignore */ }

  const save = (newMeals: MealItem[]) => {
    onChange(JSON.stringify(newMeals, null, 2));
  };

  const updateMeal = (index: number, updates: Partial<MealItem>) => {
    const updated = [...meals];
    updated[index] = { ...updated[index], ...updates };
    save(updated);
  };

  const addMealFromPreset = (preset: typeof MEAL_PRESETS[0]) => {
    const [startTime, endTime] = preset.time.split("-");
    const newMeal: MealItem = {
      id: `${preset.id}-${Date.now().toString(36)}`,
      name: preset.name,
      sortOrder: meals.length + 1,
      adultPrice: preset.price,
      timeslots: [{ startTime, endTime }],
      timeslotLocked: false,
      allowCheckIn: preset.checkIn,
      allowMiddle: preset.middle,
      allowCheckOut: preset.checkOut,
      cascadeFrom: [],
    };
    save([...meals, newMeal]);
    setShowAddMenu(false);
  };

  const addCustomMeal = () => {
    const newMeal: MealItem = {
      id: `custom-${Date.now().toString(36)}`,
      name: "New Meal",
      sortOrder: meals.length + 1,
      adultPrice: 15,
      timeslots: [{ startTime: "12:00", endTime: "13:00" }],
      timeslotLocked: false,
      allowCheckIn: "selectable",
      allowMiddle: "selectable",
      allowCheckOut: "selectable",
      cascadeFrom: [],
    };
    save([...meals, newMeal]);
    setShowAddMenu(false);
    setExpandedMeal(newMeal.id);
  };

  const removeMeal = (index: number) => {
    save(meals.filter((_, i) => i !== index));
  };

  const moveMeal = (from: number, to: number) => {
    if (to < 0 || to >= meals.length) return;
    const updated = [...meals];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    updated.forEach((m, i) => m.sortOrder = i + 1);
    save(updated);
  };

  // Pro mode — raw JSON
  if (mode === "pro") {
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold text-amber-600 uppercase">Pro Mode</span>
          <button onClick={() => setMode("easy")} className="text-[10px] text-primary hover:underline">← Easy Mode</button>
        </div>
        <textarea
          value={typeof value === "string" ? value : JSON.stringify(value ?? [], null, 2)}
          onChange={(e) => { try { onChange(JSON.stringify(JSON.parse(e.target.value), null, 2)); } catch { onChange(e.target.value); } }}
          rows={12}
          className="w-full px-3 py-2 text-[11px] border border-outline-variant rounded-lg focus:outline-none focus:border-primary bg-white font-mono resize-y"
        />
      </div>
    );
  }

  // Easy mode — visual cards
  return (
    <div>
      {/* Mode toggle */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-700">{meals.length} Meal{meals.length !== 1 ? "s" : ""}</span>
        <button onClick={() => setMode("pro")} className="text-[10px] text-gray-400 hover:text-gray-600" title="Advanced JSON editor">
          Pro ⚙
        </button>
      </div>

      {/* Meal cards */}
      <div className="space-y-2">
        {meals.map((meal, i) => {
          const isExpanded = expandedMeal === meal.id;
          const ts = meal.timeslots?.[0];

          return (
            <div key={meal.id} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Collapsed view — always visible */}
              <div
                className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-gray-50 cursor-pointer"
                onClick={() => setExpandedMeal(isExpanded ? null : meal.id)}
              >
                {/* Reorder */}
                <div className="flex flex-col">
                  <button onClick={(e) => { e.stopPropagation(); moveMeal(i, i - 1); }} disabled={i === 0} className="text-[9px] text-gray-400 hover:text-gray-600 disabled:opacity-20">▲</button>
                  <button onClick={(e) => { e.stopPropagation(); moveMeal(i, i + 1); }} disabled={i === meals.length - 1} className="text-[9px] text-gray-400 hover:text-gray-600 disabled:opacity-20">▼</button>
                </div>

                {/* Name + time */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-800 truncate">{meal.name}</div>
                  <div className="text-[10px] text-gray-400">
                    {ts ? `${ts.startTime} - ${ts.endTime}` : "No timeslot"}
                  </div>
                </div>

                {/* Price */}
                <div className="text-sm font-bold text-primary">${meal.adultPrice}</div>

                {/* Day indicators */}
                <div className="flex gap-0.5">
                  <span title="Check-in" className="w-2 h-2 rounded-full" style={{ backgroundColor: meal.allowCheckIn === "selectable" ? "#22c55e" : meal.allowCheckIn === "preselected" ? "#3b82f6" : "#ef4444" }} />
                  <span title="Middle days" className="w-2 h-2 rounded-full" style={{ backgroundColor: meal.allowMiddle === "selectable" ? "#22c55e" : meal.allowMiddle === "preselected" ? "#3b82f6" : "#ef4444" }} />
                  <span title="Check-out" className="w-2 h-2 rounded-full" style={{ backgroundColor: meal.allowCheckOut === "selectable" ? "#22c55e" : meal.allowCheckOut === "preselected" ? "#3b82f6" : "#ef4444" }} />
                </div>

                {/* Expand arrow */}
                <span className="text-gray-400 text-xs">{isExpanded ? "▾" : "▸"}</span>
              </div>

              {/* Expanded view — detailed editing */}
              {isExpanded && (
                <div className="px-3 py-3 bg-gray-50 border-t border-gray-200 space-y-3">
                  {/* Name */}
                  <div>
                    <label className="text-[10px] text-gray-500 font-medium block mb-0.5">Meal Name</label>
                    <input
                      type="text"
                      value={meal.name}
                      onChange={(e) => updateMeal(i, { name: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-primary"
                    />
                  </div>

                  {/* Price */}
                  <div>
                    <label className="text-[10px] text-gray-500 font-medium block mb-0.5">Adult Price (per person)</label>
                    <input
                      type="number"
                      value={meal.adultPrice}
                      onChange={(e) => updateMeal(i, { adultPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-primary"
                      min={0}
                      step={0.01}
                    />
                  </div>

                  {/* Timeslots */}
                  <div>
                    <label className="text-[10px] text-gray-500 font-medium block mb-1">Timeslots</label>
                    {(meal.timeslots || []).map((ts, ti) => (
                      <div key={ti} className="flex items-center gap-1 mb-1">
                        <input
                          type="time"
                          value={ts.startTime}
                          onChange={(e) => {
                            const newTs = [...(meal.timeslots || [])];
                            newTs[ti] = { ...newTs[ti], startTime: e.target.value };
                            updateMeal(i, { timeslots: newTs });
                          }}
                          className="px-1.5 py-1 text-[11px] border border-gray-200 rounded"
                        />
                        <span className="text-gray-400 text-[10px]">to</span>
                        <input
                          type="time"
                          value={ts.endTime}
                          onChange={(e) => {
                            const newTs = [...(meal.timeslots || [])];
                            newTs[ti] = { ...newTs[ti], endTime: e.target.value };
                            updateMeal(i, { timeslots: newTs });
                          }}
                          className="px-1.5 py-1 text-[11px] border border-gray-200 rounded"
                        />
                        {(meal.timeslots || []).length > 1 && (
                          <button
                            onClick={() => {
                              const newTs = (meal.timeslots || []).filter((_, j) => j !== ti);
                              updateMeal(i, { timeslots: newTs });
                            }}
                            className="text-red-400 hover:text-red-600 text-xs"
                          >✕</button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => updateMeal(i, { timeslots: [...(meal.timeslots || []), { startTime: "12:00", endTime: "13:00" }] })}
                      className="text-[10px] text-primary hover:underline"
                    >+ Add Timeslot</button>
                  </div>

                  {/* Timeslot locked */}
                  <label className="flex items-center gap-2 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={!!meal.timeslotLocked}
                      onChange={(e) => updateMeal(i, { timeslotLocked: e.target.checked })}
                      className="accent-primary"
                    />
                    Lock timeslot (show time but don't let customer change it)
                  </label>

                  {/* Day selectability */}
                  <div>
                    <label className="text-[10px] text-gray-500 font-medium block mb-1">Day Availability</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <div>
                        <div className="text-[9px] text-gray-400 mb-0.5 text-center">Check-in</div>
                        <select
                          value={meal.allowCheckIn}
                          onChange={(e) => updateMeal(i, { allowCheckIn: e.target.value })}
                          className="w-full text-[10px] border border-gray-200 rounded px-1 py-1"
                        >
                          {DAY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <div className="text-[9px] text-gray-400 mb-0.5 text-center">Middle</div>
                        <select
                          value={meal.allowMiddle}
                          onChange={(e) => updateMeal(i, { allowMiddle: e.target.value })}
                          className="w-full text-[10px] border border-gray-200 rounded px-1 py-1"
                        >
                          {DAY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <div className="text-[9px] text-gray-400 mb-0.5 text-center">Check-out</div>
                        <select
                          value={meal.allowCheckOut}
                          onChange={(e) => updateMeal(i, { allowCheckOut: e.target.value })}
                          className="w-full text-[10px] border border-gray-200 rounded px-1 py-1"
                        >
                          {DAY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Cascade */}
                  <div>
                    <label className="text-[10px] text-gray-500 font-medium block mb-1">
                      Auto-select when this meal is picked (cascade)
                    </label>
                    <div className="space-y-1">
                      {meals.filter((m) => m.id !== meal.id).map((otherMeal) => {
                        const isLinked = (meal.cascadeFrom || []).includes(otherMeal.id);
                        return (
                          <label key={otherMeal.id} className="flex items-center gap-2 text-[11px] text-gray-600">
                            <input
                              type="checkbox"
                              checked={isLinked}
                              onChange={() => {
                                const current = meal.cascadeFrom || [];
                                const updated = isLinked
                                  ? current.filter((id) => id !== otherMeal.id)
                                  : [...current, otherMeal.id];
                                updateMeal(i, { cascadeFrom: updated });
                              }}
                              className="accent-primary"
                            />
                            Also select {otherMeal.name}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => removeMeal(i)}
                    className="text-[10px] text-red-500 hover:text-red-700 hover:underline"
                  >
                    Remove {meal.name}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add meal */}
      <div className="mt-3 relative">
        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="w-full py-2 text-xs font-medium text-primary border border-dashed border-primary/40 rounded-lg hover:bg-primary/5 transition-colors"
        >
          + Add Meal
        </button>

        {showAddMenu && (
          <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
            {MEAL_PRESETS.filter((p) => !meals.some((m) => m.name.toLowerCase() === p.name.toLowerCase())).map((preset) => (
              <button
                key={preset.id}
                onClick={() => addMealFromPreset(preset)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 border-b border-gray-100 last:border-0"
              >
                <span className="font-medium">{preset.name}</span>
                <span className="text-gray-400 ml-1">${preset.price} · {preset.time}</span>
              </button>
            ))}
            <button
              onClick={addCustomMeal}
              className="w-full text-left px-3 py-2 text-xs text-primary hover:bg-primary/5 font-medium"
            >
              + Custom Meal...
            </button>
          </div>
        )}
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
            Variant<HelpTip text="Choose a different look or layout for this widget" />
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

          // Use meal config editor for "meals" field on meal-picker
          const isMealsField = field.name === "meals" && field.type === "json" && widget.templateId === "meal-picker";

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
              ) : isMealsField ? (
                <MealConfigEditor
                  value={widget.config[field.name]}
                  onChange={(val) =>
                    updateWidgetConfig(selectedStepId, selectedWidgetId, {
                      [field.name]: val,
                    })
                  }
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
              {field.description && !isOptionsField && !isMealsField && (
                <p className="text-[10px] text-outline mt-0.5">{field.description}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Bindings */}
      <div className="pt-2 border-t border-outline-variant">
        <div className="flex items-center text-xs font-medium text-on-surface-variant mb-3">Variable Bindings<HelpTip text="Connect this widget to data from other steps so information flows through the funnel" /></div>
        <BindingsEditor template={template} bindings={widget.bindings} funnel={funnel} />
      </div>

      {/* Step Navigation Labels */}
      <StepNavigationEditor stepId={selectedStepId} step={step} />
    </div>
  );
}

function StepNavigationEditor({ stepId, step }: { stepId: string; step: import("@/lib/types").Step }) {
  const { updateStep, funnel } = useFunnelStore();
  const [showAdvancedNav, setShowAdvancedNav] = useState(false);
  const condRules = step.navigation.conditionalNext || [];

  const updateCondRules = (newRules: import("@/lib/types").ConditionalNavRule[]) => {
    updateStep(stepId, {
      navigation: { ...step.navigation, conditionalNext: newRules.length > 0 ? newRules : undefined },
    });
  };

  return (
    <div className="pt-2 border-t border-outline-variant space-y-3">
      <div className="text-xs font-medium text-on-surface-variant">Step Navigation</div>

      {/* Button labels */}
      <div>
        <label className="block text-xs text-on-surface-variant mb-1">Next Button Label</label>
        <input type="text" value={step.navigation.nextLabel || ""}
          onChange={(e) => updateStep(stepId, { navigation: { ...step.navigation, nextLabel: e.target.value } })}
          placeholder="Continue"
          className="w-full px-3 py-1.5 text-sm border border-outline-variant rounded-lg focus:outline-none focus:border-primary bg-white" />
      </div>
      <div>
        <label className="block text-xs text-on-surface-variant mb-1">Back Button Label</label>
        <input type="text" value={step.navigation.backLabel || ""}
          onChange={(e) => updateStep(stepId, { navigation: { ...step.navigation, backLabel: e.target.value } })}
          placeholder="Back"
          className="w-full px-3 py-1.5 text-sm border border-outline-variant rounded-lg focus:outline-none focus:border-primary bg-white"
          disabled={!!step.navigation.hideBack} />
      </div>

      {/* Hide Back Button toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={!!step.navigation.hideBack}
          onChange={(e) => updateStep(stepId, { navigation: { ...step.navigation, hideBack: e.target.checked || undefined } })}
          className="rounded border-gray-300 text-primary focus:ring-primary" />
        <span className="flex items-center text-xs text-on-surface-variant">Hide Back button<HelpTip text="Hide the Back button so customers can't go backward past this point. Use after payment or confirmation." /></span>
      </label>

      {/* Default Next Step */}
      <div>
        <label className="flex items-center text-xs text-on-surface-variant mb-1">Default Next Step<HelpTip text="Override which page comes next. Normally pages play in order." /></label>
        <select value={step.navigation.next || ""}
          onChange={(e) => updateStep(stepId, { navigation: { ...step.navigation, next: e.target.value || undefined } })}
          className="w-full px-3 py-1.5 text-sm border border-outline-variant rounded-lg focus:outline-none focus:border-primary bg-white">
          <option value="">→ Next step in list (default)</option>
          {funnel?.steps.map((s, si) => (
            <option key={s.id} value={s.id}>→ Step {si + 1}: {s.title}</option>
          ))}
        </select>
      </div>

      {/* Conditional Navigation (Multi-Jump) */}
      <div className="pt-2 border-t border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <label className="flex items-center text-xs font-medium text-on-surface-variant">Conditional Routing<HelpTip text="Send customers to different pages based on their earlier choices (e.g., one customer type sees extra options, another skips them)" /></label>
          {condRules.length > 0 && (
            <button onClick={() => setShowAdvancedNav(!showAdvancedNav)}
              className="text-[9px] text-gray-400 hover:text-gray-600">
              {showAdvancedNav ? "Visual" : "{ } JSON"}
            </button>
          )}
        </div>

        {showAdvancedNav ? (
          /* Advanced JSON view */
          <textarea
            value={JSON.stringify(condRules, null, 2)}
            onChange={(e) => { try { updateCondRules(JSON.parse(e.target.value)); } catch {} }}
            rows={6}
            className="w-full px-3 py-1.5 text-[11px] border border-outline-variant rounded-lg focus:outline-none focus:border-primary bg-white font-mono resize-y"
          />
        ) : (
          /* Visual editor */
          <div className="space-y-2">
            {condRules.map((rule, ri) => (
              <div key={ri} className="border border-blue-200 rounded-lg p-2 bg-blue-50/50 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-blue-600 shrink-0">IF</span>
                  <input type="text" value={rule.variable} placeholder="variable"
                    onChange={(e) => { const nr = [...condRules]; nr[ri] = { ...nr[ri], variable: e.target.value }; updateCondRules(nr); }}
                    className="flex-1 px-2 py-0.5 text-xs border border-blue-200 rounded focus:outline-none focus:border-primary bg-white" />
                  <select value={rule.operator}
                    onChange={(e) => { const nr = [...condRules]; nr[ri] = { ...nr[ri], operator: e.target.value as "equals" | "not_equals" | "contains" }; updateCondRules(nr); }}
                    className="px-1 py-0.5 text-xs border border-blue-200 rounded bg-white">
                    <option value="equals">=</option>
                    <option value="not_equals">≠</option>
                    <option value="contains">contains</option>
                  </select>
                  <input type="text" value={rule.value} placeholder="value"
                    onChange={(e) => { const nr = [...condRules]; nr[ri] = { ...nr[ri], value: e.target.value }; updateCondRules(nr); }}
                    className="flex-1 px-2 py-0.5 text-xs border border-blue-200 rounded focus:outline-none focus:border-primary bg-white" />
                  <button onClick={() => updateCondRules(condRules.filter((_, i) => i !== ri))}
                    className="text-red-400 hover:text-red-600 text-xs px-1">✕</button>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-blue-600 shrink-0">→</span>
                  <select value={rule.targetStepId}
                    onChange={(e) => { const nr = [...condRules]; nr[ri] = { ...nr[ri], targetStepId: e.target.value }; updateCondRules(nr); }}
                    className="flex-1 px-2 py-0.5 text-xs border border-blue-200 rounded bg-white">
                    <option value="">Select step...</option>
                    {funnel?.steps.map((s, si) => (
                      <option key={s.id} value={s.id}>Step {si + 1}: {s.title}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}

            <button onClick={() => updateCondRules([...condRules, { variable: "eventSegment", operator: "equals", value: "", targetStepId: "", label: "" }])}
              className="w-full py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
              + Add Routing Rule
            </button>
            {condRules.length === 0 && (
              <p className="text-[10px] text-gray-400">No conditional routing. All guests go to the same next step.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
