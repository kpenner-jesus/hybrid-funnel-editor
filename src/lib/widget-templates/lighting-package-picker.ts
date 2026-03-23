import type { WidgetTemplate } from "../types";

export const lightingPackagePickerTemplate: WidgetTemplate = {
  id: "lighting-package-picker",
  name: "Lighting Package Picker",
  icon: "💡",
  category: "selection",
  description: "Select lighting packages, individual fixtures, and effects for events. Supports uplighting, pin spots, gobos, and custom colors.",
  aiDescription: "Use lighting-package-picker when the business offers event lighting services — uplighting, pin spots, gobos, string lights, chandeliers, dance floor lighting, or complete lighting packages. This widget shows package tiers (basic, standard, premium) with individual add-on options. It supports color selection for uplighting, quantity for fixtures, and calculates pricing based on venue size or flat rate. Place this in the 'extras/add-ons' section of the funnel, typically after venue and decor selection. Weddings and corporate galas are the primary use cases.",
  aiConfusionNotes: "Do NOT use category-picker for lighting — lighting-package-picker has package tier comparison, color selection, and fixture quantity calculation. Do NOT use add-on-picker for full lighting packages — add-on-picker is for simple yes/no items, lighting-package-picker handles the complexity of packages + individual fixtures + colors. Do NOT confuse with AV equipment (use category-picker for projectors, screens, microphones).",
  bestFor: ["uplighting", "pin spots", "gobo projection", "string lights", "dance floor lighting", "event lighting", "lighting packages"],
  notFor: ["AV equipment", "sound systems", "general venue add-ons", "outdoor lighting that's not event-specific"],
  tags: ["lighting", "uplighting", "gobo", "pin-spot", "string-lights", "dance-floor", "ambiance", "wedding", "events", "gala", "design"],
  industries: ["wedding-venue", "event-venue", "banquet-hall", "hotel", "event-planner", "lighting-company"],
  complexity: "complex",
  inputs: [
    { name: "venueSize", type: "string", label: "Venue Size/Space", description: "For calculating fixture quantities" },
    { name: "guestCount", type: "number", label: "Guest Count", description: "For scaling dance floor size" },
  ],
  outputs: [
    { name: "selectedLighting", type: "object", label: "Selected Lighting", description: "Package + individual fixture selections" },
    { name: "lightingTotal", type: "number", label: "Lighting Total", description: "Total cost of lighting selections" },
  ],
  configFields: [
    { name: "title", type: "text", label: "Section Title", defaultValue: "Event Lighting" },
    { name: "subtitle", type: "text", label: "Subtitle", defaultValue: "Transform your space with professional event lighting" },
    { name: "packages", type: "json", label: "Lighting Packages", defaultValue: JSON.stringify([
      {
        id: "basic", name: "Essential Lighting", price: 500, description: "Clean, professional lighting for your event",
        includes: ["8 uplights (white/warm white)", "Basic dance floor lighting", "Setup & teardown"],
        recommended: false
      },
      {
        id: "standard", name: "Ambient Package", price: 1200, description: "Create a warm, inviting atmosphere with color",
        includes: ["16 uplights (your choice of color)", "Pin spots on centerpieces", "Dance floor lighting with color wash", "Wireless dimming control", "Setup & teardown"],
        recommended: true
      },
      {
        id: "premium", name: "Signature Experience", price: 2500, description: "Full transformation with custom design",
        includes: ["24 uplights (custom color scheme)", "Pin spots on all centerpieces", "Custom gobo projection (monogram/pattern)", "String light canopy", "Dance floor with color transitions", "Dedicated lighting technician", "Design consultation"],
        recommended: false
      },
    ]) },
    { name: "addons", type: "json", label: "Individual Add-Ons", defaultValue: JSON.stringify([
      { id: "extra-uplight", name: "Additional Uplight", price: 35, unit: "per fixture", description: "Match your color scheme throughout the space" },
      { id: "gobo", name: "Custom Gobo Projection", price: 200, unit: "flat", description: "Your monogram or pattern projected on wall or floor" },
      { id: "string-lights", name: "String Light Canopy", price: 400, unit: "flat", description: "Warm bistro-style string lights overhead" },
      { id: "pin-spots", name: "Pin Spot Lighting", price: 15, unit: "per table", description: "Focused light on each centerpiece" },
      { id: "dance-upgrade", name: "Dance Floor Upgrade", price: 300, unit: "flat", description: "Color-changing LED dance floor panels" },
      { id: "outdoor", name: "Outdoor Pathway Lights", price: 200, unit: "flat", description: "Illuminate walkways and garden paths" },
    ]) },
    { name: "uplightColors", type: "json", label: "Available Uplight Colors", defaultValue: JSON.stringify([
      "Warm White", "Cool White", "Amber", "Blush Pink", "Dusty Rose",
      "Burgundy", "Red", "Navy Blue", "Royal Blue", "Teal", "Sage Green",
      "Emerald", "Purple", "Lavender", "Gold", "Champagne"
    ]) },
    { name: "showColorPreview", type: "boolean", label: "Show Color Swatches", defaultValue: true },
    { name: "currency", type: "text", label: "Currency", defaultValue: "CAD" },
  ],

  themeSlots: [],
  rules: [],
  variants: [
    { id: "default", name: "Package Comparison", description: "Side-by-side package tiers with add-ons below" },
    { id: "builder", name: "Build Your Own", description: "Start from scratch, pick individual items" },
  ],
};
