import type { WidgetTemplate } from "../types";

export const textBlockTemplate: WidgetTemplate = {
  id: "text-block",
  name: "Text / HTML Block",
  category: "layout",
  description:
    "Rich text content block supporting HTML formatting. Use for descriptions, instructions, promotional text, bullet lists, and any narrative content between widgets. Supports bold, italic, links, lists, and paragraphs.",
  icon: "📄",
  inputs: [],
  outputs: [],
  themeSlots: [
    { name: "textColor", cssProperty: "color", defaultValue: "#374151", label: "Text Color" },
  ],
  configFields: [
    { name: "content", type: "textarea", label: "Content (HTML supported)", defaultValue: "<p>Add your text content here. You can use <strong>bold</strong>, <em>italic</em>, and <a href='#'>links</a>.</p>", description: "Rich text content. HTML tags like <p>, <ul>, <li>, <strong>, <em>, <a> are supported." },
    { name: "maxWidth", type: "select", label: "Max Width", defaultValue: "full", options: [{ value: "narrow", label: "Narrow (400px)" }, { value: "medium", label: "Medium (600px)" }, { value: "full", label: "Full Width" }] },
    { name: "fontSize", type: "select", label: "Font Size", defaultValue: "normal", options: [{ value: "small", label: "Small (13px)" }, { value: "normal", label: "Normal (15px)" }, { value: "large", label: "Large (17px)" }] },
  ],
  variants: [
    { id: "default", name: "Standard", description: "Standard text block" },
    { id: "callout", name: "Callout", description: "Highlighted callout box with background" },
    { id: "quote", name: "Quote", description: "Blockquote style with left border" },
  ],
  rules: [],
};
