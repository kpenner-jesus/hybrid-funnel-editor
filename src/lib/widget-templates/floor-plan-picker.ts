import type { WidgetTemplate } from "../types";

export const floorPlanPickerTemplate: WidgetTemplate = {
  id: "floor-plan-picker",
  name: "Floor Plan Picker",
  icon: "📐",
  category: "selection",
  description: "Select room layout/configuration. Shows capacity per layout with optional images.",
  aiDescription: "Use floor-plan-picker when the business offers multiple room configurations or seating arrangements (theater, classroom, rounds-of-8, cocktail, U-shape, boardroom). Each layout option shows its name, max capacity, description, and optionally an image/diagram. The widget validates against guest count — if the customer selected 200 guests but picks a layout that holds 150, it shows a warning. ALWAYS place after guest-counter and before or alongside category-picker for venue spaces.",
  aiConfusionNotes: "Do NOT use option-picker for layout selection — floor-plan-picker validates capacity against guest count. Do NOT use category-picker for room layouts — category-picker is for products with pricing, floor-plan-picker is for configuration choices that affect capacity.",
  bestFor: ["room layout", "seating arrangement", "floor plan", "table configuration", "stage setup", "ceremony layout"],
  notFor: ["venue space selection", "room booking", "general options"],
  tags: ["layout", "floor-plan", "seating", "capacity", "configuration", "wedding", "events", "conference", "venue"],
  industries: ["wedding-venue", "event-venue", "conference-center", "hotel", "restaurant", "theater"],
  complexity: "moderate",
  inputs: [
    { name: "guestCount", type: "number", label: "Guest Count", description: "Total guests for capacity validation" },
  ],
  outputs: [
    { name: "selectedLayout", type: "object", label: "Selected Layout", description: "Chosen floor plan with capacity info" },
  ],
  configFields: [
    { name: "title", type: "text", label: "Section Title", defaultValue: "Choose Your Room Layout" },
    { name: "subtitle", type: "text", label: "Subtitle", defaultValue: "Select the seating arrangement that best suits your event" },
    { name: "layouts", type: "json", label: "Layout Options", defaultValue: JSON.stringify([
      { id: "theater", name: "Theater Style", capacity: 300, description: "Rows of chairs facing a stage or podium. Best for presentations and ceremonies.", imageUrl: "", priceAdjustment: 0 },
      { id: "classroom", name: "Classroom Style", capacity: 150, description: "Tables and chairs facing front. Best for workshops and training sessions.", imageUrl: "", priceAdjustment: 0 },
      { id: "rounds", name: "Rounds of 8-10", capacity: 200, description: "Round tables seating 8-10 guests each. Best for dinners, receptions, and galas.", imageUrl: "", priceAdjustment: 200 },
      { id: "cocktail", name: "Cocktail / Standing", capacity: 400, description: "High-top tables with open floor space. Best for networking and cocktail receptions.", imageUrl: "", priceAdjustment: 0 },
      { id: "u-shape", name: "U-Shape", capacity: 60, description: "Tables arranged in a U shape. Best for board meetings and small conferences.", imageUrl: "", priceAdjustment: 0 },
      { id: "boardroom", name: "Boardroom", capacity: 30, description: "Single long table. Best for executive meetings and intimate gatherings.", imageUrl: "", priceAdjustment: 0 },
    ]) },
    { name: "showCapacity", type: "boolean", label: "Show Capacity per Layout", defaultValue: true },
    { name: "validateCapacity", type: "boolean", label: "Warn if Over Capacity", defaultValue: true },
    { name: "allowMultiple", type: "boolean", label: "Allow Multiple Layouts (multi-room)", defaultValue: false },
    { name: "showPriceAdjustment", type: "boolean", label: "Show Price Difference", defaultValue: true },
  ],

  themeSlots: [],
  rules: [],
  variants: [
    { id: "default", name: "Card Grid", description: "Layout options as visual cards" },
    { id: "list", name: "Detailed List", description: "Layout options in a detailed list with diagrams" },
    { id: "visual", name: "Visual Diagram", description: "Interactive floor plan visualization" },
  ],
};
