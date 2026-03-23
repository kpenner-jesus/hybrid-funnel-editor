import type { WidgetTemplate } from "../types";

export const packageTierPickerTemplate: WidgetTemplate = {
  id: "package-tier-picker",
  name: "Package Tier Picker",
  category: "pricing",
  description: "All-inclusive package comparison with feature checklists, per-person pricing, and downstream widget pre-configuration.",
  icon: "📦",
  inputs: [
    { name: "guests", type: "object", label: "Guest Count", description: "From guest-counter" },
  ],
  outputs: [
    { name: "selectedPackage", type: "object", label: "Selected Package" },
    { name: "packageTotal", type: "number", label: "Package Total" },
    { name: "packageIncludes", type: "array", label: "Included Items List" },
  ],
  themeSlots: [],
  configFields: [
    { name: "title", type: "text", label: "Section Title", defaultValue: "Choose Your Package" },
    { name: "subtitle", type: "text", label: "Subtitle", defaultValue: "Select the package that best fits your event" },
    { name: "currency", type: "text", label: "Currency Code", defaultValue: "USD" },
    { name: "pricingType", type: "select", label: "Pricing Type", defaultValue: "per-person",
      options: [
        { value: "per-person", label: "Per Person" },
        { value: "flat", label: "Flat Rate" },
      ],
    },
    { name: "tiers", type: "json", label: "Package Tiers",
      defaultValue: JSON.stringify([
        {
          id: "classic", name: "Classic", icon: "⭐", pricePerPerson: 85, flatPrice: 8500,
          color: "#6b7280", popular: false,
          includes: ["Venue rental (6 hours)", "Basic linens", "Tables & chairs", "House wine & beer (4 hours)", "Buffet dinner"],
          excludes: ["Chair covers", "Centerpieces", "DJ/Entertainment", "Uplighting"],
        },
        {
          id: "premier", name: "Premier", icon: "🌟", pricePerPerson: 125, flatPrice: 12500,
          color: "#2563eb", popular: true,
          includes: ["Venue rental (8 hours)", "Premium linens", "Tables & chairs", "Chair covers", "Centerpieces", "Open bar — Gold (4 hours)", "Plated dinner", "DJ & MC"],
          excludes: ["Uplighting", "Photo booth", "Late-night snack"],
        },
        {
          id: "elite", name: "Elite", icon: "💎", pricePerPerson: 175, flatPrice: 17500,
          color: "#7c3aed", popular: false,
          includes: ["Venue rental (10 hours)", "Luxury linens", "Tables & chairs", "Chiavari chairs", "Tall centerpieces", "Open bar — Platinum (5 hours)", "Plated dinner + late-night", "DJ & MC", "Uplighting (16 lights)", "Photo booth (4 hours)", "Day-of coordinator"],
          excludes: [],
        },
      ]),
    },
    { name: "showComparison", type: "boolean", label: "Show Feature Comparison", defaultValue: true },
    { name: "highlightPopular", type: "boolean", label: "Highlight Popular Tier", defaultValue: true },
  ],
  variants: [
    { id: "default", name: "Comparison Columns", description: "Side-by-side columns with feature checklists" },
    { id: "cards", name: "Stacked Cards", description: "Vertical card stack for narrow layouts" },
  ],
  rules: [],

  // Rich registry metadata
  aiDescription: "All-inclusive package tier comparison widget. Shows 2-5 tiers (Classic/Premier/Elite) in side-by-side columns with included features checklist, per-person or flat pricing, and a 'Popular' badge. Selection sets the anchor price for the entire quote and can pre-configure downstream widgets (e.g., selecting Elite pre-enables uplighting in the add-on step).",
  aiConfusionNotes: "Do NOT use option-picker for package tiers — use package-tier-picker for comparison columns with feature checklists and per-person math. Do NOT use segment-picker — packages don't branch the funnel, they set pricing. Do NOT use category-picker — packages are tiers with includes/excludes, not product categories.",
  bestFor: ["all-inclusive packages", "pricing tiers", "package comparison", "base package selection", "bronze/silver/gold", "classic/premier/elite"],
  notFor: ["individual product selection", "funnel branching", "add-ons", "beverage-only packages"],
  tags: ["package", "tier", "comparison", "all-inclusive", "per-person", "includes", "popular", "bronze", "silver", "gold", "classic", "premier", "elite"],
  swappableWith: ["option-picker", "category-picker"],
  requiresInputs: ["guests"],
  complexity: "moderate",
  industries: ["wedding", "events", "hospitality", "conference", "resort", "catering"],
  pricingModel: "per-person",
  subcategory: "packages",
};
