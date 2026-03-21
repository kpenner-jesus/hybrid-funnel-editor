import type { WidgetTemplate } from "../types";

export const mealPickerTemplate: WidgetTemplate = {
  id: "meal-picker",
  name: "Meal Picker",
  category: "selection",
  description: "Meal package selection (breakfast, lunch, dinner) with per-person pricing and dietary filters. Fetches from Everybooking via categoryId. Requires guests and nightCount as inputs. Outputs selectedMeals and mealTotal.",
  icon: "🍽️",
  inputs: [
    { name: "guests", type: "object", label: "Guest Count", required: true },
    { name: "nightCount", type: "number", label: "Number of Nights", required: true },
    { name: "products", type: "array", label: "Meal Products", required: true },
  ],
  outputs: [
    { name: "selectedMeals", type: "array", label: "Selected Meals", description: "Array of selected meal objects with quantities" },
    { name: "mealTotal", type: "number", label: "Meal Total" },
  ],
  themeSlots: [
    { name: "cardBg", cssProperty: "background-color", defaultValue: "#ffffff", label: "Card Background" },
    { name: "categoryBadgeBg", cssProperty: "background-color", defaultValue: "#f5eedf", label: "Category Badge Background" },
    { name: "priceColor", cssProperty: "color", defaultValue: "#006c4b", label: "Price Color" },
  ],
  configFields: [
    { name: "title", type: "text", label: "Section Title", defaultValue: "Meal Packages" },
    { name: "categoryId", type: "number", label: "Meal Category ID", defaultValue: 34, description: "Everybooking category ID for meal products" },
    { name: "meetingMealCategoryId", type: "number", label: "Meeting Meal Category ID", defaultValue: 39, description: "Everybooking category ID for meeting+meal combos (optional)" },
    { name: "showDietaryFilters", type: "boolean", label: "Show Dietary Filters", defaultValue: true },
    { name: "groupByCategory", type: "boolean", label: "Group by Meal Category", defaultValue: true },
    { name: "priceDisplay", type: "select", label: "Price Display", defaultValue: "per-person", options: [
      { value: "per-person", label: "Per Person" },
      { value: "total", label: "Total for Group" },
    ]},
    { name: "allowCustomQuantity", type: "boolean", label: "Allow Custom Quantity per Meal", defaultValue: false },
  ],
  variants: [
    { id: "default", name: "Grouped List", description: "Meals grouped by category (breakfast, lunch, dinner)" },
    { id: "cards", name: "Meal Cards", description: "Visual cards with meal images" },
    { id: "checklist", name: "Checklist", description: "Simple checkbox-based meal selection" },
  ],
  rules: [
    { id: "per-person-calc", description: "Calculate total based on guest count and nights", condition: "always", action: "calculate_total" },
  ],
};
