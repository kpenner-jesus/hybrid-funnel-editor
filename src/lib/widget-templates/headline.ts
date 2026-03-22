import type { WidgetTemplate } from "../types";

export const headlineTemplate: WidgetTemplate = {
  id: "headline",
  name: "Headline",
  category: "layout",
  description:
    "Standalone heading text widget. Place between other widgets to add section headers, titles, or visual breaks. Supports configurable size, alignment, and color.",
  icon: "📝",
  inputs: [],
  outputs: [],
  themeSlots: [
    { name: "textColor", cssProperty: "color", defaultValue: "#1a1a1a", label: "Text Color" },
  ],
  configFields: [
    { name: "text", type: "text", label: "Headline Text", defaultValue: "Section Title", description: "The heading text to display" },
    { name: "size", type: "select", label: "Size", defaultValue: "large", options: [{ value: "small", label: "Small (18px)" }, { value: "medium", label: "Medium (24px)" }, { value: "large", label: "Large (32px)" }, { value: "xlarge", label: "Extra Large (40px)" }] },
    { name: "alignment", type: "select", label: "Alignment", defaultValue: "left", options: [{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }] },
    { name: "useThemeColor", type: "boolean", label: "Use Theme Primary Color", defaultValue: true, description: "If enabled, uses the funnel's primary color" },
  ],
  variants: [
    { id: "default", name: "Standard", description: "Standard heading" },
    { id: "decorated", name: "Decorated", description: "Heading with underline accent" },
  ],
  rules: [],
};
