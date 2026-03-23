import type { WidgetTemplate } from "../types";

export const ceremonyDetailsPickerTemplate: WidgetTemplate = {
  id: "ceremony-details-picker",
  name: "Ceremony Details Picker",
  icon: "💍",
  category: "data-collection",
  description: "Collect ceremony-specific details: officiant, music, processional, readings, vows style, unity ceremony.",
  aiDescription: "Use ceremony-details-picker for wedding/ceremony-specific detail collection. This widget collects structured information about the ceremony itself — officiant type (provided/in-house), music selections (processional, recessional, during ceremony), vow style (traditional/custom/mix), unity ceremony type (candle, sand, handfasting), reading selections, and special requests. Each section is collapsible and optional. This is a DATA COLLECTION widget, not a product selection widget — it doesn't have pricing. Use it to capture ceremony preferences that the venue coordinator needs for planning. ONLY use for weddings or ceremony-based events.",
  aiConfusionNotes: "Do NOT use option-picker for ceremony details — ceremony-details-picker has structured sections for each ceremony element. Do NOT use contact-form — that's for contact info, not event preferences. Do NOT use text-input for ceremony details — ceremony-details-picker provides structured multi-section collection with appropriate options per section.",
  bestFor: ["wedding ceremony", "vow renewal", "commitment ceremony", "officiant selection", "music selection", "unity ceremony"],
  notFor: ["reception details", "venue selection", "general event preferences", "non-ceremony events"],
  tags: ["ceremony", "wedding", "officiant", "vows", "music", "processional", "unity", "readings", "wedding-planning"],
  industries: ["wedding-venue", "event-venue", "wedding-planner", "chapel", "church"],
  complexity: "moderate",
  inputs: [],
  outputs: [
    { name: "ceremonyDetails", type: "object", label: "Ceremony Details", description: "All ceremony preferences and selections" },
  ],
  configFields: [
    { name: "title", type: "text", label: "Section Title", defaultValue: "Ceremony Details" },
    { name: "subtitle", type: "text", label: "Subtitle", defaultValue: "Tell us about your ceremony preferences so we can prepare everything perfectly" },
    { name: "sections", type: "json", label: "Ceremony Sections", defaultValue: JSON.stringify([
      {
        id: "officiant", name: "Officiant", enabled: true, type: "select",
        options: [
          { value: "provided", label: "We have our own officiant" },
          { value: "in-house", label: "We'd like the venue to provide an officiant" },
          { value: "undecided", label: "We haven't decided yet" },
        ],
        followUp: { type: "text", label: "Officiant name (if known)", showWhen: "provided" }
      },
      {
        id: "vow-style", name: "Vow Style", enabled: true, type: "select",
        options: [
          { value: "traditional", label: "Traditional vows" },
          { value: "custom", label: "We're writing our own vows" },
          { value: "mix", label: "Mix of traditional and personal" },
        ]
      },
      {
        id: "music", name: "Music & Processional", enabled: true, type: "multi",
        items: [
          { id: "processional", label: "Processional Song", type: "text", placeholder: "Song for walking down the aisle" },
          { id: "during", label: "During Ceremony", type: "text", placeholder: "Background music or live performance" },
          { id: "recessional", label: "Recessional Song", type: "text", placeholder: "Exit song after ceremony" },
        ]
      },
      {
        id: "unity", name: "Unity Ceremony", enabled: true, type: "select",
        options: [
          { value: "none", label: "No unity ceremony" },
          { value: "candle", label: "Unity candle lighting" },
          { value: "sand", label: "Sand ceremony" },
          { value: "handfasting", label: "Handfasting (ribbon binding)" },
          { value: "wine", label: "Wine blending ceremony" },
          { value: "tree", label: "Tree planting ceremony" },
          { value: "other", label: "Other (please describe)" },
        ],
        followUp: { type: "text", label: "Describe your unity ceremony", showWhen: "other" }
      },
      {
        id: "readings", name: "Readings", enabled: true, type: "textarea",
        placeholder: "List any readings, poems, or scripture you'd like included in the ceremony"
      },
      {
        id: "special-requests", name: "Special Requests", enabled: true, type: "textarea",
        placeholder: "Any other ceremony details or special requests (e.g., cultural traditions, ring bearer, flower girl)"
      },
    ]) },
    { name: "collapsible", type: "boolean", label: "Make Sections Collapsible", defaultValue: true },
    { name: "showOptionalBadge", type: "boolean", label: "Show 'Optional' Badge on Non-Required Sections", defaultValue: true },
  ],

  themeSlots: [],
  rules: [],
  variants: [
    { id: "default", name: "Full Form", description: "All sections expanded" },
    { id: "wizard", name: "Step-by-Step", description: "One section at a time with next/skip" },
  ],
};
