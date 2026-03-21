import type { WidgetTemplate } from "../types";

export const invoiceTemplate: WidgetTemplate = {
  id: "invoice",
  name: "Invoice / Summary",
  category: "display",
  description: "Displays a booking summary with line items, subtotals, and a grand total.",
  icon: "🧾",
  inputs: [
    { name: "checkIn", type: "date", label: "Check-in Date", required: true },
    { name: "checkOut", type: "date", label: "Check-out Date", required: true },
    { name: "nightCount", type: "number", label: "Number of Nights", required: true },
    { name: "guests", type: "object", label: "Guest Count", required: true },
    { name: "selectedRooms", type: "array", label: "Selected Rooms", required: true },
    { name: "selectedMeals", type: "array", label: "Selected Meals" },
    { name: "selectedActivities", type: "array", label: "Selected Activities" },
    { name: "contactInfo", type: "object", label: "Contact Information" },
  ],
  outputs: [
    { name: "totalPrice", type: "number", label: "Grand Total" },
    { name: "lineItems", type: "array", label: "Line Items" },
  ],
  themeSlots: [
    { name: "invoiceBg", cssProperty: "background-color", defaultValue: "#ffffff", label: "Invoice Background" },
    { name: "headerBg", cssProperty: "background-color", defaultValue: "#006c4b", label: "Header Background" },
    { name: "headerText", cssProperty: "color", defaultValue: "#ffffff", label: "Header Text" },
    { name: "totalBg", cssProperty: "background-color", defaultValue: "#e0f5ee", label: "Total Row Background" },
    { name: "dividerColor", cssProperty: "border-color", defaultValue: "#c3c6cf", label: "Divider Color" },
  ],
  configFields: [
    { name: "title", type: "text", label: "Invoice Title", defaultValue: "Booking Summary" },
    { name: "showLogo", type: "boolean", label: "Show Property Logo", defaultValue: true },
    { name: "currency", type: "text", label: "Currency Symbol", defaultValue: "CHF" },
    { name: "showTax", type: "boolean", label: "Show Tax Row", defaultValue: false },
    { name: "taxRate", type: "number", label: "Tax Rate (%)", defaultValue: 7.7 },
    { name: "showContactSummary", type: "boolean", label: "Show Contact Summary", defaultValue: true },
    { name: "showDateSummary", type: "boolean", label: "Show Date Summary", defaultValue: true },
  ],
  variants: [
    { id: "default", name: "Standard Invoice", description: "Clean line-item invoice with subtotals" },
    { id: "compact", name: "Compact Summary", description: "Condensed summary with key totals only" },
    { id: "detailed", name: "Detailed Breakdown", description: "Full breakdown with per-night and per-person calculations" },
  ],
  rules: [
    { id: "calc-total", description: "Calculate grand total from all line items", condition: "always", action: "calculate_total" },
    { id: "tax-calc", description: "Calculate tax if enabled", condition: "config.showTax", action: "calculate_tax" },
  ],
};
