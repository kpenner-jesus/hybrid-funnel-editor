import type { WidgetTemplate } from "../types";
import { guestRoomsTemplate } from "./guest-rooms";
import { datePickerTemplate } from "./date-picker";
import { guestCounterTemplate } from "./guest-counter";
import { optionPickerTemplate } from "./option-picker";
import { mealPickerTemplate } from "./meal-picker";
import { activityPickerTemplate } from "./activity-picker";
import { contactFormTemplate } from "./contact-form";
import { invoiceTemplate } from "./invoice";
import { segmentPickerTemplate } from "./segment-picker";
import { heroSectionTemplate } from "./hero-section";
import { headlineTemplate } from "./headline";
import { textBlockTemplate } from "./text-block";
import { imageBlockTemplate } from "./image-block";
import { categoryPickerTemplate } from "./category-picker";
import { textInputTemplate, textareaInputTemplate } from "./text-input";
import { bookingWidgetTemplate } from "./booking-widget";
import { paymentWidgetTemplate } from "./payment-widget";

export const widgetTemplateRegistry: Record<string, WidgetTemplate> = {
  // --- Content / Layout ---
  "hero-section": heroSectionTemplate,
  "headline": headlineTemplate,
  "text-block": textBlockTemplate,
  "image-block": imageBlockTemplate,
  // --- Input ---
  "date-picker": datePickerTemplate,
  "guest-counter": guestCounterTemplate,
  "text-input": textInputTemplate,
  "textarea-input": textareaInputTemplate,
  // --- Selection ---
  "segment-picker": segmentPickerTemplate,
  "option-picker": optionPickerTemplate,
  "guest-rooms": guestRoomsTemplate,
  "meal-picker": mealPickerTemplate,
  "activity-picker": activityPickerTemplate,
  "category-picker": categoryPickerTemplate,
  // --- Form ---
  "contact-form": contactFormTemplate,
  "booking-widget": bookingWidgetTemplate,
  "payment-widget": paymentWidgetTemplate,
  // --- Display ---
  "invoice": invoiceTemplate,
};

export const widgetTemplateList: WidgetTemplate[] = Object.values(widgetTemplateRegistry);

export function getTemplate(templateId: string): WidgetTemplate | undefined {
  return widgetTemplateRegistry[templateId];
}

export const templateCategories = [
  { id: "layout", label: "Content", description: "Hero, headlines, text, images" },
  { id: "input", label: "Input", description: "Data entry and text fields" },
  { id: "selection", label: "Selection", description: "Product and option selection" },
  { id: "form", label: "Form", description: "Contact forms, booking, payment" },
  { id: "display", label: "Display", description: "Invoice and data display" },
] as const;

export {
  heroSectionTemplate,
  headlineTemplate,
  textBlockTemplate,
  imageBlockTemplate,
  guestRoomsTemplate,
  datePickerTemplate,
  guestCounterTemplate,
  optionPickerTemplate,
  segmentPickerTemplate,
  mealPickerTemplate,
  activityPickerTemplate,
  categoryPickerTemplate,
  contactFormTemplate,
  bookingWidgetTemplate,
  paymentWidgetTemplate,
  invoiceTemplate,
  textInputTemplate,
  textareaInputTemplate,
};
