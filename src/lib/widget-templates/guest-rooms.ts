import type { WidgetTemplate } from "../types";

export const guestRoomsTemplate: WidgetTemplate = {
  id: "guest-rooms",
  name: "Guest Rooms",
  category: "selection",
  description: "Room product selection with images, pricing, availability, and quantity controls. Fetches live inventory from Everybooking via categoryId. Requires checkIn, checkOut, and guests as inputs. Outputs selectedRooms and roomTotal.",
  icon: "🛏️",
  inputs: [
    { name: "checkIn", type: "date", label: "Check-in Date", required: true },
    { name: "checkOut", type: "date", label: "Check-out Date", required: true },
    { name: "guests", type: "object", label: "Guest Count", required: true },
    { name: "products", type: "array", label: "Room Products", required: true, description: "Array of room product objects" },
  ],
  outputs: [
    { name: "selectedRooms", type: "array", label: "Selected Rooms", description: "Array of selected room objects with quantities" },
    { name: "roomTotal", type: "number", label: "Room Total", description: "Total price for all selected rooms" },
  ],
  themeSlots: [
    { name: "cardBg", cssProperty: "background-color", defaultValue: "#ffffff", label: "Card Background" },
    { name: "cardBorder", cssProperty: "border-color", defaultValue: "#c3c6cf", label: "Card Border" },
    { name: "selectedBorder", cssProperty: "border-color", defaultValue: "#006c4b", label: "Selected Border" },
    { name: "priceColor", cssProperty: "color", defaultValue: "#006c4b", label: "Price Color" },
  ],
  configFields: [
    { name: "title", type: "text", label: "Section Title", defaultValue: "Select Your Rooms" },
    { name: "categoryId", type: "number", label: "Room Category ID", defaultValue: 33, description: "Everybooking category ID for room products" },
    { name: "showImages", type: "boolean", label: "Show Room Images", defaultValue: true },
    { name: "showTags", type: "boolean", label: "Show Tags", defaultValue: true },
    { name: "maxSelections", type: "number", label: "Max Selections", defaultValue: 0, description: "0 = unlimited" },
    { name: "layout", type: "select", label: "Card Layout", defaultValue: "grid", options: [
      { value: "grid", label: "Grid" },
      { value: "list", label: "List" },
    ]},
  ],
  variants: [
    { id: "default", name: "Default", description: "Standard layout" },
  ],
  rules: [
    { id: "stock-check", description: "Disable selection when stock is 0", condition: "product.stock === 0", action: "disable" },
    { id: "guest-fit", description: "Warn if room capacity is less than guest count", condition: "product.maxAdults < guests.adults", action: "warn" },
  ],
};
