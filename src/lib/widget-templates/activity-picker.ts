import type { WidgetTemplate } from "../types";

export const activityPickerTemplate: WidgetTemplate = {
  id: "activity-picker",
  name: "Activity Picker",
  category: "selection",
  description: "Browse and select available activities and excursions with scheduling.",
  icon: "🏔️",
  inputs: [
    { name: "checkIn", type: "date", label: "Check-in Date", required: true },
    { name: "checkOut", type: "date", label: "Check-out Date", required: true },
    { name: "guests", type: "object", label: "Guest Count", required: true },
    { name: "products", type: "array", label: "Activity Products", required: true },
  ],
  outputs: [
    { name: "selectedActivities", type: "array", label: "Selected Activities" },
    { name: "activityTotal", type: "number", label: "Activity Total" },
  ],
  themeSlots: [
    { name: "cardBg", cssProperty: "background-color", defaultValue: "#ffffff", label: "Card Background" },
    { name: "imageBorderRadius", cssProperty: "border-radius", defaultValue: "12px", label: "Image Border Radius" },
    { name: "durationBadgeBg", cssProperty: "background-color", defaultValue: "#e0f5ee", label: "Duration Badge Background" },
    { name: "priceColor", cssProperty: "color", defaultValue: "#006c4b", label: "Price Color" },
  ],
  configFields: [
    { name: "title", type: "text", label: "Section Title", defaultValue: "Activities & Excursions" },
    { name: "showImages", type: "boolean", label: "Show Activity Images", defaultValue: true },
    { name: "showDuration", type: "boolean", label: "Show Duration", defaultValue: true },
    { name: "maxSelections", type: "number", label: "Max Selections", defaultValue: 0, description: "0 = unlimited" },
    { name: "layout", type: "select", label: "Layout", defaultValue: "grid", options: [
      { value: "grid", label: "Grid" },
      { value: "carousel", label: "Carousel" },
      { value: "list", label: "List" },
    ]},
  ],
  variants: [
    { id: "default", name: "Image Cards", description: "Activity cards with large images and descriptions" },
    { id: "compact", name: "Compact List", description: "Condensed list view for many activities" },
    { id: "carousel", name: "Carousel", description: "Horizontally scrolling activity carousel" },
  ],
  rules: [
    { id: "capacity-check", description: "Check activity has capacity for group size", condition: "product.maxParticipants < totalGuests", action: "warn" },
  ],
};
