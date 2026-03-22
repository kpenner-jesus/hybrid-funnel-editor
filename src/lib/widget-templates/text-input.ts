import type { WidgetTemplate } from "../types";

export const textInputTemplate: WidgetTemplate = {
  id: "text-input",
  name: "Text Input",
  category: "input",
  description:
    "Standalone text input field that stores its value to a funnel variable. Use for capturing single-line text like organization name, event name, dietary restrictions, or any custom question. Can be placed on any step independently of the contact form.",
  icon: "✏️",
  inputs: [],
  outputs: [
    { name: "value", type: "string", label: "Input Value", description: "The text entered by the user" },
  ],
  themeSlots: [
    { name: "borderColor", cssProperty: "border-color", defaultValue: "#d1d5db", label: "Border Color" },
    { name: "focusBorder", cssProperty: "border-color", defaultValue: "#006c4b", label: "Focus Border Color" },
  ],
  configFields: [
    { name: "label", type: "text", label: "Label", defaultValue: "Your Answer", description: "Label shown above the input" },
    { name: "placeholder", type: "text", label: "Placeholder", defaultValue: "Type here...", description: "Placeholder text inside the input" },
    { name: "required", type: "boolean", label: "Required", defaultValue: false },
    { name: "inputType", type: "select", label: "Input Type", defaultValue: "text", options: [{ value: "text", label: "Text" }, { value: "email", label: "Email" }, { value: "tel", label: "Phone" }, { value: "url", label: "URL" }, { value: "number", label: "Number" }] },
    { name: "helpText", type: "text", label: "Help Text (optional)", defaultValue: "", description: "Small text below the input" },
    { name: "variableName", type: "text", label: "Variable Name", defaultValue: "custom-input", description: "The funnel variable this value is stored as" },
  ],
  variants: [
    { id: "default", name: "Standard", description: "Standard text input with label" },
    { id: "floating-label", name: "Floating Label", description: "Material-style floating label" },
  ],
  rules: [],
};

export const textareaInputTemplate: WidgetTemplate = {
  id: "textarea-input",
  name: "Text Area",
  category: "input",
  description:
    "Multi-line text input for longer responses. Use for notes, special requests, dietary restrictions, event descriptions, or any free-form text. Can be placed on any step independently.",
  icon: "📋",
  inputs: [],
  outputs: [
    { name: "value", type: "string", label: "Input Value", description: "The text entered by the user" },
  ],
  themeSlots: [
    { name: "borderColor", cssProperty: "border-color", defaultValue: "#d1d5db", label: "Border Color" },
  ],
  configFields: [
    { name: "label", type: "text", label: "Label", defaultValue: "Additional Notes", description: "Label shown above the textarea" },
    { name: "placeholder", type: "text", label: "Placeholder", defaultValue: "Enter your response here...", description: "Placeholder text" },
    { name: "required", type: "boolean", label: "Required", defaultValue: false },
    { name: "rows", type: "number", label: "Rows", defaultValue: 4, description: "Number of visible text rows" },
    { name: "helpText", type: "text", label: "Help Text (optional)", defaultValue: "" },
    { name: "variableName", type: "text", label: "Variable Name", defaultValue: "custom-notes", description: "The funnel variable this value is stored as" },
  ],
  variants: [
    { id: "default", name: "Standard", description: "Standard textarea with label" },
  ],
  rules: [],
};
