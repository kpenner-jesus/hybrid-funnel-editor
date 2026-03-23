import type { WidgetTemplate } from "../types";

export const linenDecorPickerTemplate: WidgetTemplate = {
  id: "linen-decor-picker",
  name: "Linen & Decor Picker",
  icon: "🎀",
  category: "selection",
  description: "Select table linens, chair covers, centerpieces, and decor packages with color/style options.",
  aiDescription: "Use linen-decor-picker when the business offers table linens, chair covers, napkins, centerpieces, runners, overlays, or decor packages. This widget shows items organized by category (linens, centerpieces, chair decor) with color swatches, quantity tied to table count, and package options. It calculates pricing per-table or per-item. Quantities often auto-calculate from table count (derived from guest count ÷ seats per table). ALWAYS place after floor-plan-picker or guest-counter so table counts are available.",
  aiConfusionNotes: "Do NOT use category-picker for decor — linen-decor-picker has color swatch support and per-table quantity calculation. Do NOT use option-picker — it lacks quantity and color selection. Do NOT use add-on-picker for full decor packages — add-on-picker is for simple yes/no add-ons, linen-decor-picker handles the complexity of colors, quantities, and per-table math.",
  bestFor: ["table linens", "chair covers", "centerpieces", "napkins", "table runners", "decor packages", "color selection"],
  notFor: ["lighting", "AV equipment", "flowers (use category-picker)", "general add-ons"],
  tags: ["decor", "linens", "tablecloth", "chair-cover", "centerpiece", "color", "wedding", "events", "banquet", "design"],
  industries: ["wedding-venue", "event-venue", "catering", "banquet-hall", "hotel", "event-planner"],
  complexity: "complex",
  inputs: [
    { name: "tableCount", type: "number", label: "Number of Tables", description: "For auto-calculating quantities" },
    { name: "guestCount", type: "number", label: "Guest Count", description: "For per-person items like napkins" },
  ],
  outputs: [
    { name: "selectedDecor", type: "array", label: "Selected Decor Items", description: "All decor selections with colors and quantities" },
    { name: "decorTotal", type: "number", label: "Decor Total", description: "Total cost of all decor selections" },
  ],
  configFields: [
    { name: "title", type: "text", label: "Section Title", defaultValue: "Table Linens & Decor" },
    { name: "subtitle", type: "text", label: "Subtitle", defaultValue: "Choose your table settings and decorative elements" },
    { name: "categories", type: "json", label: "Decor Categories", defaultValue: JSON.stringify([
      {
        id: "linens", name: "Table Linens", items: [
          { id: "tablecloth", name: "Tablecloth", pricePerUnit: 15, unit: "per table", colors: ["White", "Ivory", "Black", "Navy", "Burgundy", "Gold", "Sage Green"], description: "Full-length floor tablecloth" },
          { id: "napkins", name: "Cloth Napkins", pricePerUnit: 2, unit: "per person", colors: ["White", "Ivory", "Black", "Navy", "Burgundy", "Gold"], description: "Pressed cloth napkins with fold" },
          { id: "runner", name: "Table Runner", pricePerUnit: 8, unit: "per table", colors: ["Burlap", "Satin White", "Lace", "Sequin Gold", "Sequin Silver"], description: "Decorative runner over tablecloth" },
          { id: "overlay", name: "Table Overlay", pricePerUnit: 12, unit: "per table", colors: ["Lace White", "Organza Gold", "Organza Silver"], description: "Sheer overlay for layered look" },
        ]
      },
      {
        id: "chairs", name: "Chair Decor", items: [
          { id: "chair-cover", name: "Chair Cover", pricePerUnit: 4, unit: "per chair", colors: ["White", "Ivory", "Black"], description: "Fitted spandex chair cover" },
          { id: "chair-sash", name: "Chair Sash", pricePerUnit: 2, unit: "per chair", colors: ["Gold", "Silver", "Burgundy", "Navy", "Blush Pink", "Sage"], description: "Decorative bow or sash" },
        ]
      },
      {
        id: "centerpieces", name: "Centerpieces", items: [
          { id: "basic-floral", name: "Basic Floral Arrangement", pricePerUnit: 35, unit: "per table", colors: [], description: "Seasonal flowers in a clear vase" },
          { id: "premium-floral", name: "Premium Floral Arrangement", pricePerUnit: 75, unit: "per table", colors: [], description: "Lush designer arrangement with candles" },
          { id: "candle-cluster", name: "Candle Cluster", pricePerUnit: 20, unit: "per table", colors: ["White", "Ivory", "Gold"], description: "Pillar and votive candle grouping" },
          { id: "lantern", name: "Lantern Centerpiece", pricePerUnit: 25, unit: "per table", colors: ["Gold", "Silver", "Black", "White"], description: "Decorative lantern with candle" },
        ]
      },
    ]) },
    { name: "seatsPerTable", type: "number", label: "Seats Per Table (default)", defaultValue: 8 },
    { name: "showColorSwatches", type: "boolean", label: "Show Color Swatches", defaultValue: true },
    { name: "autoCalculateQty", type: "boolean", label: "Auto-Calculate from Table/Guest Count", defaultValue: true },
    { name: "currency", type: "text", label: "Currency", defaultValue: "CAD" },
  ],

  themeSlots: [],
  rules: [],
  variants: [
    { id: "default", name: "Category Grid", description: "Organized by category with color swatches" },
    { id: "packages", name: "Pre-Built Packages", description: "Curated decor packages (Bronze, Silver, Gold)" },
  ],
};
