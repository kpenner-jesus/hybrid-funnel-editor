import type { WidgetTemplate } from "../types";

export const paymentWidgetTemplate: WidgetTemplate = {
  id: "payment-widget",
  name: "Payment Widget",
  category: "form",
  description:
    "Payment collection widget for securing bookings. Supports percentage-based deposits (e.g., 10% deposit) or full payment. Integrates with the Everybooking payment system. Place on a dedicated payment step after the invoice is displayed.",
  icon: "💳",
  inputs: [
    { name: "bookingId", type: "string", label: "Booking ID", description: "From the booking widget" },
    { name: "totalPrice", type: "number", label: "Total Price", description: "From the invoice widget" },
  ],
  outputs: [
    { name: "paymentComplete", type: "boolean", label: "Payment Complete", description: "Whether payment was successfully processed" },
    { name: "amountPaid", type: "number", label: "Amount Paid" },
  ],
  themeSlots: [
    { name: "buttonBg", cssProperty: "background-color", defaultValue: "#006c4b", label: "Pay Button Color" },
  ],
  configFields: [
    { name: "title", type: "text", label: "Title", defaultValue: "Secure Your Booking", description: "Payment section heading" },
    { name: "amount", type: "number", label: "Amount", defaultValue: 10, description: "Payment amount (number or percentage)" },
    { name: "amountType", type: "select", label: "Amount Type", defaultValue: "percent", options: [{ value: "percent", label: "Percentage of Total" }, { value: "fixed", label: "Fixed Amount" }, { value: "full", label: "Full Payment" }] },
    { name: "description", type: "textarea", label: "Description", defaultValue: "A deposit is required to secure your dates.", description: "Text explaining the payment" },
    { name: "acceptedMethods", type: "json", label: "Accepted Payment Methods", defaultValue: '["credit-card", "e-check"]', description: "JSON array of accepted methods" },
  ],
  variants: [
    { id: "default", name: "Standard", description: "Standard payment form" },
    { id: "compact", name: "Compact", description: "Minimal payment widget" },
  ],
  rules: [],
};
