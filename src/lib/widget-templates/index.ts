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

export const widgetTemplateRegistry: Record<string, WidgetTemplate> = {
  "guest-rooms": guestRoomsTemplate,
  "date-picker": datePickerTemplate,
  "guest-counter": guestCounterTemplate,
  "option-picker": optionPickerTemplate,
  "segment-picker": segmentPickerTemplate,
  "meal-picker": mealPickerTemplate,
  "activity-picker": activityPickerTemplate,
  "contact-form": contactFormTemplate,
  "invoice": invoiceTemplate,
};

export const widgetTemplateList: WidgetTemplate[] = Object.values(widgetTemplateRegistry);

export function getTemplate(templateId: string): WidgetTemplate | undefined {
  return widgetTemplateRegistry[templateId];
}

export const templateCategories = [
  { id: "input", label: "Input", description: "Data entry widgets" },
  { id: "selection", label: "Selection", description: "Product and option selection" },
  { id: "form", label: "Form", description: "Form and data collection" },
  { id: "display", label: "Display", description: "Data display and summary" },
  { id: "layout", label: "Layout", description: "Layout and structure" },
] as const;

export {
  guestRoomsTemplate,
  datePickerTemplate,
  guestCounterTemplate,
  optionPickerTemplate,
  segmentPickerTemplate,
  mealPickerTemplate,
  activityPickerTemplate,
  contactFormTemplate,
  invoiceTemplate,
};
