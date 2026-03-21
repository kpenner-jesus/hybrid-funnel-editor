"use client";

import React from "react";
import type { WidgetInstance, ThemeConfig } from "@/lib/types";
import { widgetTemplateRegistry } from "@/lib/widget-templates";
import { mockRooms, mockMeals, mockActivities } from "@/lib/mock-data";

interface WidgetRendererProps {
  widget: WidgetInstance;
  theme: ThemeConfig;
  isSelected?: boolean;
  onClick?: () => void;
}

function DatePickerPreview({ config, theme }: { config: Record<string, unknown>; theme: ThemeConfig }) {
  return (
    <div className="space-y-3">
      <h3 style={{ fontFamily: theme.headlineFont, color: theme.primaryColor }} className="text-lg font-semibold">
        {(config.title as string) || "Select Your Dates"}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Check-in</label>
          <div className="px-3 py-2 border rounded-lg text-sm" style={{ borderRadius: `${theme.borderRadius / 2}px` }}>
            Mar 25, 2026
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Check-out</label>
          <div className="px-3 py-2 border rounded-lg text-sm" style={{ borderRadius: `${theme.borderRadius / 2}px` }}>
            Mar 29, 2026
          </div>
        </div>
      </div>
      <div className="text-xs text-gray-500 text-center">4 nights</div>
    </div>
  );
}

function GuestCounterPreview({ config, theme }: { config: Record<string, unknown>; theme: ThemeConfig }) {
  return (
    <div className="space-y-3">
      <h3 style={{ fontFamily: theme.headlineFont, color: theme.primaryColor }} className="text-lg font-semibold">
        {(config.title as string) || "Number of Guests"}
      </h3>
      {["Adults", "Children (Ages 2-12)", ...(config.showInfants !== false ? ["Infants (Under 2)"] : [])].map(
        (label, i) => (
          <div key={label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
            <span className="text-sm">{label}</span>
            <div className="flex items-center gap-3">
              <button
                className="w-7 h-7 rounded-full border flex items-center justify-center text-sm"
                style={{ borderColor: theme.primaryColor, color: theme.primaryColor }}
              >
                -
              </button>
              <span className="text-sm font-medium w-4 text-center">{i === 0 ? 2 : 0}</span>
              <button
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm"
                style={{ backgroundColor: theme.primaryColor }}
              >
                +
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}

function RoomSelectionPreview({ config, theme }: { config: Record<string, unknown>; theme: ThemeConfig }) {
  const showImages = config.showImages !== false;
  const rooms = mockRooms.slice(0, 4);

  return (
    <div className="space-y-3">
      <h3 style={{ fontFamily: theme.headlineFont, color: theme.primaryColor }} className="text-lg font-semibold">
        {(config.title as string) || "Select Your Rooms"}
      </h3>
      <div className={config.layout === "list" ? "space-y-2" : "grid grid-cols-2 gap-3"}>
        {rooms.map((room, i) => (
          <div
            key={room.id}
            className="border overflow-hidden transition-shadow hover:shadow-md"
            style={{
              borderRadius: `${theme.borderRadius}px`,
              borderColor: i === 0 ? theme.primaryColor : "#e5e7eb",
              backgroundColor: i === 0 ? `${theme.primaryColor}08` : "#fff",
            }}
          >
            {showImages && (
              <div className="h-28 bg-gray-200 relative overflow-hidden">
                <img src={room.imageUrl} alt={room.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-3">
              <div className="font-medium text-sm">{room.name}</div>
              <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{room.description}</div>
              {config.showTags !== false && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {room.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] text-gray-600">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between mt-2">
                <span className="font-semibold text-sm" style={{ color: theme.primaryColor }}>
                  CHF {room.pricePerNight}
                </span>
                <span className="text-[10px] text-gray-400">per night</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MealPickerPreview({ config, theme }: { config: Record<string, unknown>; theme: ThemeConfig }) {
  return (
    <div className="space-y-3">
      <h3 style={{ fontFamily: theme.headlineFont, color: theme.primaryColor }} className="text-lg font-semibold">
        {(config.title as string) || "Meal Packages"}
      </h3>
      {["breakfast", "lunch", "dinner", "snack"].map((cat) => {
        const meals = mockMeals.filter((m) => m.category === cat);
        if (meals.length === 0) return null;
        return (
          <div key={cat}>
            {config.groupByCategory !== false && (
              <div className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-1.5">
                {cat}
              </div>
            )}
            <div className="space-y-1.5">
              {meals.map((meal) => (
                <div
                  key={meal.id}
                  className="flex items-center gap-3 p-2.5 border rounded-lg"
                  style={{ borderRadius: `${theme.borderRadius / 2}px` }}
                >
                  <input type="checkbox" className="accent-current" style={{ accentColor: theme.primaryColor }} readOnly />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{meal.name}</div>
                    <div className="text-[10px] text-gray-500 truncate">{meal.description}</div>
                  </div>
                  <span className="text-sm font-semibold whitespace-nowrap" style={{ color: theme.primaryColor }}>
                    CHF {meal.pricePerPerson}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ActivityPickerPreview({ config, theme }: { config: Record<string, unknown>; theme: ThemeConfig }) {
  const activities = mockActivities.slice(0, 4);
  return (
    <div className="space-y-3">
      <h3 style={{ fontFamily: theme.headlineFont, color: theme.primaryColor }} className="text-lg font-semibold">
        {(config.title as string) || "Activities & Excursions"}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {activities.map((act) => (
          <div
            key={act.id}
            className="border overflow-hidden hover:shadow-md transition-shadow"
            style={{ borderRadius: `${theme.borderRadius}px` }}
          >
            {config.showImages !== false && (
              <div className="h-24 bg-gray-200 overflow-hidden">
                <img src={act.imageUrl} alt={act.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-2.5">
              <div className="font-medium text-sm">{act.name}</div>
              {config.showDuration !== false && (
                <div className="inline-block px-1.5 py-0.5 rounded text-[10px] mt-1" style={{ backgroundColor: `${theme.primaryColor}15`, color: theme.primaryColor }}>
                  {Math.floor(act.durationMinutes / 60)}h {act.durationMinutes % 60 > 0 ? `${act.durationMinutes % 60}m` : ""}
                </div>
              )}
              <div className="flex items-center justify-between mt-2">
                <span className="font-semibold text-sm" style={{ color: theme.primaryColor }}>
                  CHF {act.pricePerPerson}
                </span>
                <span className="text-[10px] text-gray-400">per person</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContactFormPreview({ config, theme }: { config: Record<string, unknown>; theme: ThemeConfig }) {
  const fieldStyle = { borderRadius: `${theme.borderRadius / 2}px` };
  return (
    <div className="space-y-3">
      <h3 style={{ fontFamily: theme.headlineFont, color: theme.primaryColor }} className="text-lg font-semibold">
        {(config.title as string) || "Your Details"}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">First Name *</label>
          <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="John" readOnly style={fieldStyle} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Last Name *</label>
          <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Doe" readOnly style={fieldStyle} />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Email *</label>
        <input type="email" className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="john@example.com" readOnly style={fieldStyle} />
      </div>
      {config.showPhone !== false && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">Phone</label>
          <input type="tel" className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="+41 79 123 4567" readOnly style={fieldStyle} />
        </div>
      )}
      {!!config.showCompany && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">Company</label>
          <input type="text" className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Acme Corp" readOnly style={fieldStyle} />
        </div>
      )}
      {config.showNotes !== false && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">Notes / Special Requests</label>
          <textarea className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} placeholder="Any special requirements..." readOnly style={fieldStyle} />
        </div>
      )}
      {config.gdprConsent !== false && (
        <label className="flex gap-2 items-start text-xs text-gray-500">
          <input type="checkbox" className="mt-0.5" style={{ accentColor: theme.primaryColor }} readOnly />
          <span>{(config.gdprText as string) || "I agree to the processing of my personal data."}</span>
        </label>
      )}
    </div>
  );
}

function InvoicePreview({ config, theme }: { config: Record<string, unknown>; theme: ThemeConfig }) {
  const currency = (config.currency as string) || "CHF";
  const lineItems = [
    { label: "Alpine Suite (4 nights x 2)", amount: 2560 },
    { label: "Mountain Breakfast Buffet (4 nights x 2 guests)", amount: 280 },
    { label: "Guided Mountain Hike (2 guests)", amount: 90 },
    { label: "Alpine Spa & Wellness (2 guests)", amount: 240 },
  ];
  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const tax = config.showTax ? subtotal * ((config.taxRate as number || 7.7) / 100) : 0;
  const total = subtotal + tax;

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-t-lg text-white text-center" style={{ backgroundColor: theme.primaryColor, borderRadius: `${theme.borderRadius}px ${theme.borderRadius}px 0 0` }}>
        <h3 style={{ fontFamily: theme.headlineFont }} className="text-lg font-semibold">
          {(config.title as string) || "Booking Summary"}
        </h3>
      </div>
      {config.showDateSummary !== false && (
        <div className="flex justify-between text-xs text-gray-500 px-1">
          <span>Mar 25 - Mar 29, 2026</span>
          <span>4 nights, 2 guests</span>
        </div>
      )}
      <div className="space-y-2">
        {lineItems.map((item, i) => (
          <div key={i} className="flex justify-between items-center py-1.5 border-b border-gray-100 text-sm">
            <span className="text-gray-700">{item.label}</span>
            <span className="font-medium">{currency} {item.amount.toFixed(2)}</span>
          </div>
        ))}
      </div>
      {!!config.showTax && (
        <div className="flex justify-between items-center py-1 text-sm text-gray-500">
          <span>Tax ({config.taxRate as number || 7.7}%)</span>
          <span>{currency} {tax.toFixed(2)}</span>
        </div>
      )}
      <div
        className="flex justify-between items-center p-3 rounded-lg font-semibold"
        style={{ backgroundColor: `${theme.primaryColor}10` }}
      >
        <span>Total</span>
        <span style={{ color: theme.primaryColor }}>{currency} {total.toFixed(2)}</span>
      </div>
    </div>
  );
}

function OptionPickerPreview({ config, theme }: { config: Record<string, unknown>; theme: ThemeConfig }) {
  const mockOptions = [
    { id: "standard", label: "Standard", desc: "Basic package" },
    { id: "premium", label: "Premium", desc: "Extra amenities" },
    { id: "deluxe", label: "Deluxe", desc: "All-inclusive" },
  ];

  return (
    <div className="space-y-3">
      <h3 style={{ fontFamily: theme.headlineFont, color: theme.primaryColor }} className="text-lg font-semibold">
        {(config.title as string) || "Choose an Option"}
      </h3>
      <div className={`grid grid-cols-${config.columns || 3} gap-2`}>
        {mockOptions.map((opt, i) => (
          <div
            key={opt.id}
            className="p-3 border-2 text-center cursor-pointer transition-colors"
            style={{
              borderRadius: `${theme.borderRadius}px`,
              borderColor: i === 0 ? theme.primaryColor : "#e5e7eb",
              backgroundColor: i === 0 ? `${theme.primaryColor}08` : "#fff",
            }}
          >
            <div className="font-medium text-sm">{opt.label}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">{opt.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GenericWidgetPreview({ template, config, theme }: { template: { name: string; icon: string; inputs: { label: string }[]; outputs: { label: string }[] }; config: Record<string, unknown>; theme: ThemeConfig }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xl">{template.icon}</span>
        <h3 style={{ fontFamily: theme.headlineFont }} className="text-base font-semibold">
          {(config.title as string) || template.name}
        </h3>
      </div>
      <div className="text-xs text-gray-400 italic">Widget preview placeholder</div>
    </div>
  );
}

export function WidgetRenderer({ widget, theme, isSelected, onClick }: WidgetRendererProps) {
  const template = widgetTemplateRegistry[widget.templateId];

  const cardStyle: React.CSSProperties = {
    borderRadius: `${theme.borderRadius}px`,
    backgroundColor: "#ffffff",
    ...(theme.cardStyle === "elevated" && { boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }),
    ...(theme.cardStyle === "outlined" && { border: "1px solid #e5e7eb" }),
    ...(theme.cardStyle === "flat" && { border: "1px solid transparent" }),
  };

  let content: React.ReactNode;
  switch (widget.templateId) {
    case "date-picker":
      content = <DatePickerPreview config={widget.config} theme={theme} />;
      break;
    case "guest-counter":
      content = <GuestCounterPreview config={widget.config} theme={theme} />;
      break;
    case "guest-rooms":
      content = <RoomSelectionPreview config={widget.config} theme={theme} />;
      break;
    case "meal-picker":
      content = <MealPickerPreview config={widget.config} theme={theme} />;
      break;
    case "activity-picker":
      content = <ActivityPickerPreview config={widget.config} theme={theme} />;
      break;
    case "contact-form":
      content = <ContactFormPreview config={widget.config} theme={theme} />;
      break;
    case "invoice":
      content = <InvoicePreview config={widget.config} theme={theme} />;
      break;
    case "option-picker":
      content = <OptionPickerPreview config={widget.config} theme={theme} />;
      break;
    default:
      content = template ? (
        <GenericWidgetPreview template={template} config={widget.config} theme={theme} />
      ) : (
        <div className="text-sm text-red-500">Unknown widget: {widget.templateId}</div>
      );
  }

  return (
    <div
      onClick={onClick}
      className={`p-5 transition-all cursor-pointer ${
        isSelected ? "ring-2 ring-offset-2" : "hover:ring-1 hover:ring-offset-1"
      }`}
      style={{
        ...cardStyle,
        ...(isSelected ? { ringColor: theme.primaryColor } : {}),
      }}
    >
      {content}
    </div>
  );
}
