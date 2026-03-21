"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { WidgetInstance, ThemeConfig } from "@/lib/types";
import { widgetTemplateRegistry } from "@/lib/widget-templates";
import { mockRooms, mockMeals, mockActivities } from "@/lib/mock-data";

interface WidgetRendererProps {
  widget: WidgetInstance;
  theme: ThemeConfig;
  isSelected?: boolean;
  onClick?: () => void;
  resolvedInputs?: Record<string, unknown>;
  onOutput?: (outputs: Record<string, unknown>) => void;
}

// ─── Date Picker ──────────────────────────────────────────────

function DatePickerPreview({
  config,
  theme,
  resolvedInputs,
  onOutput,
}: {
  config: Record<string, unknown>;
  theme: ThemeConfig;
  resolvedInputs: Record<string, unknown>;
  onOutput: (outputs: Record<string, unknown>) => void;
}) {
  const today = new Date();
  const defaultCheckIn = new Date(today);
  defaultCheckIn.setDate(today.getDate() + 7);
  const defaultCheckOut = new Date(defaultCheckIn);
  defaultCheckOut.setDate(defaultCheckIn.getDate() + 4);

  const fmt = (d: Date) => d.toISOString().split("T")[0];

  const [checkIn, setCheckIn] = useState<string>(
    (resolvedInputs?.checkIn as string) || fmt(defaultCheckIn)
  );
  const [checkOut, setCheckOut] = useState<string>(
    (resolvedInputs?.checkOut as string) || fmt(defaultCheckOut)
  );

  const nightCount = Math.max(
    0,
    Math.round(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );

  // Emit on mount and on change
  useEffect(() => {
    onOutput({ checkIn, checkOut, nightCount });
  }, [checkIn, checkOut, nightCount, onOutput]);

  const formatDisplay = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-3">
      <h3
        style={{ fontFamily: theme.headlineFont, color: theme.primaryColor }}
        className="text-lg font-semibold"
      >
        {(config.title as string) || "Select Your Dates"}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Check-in</label>
          <input
            type="date"
            value={checkIn}
            onChange={(e) => {
              setCheckIn(e.target.value);
              // Ensure checkout is after checkin
              if (e.target.value >= checkOut) {
                const next = new Date(e.target.value + "T00:00:00");
                next.setDate(next.getDate() + 1);
                setCheckOut(fmt(next));
              }
            }}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-current"
            style={{
              borderRadius: `${theme.borderRadius / 2}px`,
              borderColor: theme.primaryColor + "40",
            }}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Check-out</label>
          <input
            type="date"
            value={checkOut}
            min={checkIn}
            onChange={(e) => setCheckOut(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-current"
            style={{
              borderRadius: `${theme.borderRadius / 2}px`,
              borderColor: theme.primaryColor + "40",
            }}
          />
        </div>
      </div>
      <div className="text-xs text-gray-500 text-center">
        {nightCount} night{nightCount !== 1 ? "s" : ""}
      </div>
    </div>
  );
}

// ─── Guest Counter ────────────────────────────────────────────

function GuestCounterPreview({
  config,
  theme,
  onOutput,
}: {
  config: Record<string, unknown>;
  theme: ThemeConfig;
  resolvedInputs: Record<string, unknown>;
  onOutput: (outputs: Record<string, unknown>) => void;
}) {
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);

  const maxAdults = (config.maxAdults as number) || 10;
  const maxChildren = (config.maxChildren as number) || 10;
  const maxInfants = (config.maxInfants as number) || 5;
  const minAdults = (config.minAdults as number) || 1;

  useEffect(() => {
    onOutput({
      guests: { adults, children, infants },
      totalGuests: adults + children,
    });
  }, [adults, children, infants, onOutput]);

  const CounterRow = ({
    label,
    value,
    min,
    max,
    onChange,
  }: {
    label: string;
    value: number;
    min: number;
    max: number;
    onChange: (v: number) => void;
  }) => (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (value > min) onChange(value - 1);
          }}
          disabled={value <= min}
          className="w-7 h-7 rounded-full border flex items-center justify-center text-sm disabled:opacity-30"
          style={{ borderColor: theme.primaryColor, color: theme.primaryColor }}
        >
          -
        </button>
        <span className="text-sm font-medium w-4 text-center">{value}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (value < max) onChange(value + 1);
          }}
          disabled={value >= max}
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm disabled:opacity-50"
          style={{ backgroundColor: theme.primaryColor }}
        >
          +
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <h3
        style={{ fontFamily: theme.headlineFont, color: theme.primaryColor }}
        className="text-lg font-semibold"
      >
        {(config.title as string) || "Number of Guests"}
      </h3>
      <CounterRow
        label="Adults"
        value={adults}
        min={minAdults}
        max={maxAdults}
        onChange={setAdults}
      />
      <CounterRow
        label={`Children (${(config.childAgeLabel as string) || "Ages 2-12"})`}
        value={children}
        min={0}
        max={maxChildren}
        onChange={setChildren}
      />
      {config.showInfants !== false && (
        <CounterRow
          label="Infants (Under 2)"
          value={infants}
          min={0}
          max={maxInfants}
          onChange={setInfants}
        />
      )}
    </div>
  );
}

// ─── Room Selection ───────────────────────────────────────────

function RoomSelectionPreview({
  config,
  theme,
  resolvedInputs,
  onOutput,
}: {
  config: Record<string, unknown>;
  theme: ThemeConfig;
  resolvedInputs: Record<string, unknown>;
  onOutput: (outputs: Record<string, unknown>) => void;
}) {
  const showImages = config.showImages !== false;
  const rooms = mockRooms.slice(0, 4);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const checkIn = resolvedInputs?.checkIn as string | undefined;
  const checkOut = resolvedInputs?.checkOut as string | undefined;
  const guests = resolvedInputs?.guests as
    | { adults: number; children: number }
    | undefined;

  let nightCount = 4;
  if (checkIn && checkOut) {
    nightCount = Math.max(
      1,
      Math.round(
        (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );
  }

  useEffect(() => {
    const selected = rooms.filter((r) => selectedIds.has(r.id));
    const roomTotal = selected.reduce(
      (sum, r) => sum + r.pricePerNight * nightCount,
      0
    );
    onOutput({
      selectedRooms: selected.map((r) => ({
        ...r,
        quantity: 1,
        nights: nightCount,
        lineTotal: r.pricePerNight * nightCount,
      })),
      roomTotal,
    });
  }, [selectedIds, nightCount, onOutput]);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <h3
        style={{ fontFamily: theme.headlineFont, color: theme.primaryColor }}
        className="text-lg font-semibold"
      >
        {(config.title as string) || "Select Your Rooms"}
      </h3>
      {guests && (
        <div className="text-xs text-gray-500">
          {guests.adults} adult{guests.adults !== 1 ? "s" : ""}
          {guests.children > 0 &&
            `, ${guests.children} child${guests.children !== 1 ? "ren" : ""}`}
          {checkIn && checkOut && ` | ${nightCount} night${nightCount !== 1 ? "s" : ""}`}
        </div>
      )}
      <div
        className={
          config.layout === "list" ? "space-y-2" : "grid grid-cols-2 gap-3"
        }
      >
        {rooms.map((room) => {
          const isSelected = selectedIds.has(room.id);
          return (
            <div
              key={room.id}
              onClick={(e) => {
                e.stopPropagation();
                toggle(room.id);
              }}
              className="border overflow-hidden transition-shadow hover:shadow-md cursor-pointer"
              style={{
                borderRadius: `${theme.borderRadius}px`,
                borderColor: isSelected ? theme.primaryColor : "#e5e7eb",
                borderWidth: isSelected ? "2px" : "1px",
                backgroundColor: isSelected
                  ? `${theme.primaryColor}08`
                  : "#fff",
              }}
            >
              {showImages && (
                <div className="h-28 bg-gray-200 relative overflow-hidden">
                  <img
                    src={room.imageUrl}
                    alt={room.name}
                    className="w-full h-full object-cover"
                  />
                  {isSelected && (
                    <div
                      className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs"
                      style={{ backgroundColor: theme.primaryColor }}
                    >
                      ✓
                    </div>
                  )}
                </div>
              )}
              <div className="p-3">
                <div className="font-medium text-sm">{room.name}</div>
                <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                  {room.description}
                </div>
                {config.showTags !== false && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {room.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] text-gray-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span
                    className="font-semibold text-sm"
                    style={{ color: theme.primaryColor }}
                  >
                    CHF {room.pricePerNight}
                  </span>
                  <span className="text-[10px] text-gray-400">per night</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Meal Picker ──────────────────────────────────────────────

function MealPickerPreview({
  config,
  theme,
  resolvedInputs,
  onOutput,
}: {
  config: Record<string, unknown>;
  theme: ThemeConfig;
  resolvedInputs: Record<string, unknown>;
  onOutput: (outputs: Record<string, unknown>) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const guests = resolvedInputs?.guests as
    | { adults: number; children: number }
    | undefined;
  const guestCount = guests ? guests.adults + guests.children : 2;

  useEffect(() => {
    const selected = mockMeals.filter((m) => selectedIds.has(m.id));
    const mealTotal = selected.reduce(
      (sum, m) => sum + m.pricePerPerson * guestCount,
      0
    );
    onOutput({
      selectedMeals: selected.map((m) => ({
        ...m,
        quantity: guestCount,
        lineTotal: m.pricePerPerson * guestCount,
      })),
      mealTotal,
    });
  }, [selectedIds, guestCount, onOutput]);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <h3
        style={{ fontFamily: theme.headlineFont, color: theme.primaryColor }}
        className="text-lg font-semibold"
      >
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
              {meals.map((meal) => {
                const isSelected = selectedIds.has(meal.id);
                return (
                  <div
                    key={meal.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(meal.id);
                    }}
                    className="flex items-center gap-3 p-2.5 border rounded-lg cursor-pointer transition-colors"
                    style={{
                      borderRadius: `${theme.borderRadius / 2}px`,
                      borderColor: isSelected
                        ? theme.primaryColor
                        : "#e5e7eb",
                      backgroundColor: isSelected
                        ? `${theme.primaryColor}08`
                        : "#fff",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="accent-current"
                      style={{ accentColor: theme.primaryColor }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{meal.name}</div>
                      <div className="text-[10px] text-gray-500 truncate">
                        {meal.description}
                      </div>
                    </div>
                    <span
                      className="text-sm font-semibold whitespace-nowrap"
                      style={{ color: theme.primaryColor }}
                    >
                      CHF {meal.pricePerPerson}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Activity Picker ──────────────────────────────────────────

function ActivityPickerPreview({
  config,
  theme,
  resolvedInputs,
  onOutput,
}: {
  config: Record<string, unknown>;
  theme: ThemeConfig;
  resolvedInputs: Record<string, unknown>;
  onOutput: (outputs: Record<string, unknown>) => void;
}) {
  const activities = mockActivities.slice(0, 4);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const guests = resolvedInputs?.guests as
    | { adults: number; children: number }
    | undefined;
  const guestCount = guests ? guests.adults + guests.children : 2;

  useEffect(() => {
    const selected = activities.filter((a) => selectedIds.has(a.id));
    const activityTotal = selected.reduce(
      (sum, a) => sum + a.pricePerPerson * guestCount,
      0
    );
    onOutput({
      selectedActivities: selected.map((a) => ({
        ...a,
        quantity: guestCount,
        lineTotal: a.pricePerPerson * guestCount,
      })),
      activityTotal,
    });
  }, [selectedIds, guestCount, onOutput]);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <h3
        style={{ fontFamily: theme.headlineFont, color: theme.primaryColor }}
        className="text-lg font-semibold"
      >
        {(config.title as string) || "Activities & Excursions"}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {activities.map((act) => {
          const isSelected = selectedIds.has(act.id);
          return (
            <div
              key={act.id}
              onClick={(e) => {
                e.stopPropagation();
                toggle(act.id);
              }}
              className="border overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              style={{
                borderRadius: `${theme.borderRadius}px`,
                borderColor: isSelected ? theme.primaryColor : "#e5e7eb",
                borderWidth: isSelected ? "2px" : "1px",
                backgroundColor: isSelected
                  ? `${theme.primaryColor}08`
                  : "#fff",
              }}
            >
              {config.showImages !== false && (
                <div className="h-24 bg-gray-200 overflow-hidden relative">
                  <img
                    src={act.imageUrl}
                    alt={act.name}
                    className="w-full h-full object-cover"
                  />
                  {isSelected && (
                    <div
                      className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs"
                      style={{ backgroundColor: theme.primaryColor }}
                    >
                      ✓
                    </div>
                  )}
                </div>
              )}
              <div className="p-2.5">
                <div className="font-medium text-sm">{act.name}</div>
                {config.showDuration !== false && (
                  <div
                    className="inline-block px-1.5 py-0.5 rounded text-[10px] mt-1"
                    style={{
                      backgroundColor: `${theme.primaryColor}15`,
                      color: theme.primaryColor,
                    }}
                  >
                    {Math.floor(act.durationMinutes / 60)}h{" "}
                    {act.durationMinutes % 60 > 0
                      ? `${act.durationMinutes % 60}m`
                      : ""}
                  </div>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span
                    className="font-semibold text-sm"
                    style={{ color: theme.primaryColor }}
                  >
                    CHF {act.pricePerPerson}
                  </span>
                  <span className="text-[10px] text-gray-400">per person</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Contact Form ─────────────────────────────────────────────

function ContactFormPreview({
  config,
  theme,
  onOutput,
}: {
  config: Record<string, unknown>;
  theme: ThemeConfig;
  resolvedInputs: Record<string, unknown>;
  onOutput: (outputs: Record<string, unknown>) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [notes, setNotes] = useState("");
  const [gdprAccepted, setGdprAccepted] = useState(false);

  useEffect(() => {
    const isValid =
      firstName.trim() !== "" &&
      lastName.trim() !== "" &&
      email.trim() !== "" &&
      (config.gdprConsent === false || gdprAccepted);
    onOutput({
      contactInfo: {
        firstName,
        lastName,
        email,
        phone,
        company,
        notes,
        gdprAccepted,
      },
      isValid,
    });
  }, [firstName, lastName, email, phone, company, notes, gdprAccepted, config.gdprConsent, onOutput]);

  const fieldStyle = { borderRadius: `${theme.borderRadius / 2}px` };

  return (
    <div className="space-y-3">
      <h3
        style={{ fontFamily: theme.headlineFont, color: theme.primaryColor }}
        className="text-lg font-semibold"
      >
        {(config.title as string) || "Your Details"}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            First Name *
          </label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-current"
            placeholder="John"
            style={fieldStyle}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            Last Name *
          </label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-current"
            placeholder="Doe"
            style={fieldStyle}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Email *</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-current"
          placeholder="john@example.com"
          style={fieldStyle}
        />
      </div>
      {config.showPhone !== false && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-current"
            placeholder="+41 79 123 4567"
            style={fieldStyle}
          />
        </div>
      )}
      {!!config.showCompany && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">Company</label>
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-current"
            placeholder="Acme Corp"
            style={fieldStyle}
          />
        </div>
      )}
      {config.showNotes !== false && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            Notes / Special Requests
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-current"
            rows={2}
            placeholder="Any special requirements..."
            style={fieldStyle}
          />
        </div>
      )}
      {config.gdprConsent !== false && (
        <label
          className="flex gap-2 items-start text-xs text-gray-500 cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            className="mt-0.5"
            checked={gdprAccepted}
            onChange={(e) => setGdprAccepted(e.target.checked)}
            style={{ accentColor: theme.primaryColor }}
          />
          <span>
            {(config.gdprText as string) ||
              "I agree to the processing of my personal data."}
          </span>
        </label>
      )}
    </div>
  );
}

// ─── Invoice ──────────────────────────────────────────────────

function InvoicePreview({
  config,
  theme,
  resolvedInputs,
  onOutput,
}: {
  config: Record<string, unknown>;
  theme: ThemeConfig;
  resolvedInputs: Record<string, unknown>;
  onOutput: (outputs: Record<string, unknown>) => void;
}) {
  const currency = (config.currency as string) || "CHF";

  const checkIn = resolvedInputs?.checkIn as string | undefined;
  const checkOut = resolvedInputs?.checkOut as string | undefined;
  const guests = resolvedInputs?.guests as
    | { adults: number; children: number }
    | undefined;
  const selectedRooms = (resolvedInputs?.selectedRooms as Array<{
    name: string;
    pricePerNight: number;
    nights: number;
    lineTotal: number;
  }>) || [];
  const selectedMeals = (resolvedInputs?.selectedMeals as Array<{
    name: string;
    pricePerPerson: number;
    quantity: number;
    lineTotal: number;
  }>) || [];
  const selectedActivities = (resolvedInputs?.selectedActivities as Array<{
    name: string;
    pricePerPerson: number;
    quantity: number;
    lineTotal: number;
  }>) || [];
  const contactInfo = resolvedInputs?.contactInfo as
    | { firstName: string; lastName: string; email: string }
    | undefined;

  let nightCount = 4;
  if (checkIn && checkOut) {
    nightCount = Math.max(
      1,
      Math.round(
        (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );
  }
  const guestCount = guests ? guests.adults + guests.children : 2;

  // Build dynamic line items from resolved inputs, or fall back to static
  const lineItems: { label: string; amount: number }[] = [];

  if (selectedRooms.length > 0) {
    for (const room of selectedRooms) {
      lineItems.push({
        label: `${room.name} (${room.nights || nightCount} nights)`,
        amount: room.lineTotal || room.pricePerNight * nightCount,
      });
    }
  }
  if (selectedMeals.length > 0) {
    for (const meal of selectedMeals) {
      lineItems.push({
        label: `${meal.name} (${meal.quantity || guestCount} guests)`,
        amount: meal.lineTotal || meal.pricePerPerson * guestCount,
      });
    }
  }
  if (selectedActivities.length > 0) {
    for (const act of selectedActivities) {
      lineItems.push({
        label: `${act.name} (${act.quantity || guestCount} guests)`,
        amount: act.lineTotal || act.pricePerPerson * guestCount,
      });
    }
  }

  // Fallback if nothing selected yet
  if (lineItems.length === 0) {
    lineItems.push(
      { label: "No items selected yet", amount: 0 }
    );
  }

  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const tax = config.showTax
    ? subtotal * (((config.taxRate as number) || 7.7) / 100)
    : 0;
  const total = subtotal + tax;

  useEffect(() => {
    onOutput({ totalPrice: total, lineItems });
  }, [total, onOutput]);

  const fmtDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="space-y-3">
      <div
        className="p-3 rounded-t-lg text-white text-center"
        style={{
          backgroundColor: theme.primaryColor,
          borderRadius: `${theme.borderRadius}px ${theme.borderRadius}px 0 0`,
        }}
      >
        <h3
          style={{ fontFamily: theme.headlineFont }}
          className="text-lg font-semibold"
        >
          {(config.title as string) || "Booking Summary"}
        </h3>
      </div>
      {config.showDateSummary !== false && (
        <div className="flex justify-between text-xs text-gray-500 px-1">
          <span>
            {checkIn && checkOut
              ? `${fmtDate(checkIn)} - ${fmtDate(checkOut)}, ${new Date(checkOut).getFullYear()}`
              : "Dates not selected"}
          </span>
          <span>
            {nightCount} night{nightCount !== 1 ? "s" : ""}, {guestCount} guest
            {guestCount !== 1 ? "s" : ""}
          </span>
        </div>
      )}
      {config.showContactSummary !== false && contactInfo && contactInfo.firstName && (
        <div className="text-xs text-gray-500 px-1 border-b border-gray-100 pb-2">
          {contactInfo.firstName} {contactInfo.lastName}
          {contactInfo.email && ` | ${contactInfo.email}`}
        </div>
      )}
      <div className="space-y-2">
        {lineItems.map((item, i) => (
          <div
            key={i}
            className="flex justify-between items-center py-1.5 border-b border-gray-100 text-sm"
          >
            <span className="text-gray-700">{item.label}</span>
            <span className="font-medium">
              {item.amount > 0
                ? `${currency} ${item.amount.toFixed(2)}`
                : "-"}
            </span>
          </div>
        ))}
      </div>
      {!!config.showTax && (
        <div className="flex justify-between items-center py-1 text-sm text-gray-500">
          <span>
            Tax ({(config.taxRate as number) || 7.7}%)
          </span>
          <span>
            {currency} {tax.toFixed(2)}
          </span>
        </div>
      )}
      <div
        className="flex justify-between items-center p-3 rounded-lg font-semibold"
        style={{ backgroundColor: `${theme.primaryColor}10` }}
      >
        <span>Total</span>
        <span style={{ color: theme.primaryColor }}>
          {currency} {total.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

// ─── Option Picker ────────────────────────────────────────────

function OptionPickerPreview({
  config,
  theme,
  onOutput,
}: {
  config: Record<string, unknown>;
  theme: ThemeConfig;
  resolvedInputs: Record<string, unknown>;
  onOutput: (outputs: Record<string, unknown>) => void;
}) {
  const mockOptions = [
    { id: "standard", label: "Standard", desc: "Basic package" },
    { id: "premium", label: "Premium", desc: "Extra amenities" },
    { id: "deluxe", label: "Deluxe", desc: "All-inclusive" },
  ];

  const isMulti = !!config.multiSelect;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isMulti) {
      onOutput({
        selectedOption: [...selectedIds][0] || null,
        selectedOptions: [...selectedIds],
      });
    } else {
      onOutput({
        selectedOption: selectedId,
        selectedOptions: selectedId ? [selectedId] : [],
      });
    }
  }, [selectedId, selectedIds, isMulti, onOutput]);

  const handleClick = (id: string) => {
    if (isMulti) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    } else {
      setSelectedId((prev) => (prev === id ? null : id));
    }
  };

  return (
    <div className="space-y-3">
      <h3
        style={{ fontFamily: theme.headlineFont, color: theme.primaryColor }}
        className="text-lg font-semibold"
      >
        {(config.title as string) || "Choose an Option"}
      </h3>
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${(config.columns as number) || 3}, 1fr)`,
        }}
      >
        {mockOptions.map((opt) => {
          const isSelected = isMulti
            ? selectedIds.has(opt.id)
            : selectedId === opt.id;
          return (
            <div
              key={opt.id}
              onClick={(e) => {
                e.stopPropagation();
                handleClick(opt.id);
              }}
              className="p-3 border-2 text-center cursor-pointer transition-colors"
              style={{
                borderRadius: `${theme.borderRadius}px`,
                borderColor: isSelected ? theme.primaryColor : "#e5e7eb",
                backgroundColor: isSelected
                  ? `${theme.primaryColor}08`
                  : "#fff",
              }}
            >
              <div className="font-medium text-sm">{opt.label}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">
                {opt.desc}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Segment Picker ──────────────────────────────────────────

interface SegmentOption {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  nextStep?: string;
}

function SegmentPickerPreview({
  config,
  theme,
  onOutput,
}: {
  config: Record<string, unknown>;
  theme: ThemeConfig;
  resolvedInputs: Record<string, unknown>;
  onOutput: (outputs: Record<string, unknown>) => void;
}) {
  const isMulti = !!config.allowMultiple;
  const style = (config.style as string) || "cards";
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Parse options from JSON config
  let options: SegmentOption[] = [];
  try {
    const raw = config.options;
    if (typeof raw === "string") {
      options = JSON.parse(raw);
    } else if (Array.isArray(raw)) {
      options = raw as SegmentOption[];
    }
  } catch {
    // fallback demo options
    options = [
      { id: "retreat", label: "Group Retreat", description: "Church, Corporate, Youth...", icon: "⛺" },
      { id: "conference", label: "Group Conference", description: "Meetings, Seminars", icon: "🏢" },
      { id: "family", label: "Family Reunion", description: "Gatherings, Celebrations", icon: "👨‍👩‍👧‍👦" },
    ];
  }

  useEffect(() => {
    if (isMulti) {
      onOutput({
        selectedSegment: [...selectedIds][0] || null,
        selectedSegments: [...selectedIds],
      });
    } else {
      onOutput({
        selectedSegment: selectedId,
        selectedSegments: selectedId ? [selectedId] : [],
      });
    }
  }, [selectedId, selectedIds, isMulti, onOutput]);

  const handleClick = (id: string) => {
    if (isMulti) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    } else {
      setSelectedId((prev) => (prev === id ? null : id));
    }
  };

  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  if (style === "pills") {
    return (
      <div className="space-y-3">
        <h3
          style={{ fontFamily: theme.headlineFont, color: theme.primaryColor }}
          className="text-lg font-semibold"
        >
          {(config.title as string) || "What brings you here?"}
        </h3>
        {config.subtitle ? (
          <p className="text-sm text-gray-500">{String(config.subtitle)}</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {options.map((opt) => {
            const isSelected = isMulti
              ? selectedIds.has(opt.id)
              : selectedId === opt.id;
            return (
              <button
                key={opt.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handleClick(opt.id);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all"
                style={{
                  border: `2px solid ${isSelected ? theme.primaryColor : "#e5e7eb"}`,
                  backgroundColor: isSelected ? `${theme.primaryColor}10` : "#fff",
                  color: isSelected ? theme.primaryColor : "#374151",
                }}
              >
                {opt.icon && <span>{opt.icon}</span>}
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // "cards" or "list" style — vertical card list with letter indices
  return (
    <div className="space-y-3">
      <h3
        style={{ fontFamily: theme.headlineFont, color: theme.primaryColor }}
        className="text-lg font-semibold"
      >
        {(config.title as string) || "What brings you here?"}
      </h3>
      {config.subtitle ? (
        <p className="text-sm text-gray-500 mb-1">{String(config.subtitle)}</p>
      ) : null}
      <div className="space-y-2">
        {options.map((opt, idx) => {
          const isSelected = isMulti
            ? selectedIds.has(opt.id)
            : selectedId === opt.id;
          return (
            <div
              key={opt.id}
              onClick={(e) => {
                e.stopPropagation();
                handleClick(opt.id);
              }}
              className="flex items-center gap-3 p-3.5 cursor-pointer transition-all hover:shadow-md"
              style={{
                borderRadius: `${theme.borderRadius}px`,
                border: `2px solid ${isSelected ? theme.primaryColor : "#e5e7eb"}`,
                backgroundColor: isSelected ? `${theme.primaryColor}08` : "#fff",
              }}
            >
              {/* Letter index */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                style={{
                  backgroundColor: isSelected
                    ? theme.primaryColor
                    : `${theme.primaryColor}12`,
                  color: isSelected ? "#fff" : theme.primaryColor,
                }}
              >
                {letters[idx] || String(idx + 1)}
              </div>

              {/* Icon */}
              {opt.icon && (
                <span className="text-xl shrink-0">{opt.icon}</span>
              )}

              {/* Label + description */}
              <div className="flex-1 min-w-0">
                <div
                  className="font-medium text-sm"
                  style={{ color: isSelected ? theme.primaryColor : "#1f2937" }}
                >
                  {opt.label}
                </div>
                {opt.description && (
                  <div className="text-xs text-gray-500 mt-0.5 truncate">
                    {opt.description}
                  </div>
                )}
              </div>

              {/* Chevron / branch indicator */}
              <div className="shrink-0 flex items-center gap-1">
                {opt.nextStep && (
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: `${theme.primaryColor}12`,
                      color: theme.primaryColor,
                    }}
                  >
                    branch
                  </span>
                )}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={isSelected ? theme.primaryColor : "#9ca3af"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Generic Fallback ─────────────────────────────────────────

function GenericWidgetPreview({
  template,
  config,
  theme,
}: {
  template: {
    name: string;
    icon: string;
    inputs: { label: string }[];
    outputs: { label: string }[];
  };
  config: Record<string, unknown>;
  theme: ThemeConfig;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xl">{template.icon}</span>
        <h3
          style={{ fontFamily: theme.headlineFont }}
          className="text-base font-semibold"
        >
          {(config.title as string) || template.name}
        </h3>
      </div>
      <div className="text-xs text-gray-400 italic">
        Widget preview placeholder
      </div>
    </div>
  );
}

// ─── Main Renderer ────────────────────────────────────────────

export function WidgetRenderer({
  widget,
  theme,
  isSelected,
  onClick,
  resolvedInputs = {},
  onOutput,
}: WidgetRendererProps) {
  const template = widgetTemplateRegistry[widget.templateId];

  // Stable callback to avoid infinite re-render loops
  const stableOnOutput = useCallback(
    (outputs: Record<string, unknown>) => {
      onOutput?.(outputs);
    },
    [onOutput]
  );

  const cardStyle: React.CSSProperties = {
    borderRadius: `${theme.borderRadius}px`,
    backgroundColor: "#ffffff",
    ...(theme.cardStyle === "elevated" && {
      boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
    }),
    ...(theme.cardStyle === "outlined" && { border: "1px solid #e5e7eb" }),
    ...(theme.cardStyle === "flat" && { border: "1px solid transparent" }),
  };

  let content: React.ReactNode;
  switch (widget.templateId) {
    case "date-picker":
      content = (
        <DatePickerPreview
          config={widget.config}
          theme={theme}
          resolvedInputs={resolvedInputs}
          onOutput={stableOnOutput}
        />
      );
      break;
    case "guest-counter":
      content = (
        <GuestCounterPreview
          config={widget.config}
          theme={theme}
          resolvedInputs={resolvedInputs}
          onOutput={stableOnOutput}
        />
      );
      break;
    case "guest-rooms":
      content = (
        <RoomSelectionPreview
          config={widget.config}
          theme={theme}
          resolvedInputs={resolvedInputs}
          onOutput={stableOnOutput}
        />
      );
      break;
    case "meal-picker":
      content = (
        <MealPickerPreview
          config={widget.config}
          theme={theme}
          resolvedInputs={resolvedInputs}
          onOutput={stableOnOutput}
        />
      );
      break;
    case "activity-picker":
      content = (
        <ActivityPickerPreview
          config={widget.config}
          theme={theme}
          resolvedInputs={resolvedInputs}
          onOutput={stableOnOutput}
        />
      );
      break;
    case "contact-form":
      content = (
        <ContactFormPreview
          config={widget.config}
          theme={theme}
          resolvedInputs={resolvedInputs}
          onOutput={stableOnOutput}
        />
      );
      break;
    case "invoice":
      content = (
        <InvoicePreview
          config={widget.config}
          theme={theme}
          resolvedInputs={resolvedInputs}
          onOutput={stableOnOutput}
        />
      );
      break;
    case "option-picker":
      content = (
        <OptionPickerPreview
          config={widget.config}
          theme={theme}
          resolvedInputs={resolvedInputs}
          onOutput={stableOnOutput}
        />
      );
      break;
    case "segment-picker":
      content = (
        <SegmentPickerPreview
          config={widget.config}
          theme={theme}
          resolvedInputs={resolvedInputs}
          onOutput={stableOnOutput}
        />
      );
      break;
    default:
      content = template ? (
        <GenericWidgetPreview
          template={template}
          config={widget.config}
          theme={theme}
        />
      ) : (
        <div className="text-sm text-red-500">
          Unknown widget: {widget.templateId}
        </div>
      );
  }

  return (
    <div
      onClick={onClick}
      className={`p-5 transition-all cursor-pointer ${
        isSelected
          ? "ring-2 ring-offset-2"
          : "hover:ring-1 hover:ring-offset-1"
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
