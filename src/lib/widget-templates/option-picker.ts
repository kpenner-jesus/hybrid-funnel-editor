import type { WidgetTemplate } from "../types";

export const optionPickerTemplate: WidgetTemplate = {
  id: "option-picker",
  name: "Segment/Option Picker",
  category: "selection",
  description: "Allows users to pick from a set of options or segments (e.g. room type filters, package tiers).",
  icon: "🔘",
  inputs: [
    { name: "options", type: "array", label: "Available Options", required: true, description: "Array of option objects with id, label, description" },
  ],
  outputs: [
    { name: "selectedOption", type: "string", label: "Selected Option ID" },
    { name: "selectedOptions", type: "array", label: "Selected Option IDs (multi-select)" },
  ],
  themeSlots: [
    { name: "optionBg", cssProperty: "background-color", defaultValue: "#ffffff", label: "Option Background" },
    { name: "selectedBg", cssProperty: "background-color", defaultValue: "#e0f5ee", label: "Selected Background" },
    { name: "selectedBorder", cssProperty: "border-color", defaultValue: "#006c4b", label: "Selected Border" },
  ],
  configFields: [
    { name: "title", type: "text", label: "Section Title", defaultValue: "Choose an Option" },
    { name: "multiSelect", type: "boolean", label: "Allow Multiple Selection", defaultValue: false },
    { name: "displayStyle", type: "select", label: "Display Style", defaultValue: "cards", options: [
      { value: "cards", label: "Cards" },
      { value: "chips", label: "Chips/Pills" },
      { value: "radio", label: "Radio Buttons" },
      { value: "buttons", label: "Segmented Buttons" },
    ]},
    { name: "columns", type: "number", label: "Columns", defaultValue: 3 },
    { name: "required", type: "boolean", label: "Selection Required", defaultValue: true },
  ],
  variants: [
    { id: "default", name: "Card Grid", description: "Options as selectable cards in a grid layout" },
    { id: "chips", name: "Pill Chips", description: "Compact horizontal pill-shaped selectors" },
    { id: "segmented", name: "Segmented Control", description: "iOS-style segmented button bar" },
  ],
  rules: [
    { id: "required-check", description: "Require at least one selection when required", condition: "config.required && !selectedOption", action: "error" },
  ],
};
