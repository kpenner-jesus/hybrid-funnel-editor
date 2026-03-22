import type { WidgetTemplate } from "../types";

export const guestCounterTemplate: WidgetTemplate = {
  id: "guest-counter",
  name: "Guest Counter",
  category: "input",
  description:
    "Interactive counter for adults and configurable youth/children categories with slider for fast big-number selection. " +
    "Supports age collection (average slider or individual age boxes). " +
    "Configurable minimum adults, max per category, and multiple age categories. " +
    "Outputs guests object used by room/meal/activity widgets for pricing.",
  icon: "👥",
  inputs: [
    { name: "maxGuests", type: "number", label: "Maximum Total Guests", defaultValue: 400 },
  ],
  outputs: [
    { name: "guests", type: "object", label: "Guest Count", description: "Object with adults, children counts per category, and ages" },
    { name: "totalGuests", type: "number", label: "Total Guest Count" },
  ],
  themeSlots: [
    { name: "counterBg", cssProperty: "background-color", defaultValue: "#ffffff", label: "Counter Background" },
    { name: "buttonBg", cssProperty: "background-color", defaultValue: "#006c4b", label: "Button Background" },
    { name: "buttonText", cssProperty: "color", defaultValue: "#ffffff", label: "Button Text Color" },
  ],
  configFields: [
    { name: "title", type: "text", label: "Section Title", defaultValue: "How Many Guests?" },
    { name: "subtitle", type: "text", label: "Subtitle", defaultValue: "" },
    { name: "minAdults", type: "number", label: "Minimum Adults", defaultValue: 20 },
    { name: "maxAdults", type: "number", label: "Maximum Adults", defaultValue: 400 },
    { name: "defaultAdults", type: "number", label: "Default Adults Count", defaultValue: 20 },
    { name: "showSlider", type: "boolean", label: "Show Slider for Adults", defaultValue: true },
    { name: "sliderMax", type: "number", label: "Slider Maximum", defaultValue: 200 },
    // Youth/children categories — JSON array
    { name: "youthCategories", type: "json", label: "Youth/Children Categories",
      defaultValue: JSON.stringify([
        { id: "children", name: "Children", ageLabel: "Ages 0-10", minAge: 0, maxAge: 10, max: 100, defaultCount: 0 },
        { id: "youth", name: "Youth", ageLabel: "Ages 11-15", minAge: 11, maxAge: 15, max: 100, defaultCount: 0 },
      ]),
    },
    // Age collection
    { name: "collectAges", type: "boolean", label: "Collect Ages for Pricing", defaultValue: true },
    { name: "ageCollectionMode", type: "select", label: "Default Age Collection Mode",
      defaultValue: "average",
      options: [
        { value: "average", label: "Average Age Slider" },
        { value: "individual", label: "Individual Age Boxes" },
      ],
    },
  ],
  variants: [
    { id: "default", name: "Full Slider", description: "Large number + slider + buttons" },
    { id: "compact", name: "Compact", description: "Buttons only, no slider" },
  ],
  rules: [
    { id: "min-adults", description: "Require minimum adults", condition: "guests.adults < config.minAdults", action: "error" },
    { id: "max-total", description: "Cap total guests", condition: "totalGuests > config.maxGuests", action: "error" },
  ],
};
