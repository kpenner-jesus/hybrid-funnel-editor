import type { WidgetTemplate } from "../types";

export const datePickerTemplate: WidgetTemplate = {
  id: "date-picker",
  name: "Date Range Picker",
  category: "input",
  description: "Calendar-based date range selector for check-in and check-out dates. Outputs checkIn, checkOut, and nightCount. Place early in funnel — room/meal/activity widgets need dates to fetch availability.",
  icon: "📅",
  inputs: [
    { name: "minDate", type: "date", label: "Minimum Date", description: "Earliest selectable date" },
    { name: "maxDate", type: "date", label: "Maximum Date", description: "Latest selectable date" },
    { name: "blockedDates", type: "array", label: "Blocked Dates", description: "Dates that cannot be selected" },
  ],
  outputs: [
    { name: "checkIn", type: "date", label: "Check-in Date" },
    { name: "checkOut", type: "date", label: "Check-out Date" },
    { name: "nightCount", type: "number", label: "Number of Nights" },
  ],
  themeSlots: [
    { name: "calendarBg", cssProperty: "background-color", defaultValue: "#ffffff", label: "Calendar Background" },
    { name: "selectedDayBg", cssProperty: "background-color", defaultValue: "#006c4b", label: "Selected Day Background" },
    { name: "rangeBg", cssProperty: "background-color", defaultValue: "#e0f5ee", label: "Range Highlight" },
    { name: "todayBorder", cssProperty: "border-color", defaultValue: "#006c4b", label: "Today Border" },
  ],
  configFields: [
    { name: "title", type: "text", label: "Section Title", defaultValue: "Select Your Dates" },
    { name: "minStay", type: "number", label: "Minimum Stay (nights)", defaultValue: 1 },
    { name: "maxStay", type: "number", label: "Maximum Stay (nights)", defaultValue: 30 },
    { name: "showPriceHints", type: "boolean", label: "Show Price Hints on Calendar", defaultValue: false },
    { name: "displayMode", type: "select", label: "Display Mode", defaultValue: "inline", options: [
      { value: "inline", label: "Inline Calendar" },
      { value: "popup", label: "Popup Calendar" },
      { value: "dual", label: "Dual Month View" },
    ]},
  ],
  variants: [
    { id: "default", name: "Default", description: "Standard layout" },
  ],
  rules: [
    { id: "min-stay", description: "Enforce minimum stay duration", condition: "nightCount < config.minStay", action: "error" },
    { id: "max-stay", description: "Enforce maximum stay duration", condition: "nightCount > config.maxStay", action: "error" },
  ],
};
