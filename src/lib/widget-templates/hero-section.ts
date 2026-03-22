import type { WidgetTemplate } from "../types";

export const heroSectionTemplate: WidgetTemplate = {
  id: "hero-section",
  name: "Hero Section",
  category: "layout",
  description:
    "Full-width hero banner with background image, overlay text, and optional logo. Use as the FIRST widget in the welcome step to create a strong visual impression. Supports headline overlay, subtitle, and CTA text.",
  icon: "🖼️",
  inputs: [],
  outputs: [],
  themeSlots: [
    { name: "overlayColor", cssProperty: "background-color", defaultValue: "rgba(0,0,0,0.4)", label: "Overlay Color" },
    { name: "textColor", cssProperty: "color", defaultValue: "#ffffff", label: "Text Color" },
  ],
  configFields: [
    { name: "backgroundImageUrl", type: "text", label: "Background Image URL", defaultValue: "", description: "Full URL to the hero background image" },
    { name: "headline", type: "text", label: "Headline", defaultValue: "Welcome", description: "Large text overlaid on the hero image" },
    { name: "subtitle", type: "textarea", label: "Subtitle", defaultValue: "", description: "Smaller text below the headline" },
    { name: "logoUrl", type: "text", label: "Logo URL (optional)", defaultValue: "", description: "Logo image to display above the headline" },
    { name: "height", type: "select", label: "Height", defaultValue: "medium", options: [{ value: "small", label: "Small (200px)" }, { value: "medium", label: "Medium (300px)" }, { value: "large", label: "Large (400px)" }, { value: "full", label: "Full Screen" }] },
    { name: "overlayOpacity", type: "number", label: "Overlay Opacity (%)", defaultValue: 40, description: "0 = transparent, 100 = fully dark" },
  ],
  variants: [
    { id: "default", name: "Centered", description: "Centered text over background image" },
    { id: "left-aligned", name: "Left Aligned", description: "Text aligned to the left" },
  ],
  rules: [],
};
