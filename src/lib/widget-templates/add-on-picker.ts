import type { WidgetTemplate } from "../types";

export const addOnPickerTemplate: WidgetTemplate = {
  id: "add-on-picker",
  name: "Add-On Picker",
  category: "pricing",
  description: "Quick-toggle grid of optional enhancements with mixed pricing (flat, per-person, per-hour). Designed for upsell after main package selection.",
  icon: "➕",
  inputs: [
    { name: "guests", type: "object", label: "Guest Count", description: "From guest-counter" },
  ],
  outputs: [
    { name: "selectedAddOns", type: "array", label: "Selected Add-Ons" },
    { name: "addOnTotal", type: "number", label: "Add-On Total" },
  ],
  themeSlots: [],
  configFields: [
    { name: "title", type: "text", label: "Section Title", defaultValue: "Enhance Your Event" },
    { name: "subtitle", type: "text", label: "Subtitle", defaultValue: "Add optional upgrades to make your event unforgettable" },
    { name: "currency", type: "text", label: "Currency Code", defaultValue: "USD" },
    { name: "addOns", type: "json", label: "Add-On Items",
      defaultValue: JSON.stringify([
        { id: "photo-booth", name: "Photo Booth", description: "4-hour photo booth with props and prints", price: 800, priceType: "flat", icon: "📸", imageUrl: "", category: "Entertainment" },
        { id: "uplighting", name: "Uplighting Package", description: "16 LED uplights in your choice of color", price: 600, priceType: "flat", icon: "💡", imageUrl: "", category: "Décor" },
        { id: "sparkler-sendoff", name: "Sparkler Send-Off", description: "Sparkler exit kit for all guests", price: 150, priceType: "flat", icon: "✨", imageUrl: "", category: "Entertainment" },
        { id: "late-night-tacos", name: "Late-Night Taco Station", description: "Chef-attended taco bar for end of reception", price: 12, priceType: "per-person", icon: "🌮", imageUrl: "", category: "Food & Beverage" },
        { id: "lawn-games", name: "Lawn Games Set", description: "Cornhole, croquet, giant Jenga for cocktail hour", price: 250, priceType: "flat", icon: "🎯", imageUrl: "", category: "Entertainment" },
        { id: "dance-floor-upgrade", name: "LED Dance Floor", description: "White LED dance floor upgrade", price: 1200, priceType: "flat", icon: "💃", imageUrl: "", category: "Venue" },
        { id: "fog-machine", name: "First Dance Fog Effect", description: "Low-lying fog for a dramatic first dance", price: 300, priceType: "flat", icon: "🌫️", imageUrl: "", category: "Entertainment" },
        { id: "smores", name: "S'mores Station", description: "Outdoor fire pit with s'mores supplies", price: 8, priceType: "per-person", icon: "🔥", imageUrl: "", category: "Food & Beverage" },
        { id: "monogram", name: "Custom Monogram Gobo", description: "Projected monogram on wall or dance floor", price: 350, priceType: "flat", icon: "🔤", imageUrl: "", category: "Décor" },
        { id: "vintage-lounge", name: "Vintage Lounge Furniture", description: "Curated lounge seating area", price: 450, priceType: "flat", icon: "🛋️", imageUrl: "", category: "Venue" },
      ]),
    },
    { name: "groupByCategory", type: "boolean", label: "Group by Category", defaultValue: true },
    { name: "columns", type: "number", label: "Grid Columns", defaultValue: 2 },
    { name: "showImages", type: "boolean", label: "Show Images (when available)", defaultValue: true },
  ],
  variants: [
    { id: "default", name: "Toggle Grid", description: "Card grid with on/off toggles" },
    { id: "compact", name: "Compact Checklist", description: "Simple checkbox list" },
  ],
  rules: [],

  // Rich registry metadata
  aiDescription: "Quick-toggle add-on selection grid. Shows optional enhancements as cards with on/off toggles, images, and mixed pricing (some flat fee, some per-person). Designed to appear AFTER the main package selection for upsell revenue. Supports grouping by category (Entertainment, Décor, Food & Beverage). Each add-on can have an icon, image, description, and price. Research shows add-ons increase per-event revenue by 15-25%.",
  aiConfusionNotes: "Do NOT use activity-picker for quick add-ons — activity-picker is for substantial offerings with durations and time slots. Do NOT use category-picker — add-ons are quick toggles, not deep product browsing. Do NOT use option-picker — add-ons are multi-select with pricing, not single-choice.",
  bestFor: ["optional extras", "upsells", "enhancements", "upgrades", "add-ons", "photo booth", "lighting", "décor", "entertainment"],
  notFor: ["main package selection", "accommodation", "meals", "substantial activities with duration"],
  tags: ["add-ons", "extras", "upsell", "enhancements", "upgrades", "toggle", "optional", "photo-booth", "uplighting", "sparklers", "entertainment", "décor"],
  swappableWith: ["activity-picker", "category-picker"],
  requiresInputs: ["guests"],
  complexity: "simple",
  industries: ["wedding", "events", "hospitality", "conference", "resort", "catering", "charter"],
  pricingModel: "flat",
  subcategory: "extras",
  whyNeeded: "Add-ons increase per-event revenue by 15-25%. Quick toggles make it easy for customers to add extras (photo booth, uplighting, late-night snacks) without slowing down the quote flow.",
  workaround: "activity-picker or category-picker can list extras, but they're designed for deeper selection — not quick on/off toggles. The UX is heavier than needed for simple add-ons.",
};
