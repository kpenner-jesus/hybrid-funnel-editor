import type { WidgetTemplate } from "../types";

export const guestCounterTemplate: WidgetTemplate = {
  id: "guest-counter",
  name: "Guest Counter",
  category: "input",
  description: "Counter controls for selecting number of adults, children, and infants.",
  icon: "👥",
  inputs: [
    { name: "maxGuests", type: "number", label: "Maximum Total Guests", defaultValue: 20 },
  ],
  outputs: [
    { name: "guests", type: "object", label: "Guest Count", description: "Object with adults, children, infants counts" },
    { name: "totalGuests", type: "number", label: "Total Guest Count" },
  ],
  themeSlots: [
    { name: "counterBg", cssProperty: "background-color", defaultValue: "#ffffff", label: "Counter Background" },
    { name: "buttonBg", cssProperty: "background-color", defaultValue: "#006c4b", label: "Button Background" },
    { name: "buttonText", cssProperty: "color", defaultValue: "#ffffff", label: "Button Text Color" },
  ],
  configFields: [
    { name: "title", type: "text", label: "Section Title", defaultValue: "Number of Guests" },
    { name: "showInfants", type: "boolean", label: "Show Infants Counter", defaultValue: true },
    { name: "minAdults", type: "number", label: "Minimum Adults", defaultValue: 1 },
    { name: "maxAdults", type: "number", label: "Maximum Adults", defaultValue: 10 },
    { name: "maxChildren", type: "number", label: "Maximum Children", defaultValue: 10 },
    { name: "maxInfants", type: "number", label: "Maximum Infants", defaultValue: 5 },
    { name: "childAgeLabel", type: "text", label: "Children Age Label", defaultValue: "Ages 2-12" },
  ],
  variants: [
    { id: "default", name: "Vertical Counters", description: "Stacked counter rows with +/- buttons" },
    { id: "horizontal", name: "Horizontal Counters", description: "Side-by-side counter groups" },
    { id: "dropdown", name: "Dropdown", description: "Compact dropdown selector for guest counts" },
  ],
  rules: [
    { id: "min-adults", description: "Require at least one adult", condition: "guests.adults < config.minAdults", action: "error" },
    { id: "max-total", description: "Cap total guests", condition: "totalGuests > config.maxGuests", action: "error" },
  ],
};
