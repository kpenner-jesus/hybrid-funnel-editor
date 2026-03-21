import type { WidgetTemplate } from "../types";

export const contactFormTemplate: WidgetTemplate = {
  id: "contact-form",
  name: "Contact Form",
  category: "form",
  description: "Collects guest contact information for booking confirmation.",
  icon: "📋",
  inputs: [
    { name: "prefillData", type: "object", label: "Pre-fill Data", description: "Optional pre-fill values for returning guests" },
  ],
  outputs: [
    { name: "contactInfo", type: "object", label: "Contact Information", description: "Object with name, email, phone, notes, etc." },
    { name: "isValid", type: "boolean", label: "Form Valid" },
  ],
  themeSlots: [
    { name: "inputBg", cssProperty: "background-color", defaultValue: "#ffffff", label: "Input Background" },
    { name: "inputBorder", cssProperty: "border-color", defaultValue: "#c3c6cf", label: "Input Border" },
    { name: "focusBorder", cssProperty: "border-color", defaultValue: "#006c4b", label: "Focus Border" },
    { name: "labelColor", cssProperty: "color", defaultValue: "#43474e", label: "Label Color" },
  ],
  configFields: [
    { name: "title", type: "text", label: "Section Title", defaultValue: "Your Details" },
    { name: "showPhone", type: "boolean", label: "Show Phone Field", defaultValue: true },
    { name: "showCompany", type: "boolean", label: "Show Company Field", defaultValue: false },
    { name: "showNotes", type: "boolean", label: "Show Notes/Comments Field", defaultValue: true },
    { name: "requireEmail", type: "boolean", label: "Require Email", defaultValue: true },
    { name: "requirePhone", type: "boolean", label: "Require Phone", defaultValue: false },
    { name: "gdprConsent", type: "boolean", label: "Show GDPR Consent Checkbox", defaultValue: true },
    { name: "gdprText", type: "textarea", label: "GDPR Consent Text", defaultValue: "I agree to the processing of my personal data in accordance with the privacy policy." },
  ],
  variants: [
    { id: "default", name: "Standard Form", description: "Vertical stacked form fields" },
    { id: "two-column", name: "Two Column", description: "Name/email on left, phone/company on right" },
    { id: "minimal", name: "Minimal", description: "Only name and email in a compact layout" },
  ],
  rules: [
    { id: "email-required", description: "Validate email format", condition: "!isValidEmail(contactInfo.email)", action: "error" },
    { id: "gdpr-required", description: "GDPR consent must be accepted", condition: "config.gdprConsent && !contactInfo.gdprAccepted", action: "error" },
  ],
};
