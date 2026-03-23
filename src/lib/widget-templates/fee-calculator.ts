import type { WidgetTemplate } from "../types";

export const feeCalculatorTemplate: WidgetTemplate = {
  id: "fee-calculator",
  name: "Fee Calculator",
  icon: "💰",
  category: "pricing",
  description: "Calculates service charges, taxes, gratuity, and fees. Shows transparent breakdown to customers.",
  aiDescription: "Use fee-calculator when the business needs to add percentage-based fees (service charge, gratuity, tax, admin fee) on top of selected products. This widget reads the running subtotal from upstream widgets and calculates additional fees. It shows customers a transparent breakdown of all charges before the invoice. ALWAYS place this AFTER all product selection steps (rooms, meals, activities) and BEFORE the invoice/payment steps.",
  aiConfusionNotes: "Do NOT use invoice for fee display — invoice shows the final total. fee-calculator is for the intermediate breakdown where fees are calculated and displayed transparently. Do NOT use option-picker for fee selection — fee-calculator has built-in percentage math.",
  bestFor: ["service charge", "gratuity", "tax calculation", "admin fee", "processing fee", "resort fee"],
  notFor: ["product pricing", "deposit calculation", "discount codes"],
  tags: ["pricing", "fees", "tax", "gratuity", "service-charge", "transparent-pricing", "wedding", "events", "catering", "hospitality"],
  industries: ["wedding-venue", "event-venue", "catering", "restaurant", "hotel", "resort", "conference-center"],
  complexity: "moderate",
  inputs: [
    { name: "subtotal", type: "number", label: "Running Subtotal", description: "Total from all upstream product selections" },
  ],
  outputs: [
    { name: "fees", type: "object", label: "Calculated Fees", description: "Breakdown of all fees applied" },
    { name: "totalWithFees", type: "number", label: "Total with Fees", description: "Subtotal + all fees" },
  ],
  configFields: [
    { name: "title", type: "text", label: "Section Title", defaultValue: "Fees & Service Charges" },
    { name: "fees", type: "json", label: "Fee Definitions", defaultValue: JSON.stringify([
      { id: "service-charge", name: "Service Charge", type: "percentage", value: 20, description: "Standard service charge", enabled: true, optional: false },
      { id: "gratuity", name: "Gratuity", type: "percentage", value: 0, description: "Optional gratuity for staff", enabled: true, optional: true, presets: [15, 18, 20, 25] },
      { id: "admin-fee", name: "Admin Fee", type: "flat", value: 150, description: "Event coordination fee", enabled: true, optional: false },
    ]) },
    { name: "showBreakdown", type: "boolean", label: "Show Line-by-Line Breakdown", defaultValue: true },
    { name: "allowCustomGratuity", type: "boolean", label: "Allow Custom Gratuity %", defaultValue: true },
    { name: "currency", type: "text", label: "Currency", defaultValue: "CAD" },
  ],

  themeSlots: [],
  rules: [],
  variants: [
    { id: "default", name: "Full Breakdown", description: "Shows all fees with descriptions" },
    { id: "compact", name: "Compact Summary", description: "Shows total fees as one line" },
  ],
};
