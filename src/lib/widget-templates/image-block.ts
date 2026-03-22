import type { WidgetTemplate } from "../types";

export const imageBlockTemplate: WidgetTemplate = {
  id: "image-block",
  name: "Image",
  category: "layout",
  description:
    "Inline image widget. Display venue photos, activity images, or decorative visuals between other widgets. Supports configurable width, aspect ratio, alt text, and optional caption.",
  icon: "🏞️",
  inputs: [],
  outputs: [],
  themeSlots: [],
  configFields: [
    { name: "imageUrl", type: "text", label: "Image URL", defaultValue: "", description: "Full URL to the image" },
    { name: "altText", type: "text", label: "Alt Text", defaultValue: "Image", description: "Accessibility description" },
    { name: "caption", type: "text", label: "Caption (optional)", defaultValue: "", description: "Text shown below the image" },
    { name: "width", type: "select", label: "Width", defaultValue: "full", options: [{ value: "small", label: "Small (300px)" }, { value: "medium", label: "Medium (500px)" }, { value: "large", label: "Large (700px)" }, { value: "full", label: "Full Width" }] },
    { name: "borderRadius", type: "number", label: "Corner Radius (px)", defaultValue: 8 },
  ],
  variants: [
    { id: "default", name: "Standard", description: "Image with optional caption" },
    { id: "card", name: "Card", description: "Image in an elevated card frame" },
  ],
  rules: [],
};
