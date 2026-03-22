import type { WidgetTemplate } from "../types";

export const bookingWidgetTemplate: WidgetTemplate = {
  id: "booking-widget",
  name: "Booking Widget",
  category: "form",
  description:
    "Hidden backend booking widget that creates an actual booking/session in the Everybooking API. Ties together selected products (rooms, meals, activities) with dates and guest counts to generate an invoice. Typically placed on the Contact step (hidden from the user) and triggered by a 'Generate Quote' button. The booking_id output is passed to the Invoice widget.",
  icon: "📦",
  inputs: [
    { name: "checkIn", type: "date", label: "Check-in Date" },
    { name: "checkOut", type: "date", label: "Check-out Date" },
    { name: "guests", type: "object", label: "Guest Counts" },
    { name: "selectedRooms", type: "array", label: "Selected Rooms" },
    { name: "selectedMeals", type: "array", label: "Selected Meals" },
    { name: "selectedActivities", type: "array", label: "Selected Activities" },
    { name: "contactInfo", type: "object", label: "Contact Information" },
  ],
  outputs: [
    { name: "bookingId", type: "string", label: "Booking ID", description: "The generated booking/session ID for the invoice widget" },
    { name: "sessionId", type: "string", label: "Session ID", description: "API session ID for completing the booking" },
  ],
  themeSlots: [],
  configFields: [
    { name: "categoryName", type: "text", label: "Booking Category Name", defaultValue: "Group Package", description: "Name of the booking category in Everybooking" },
    { name: "visible", type: "boolean", label: "Visible to User", defaultValue: false, description: "Usually hidden — runs in background to create the booking" },
    { name: "products", type: "json", label: "Additional Products (optional)", defaultValue: "[]", description: "JSON array of extra products to include: [{name, price, unit, liquidVariable}]" },
  ],
  variants: [
    { id: "default", name: "Hidden", description: "Runs in background, not visible to user" },
    { id: "visible", name: "Visible Summary", description: "Shows a booking summary card" },
  ],
  rules: [],
};
