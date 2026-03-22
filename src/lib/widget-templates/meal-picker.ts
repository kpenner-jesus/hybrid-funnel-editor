import type { WidgetTemplate } from "../types";

export const mealPickerTemplate: WidgetTemplate = {
  id: "meal-picker",
  name: "Meal Widget",
  category: "selection",
  description:
    "Timeslot-based meal booking grid. Shows meals (Breakfast, Lunch, Supper, Night Snack + custom) across date columns with per-day selectability. " +
    "Supports kids meals (percentage or age-based pricing), cascade auto-selection, and locked timeslot display. " +
    "Produces booking_widget-compatible data for Everybooking invoice. Requires guests and date range as inputs.",
  icon: "🍽️",
  inputs: [
    { name: "guests", type: "object", label: "Guest Count", required: true },
    { name: "nightCount", type: "number", label: "Number of Nights", required: true },
    { name: "checkIn", type: "string", label: "Check-in Date" },
    { name: "checkOut", type: "string", label: "Check-out Date" },
  ],
  outputs: [
    { name: "selectedMeals", type: "array", label: "Selected Meals", description: "Array of {mealId, date, timeslot, qty} for each booked meal" },
    { name: "mealTotal", type: "number", label: "Meal Total" },
    { name: "kidsMealTotal", type: "number", label: "Kids Meal Total" },
  ],
  themeSlots: [
    { name: "cardBg", cssProperty: "background-color", defaultValue: "#ffffff", label: "Card Background" },
    { name: "headerBg", cssProperty: "background-color", defaultValue: "#f8fafc", label: "Header Background" },
    { name: "priceColor", cssProperty: "color", defaultValue: "#006c4b", label: "Price Color" },
  ],
  configFields: [
    // Basic
    { name: "title", type: "text", label: "Section Title", defaultValue: "Meals" },
    { name: "subtitle", type: "text", label: "Subtitle", defaultValue: "" },
    { name: "currency", type: "text", label: "Currency Code", defaultValue: "CAD" },
    { name: "singleDate", type: "boolean", label: "Single Date Mode (not a range)", defaultValue: false },
    { name: "showSelectAll", type: "boolean", label: "Show 'Select All' per day", defaultValue: true },

    // Meal definitions — stored as JSON array
    {
      name: "meals",
      type: "json",
      label: "Meal Definitions",
      defaultValue: JSON.stringify([
        {
          id: "breakfast", name: "Breakfast", sortOrder: 1, adultPrice: 18,
          timeslots: [{ startTime: "07:00", endTime: "09:00" }],
          timeslotLocked: false,
          allowCheckIn: "unselectable", allowMiddle: "selectable", allowCheckOut: "selectable",
          cascadeFrom: [],
        },
        {
          id: "lunch", name: "Lunch", sortOrder: 2, adultPrice: 20,
          timeslots: [{ startTime: "12:00", endTime: "14:00" }],
          timeslotLocked: false,
          allowCheckIn: "selectable", allowMiddle: "selectable", allowCheckOut: "selectable",
          cascadeFrom: [],
        },
        {
          id: "supper", name: "Supper", sortOrder: 3, adultPrice: 25,
          timeslots: [{ startTime: "17:00", endTime: "19:00" }],
          timeslotLocked: false,
          allowCheckIn: "selectable", allowMiddle: "selectable", allowCheckOut: "unselectable",
          cascadeFrom: [],
        },
        {
          id: "night-snack", name: "Night Snack", sortOrder: 4, adultPrice: 8,
          timeslots: [{ startTime: "20:00", endTime: "22:00" }],
          timeslotLocked: false,
          allowCheckIn: "selectable", allowMiddle: "selectable", allowCheckOut: "unselectable",
          cascadeFrom: [],
        },
      ]),
      description: "JSON array of meal definitions. Each: { id, name, sortOrder, adultPrice, timeslots: [{startTime, endTime}], timeslotLocked, allowCheckIn, allowMiddle, allowCheckOut, cascadeFrom: [mealId...] }",
    },

    // Kids meal config
    { name: "kidsEnabled", type: "boolean", label: "Enable Kids Meals", defaultValue: true },
    {
      name: "kidsPricingModel",
      type: "select",
      label: "Kids Pricing Model",
      defaultValue: "percentage",
      options: [
        { value: "percentage", label: "Percentage of Adult Price" },
        { value: "age-based", label: "Price × Child Age" },
      ],
    },
    { name: "kidsPercentage", type: "number", label: "Kids Price (% of adult)", defaultValue: 10 },
    { name: "kidsAgeMultiplier", type: "number", label: "Kids Price per Age Year ($)", defaultValue: 1.5 },

    // Everybooking integration
    { name: "categoryId", type: "number", label: "Meal Category ID", defaultValue: 34, description: "Everybooking category ID for adult meal products" },
    { name: "kidsCategoryId", type: "number", label: "Kids Meal Category ID", defaultValue: 0, description: "Everybooking category ID for kids meal products (0 = auto-create)" },
  ],
  variants: [
    { id: "default", name: "Full Grid", description: "Date × meal grid with timeslot selectors and color bars" },
    { id: "simple", name: "Simple Checkboxes", description: "Checkbox list grouped by meal type (no timeslot grid)" },
  ],
  rules: [
    { id: "timeslot-booking", description: "Each selected meal+day = 1 timeslot unit at the given price", condition: "always", action: "calculate_total" },
    { id: "kids-auto-book", description: "Kids meals auto-booked when adult meal is selected (if kidsEnabled)", condition: "kidsEnabled", action: "auto_book_kids" },
    { id: "cascade-select", description: "Cascade auto-selects related meals when a trigger meal is picked", condition: "cascadeFrom.length > 0", action: "cascade_select" },
  ],
};
