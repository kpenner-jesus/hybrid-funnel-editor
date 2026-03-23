/**
 * Shared Compound Pricing Engine
 *
 * All pricing widgets use this engine to calculate line items.
 * The engine is PREVIEW ONLY — real pricing comes from Everybooking's
 * server via product.price JSONB and parameter assignments.
 *
 * Supports: flat, per-person, per-hour, per-person-per-hour, per-unit, tiered
 */

// --- Types ---

export type PricingModel =
  | "flat"              // Fixed price regardless of quantity
  | "per-person"        // price × guest count
  | "per-hour"          // price × hours
  | "per-person-per-hour" // price × guests × hours
  | "per-unit"          // price × quantity (rooms, items)
  | "per-unit-per-night" // price × quantity × nights
  | "tiered"            // Different price per tier bracket
  | "calculated";       // Custom formula

export interface PricingRule {
  model: PricingModel;
  basePrice: number;
  /** Multiplier sources — the engine looks up these values from the context */
  multipliers?: Array<{
    source: "guestCount" | "eventHours" | "quantity" | "nights" | "childCount" | "custom";
    customKey?: string; // for "custom" source — key to look up in context
    factor?: number;    // 1.0 = direct multiply, 0.5 = half rate (e.g., children)
  }>;
  /** Tiered pricing brackets (for "tiered" model) */
  tiers?: Array<{
    minQty: number;
    maxQty: number;
    pricePerUnit: number;
    label?: string; // e.g., "1-50 guests", "51-100 guests"
  }>;
  /** Minimum charge regardless of calculation */
  minimumCharge?: number;
  /** Label for the line item (e.g., "Open Bar — Gold Package") */
  label?: string;
  /** Unit label (e.g., "per person", "per hour", "per night") */
  unitLabel?: string;
  /** Category for grouping in invoice (e.g., "Beverage", "Venue", "Catering") */
  category?: string;
}

export interface PricingContext {
  guestCount: number;
  childCount?: number;
  eventHours?: number;
  nights?: number;
  quantity?: number;
  /** Custom values keyed by name */
  custom?: Record<string, number>;
}

export interface LineItem {
  id: string;
  label: string;
  unitLabel: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  category: string;
  breakdown?: string; // e.g., "$45 × 150 guests × 4 hours"
}

// --- Engine ---

/**
 * Calculate a line item from a pricing rule and context.
 * Returns null if the calculation results in $0 or the item is not applicable.
 */
export function calculateLineItem(
  id: string,
  rule: PricingRule,
  context: PricingContext
): LineItem | null {
  let total = rule.basePrice;
  let qty = 1;
  const parts: string[] = [`$${rule.basePrice.toFixed(2)}`];

  switch (rule.model) {
    case "flat":
      total = rule.basePrice;
      qty = 1;
      break;

    case "per-person":
      qty = context.guestCount;
      total = rule.basePrice * qty;
      parts.push(`× ${qty} guests`);
      break;

    case "per-hour":
      qty = context.eventHours || 1;
      total = rule.basePrice * qty;
      parts.push(`× ${qty} hours`);
      break;

    case "per-person-per-hour":
      qty = context.guestCount * (context.eventHours || 1);
      total = rule.basePrice * context.guestCount * (context.eventHours || 1);
      parts.push(`× ${context.guestCount} guests × ${context.eventHours || 1} hours`);
      break;

    case "per-unit":
      qty = context.quantity || 1;
      total = rule.basePrice * qty;
      parts.push(`× ${qty}`);
      break;

    case "per-unit-per-night":
      qty = (context.quantity || 1) * (context.nights || 1);
      total = rule.basePrice * (context.quantity || 1) * (context.nights || 1);
      parts.push(`× ${context.quantity || 1} × ${context.nights || 1} nights`);
      break;

    case "tiered": {
      const tierQty = context.guestCount || context.quantity || 1;
      const tier = rule.tiers?.find(t => tierQty >= t.minQty && tierQty <= t.maxQty);
      if (tier) {
        total = tier.pricePerUnit * tierQty;
        qty = tierQty;
        parts.length = 0;
        parts.push(`$${tier.pricePerUnit.toFixed(2)} × ${tierQty} (${tier.label || "tier"})`);
      }
      break;
    }

    case "calculated":
      // Apply all multipliers
      if (rule.multipliers) {
        for (const mult of rule.multipliers) {
          let value = 1;
          switch (mult.source) {
            case "guestCount": value = context.guestCount; break;
            case "eventHours": value = context.eventHours || 1; break;
            case "quantity": value = context.quantity || 1; break;
            case "nights": value = context.nights || 1; break;
            case "childCount": value = context.childCount || 0; break;
            case "custom": value = context.custom?.[mult.customKey || ""] || 0; break;
          }
          if (mult.factor) value *= mult.factor;
          total *= value;
          if (value !== 1) parts.push(`× ${value}`);
        }
      }
      break;
  }

  // Apply minimum charge
  if (rule.minimumCharge && total < rule.minimumCharge) {
    total = rule.minimumCharge;
    parts.push(`(minimum $${rule.minimumCharge.toFixed(2)})`);
  }

  if (total <= 0) return null;

  return {
    id,
    label: rule.label || "Item",
    unitLabel: rule.unitLabel || getDefaultUnitLabel(rule.model),
    unitPrice: rule.basePrice,
    quantity: qty,
    subtotal: Math.round(total * 100) / 100,
    category: rule.category || "General",
    breakdown: parts.join(" "),
  };
}

/**
 * Calculate fee items (service charge, tax, gratuity) from a subtotal.
 */
export function calculateFees(
  subtotal: number,
  fees: Array<{
    id: string;
    name: string;
    type: "percentage" | "flat";
    value: number; // percentage (e.g., 22 for 22%) or flat dollar amount
    appliesTo?: "food-beverage" | "all" | "subtotal";
  }>
): LineItem[] {
  return fees.map(fee => {
    const amount = fee.type === "percentage"
      ? Math.round(subtotal * (fee.value / 100) * 100) / 100
      : fee.value;

    return {
      id: fee.id,
      label: fee.name,
      unitLabel: fee.type === "percentage" ? `${fee.value}%` : "flat",
      unitPrice: amount,
      quantity: 1,
      subtotal: amount,
      category: "Fees & Taxes",
      breakdown: fee.type === "percentage" ? `${fee.value}% of $${subtotal.toFixed(2)}` : `$${fee.value.toFixed(2)}`,
    };
  }).filter(item => item.subtotal > 0);
}

/**
 * Sum line items into a grand total with category subtotals.
 */
export function summarizeLineItems(items: LineItem[]): {
  lineItems: LineItem[];
  categoryTotals: Record<string, number>;
  subtotal: number;
  grandTotal: number;
} {
  const categoryTotals: Record<string, number> = {};
  let subtotal = 0;

  for (const item of items) {
    categoryTotals[item.category] = (categoryTotals[item.category] || 0) + item.subtotal;
    subtotal += item.subtotal;
  }

  return {
    lineItems: items,
    categoryTotals,
    subtotal,
    grandTotal: subtotal,
  };
}

// --- Helpers ---

function getDefaultUnitLabel(model: PricingModel): string {
  switch (model) {
    case "flat": return "flat";
    case "per-person": return "per person";
    case "per-hour": return "per hour";
    case "per-person-per-hour": return "per person/hour";
    case "per-unit": return "each";
    case "per-unit-per-night": return "per night";
    case "tiered": return "tiered";
    case "calculated": return "calculated";
    default: return "";
  }
}
