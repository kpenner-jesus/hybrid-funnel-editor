import type { WidgetTemplate } from "../types";

export const activityPickerTemplate: WidgetTemplate = {
  id: "activity-picker",
  name: "Activity Picker",
  category: "selection",
  description: "Activity and excursion selection with images, duration badges, and scheduling. Fetches from Everybooking via categoryId. Requires checkIn, checkOut, and guests as inputs. Outputs selectedActivities and activityTotal.",
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
    { name: "categoryId", type: "number", label: "Activity Category ID", defaultValue: 40, description: "Everybooking category ID for activity products" },
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
    { id: "default", name: "Default", description: "Standard layout" },
  ],
  rules: [
    { id: "capacity-check", description: "Check activity has capacity for group size", condition: "product.maxParticipants < totalGuests", action: "warn" },
  ],
};
