import type { WidgetTemplate } from "../types";

export const categoryPickerTemplate: WidgetTemplate = {
  id: "category-picker",
  name: "Category Product Picker",
  category: "selection",
  description:
    "Grouped product selection widget. Displays products organized by categories (e.g., Wedding Venue Spaces grouped into 'Outdoor Tents' and 'Indoor Venues', or Meeting Rooms grouped into 'Main Rooms' and 'Breakout Rooms'). Each product shows name, description, price, image, capacity tags, and a quantity selector. Use for: wedding venue space selection, meeting room booking, AV equipment rental, or any grouped product catalog.",
  icon: "🏛️",
  inputs: [
    { name: "checkIn", type: "date", label: "Check-in Date", description: "For date-based pricing" },
    { name: "checkOut", type: "date", label: "Check-out Date", description: "For date-range products" },
  ],
  outputs: [
    { name: "selectedProducts", type: "array", label: "Selected Products", description: "Array of selected products with quantities" },
    { name: "productTotal", type: "number", label: "Product Total", description: "Total cost of all selected products" },
  ],
  themeSlots: [
    { name: "cardBg", cssProperty: "background-color", defaultValue: "#ffffff", label: "Card Background" },
    { name: "categoryHeaderBg", cssProperty: "background-color", defaultValue: "#f8fafc", label: "Category Header Background" },
  ],
  configFields: [
    { name: "title", type: "text", label: "Title", defaultValue: "Select Products", description: "Section heading" },
    { name: "categories", type: "json", label: "Categories & Products", defaultValue: JSON.stringify([
      {
        name: "Main Category",
        products: [
          { id: "product-1", name: "Product One", description: "Description here", price: 100, unit: "day", stock: 1, imageUrl: "", tags: ["Tag 1"] },
          { id: "product-2", name: "Product Two", description: "Description here", price: 200, unit: "day", stock: 1, imageUrl: "", tags: ["Tag 2"] },
        ]
      }
    ], null, 2), description: "JSON array of categories, each with name and products array" },
    { name: "multiSelect", type: "boolean", label: "Allow Multiple Selection", defaultValue: true, description: "Allow selecting products from multiple categories" },
    { name: "showImages", type: "boolean", label: "Show Product Images", defaultValue: true },
    { name: "showQuantity", type: "boolean", label: "Show Quantity Selector", defaultValue: false, description: "Allow selecting quantity > 1" },
    { name: "currency", type: "text", label: "Currency", defaultValue: "CAD" },
  ],
  variants: [
    { id: "default", name: "Cards", description: "Product cards grouped by category" },
    { id: "compact", name: "Compact List", description: "Compact list view" },
  ],
  rules: [],
};
