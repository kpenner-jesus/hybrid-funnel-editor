import type { WidgetTemplate } from "../types";
import { guestRoomsTemplate } from "./guest-rooms";
import { datePickerTemplate } from "./date-picker";
import { guestCounterTemplate } from "./guest-counter";
import { optionPickerTemplate } from "./option-picker";
import { mealPickerTemplate } from "./meal-picker";
import { activityPickerTemplate } from "./activity-picker";
import { contactFormTemplate } from "./contact-form";
import { invoiceTemplate } from "./invoice";
import { segmentPickerTemplate } from "./segment-picker";
import { heroSectionTemplate } from "./hero-section";
import { headlineTemplate } from "./headline";
import { textBlockTemplate } from "./text-block";
import { imageBlockTemplate } from "./image-block";
import { categoryPickerTemplate } from "./category-picker";
import { textInputTemplate, textareaInputTemplate } from "./text-input";
import { bookingWidgetTemplate } from "./booking-widget";
import { paymentWidgetTemplate } from "./payment-widget";
import { beveragePackagePickerTemplate } from "./beverage-package-picker";
import { packageTierPickerTemplate } from "./package-tier-picker";
import { addOnPickerTemplate } from "./add-on-picker";
import { feeCalculatorTemplate } from "./fee-calculator";
import { timeBlockPickerTemplate } from "./time-block-picker";
import { floorPlanPickerTemplate } from "./floor-plan-picker";
import { linenDecorPickerTemplate } from "./linen-decor-picker";
import { ceremonyDetailsPickerTemplate } from "./ceremony-details-picker";
import { siteVisitSchedulerTemplate } from "./site-visit-scheduler";
import { lightingPackagePickerTemplate } from "./lighting-package-picker";

// --- Rich metadata for AI selection, search, and catalog ---
const registryMetadata: Record<string, Partial<WidgetTemplate>> = {
  "hero-section": {
    aiDescription: "Full-width banner image with text overlay. Use as the FIRST widget on the welcome step to create a strong visual impression. Sets the tone for the entire funnel.",
    aiConfusionNotes: "Do NOT use image-block for hero banners — use hero-section. image-block is for inline photos within content.",
    bestFor: ["welcome page", "landing page", "first impression", "brand showcase"],
    notFor: ["inline images", "product photos", "step headers"],
    tags: ["visual", "branding", "banner", "welcome", "hero", "header"],
    swappableWith: ["image-block", "headline"],
    complexity: "simple",
    industries: ["all"],
    pricingModel: "none",
    subcategory: "branding",
    whyNeeded: "First impressions matter. A strong hero banner with the business logo and tagline sets professional expectations and reduces bounce rates on the welcome step.",
    workaround: "Use image-block + headline as separate widgets. Works but looks less polished — no overlay text on the image.",
  },
  "headline": {
    aiDescription: "Section title text with theme styling. Use to introduce a new section within a step. Pairs well before any selection widget.",
    aiConfusionNotes: "Do NOT use text-block for headings — use headline. text-block is for body text paragraphs.",
    bestFor: ["section titles", "step introductions", "visual hierarchy"],
    notFor: ["body text", "descriptions", "instructions"],
    tags: ["text", "title", "heading", "section", "label"],
    swappableWith: ["text-block"],
    complexity: "simple",
    industries: ["all"],
    pricingModel: "none",
    subcategory: "typography",
    whyNeeded: "Clear section titles guide customers through each step. Without headings, steps feel like a wall of widgets with no structure.",
    workaround: "Text-block with bold formatting. Works but doesn't use the theme headline font or sizing.",
  },
  "text-block": {
    aiDescription: "Rich text / HTML content block. Use for descriptions, instructions, promotional copy, or any body text between widgets.",
    aiConfusionNotes: "Do NOT use headline for body text — use text-block. Do NOT use text-input — that's for user data entry, not display.",
    bestFor: ["descriptions", "instructions", "promotions", "explanations", "policies"],
    notFor: ["headings", "user input", "forms"],
    tags: ["text", "content", "description", "body", "html", "copy"],
    swappableWith: ["headline"],
    complexity: "simple",
    industries: ["all"],
    pricingModel: "none",
    subcategory: "typography",
    whyNeeded: "Descriptions, instructions, and promotional copy give customers context before making selections. Bare widgets without text feel impersonal.",
    workaround: "Headline widget can hold short text. But no rich formatting, links, or multi-paragraph support.",
  },
  "image-block": {
    aiDescription: "Inline image with optional caption. Use within a step to show venue/product photos alongside other widgets.",
    aiConfusionNotes: "Do NOT use hero-section for inline images — use image-block. hero-section is for full-width banners.",
    bestFor: ["product photos", "venue images", "step illustrations", "visual context"],
    notFor: ["banners", "hero images", "backgrounds"],
    tags: ["image", "photo", "picture", "visual", "media"],
    swappableWith: ["hero-section"],
    complexity: "simple",
    industries: ["all"],
    pricingModel: "none",
    subcategory: "media",
    whyNeeded: "Product and venue photos increase conversion. Customers need to see what they're booking — rooms, spaces, equipment.",
    workaround: "Text descriptions only. Works but dramatically reduces engagement and trust.",
  },
  "date-picker": {
    aiDescription: "Dual-month date range calendar for selecting start and end dates. Outputs checkIn, checkOut, and nightCount. Use for event dates, stay dates, rental periods, or any date range selection.",
    aiConfusionNotes: "Do NOT use text-input with type=date — use date-picker for proper calendar UI. Do NOT use for time selection — time-block-picker handles hours.",
    bestFor: ["event dates", "stay dates", "rental period", "booking dates", "check-in/check-out"],
    notFor: ["time selection", "appointment scheduling", "single date"],
    tags: ["date", "calendar", "check-in", "check-out", "range", "duration", "nights", "days"],
    swappableWith: [],
    requiresInputs: [],
    complexity: "simple",
    industries: ["all"],
    pricingModel: "none",
    subcategory: "scheduling",
    whyNeeded: "Every booking and quotation starts with dates. Without date selection, you can't check availability, calculate night counts, or price per-day items.",
    workaround: "No workaround. Date selection is fundamental to any booking or rental quote.",
  },
  "guest-counter": {
    aiDescription: "Adults + configurable youth/children categories with slider for fast big-number selection, age collection (average or individual). Use for group size, party size, headcount, or any people-counting step.",
    aiConfusionNotes: "Do NOT use text-input type=number for counting people — use guest-counter for the slider + buttons UI. Do NOT add youth categories for non-people businesses (equipment rental, construction).",
    bestFor: ["group size", "party size", "headcount", "attendee count", "passengers", "crew size"],
    notFor: ["product quantities", "equipment counts", "room selection"],
    tags: ["guests", "adults", "children", "youth", "count", "headcount", "party-size", "group", "slider", "age"],
    swappableWith: [],
    requiresInputs: [],
    complexity: "moderate",
    industries: ["hospitality", "events", "education", "marine", "aviation", "sports"],
    pricingModel: "per-person",
    subcategory: "people",
    whyNeeded: "Group size drives pricing for meals, activities, rooms, and staffing. Per-person pricing requires accurate headcount. Youth/children categories enable age-based pricing.",
    workaround: "text-input with type=number collects a count, but no slider for fast big numbers, no youth categories, no age collection for kids meal pricing.",
  },
  "text-input": {
    aiDescription: "Single-line text field for collecting a specific piece of data (organization name, event name, PO number). Outputs to a named variable.",
    aiConfusionNotes: "Do NOT use for multi-line text — use textarea-input. Do NOT use for structured data — use contact-form for name/email/phone.",
    bestFor: ["organization name", "event name", "reference number", "custom field"],
    notFor: ["multi-line notes", "contact details", "descriptions"],
    tags: ["text", "input", "field", "data", "custom", "name", "reference"],
    swappableWith: ["textarea-input"],
    complexity: "simple",
    industries: ["all"],
    pricingModel: "none",
    subcategory: "data-entry",
    whyNeeded: "Captures specific data points like organization name, event name, PO number, or any custom field the business needs for their quote.",
    workaround: "contact-form has a company field, but can't create arbitrary custom fields. No workaround for truly custom data.",
  },
  "textarea-input": {
    aiDescription: "Multi-line text area for collecting longer text (dietary restrictions, special requests, project notes). Outputs to a named variable.",
    aiConfusionNotes: "Do NOT use text-block for data entry — text-block is display only. Use textarea-input for user-writable notes.",
    bestFor: ["dietary restrictions", "special requests", "notes", "additional info", "project description"],
    notFor: ["single values", "contact details", "short answers"],
    tags: ["textarea", "notes", "comments", "requests", "dietary", "description", "long-text"],
    swappableWith: ["text-input"],
    complexity: "simple",
    industries: ["all"],
    pricingModel: "none",
    subcategory: "data-entry",
    whyNeeded: "Collects longer text like dietary restrictions, special requests, or project notes that don't fit in a single line. Critical for service businesses that need customer specifications.",
    workaround: "text-input can collect short text but truncates longer entries. contact-form has a notes field but it's not independently configurable.",
  },
  "segment-picker": {
    aiDescription: "TOP-OF-FUNNEL branching widget. Presents service type options (e.g., Wedding, Corporate, Social) where each option routes to a different funnel path. Use ONLY as the first selection when the funnel serves multiple customer segments that need different steps.",
    aiConfusionNotes: "Do NOT use option-picker for funnel branching — use segment-picker. option-picker is for data collection (retreat type, conference type) without branching. Do NOT use mid-funnel — segment-picker is for the welcome step only.",
    bestFor: ["customer type selection", "service type branching", "funnel routing", "welcome step"],
    notFor: ["product selection", "mid-funnel choices", "data collection without branching"],
    tags: ["segment", "branch", "routing", "funnel", "welcome", "type", "category", "path"],
    swappableWith: ["option-picker"],
    complexity: "moderate",
    industries: ["all"],
    pricingModel: "none",
    subcategory: "routing",
    whyNeeded: "Multi-segment businesses (weddings + conferences + retreats) need different paths for different customer types. Without branching, everyone sees every step — including irrelevant ones.",
    workaround: "No workaround. Without segment branching, you'd need separate funnels for each customer type, or force everyone through the same linear path.",
  },
  "option-picker": {
    aiDescription: "Multiple-choice card selection for collecting a preference WITHOUT funnel branching. Use for sub-type questions (retreat type, conference type, wedding style) where the answer is recorded but doesn't change the funnel path.",
    aiConfusionNotes: "Do NOT use for funnel branching — use segment-picker if options need to route to different steps. Do NOT use for product selection with pricing — use category-picker or activity-picker. Do NOT use for beverage packages — use beverage-package-picker for per-person-per-hour pricing.",
    bestFor: ["sub-type selection", "preference questions", "style choices", "multiple choice"],
    notFor: ["funnel branching", "product selection with prices", "beverage packages", "add-ons"],
    tags: ["options", "choice", "cards", "selection", "preference", "type", "style", "multiple-choice"],
    swappableWith: ["segment-picker", "category-picker"],
    complexity: "simple",
    industries: ["all"],
    pricingModel: "none",
    subcategory: "choices",
    whyNeeded: "Captures customer preferences like event type, style, or sub-category without changing the funnel path. Essential for personalizing the quote.",
    workaround: "segment-picker can show options but forces funnel branching even when you just need data collection. text-input can collect a typed answer but no visual cards.",
  },
  "guest-rooms": {
    aiDescription: "Room/accommodation selection with image carousel, sale pricing, availability badges, unique inventory (specific room units), quantity pickers, and running subtotal. Use for any accommodation where customers pick room types and quantities.",
    aiConfusionNotes: "Do NOT use category-picker for rooms — use guest-rooms for the full room selection experience (availability, unique inventory, image carousel). category-picker is for simpler grouped product selection.",
    bestFor: ["rooms", "cabins", "suites", "villas", "accommodation", "lodging", "beds"],
    notFor: ["equipment", "meeting rooms", "venue spaces", "non-accommodation products"],
    tags: ["rooms", "accommodation", "lodging", "hotel", "suite", "cabin", "villa", "availability", "unique-inventory", "carousel"],
    swappableWith: ["category-picker"],
    requiresInputs: ["checkIn", "checkOut", "guests"],
    complexity: "complex",
    industries: ["hospitality", "resort", "hotel", "retreat", "camp"],
    pricingModel: "per-unit",
    subcategory: "accommodation",
    whyNeeded: "Accommodation is often the largest line item. Image carousels, availability badges, unique room inventory, and sale pricing drive bookings and reduce back-and-forth.",
    workaround: "category-picker can list rooms with prices, but has no availability checking, no unique inventory (specific room assignment), no image carousel, and no sale pricing display.",
  },
  "meal-picker": {
    aiDescription: "Timeslot-based meal grid showing dates as rows and meals as columns with availability bars and timeslot dropdowns. Handles day-specific rules (no breakfast on check-in, no supper on check-out), cascading auto-selection, and kids meal pricing. Use for any multi-day catering selection.",
    aiConfusionNotes: "Do NOT use category-picker for meals — use meal-picker for the timeslot grid. Do NOT use option-picker — meals need date×meal matrix, not simple cards. Do NOT use for beverage packages — use beverage-package-picker.",
    bestFor: ["catered meals", "dining", "food service", "buffet", "multi-day catering"],
    notFor: ["beverages", "bar packages", "single-meal selection", "snack items"],
    tags: ["meals", "food", "catering", "dining", "breakfast", "lunch", "dinner", "timeslot", "buffet", "per-day"],
    swappableWith: [],
    requiresInputs: ["checkIn", "checkOut", "guests"],
    complexity: "complex",
    industries: ["hospitality", "retreat", "conference", "camp", "catering"],
    pricingModel: "per-person",
    subcategory: "food-beverage",
    whyNeeded: "Catering is a top-3 expense for group bookings. The timeslot grid with day rules (no breakfast on check-in, no supper on check-out) prevents overbooking and ensures accurate per-day meal pricing.",
    workaround: "category-picker can list meal options with flat pricing, but has no date×meal grid, no timeslot selection, no day-specific availability rules, and no kids meal pricing.",
  },
  "activity-picker": {
    aiDescription: "Activity/experience selection with images, pricing, duration, and quantity pickers. Use for optional add-on experiences, tours, excursions, equipment rentals, or any supplementary services with per-person pricing.",
    aiConfusionNotes: "Do NOT use category-picker for activities — use activity-picker for the visual card layout with images. Do NOT use option-picker — activities have pricing and quantities. Do NOT confuse with add-on-picker — activities are substantial offerings with images and durations, add-ons are quick toggles.",
    bestFor: ["activities", "experiences", "tours", "excursions", "adventures", "classes", "equipment-add-ons"],
    notFor: ["rooms", "meals", "quick add-ons", "venue spaces"],
    tags: ["activities", "experiences", "tours", "excursions", "adventures", "add-ons", "per-person", "duration", "images"],
    swappableWith: ["category-picker"],
    requiresInputs: ["checkIn", "checkOut", "guests"],
    complexity: "moderate",
    industries: ["hospitality", "retreat", "resort", "camp", "charter", "tourism"],
    pricingModel: "per-person",
    subcategory: "experiences",
    whyNeeded: "Activities and experiences are a major upsell opportunity. Visual cards with images, pricing, and duration make it easy for customers to add extras that increase the quote value.",
    workaround: "category-picker can list activities but has no image cards, no duration display, and no per-person pricing calculation.",
  },
  "category-picker": {
    aiDescription: "Grouped product selection for any products organized by category. Shows products with images, prices, tags, availability, and quantity pickers. Use for venue spaces, equipment, meeting rooms, AV gear, or any categorized product catalog.",
    aiConfusionNotes: "Do NOT use for rooms — use guest-rooms for accommodation (has unique inventory + availability). Do NOT use for meals — use meal-picker for timeslot grids. Do NOT use for quick add-ons — use add-on-picker for toggles. category-picker is for substantial product selection with category grouping.",
    bestFor: ["venue spaces", "meeting rooms", "equipment", "AV gear", "rental items", "spaces", "products"],
    notFor: ["accommodation", "meals", "quick add-ons", "simple choices"],
    tags: ["products", "categories", "equipment", "spaces", "rental", "AV", "meeting-rooms", "venue", "grouped"],
    swappableWith: ["guest-rooms", "activity-picker"],
    complexity: "moderate",
    industries: ["all"],
    pricingModel: "per-unit",
    subcategory: "products",
    whyNeeded: "The universal product selection widget. Any business with categorized inventory (venue spaces, equipment, AV gear, meeting rooms) needs grouped product selection with quantities and pricing.",
    workaround: "option-picker can show products but has no pricing, no quantities, no category grouping. Multiple option-pickers could partially work but it's clunky.",
  },
  "contact-form": {
    aiDescription: "Contact information collection form with configurable fields (name, email, phone, company, notes, GDPR consent). Use near the end of the funnel before generating the quote/invoice.",
    aiConfusionNotes: "Do NOT use text-input for contact details — use contact-form for structured name/email/phone fields. Do NOT use for dietary/notes — add textarea-input separately for those.",
    bestFor: ["contact details", "customer information", "lead capture", "form submission"],
    notFor: ["custom fields", "dietary restrictions", "project notes"],
    tags: ["contact", "form", "name", "email", "phone", "company", "GDPR", "lead", "customer"],
    swappableWith: [],
    complexity: "simple",
    industries: ["all"],
    pricingModel: "none",
    subcategory: "data-collection",
    whyNeeded: "Every quote needs customer contact details to follow up. Name, email, and phone are the minimum. Company and GDPR consent are required in many industries.",
    workaround: "Multiple text-input widgets could collect individual fields, but no structured validation (email format, phone format), no GDPR checkbox, and much more work to set up.",
  },
  "booking-widget": {
    aiDescription: "Hidden backend widget that creates the actual booking in Everybooking. Place on the contact step alongside contact-form. Not visible to customers — it syncs selected products to the booking engine.",
    aiConfusionNotes: "This is NOT a display widget. Do NOT confuse with invoice or payment-widget. booking-widget is invisible and handles the backend sync. Always place it on the same step as contact-form.",
    bestFor: ["booking creation", "backend sync", "invoice generation trigger"],
    notFor: ["display", "user interaction", "product selection"],
    tags: ["booking", "backend", "sync", "hidden", "integration", "API"],
    swappableWith: [],
    complexity: "complex",
    industries: ["all"],
    pricingModel: "none",
    subcategory: "integration",
    whyNeeded: "Connects customer selections to the Everybooking backend to create an actual booking with synced products, pricing, and customer info. Without this, the quote is display-only.",
    workaround: "No workaround. Without the booking widget, selections can't sync to the backend for invoice generation.",
  },
  "payment-widget": {
    aiDescription: "Payment/deposit collection widget showing amount due and payment options. Supports percentage deposit, flat amount, or full payment. Place after the invoice step.",
    aiConfusionNotes: "Do NOT confuse with invoice — invoice displays the quote, payment-widget collects the money. Do NOT confuse with booking-widget — booking-widget is hidden backend sync.",
    bestFor: ["deposit collection", "payment", "securing booking", "down payment"],
    notFor: ["quote display", "invoice", "backend sync"],
    tags: ["payment", "deposit", "secure", "credit-card", "checkout", "billing"],
    swappableWith: [],
    complexity: "simple",
    industries: ["all"],
    pricingModel: "calculated",
    subcategory: "checkout",
    whyNeeded: "Converts quotes into revenue by collecting deposits or full payment. Without payment collection, the customer must call or email to pay — adding friction and reducing conversion.",
    workaround: "No workaround. Contact form can collect intent, but actual payment requires a payment widget connected to the booking system.",
  },
  "invoice": {
    aiDescription: "Quote/invoice display widget showing the itemized breakdown of all selections. Uses the Everybooking InvoiceWidget SDK component. Place after contact-form and before payment-widget.",
    aiConfusionNotes: "Do NOT confuse with payment-widget — invoice DISPLAYS the quote, payment-widget COLLECTS money. Do NOT confuse with fee-calculator — fee-calculator shows mid-funnel fee breakdown, invoice is the final summary.",
    bestFor: ["quote display", "invoice", "price summary", "booking review", "line items"],
    notFor: ["payment collection", "mid-funnel pricing", "fee breakdown"],
    tags: ["invoice", "quote", "summary", "price", "total", "line-items", "review"],
    swappableWith: [],
    requiresInputs: ["checkIn", "checkOut", "guests", "selectedRooms", "selectedMeals", "selectedActivities", "contactInfo"],
    complexity: "simple",
    industries: ["all"],
    pricingModel: "calculated",
    subcategory: "checkout",
    whyNeeded: "The culmination of the funnel — shows the customer their complete itemized quote before payment. Transparency builds trust and reduces support calls about pricing.",
    workaround: "No workaround. Without an invoice/quote display, customers can't review what they're paying for before committing.",
  },
};

// Apply rich metadata to base templates
function enrichTemplate(base: WidgetTemplate, meta?: Partial<WidgetTemplate>): WidgetTemplate {
  if (!meta) return base;
  return { ...base, ...meta };
}

export const widgetTemplateRegistry: Record<string, WidgetTemplate> = {
  // --- Content / Layout ---
  "hero-section": enrichTemplate(heroSectionTemplate, registryMetadata["hero-section"]),
  "headline": enrichTemplate(headlineTemplate, registryMetadata["headline"]),
  "text-block": enrichTemplate(textBlockTemplate, registryMetadata["text-block"]),
  "image-block": enrichTemplate(imageBlockTemplate, registryMetadata["image-block"]),
  // --- Input ---
  "date-picker": enrichTemplate(datePickerTemplate, registryMetadata["date-picker"]),
  "guest-counter": enrichTemplate(guestCounterTemplate, registryMetadata["guest-counter"]),
  "text-input": enrichTemplate(textInputTemplate, registryMetadata["text-input"]),
  "textarea-input": enrichTemplate(textareaInputTemplate, registryMetadata["textarea-input"]),
  // --- Selection ---
  "segment-picker": enrichTemplate(segmentPickerTemplate, registryMetadata["segment-picker"]),
  "option-picker": enrichTemplate(optionPickerTemplate, registryMetadata["option-picker"]),
  "guest-rooms": enrichTemplate(guestRoomsTemplate, registryMetadata["guest-rooms"]),
  "meal-picker": enrichTemplate(mealPickerTemplate, registryMetadata["meal-picker"]),
  "activity-picker": enrichTemplate(activityPickerTemplate, registryMetadata["activity-picker"]),
  "category-picker": enrichTemplate(categoryPickerTemplate, registryMetadata["category-picker"]),
  // --- Form ---
  "contact-form": enrichTemplate(contactFormTemplate, registryMetadata["contact-form"]),
  "booking-widget": enrichTemplate(bookingWidgetTemplate, registryMetadata["booking-widget"]),
  "payment-widget": enrichTemplate(paymentWidgetTemplate, registryMetadata["payment-widget"]),
  // --- Display ---
  "invoice": enrichTemplate(invoiceTemplate, registryMetadata["invoice"]),
  // --- Pricing ---
  "beverage-package-picker": beveragePackagePickerTemplate,
  "package-tier-picker": packageTierPickerTemplate,
  "add-on-picker": addOnPickerTemplate,
  "fee-calculator": feeCalculatorTemplate,
  // --- Event Planning ---
  "time-block-picker": timeBlockPickerTemplate,
  "floor-plan-picker": floorPlanPickerTemplate,
  "linen-decor-picker": linenDecorPickerTemplate,
  "ceremony-details-picker": ceremonyDetailsPickerTemplate,
  "site-visit-scheduler": siteVisitSchedulerTemplate,
  "lighting-package-picker": lightingPackagePickerTemplate,
};

export const widgetTemplateList: WidgetTemplate[] = Object.values(widgetTemplateRegistry);

export function getTemplate(templateId: string): WidgetTemplate | undefined {
  return widgetTemplateRegistry[templateId];
}

// Search widgets by tag, name, or description
export function searchWidgets(query: string, industryFilter?: string): WidgetTemplate[] {
  const q = query.toLowerCase().trim();
  if (!q && !industryFilter) return widgetTemplateList;
  return widgetTemplateList.filter(w => {
    // Industry filter
    if (industryFilter && w.industries && !w.industries.includes("all") && !w.industries.includes(industryFilter)) return false;
    if (!q) return true;
    // Search across name, description, tags, bestFor
    const searchable = [
      w.name, w.description, w.aiDescription || "",
      ...(w.tags || []), ...(w.bestFor || []),
      w.subcategory || "",
    ].join(" ").toLowerCase();
    return searchable.includes(q);
  });
}

// Get widgets that can be swapped with a given widget
export function getSwappableWidgets(templateId: string): WidgetTemplate[] {
  const template = widgetTemplateRegistry[templateId];
  if (!template?.swappableWith?.length) return [];
  return template.swappableWith.map(id => widgetTemplateRegistry[id]).filter(Boolean);
}

export const templateCategories = [
  { id: "content", label: "Content", description: "Hero banners, headlines, text, images" },
  { id: "input", label: "Input", description: "Dates, counts, text fields" },
  { id: "selection", label: "Selection", description: "Products, options, rooms, meals, layouts, decor" },
  { id: "pricing", label: "Pricing", description: "Packages, add-ons, beverages, fees, lighting" },
  { id: "data-collection", label: "Details", description: "Ceremony details, scheduling, preferences" },
  { id: "form", label: "Form", description: "Contact forms, text inputs" },
  { id: "transaction", label: "Transaction", description: "Booking, payment, invoice" },
] as const;

export {
  heroSectionTemplate,
  headlineTemplate,
  textBlockTemplate,
  imageBlockTemplate,
  guestRoomsTemplate,
  datePickerTemplate,
  guestCounterTemplate,
  optionPickerTemplate,
  segmentPickerTemplate,
  mealPickerTemplate,
  activityPickerTemplate,
  categoryPickerTemplate,
  contactFormTemplate,
  bookingWidgetTemplate,
  paymentWidgetTemplate,
  invoiceTemplate,
  textInputTemplate,
  textareaInputTemplate,
};
