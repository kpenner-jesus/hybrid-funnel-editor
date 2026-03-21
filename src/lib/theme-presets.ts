import type { ThemeConfig } from "./types";

export interface ThemePreset {
  id: string;
  name: string;
  category: "nature" | "luxury" | "modern" | "warm" | "coastal" | "bold";
  theme: ThemeConfig;
}

export const THEME_PRESETS: ThemePreset[] = [
  // --- Nature & Retreat ---
  {
    id: "forest-retreat",
    name: "Forest Retreat",
    category: "nature",
    theme: {
      primaryColor: "#2d6a4f",
      secondaryColor: "#74c69d",
      surfaceColor: "#f5f9f6",
      headlineFont: "Noto Serif",
      bodyFont: "Inter",
      borderRadius: 12,
      cardStyle: "elevated",
    },
  },
  {
    id: "mountain-lodge",
    name: "Mountain Lodge",
    category: "nature",
    theme: {
      primaryColor: "#5c4033",
      secondaryColor: "#a68b6e",
      surfaceColor: "#faf6f1",
      headlineFont: "Georgia",
      bodyFont: "Inter",
      borderRadius: 8,
      cardStyle: "elevated",
    },
  },
  {
    id: "garden-sanctuary",
    name: "Garden Sanctuary",
    category: "nature",
    theme: {
      primaryColor: "#4a7c59",
      secondaryColor: "#c4a35a",
      surfaceColor: "#fafdf6",
      headlineFont: "Playfair Display",
      bodyFont: "Inter",
      borderRadius: 16,
      cardStyle: "outlined",
    },
  },
  {
    id: "wilderness-edge",
    name: "Wilderness Edge",
    category: "nature",
    theme: {
      primaryColor: "#006c4b",
      secondaryColor: "#4e8a6e",
      surfaceColor: "#f5faf7",
      headlineFont: "Noto Serif",
      bodyFont: "Inter",
      borderRadius: 12,
      cardStyle: "elevated",
    },
  },

  // --- Luxury & Upscale ---
  {
    id: "gold-standard",
    name: "Gold Standard",
    category: "luxury",
    theme: {
      primaryColor: "#8b6914",
      secondaryColor: "#c9a84c",
      surfaceColor: "#fffcf5",
      headlineFont: "Playfair Display",
      bodyFont: "Inter",
      borderRadius: 4,
      cardStyle: "outlined",
    },
  },
  {
    id: "midnight-elegance",
    name: "Midnight Elegance",
    category: "luxury",
    theme: {
      primaryColor: "#1a1a2e",
      secondaryColor: "#c9a227",
      surfaceColor: "#f8f8fa",
      headlineFont: "Playfair Display",
      bodyFont: "Inter",
      borderRadius: 8,
      cardStyle: "elevated",
    },
  },
  {
    id: "rose-boutique",
    name: "Rose Boutique",
    category: "luxury",
    theme: {
      primaryColor: "#8c3a5e",
      secondaryColor: "#d4a0b9",
      surfaceColor: "#fdf6f9",
      headlineFont: "Playfair Display",
      bodyFont: "Open Sans",
      borderRadius: 12,
      cardStyle: "elevated",
    },
  },
  {
    id: "marble-manor",
    name: "Marble Manor",
    category: "luxury",
    theme: {
      primaryColor: "#3d3d3d",
      secondaryColor: "#b8a88a",
      surfaceColor: "#faf9f7",
      headlineFont: "Georgia",
      bodyFont: "Inter",
      borderRadius: 2,
      cardStyle: "flat",
    },
  },

  // --- Modern & Minimal ---
  {
    id: "clean-slate",
    name: "Clean Slate",
    category: "modern",
    theme: {
      primaryColor: "#2563eb",
      secondaryColor: "#60a5fa",
      surfaceColor: "#f8fafc",
      headlineFont: "Inter",
      bodyFont: "Inter",
      borderRadius: 8,
      cardStyle: "outlined",
    },
  },
  {
    id: "nordic-minimal",
    name: "Nordic Minimal",
    category: "modern",
    theme: {
      primaryColor: "#374151",
      secondaryColor: "#9ca3af",
      surfaceColor: "#f9fafb",
      headlineFont: "Inter",
      bodyFont: "Inter",
      borderRadius: 12,
      cardStyle: "flat",
    },
  },
  {
    id: "slate-modern",
    name: "Slate Modern",
    category: "modern",
    theme: {
      primaryColor: "#334155",
      secondaryColor: "#0ea5e9",
      surfaceColor: "#f1f5f9",
      headlineFont: "Inter",
      bodyFont: "Roboto",
      borderRadius: 10,
      cardStyle: "elevated",
    },
  },

  // --- Warm & Inviting ---
  {
    id: "tuscan-villa",
    name: "Tuscan Villa",
    category: "warm",
    theme: {
      primaryColor: "#b45309",
      secondaryColor: "#d97706",
      surfaceColor: "#fffbeb",
      headlineFont: "Georgia",
      bodyFont: "Inter",
      borderRadius: 8,
      cardStyle: "elevated",
    },
  },
  {
    id: "autumn-harvest",
    name: "Autumn Harvest",
    category: "warm",
    theme: {
      primaryColor: "#9a3412",
      secondaryColor: "#ea580c",
      surfaceColor: "#fef7f0",
      headlineFont: "Noto Serif",
      bodyFont: "Inter",
      borderRadius: 12,
      cardStyle: "elevated",
    },
  },
  {
    id: "desert-sand",
    name: "Desert Sand",
    category: "warm",
    theme: {
      primaryColor: "#92400e",
      secondaryColor: "#d4a574",
      surfaceColor: "#fefcf3",
      headlineFont: "Georgia",
      bodyFont: "Open Sans",
      borderRadius: 6,
      cardStyle: "flat",
    },
  },
  {
    id: "fireside-cabin",
    name: "Fireside Cabin",
    category: "warm",
    theme: {
      primaryColor: "#7c2d12",
      secondaryColor: "#c2410c",
      surfaceColor: "#faf5f0",
      headlineFont: "Noto Serif",
      bodyFont: "Inter",
      borderRadius: 8,
      cardStyle: "elevated",
    },
  },

  // --- Coastal & Beach ---
  {
    id: "ocean-breeze",
    name: "Ocean Breeze",
    category: "coastal",
    theme: {
      primaryColor: "#0369a1",
      secondaryColor: "#38bdf8",
      surfaceColor: "#f0f9ff",
      headlineFont: "Inter",
      bodyFont: "Inter",
      borderRadius: 16,
      cardStyle: "elevated",
    },
  },
  {
    id: "coral-reef",
    name: "Coral Reef",
    category: "coastal",
    theme: {
      primaryColor: "#0e7490",
      secondaryColor: "#f97316",
      surfaceColor: "#f0fdfa",
      headlineFont: "Inter",
      bodyFont: "Open Sans",
      borderRadius: 12,
      cardStyle: "outlined",
    },
  },
  {
    id: "sandy-shores",
    name: "Sandy Shores",
    category: "coastal",
    theme: {
      primaryColor: "#155e75",
      secondaryColor: "#d4a574",
      surfaceColor: "#fefdf8",
      headlineFont: "Georgia",
      bodyFont: "Inter",
      borderRadius: 10,
      cardStyle: "elevated",
    },
  },

  // --- Bold & Vibrant ---
  {
    id: "sunset-glow",
    name: "Sunset Glow",
    category: "bold",
    theme: {
      primaryColor: "#c2410c",
      secondaryColor: "#f59e0b",
      surfaceColor: "#fef7ee",
      headlineFont: "Inter",
      bodyFont: "Inter",
      borderRadius: 14,
      cardStyle: "elevated",
    },
  },
  {
    id: "royal-purple",
    name: "Royal Purple",
    category: "bold",
    theme: {
      primaryColor: "#6d28d9",
      secondaryColor: "#a78bfa",
      surfaceColor: "#faf5ff",
      headlineFont: "Playfair Display",
      bodyFont: "Inter",
      borderRadius: 12,
      cardStyle: "elevated",
    },
  },
  {
    id: "berry-bliss",
    name: "Berry Bliss",
    category: "bold",
    theme: {
      primaryColor: "#be185d",
      secondaryColor: "#f472b6",
      surfaceColor: "#fdf2f8",
      headlineFont: "Inter",
      bodyFont: "Open Sans",
      borderRadius: 16,
      cardStyle: "elevated",
    },
  },
];

export const PRESET_CATEGORIES = [
  { id: "all", label: "All" },
  { id: "nature", label: "Nature" },
  { id: "luxury", label: "Luxury" },
  { id: "modern", label: "Modern" },
  { id: "warm", label: "Warm" },
  { id: "coastal", label: "Coastal" },
  { id: "bold", label: "Bold" },
] as const;
