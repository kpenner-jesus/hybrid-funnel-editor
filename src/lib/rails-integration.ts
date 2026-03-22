/**
 * Rails Integration Layer
 *
 * This module provides the interface between the Hybrid Funnel Editor
 * and the Everybooking Rails backend (Heroku). When embedded in Rails,
 * these functions replace the localStorage-based stores with real
 * database calls.
 *
 * CURRENT STATE: Standalone (Vercel) — uses localStorage + venue-data-store
 * TARGET STATE: Embedded (Heroku) — uses Rails API + live database
 *
 * Integration Steps for CTO:
 * 1. Mount the editor as a React component within the Rails app
 * 2. Pass the account/venue context as props (accountId, venueId, apiToken)
 * 3. Implement the RailsDataProvider interface below
 * 4. Replace store initialization in funnel-store.ts and venue-data-store.ts
 */

// ─── Data Provider Interface ─────────────────────────────────
// Implement this interface to connect to Rails backend

export interface RailsDataProvider {
  /** Account/venue identification */
  accountId: number;
  venueId?: number;
  apiToken: string;
  baseUrl: string; // e.g., "https://wilderness-edge.everybooking.com"

  /** Fetch all funnels for this account */
  getFunnels(): Promise<FunnelSummary[]>;

  /** Load a specific funnel by ID */
  loadFunnel(funnelId: number): Promise<RailsFunnelData>;

  /** Save funnel (create or update) */
  saveFunnel(funnel: RailsFunnelData): Promise<{ id: number }>;

  /** Delete a funnel */
  deleteFunnel(funnelId: number): Promise<void>;

  /** Get all categories with products for this account */
  getCategories(): Promise<RailsCategory[]>;

  /** Get products for a specific category */
  getProducts(categoryId: number): Promise<RailsProduct[]>;

  /** Get unique stock items for a product */
  getUniqueStockItems(productId: number): Promise<RailsUniqueStockItem[]>;

  /** Get availability for a product in a date range */
  getAvailability(productId: number, startDate: string, endDate: string): Promise<RailsAvailability>;

  /** Get account theme/branding */
  getAccountTheme(): Promise<RailsAccountTheme>;
}

// ─── Rails Data Types ────────────────────────────────────────

export interface FunnelSummary {
  id: number;
  name: string;
  stepCount: number;
  updatedAt: string;
  status: "draft" | "published" | "archived";
}

export interface RailsFunnelData {
  id?: number;
  name: string;
  steps: unknown[]; // JSON steps array (same format as our FunnelDefinition.steps)
  theme_data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface RailsCategory {
  id: number;
  name: string;
  products: RailsProduct[];
}

export interface RailsProduct {
  id: number;
  name: string;
  sku: string;
  description?: string;
  details?: string; // HTML amenities/features
  more_details?: string; // HTML additional info
  summary?: string;
  images: Array<{ url: string; position: number }>;
  tags: Array<{ id: number; name: string }>;
  price: Record<string, { base_price: number; group_price?: Record<string, unknown> }>;
  max_price?: number;
  stock: number;
  booking_unit: string; // "Nights", "Timeslots", "Days", "Qty"
  unique_inventory: boolean;
  unique_stock_items?: RailsUniqueStockItem[];
  parameters: RailsParameter[];
  position: number;
  timeslots?: Array<{ start_time: string; end_time: string }>;
}

export interface RailsParameter {
  id: number;
  report_id: string; // "rooms", "adults", "children", "childage", "qty"
  name: string;
  min: number;
  max: number;
  controls_inventory: boolean;
  unique_items: boolean;
}

export interface RailsUniqueStockItem {
  id: number;
  name: string;
  description?: string;
  available: boolean;
  weight: number;
  hidden: boolean;
}

export interface RailsAvailability {
  productId: number;
  available: number;
  total: number;
  dates: Record<string, { available: number; total: number }>;
  available_units?: Array<{ id: number; name: string }>;
}

export interface RailsAccountTheme {
  primaryColor: string;
  secondaryColor?: string;
  logoUrl?: string;
  currency: string;
  timezone: string;
  taxRates: Array<{ name: string; rate: number }>;
}

// ─── Mapping Functions ───────────────────────────────────────
// Convert between Rails API format and editor format

/**
 * Convert Rails products to editor's RoomProduct format
 */
export function railsProductsToRooms(products: RailsProduct[]): import("./types").RoomProduct[] {
  return products.map((p) => ({
    id: String(p.id),
    name: p.name,
    description: p.summary || p.description || "",
    imageUrl: p.images?.[0]?.url || "",
    pricePerNight: getBasePrice(p),
    currency: "CAD",
    tags: p.tags.map((t) => t.name),
    maxAdults: p.parameters.find((pa) => pa.report_id === "adults")?.max || 2,
    maxChildren: p.parameters.find((pa) => pa.report_id === "children")?.max || 0,
    stock: p.stock,
    // Extended fields
    salePrice: p.max_price && p.max_price > getBasePrice(p) ? getBasePrice(p) : undefined,
    details: p.details,
    moreDetails: p.more_details,
    images: p.images.map((img) => img.url),
    sku: p.sku,
    uniqueInventory: p.unique_inventory,
    uniqueStockItems: p.unique_stock_items?.map((u) => ({ id: String(u.id), name: u.name })),
  }));
}

/**
 * Convert Rails meal products to editor's MealProduct format
 */
export function railsProductsToMeals(products: RailsProduct[]): import("./types").MealProduct[] {
  return products
    .filter((p) => !p.parameters.some((pa) => pa.report_id === "childage")) // Exclude kids meals
    .map((p) => ({
      id: String(p.id),
      name: p.name,
      description: p.summary || p.description || "",
      pricePerPerson: getBasePrice(p),
      currency: "CAD",
      category: guessMealCategory(p.name),
      dietaryOptions: [],
      // Extended fields
      sku: p.sku,
      timeslots: p.timeslots || [],
      bookingUnit: p.booking_unit,
    }));
}

/**
 * Convert Rails activity products to editor's ActivityProduct format
 */
export function railsProductsToActivities(products: RailsProduct[]): import("./types").ActivityProduct[] {
  return products.map((p) => ({
    id: String(p.id),
    name: p.name,
    description: p.summary || p.description || "",
    imageUrl: p.images?.[0]?.url || "",
    pricePerPerson: getBasePrice(p),
    currency: "CAD",
    durationMinutes: 120, // Default — Rails doesn't store duration directly
    maxParticipants: p.stock || 50,
    // Extended fields
    sku: p.sku,
    tags: p.tags.map((t) => t.name),
    timeslots: p.timeslots || [],
    images: p.images.map((img) => img.url),
  }));
}

/**
 * Convert Rails meal products to the meal-picker's meals config JSON
 * This is the critical bridge — it creates the timeslot grid config
 * from actual database products
 */
export function railsMealsToWidgetConfig(
  adultMeals: RailsProduct[],
  kidsMeals: RailsProduct[]
): {
  meals: string; // JSON string for config.meals
  kidsEnabled: boolean;
  kidsPricingModel: "percentage" | "age-based";
  kidsPercentage: number;
} {
  const mealDefs = adultMeals
    .sort((a, b) => a.position - b.position)
    .map((m, i) => {
      const category = guessMealCategory(m.name);
      const ts = m.timeslots?.[0];
      return {
        id: m.sku || String(m.id),
        name: m.name,
        sortOrder: i + 1,
        adultPrice: getBasePrice(m),
        timeslots: ts
          ? [{ startTime: ts.start_time, endTime: ts.end_time }]
          : [getDefaultTimeslotForCategory(category)],
        timeslotLocked: false,
        allowCheckIn: getDefaultDayRuleForCategory(category, "checkIn"),
        allowMiddle: "selectable",
        allowCheckOut: getDefaultDayRuleForCategory(category, "checkOut"),
        cascadeFrom: [] as string[],
      };
    });

  // Detect kids pricing model
  let kidsPercentage = 10;
  if (adultMeals.length > 0 && kidsMeals.length > 0) {
    const adultPrice = getBasePrice(adultMeals[0]);
    const kidsPrice = getBasePrice(kidsMeals[0]);
    if (adultPrice > 0 && kidsPrice > 0) {
      kidsPercentage = Math.round((kidsPrice / adultPrice) * 100);
    }
  }

  return {
    meals: JSON.stringify(mealDefs, null, 2),
    kidsEnabled: kidsMeals.length > 0,
    kidsPricingModel: "percentage",
    kidsPercentage,
  };
}

// ─── Helper Functions ────────────────────────────────────────

function getBasePrice(product: RailsProduct): number {
  const priceEntries = Object.values(product.price || {});
  if (priceEntries.length === 0) return 0;
  return parseFloat(String(priceEntries[0]?.base_price)) || 0;
}

function guessMealCategory(name: string): "breakfast" | "lunch" | "dinner" | "snack" {
  const n = name.toLowerCase();
  if (n.includes("breakfast") || n.includes("brunch")) return "breakfast";
  if (n.includes("lunch")) return "lunch";
  if (n.includes("supper") || n.includes("dinner")) return "dinner";
  return "snack";
}

function getDefaultTimeslotForCategory(category: string): { startTime: string; endTime: string } {
  switch (category) {
    case "breakfast": return { startTime: "07:00", endTime: "09:00" };
    case "lunch": return { startTime: "12:00", endTime: "14:00" };
    case "dinner": return { startTime: "17:00", endTime: "19:00" };
    case "snack": return { startTime: "20:00", endTime: "22:00" };
    default: return { startTime: "12:00", endTime: "13:00" };
  }
}

function getDefaultDayRuleForCategory(category: string, dayPosition: "checkIn" | "checkOut"): string {
  if (dayPosition === "checkIn" && category === "breakfast") return "unselectable";
  if (dayPosition === "checkOut" && (category === "dinner" || category === "snack")) return "unselectable";
  return "selectable";
}

// ─── Usage Example (for CTO integration) ─────────────────────
/*

// In Rails: mount editor as React component with data provider
// app/javascript/components/FunnelEditorMount.tsx

import { RailsDataProvider, railsProductsToRooms, railsProductsToMeals, railsProductsToActivities } from './rails-integration';
import { useVenueDataStore } from '@/stores/venue-data-store';
import { useFunnelStore } from '@/stores/funnel-store';

// Create the data provider from Rails context
const provider: RailsDataProvider = {
  accountId: window.EVERYBOOKING_ACCOUNT_ID,
  apiToken: window.EVERYBOOKING_API_TOKEN,
  baseUrl: window.EVERYBOOKING_BASE_URL,

  async getCategories() {
    const res = await fetch(`${this.baseUrl}/api/v1/categories`, {
      headers: { 'Authorization': `Bearer ${this.apiToken}` }
    });
    return res.json();
  },

  async getProducts(categoryId) {
    const cats = await this.getCategories();
    return cats.find(c => c.id === categoryId)?.products || [];
  },

  // ... implement other methods
};

// On editor mount: populate venue data from database
async function initializeFromRails(provider: RailsDataProvider) {
  const categories = await provider.getCategories();

  const roomCategory = categories.find(c => c.name.toLowerCase().includes('room'));
  const mealCategory = categories.find(c => c.name.toLowerCase().includes('meal'));
  const activityCategory = categories.find(c => c.name === 'Activities');

  const theme = await provider.getAccountTheme();

  useVenueDataStore.getState().setVenueData({
    venueName: theme.venueName || '',
    currency: theme.currency,
    taxRates: theme.taxRates,
    rooms: roomCategory ? railsProductsToRooms(roomCategory.products) : [],
    meals: mealCategory ? railsProductsToMeals(mealCategory.products) : [],
    activities: activityCategory ? railsProductsToActivities(activityCategory.products) : [],
  });
}

*/
