import type { WidgetTemplate } from "../types";

export const beveragePackagePickerTemplate: WidgetTemplate = {
  id: "beverage-package-picker",
  name: "Beverage Package Picker",
  category: "pricing",
  description: "Bar/beverage package selection with tier comparison, per-person-per-hour pricing, duration slider, and signature cocktail add-ons.",
  icon: "🍷",
  inputs: [
    { name: "guests", type: "object", label: "Guest Count", description: "From guest-counter" },
  ],
  outputs: [
    { name: "selectedBeverage", type: "object", label: "Selected Beverage Package" },
    { name: "beverageTotal", type: "number", label: "Beverage Total" },
  ],
  themeSlots: [],
  configFields: [
    { name: "title", type: "text", label: "Section Title", defaultValue: "Choose Your Bar Package" },
    { name: "subtitle", type: "text", label: "Subtitle", defaultValue: "Select a bar service style and customize your experience" },
    { name: "currency", type: "text", label: "Currency Code", defaultValue: "USD" },
    { name: "packages", type: "json", label: "Bar Packages",
      defaultValue: JSON.stringify([
        { id: "silver", name: "Silver Bar", description: "Well liquor, domestic beer, house wine", pricePerPerson: 32, icon: "🥈", includes: ["Well Liquor", "Domestic Beer", "House Wine", "Soft Drinks"] },
        { id: "gold", name: "Gold Bar", description: "Call liquor, craft beer, select wines", pricePerPerson: 45, icon: "🥇", includes: ["Call Liquor", "Craft Beer", "Select Wine List", "Soft Drinks", "Juice Bar"] },
        { id: "platinum", name: "Platinum Bar", description: "Top-shelf spirits, full craft selection, premium wines", pricePerPerson: 62, icon: "💎", includes: ["Top-Shelf Spirits", "Full Craft Beer", "Premium Wine", "Champagne Toast", "Espresso Bar"] },
      ]),
    },
    { name: "defaultHours", type: "number", label: "Default Service Hours", defaultValue: 4 },
    { name: "minHours", type: "number", label: "Minimum Hours", defaultValue: 2 },
    { name: "maxHours", type: "number", label: "Maximum Hours", defaultValue: 8 },
    { name: "overtimeRate", type: "number", label: "Overtime Rate (per person/hour)", defaultValue: 8 },
    { name: "includedHours", type: "number", label: "Hours Included in Base Price", defaultValue: 4 },
    { name: "addOns", type: "json", label: "Beverage Add-Ons",
      defaultValue: JSON.stringify([
        { id: "signature-cocktail", name: "Signature Cocktail Station", price: 500, priceType: "flat", icon: "🍸" },
        { id: "espresso-bar", name: "Espresso Bar", price: 750, priceType: "flat", icon: "☕" },
        { id: "mocktail-station", name: "Mocktail Station", price: 350, priceType: "flat", icon: "🧃" },
      ]),
    },
    { name: "bartenderRatio", type: "number", label: "Guests per Bartender", defaultValue: 75 },
    { name: "bartenderFee", type: "number", label: "Bartender Fee (each)", defaultValue: 150 },
    { name: "showBartenderFee", type: "boolean", label: "Show Bartender Staffing", defaultValue: true },
  ],
  variants: [
    { id: "default", name: "Comparison Cards", description: "Side-by-side tier comparison" },
    { id: "compact", name: "Compact List", description: "Vertical list with radio selection" },
  ],
  rules: [],

  // Rich registry metadata
  aiDescription: "Beverage/bar package selection with compound pricing (tier × guests × hours). Shows comparison cards for different bar tiers (Silver/Gold/Platinum), a duration slider for service hours, overtime pricing for extra hours, and optional add-ons (signature cocktails, espresso bar). Calculates bartender staffing automatically.",
  aiConfusionNotes: "Do NOT use option-picker for bar packages — use beverage-package-picker for per-person-per-hour pricing. Do NOT use category-picker — beverage pricing is compound (tier × guests × hours), not simple per-unit.",
  bestFor: ["bar service", "beverage packages", "drink packages", "open bar", "cash bar", "alcohol selection", "cocktail packages"],
  notFor: ["food selection", "room selection", "generic options", "non-beverage items"],
  tags: ["beverage", "bar", "drinks", "cocktails", "wine", "beer", "spirits", "per-person", "per-hour", "open-bar", "cash-bar", "tier", "package"],
  swappableWith: ["category-picker", "option-picker"],
  requiresInputs: ["guests"],
  complexity: "complex",
  industries: ["wedding", "events", "hospitality", "catering", "resort", "conference"],
  pricingModel: "per-person-per-hour",
  subcategory: "food-beverage",
};
