import { create } from "zustand";
import type { RoomProduct, MealProduct, ActivityProduct } from "@/lib/types";

// A generic product for categories that don't fit rooms/meals/activities
// (e.g., meeting rooms, AV equipment, wedding venues)
export interface GenericProduct {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  currency: string;
  unit: string; // "day", "qty", "person", etc.
  tags: string[];
  stock?: number;
  category?: string; // sub-category grouping
}

export interface VenueCategory {
  id: string; // e.g., "rooms", "meals", "activities", "meeting-rooms", "av-equipment"
  name: string;
  categoryId?: number; // Everybooking category ID if applicable
}

export interface VenueData {
  venueName: string;
  currency: string;
  taxRates: Array<{ name: string; rate: number }>; // e.g., [{name: "GST", rate: 5}, {name: "PST", rate: 7}]
  rooms: RoomProduct[];
  meals: MealProduct[];
  activities: ActivityProduct[];
  genericProducts: Record<string, GenericProduct[]>; // keyed by category id
  categories: VenueCategory[];
}

interface VenueDataStore {
  venueData: VenueData | null;
  setVenueData: (data: VenueData) => void;
  updateRooms: (rooms: RoomProduct[]) => void;
  updateMeals: (meals: MealProduct[]) => void;
  updateActivities: (activities: ActivityProduct[]) => void;
  updateGenericProducts: (categoryId: string, products: GenericProduct[]) => void;
  clearVenueData: () => void;
}

// Load from localStorage
function loadVenueData(): VenueData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("venue-data");
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function saveVenueData(data: VenueData | null) {
  if (typeof window === "undefined") return;
  if (data) {
    localStorage.setItem("venue-data", JSON.stringify(data));
  } else {
    localStorage.removeItem("venue-data");
  }
}

export const useVenueDataStore = create<VenueDataStore>((set) => ({
  venueData: loadVenueData(),

  setVenueData: (data) => {
    saveVenueData(data);
    set({ venueData: data });
  },

  updateRooms: (rooms) => {
    set((s) => {
      if (!s.venueData) return s;
      const updated = { ...s.venueData, rooms };
      saveVenueData(updated);
      return { venueData: updated };
    });
  },

  updateMeals: (meals) => {
    set((s) => {
      if (!s.venueData) return s;
      const updated = { ...s.venueData, meals };
      saveVenueData(updated);
      return { venueData: updated };
    });
  },

  updateActivities: (activities) => {
    set((s) => {
      if (!s.venueData) return s;
      const updated = { ...s.venueData, activities };
      saveVenueData(updated);
      return { venueData: updated };
    });
  },

  updateGenericProducts: (categoryId, products) => {
    set((s) => {
      if (!s.venueData) return s;
      const updated = {
        ...s.venueData,
        genericProducts: { ...s.venueData.genericProducts, [categoryId]: products },
      };
      saveVenueData(updated);
      return { venueData: updated };
    });
  },

  clearVenueData: () => {
    saveVenueData(null);
    set({ venueData: null });
  },
}));
