"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { WidgetInstance, ThemeConfig } from "@/lib/types";
import { widgetTemplateRegistry } from "@/lib/widget-templates";
import { mockRooms, mockMeals, mockActivities } from "@/lib/mock-data";
import { useVenueDataStore } from "@/stores/venue-data-store";

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
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const defaultIn = new Date(today); defaultIn.setDate(today.getDate() + 7);
  const defaultOut = new Date(defaultIn); defaultOut.setDate(defaultIn.getDate() + 4);

  const [startDate, setStartDate] = useState<string>((resolvedInputs?.checkIn as string) || fmt(defaultIn));
  const [endDate, setEndDate] = useState<string>((resolvedInputs?.checkOut as string) || fmt(defaultOut));
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [hover, setHover] = useState<string | null>(null);
  const [selEnd, setSelEnd] = useState(!!startDate);

  const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const toDS = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const pD = (s: string) => s ? new Date(s + "T00:00:00") : null;
  const sD = pD(startDate), eD = pD(endDate);

  const nightCount = startDate && endDate ? Math.max(0, Math.round((new Date(endDate + "T00:00:00").getTime() - new Date(startDate + "T00:00:00").getTime()) / 86400000)) : 0;

  useEffect(() => {
    onOutput({ checkIn: startDate, checkOut: endDate, nightCount });
  }, [startDate, endDate, nightCount, onOutput]);

  const click = (ds: string) => {
    const c = new Date(ds + "T00:00:00");
    if (c < today) return;
    if (!startDate || !selEnd) { setStartDate(ds); setEndDate(""); setSelEnd(true); }
    else { if (c <= sD!) { setStartDate(ds); setEndDate(""); setSelEnd(true); } else { setEndDate(ds); setSelEnd(false); } }
  };

  const prev = () => { if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); } else setViewMonth(m => m - 1); };
  const next = () => { if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); } else setViewMonth(m => m + 1); };

  const renderMonth = (y: number, m: number) => {
    const totalDays = new Date(y, m + 1, 0).getDate();
    const firstDay = new Date(y, m, 1).getDay();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(d);

    return (
      <div className="flex-1 min-w-0">
        <div className="text-center font-bold text-sm mb-2" style={{ color: theme.primaryColor, fontFamily: theme.headlineFont }}>{MONTHS[m]} {y}</div>
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map(d => <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wider py-0.5" style={{ color: "#9ca3af" }}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-y-0.5">
          {cells.map((day, i) => {
            if (!day) return <div key={`e-${i}`} />;
            const ds = toDS(y, m, day);
            const d = new Date(ds + "T00:00:00");
            const hD = hover ? new Date(hover + "T00:00:00") : null;
            const isPast = d < today;
            const isStart = startDate === ds;
            const isEnd = endDate === ds;
            const inRange = startDate && endDate && sD && eD && d > sD && d < eD;
            const inHover = startDate && !endDate && hD && selEnd && sD && d > sD && d < hD;
            const isSel = isStart || isEnd;
            const isIR = inRange || inHover;

            let bg = "transparent", col = isPast ? "#d1d5db" : "#1f2937", fw = "500", br = "50%";
            if (isSel) { bg = theme.primaryColor; col = "#fff"; fw = "700"; }
            else if (isIR) { bg = theme.primaryColor + "15"; col = theme.primaryColor; br = "0"; }
            if (isStart && (inRange || inHover)) br = "50% 0 0 50%";
            if (isEnd && inRange) br = "0 50% 50% 0";

            return (
              <div key={ds} className="flex items-center justify-center" style={{ height: 32 }}>
                <button
                  disabled={isPast}
                  onClick={() => click(ds)}
                  onMouseEnter={() => { if (selEnd && startDate && !isPast) setHover(ds); }}
                  onMouseLeave={() => setHover(null)}
                  className="w-8 h-8 text-xs flex items-center justify-center disabled:cursor-not-allowed transition-colors"
                  style={{ background: bg, color: col, fontWeight: fw, borderRadius: br, fontSize: 12 }}
                >
                  {day}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const m2 = viewMonth === 11 ? 0 : viewMonth + 1;
  const y2 = viewMonth === 11 ? viewYear + 1 : viewYear;
  const fmtDisplay = (s: string) => s ? new Date(s + "T00:00:00").toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" }) : null;

  return (
    <div data-item-label="Date Picker" className="space-y-3">
      <h3 style={{ fontFamily: theme.headlineFont, color: theme.primaryColor }} className="text-lg font-semibold">
        {(config.title as string) || "Select your dates"}
      </h3>

      {/* Check-in / Check-out summary cards */}
      <div className="grid grid-cols-2 gap-2">
        {[{ l: "Check-In", v: startDate }, { l: "Check-Out", v: endDate }].map(({ l, v }) => (
          <div key={l} className="p-3 rounded-xl text-center" style={{
            background: v ? `${theme.primaryColor}08` : "#f9fafb",
            border: `1.5px solid ${v ? theme.primaryColor : "#e5e7eb"}`,
          }}>
            <div className="text-[10px] font-bold uppercase tracking-[0.15em] mb-0.5" style={{ color: v ? theme.primaryColor : "#9ca3af" }}>{l}</div>
            <div className="text-sm font-semibold" style={{ color: v ? theme.primaryColor : "#d1d5db", fontFamily: theme.headlineFont }}>
              {v ? fmtDisplay(v) : "Select date"}
            </div>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "#fafafa", border: "1px solid #e5e7eb", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
        {/* Navigation */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid #f3f4f6" }}>
          <button onClick={prev} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <span className="font-bold text-sm" style={{ color: theme.primaryColor, fontFamily: theme.headlineFont }}>
            {MONTHS[viewMonth]} {viewYear}
          </span>
          <button onClick={next} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>

        {/* Dual calendar grid — 2 months side by side on wide, 1 on narrow */}
        <div className="flex gap-4 px-3 py-3">
          {renderMonth(viewYear, viewMonth)}
          <div className="hidden sm:block w-px bg-gray-200 shrink-0" />
          <div className="hidden sm:flex flex-1 min-w-0">
            {renderMonth(y2, m2)}
          </div>
        </div>

        {/* Status text */}
        <div className="px-4 pb-3 text-center">
          <p className="text-[11px]" style={{ color: "#9ca3af" }}>
            {!startDate ? "Tap to select your arrival date" : !endDate ? "Now tap your departure date" : `${nightCount} night${nightCount !== 1 ? "s" : ""} selected`}
          </p>
        </div>
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
    <div data-item-label={label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
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
    <div data-item-label="Guest Counter" className="space-y-3">
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
  const venueData = useVenueDataStore((s) => s.venueData);
  const rooms = venueData?.rooms && venueData.rooms.length > 0 ? venueData.rooms : mockRooms.slice(0, 4);
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
              data-item-label={room.name}
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
                    {room.currency || "CAD"} {room.pricePerNight}
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
  const venueData = useVenueDataStore((s) => s.venueData);
  const allMeals = venueData?.meals && venueData.meals.length > 0 ? venueData.meals : mockMeals;

  const guests = resolvedInputs?.guests as
    | { adults: number; children: number }
    | undefined;
  const guestCount = guests ? guests.adults + guests.children : 2;

  useEffect(() => {
    const selected = allMeals.filter((m) => selectedIds.has(m.id));
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
  }, [selectedIds, guestCount, onOutput, allMeals]);

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
        const meals = allMeals.filter((m) => m.category === cat);
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
                    data-item-label={meal.name}
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
                      {meal.currency || "CAD"} {meal.pricePerPerson}
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
  const venueData = useVenueDataStore((s) => s.venueData);
  const activities = venueData?.activities && venueData.activities.length > 0 ? venueData.activities : mockActivities.slice(0, 4);
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
              data-item-label={act.name}
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
                    {act.currency || "CAD"} {act.pricePerPerson}
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
    <div data-item-label="Contact Form" className="space-y-3">
      <h3
        style={{ fontFamily: theme.headlineFont, color: theme.primaryColor }}
        className="text-lg font-semibold"
      >
        {(config.title as string) || "Your Details"}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <div data-item-label="First Name">
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
        <div data-item-label="Last Name">
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
      <div data-item-label="Email">
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
    <div data-item-label="Invoice" className="space-y-3">
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
  resolvedInputs,
  onOutput,
}: {
  config: Record<string, unknown>;
  theme: ThemeConfig;
  resolvedInputs: Record<string, unknown>;
  onOutput: (outputs: Record<string, unknown>) => void;
}) {
  // Priority: resolved inputs > config options > mock fallback
  const mockFallback = [
    { id: "standard", label: "Standard", description: "Basic package" },
    { id: "premium", label: "Premium", description: "Extra amenities" },
    { id: "deluxe", label: "Deluxe", description: "All-inclusive" },
  ];

  let parsedOptions: Array<{ id: string; label: string; description?: string; icon?: string }> = mockFallback;

  // Check resolved inputs first (from variable binding)
  if (resolvedInputs.options && Array.isArray(resolvedInputs.options)) {
    parsedOptions = resolvedInputs.options as typeof parsedOptions;
  } else {
    // Check config options (embedded JSON)
    try {
      const configOpts = config.options;
      if (typeof configOpts === "string" && configOpts.trim().startsWith("[")) {
        parsedOptions = JSON.parse(configOpts);
      } else if (Array.isArray(configOpts)) {
        parsedOptions = configOpts as typeof parsedOptions;
      }
    } catch { /* fall back to mock */ }
  }

  const mockOptions = parsedOptions.map((o) => ({
    id: o.id,
    label: o.label,
    desc: o.description || "",
    icon: o.icon,
  }));

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
              data-item-label={opt.label}
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
              {opt.icon && <div className="text-lg mb-1">{opt.icon}</div>}
              <div className="font-medium text-sm">{opt.label}</div>
              {opt.desc && (
                <div className="text-[10px] text-gray-500 mt-0.5">
                  {opt.desc}
                </div>
              )}
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
                data-item-label={opt.label}
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
              data-segment-option={opt.id}
              data-item-label={opt.label}
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

// ─── Hero Section ────────────────────────────────────────────

function HeroSectionPreview({ config, theme }: { config: Record<string, unknown>; theme: ThemeConfig }) {
  const bgUrl = (config.backgroundImageUrl as string) || "";
  const headline = (config.headline as string) || "Welcome";
  const subtitle = (config.subtitle as string) || "";
  const logoUrl = (config.logoUrl as string) || "";
  const height = config.height === "small" ? 200 : config.height === "large" ? 400 : config.height === "full" ? 500 : 300;
  const opacity = typeof config.overlayOpacity === "number" ? config.overlayOpacity / 100 : 0.4;

  return (
    <div data-item-label="Hero Section" style={{
      position: "relative", borderRadius: theme.borderRadius, overflow: "hidden",
      height, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      backgroundImage: bgUrl ? `url(${bgUrl})` : undefined,
      backgroundSize: "cover", backgroundPosition: "center",
      backgroundColor: bgUrl ? undefined : theme.primaryColor,
    }}>
      <div style={{ position: "absolute", inset: 0, backgroundColor: `rgba(0,0,0,${opacity})` }} />
      <div style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "20px", maxWidth: 600 }}>
        {logoUrl && <img src={logoUrl} alt="Logo" style={{ maxHeight: 60, marginBottom: 16, filter: "brightness(0) invert(1)" }} />}
        <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 800, fontFamily: theme.headlineFont, lineHeight: 1.2, marginBottom: 8 }}>{headline}</h1>
        {subtitle && <p style={{ color: "rgba(255,255,255,0.9)", fontSize: 14, lineHeight: 1.5 }}>{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Headline ────────────────────────────────────────────────

function HeadlinePreview({ config, theme }: { config: Record<string, unknown>; theme: ThemeConfig }) {
  const text = (config.text as string) || "Section Title";
  const size = config.size === "small" ? 18 : config.size === "medium" ? 24 : config.size === "xlarge" ? 40 : 32;
  const alignment = (config.alignment as string) || "left";
  const useTheme = config.useThemeColor !== false;
  const variant = (config as Record<string, unknown>).variant;

  return (
    <div data-item-label="Headline" style={{ textAlign: alignment as "left" | "center" | "right" }}>
      <h2 style={{
        fontSize: size, fontWeight: 700, fontFamily: theme.headlineFont,
        color: useTheme ? theme.primaryColor : "#1a1a1a",
        margin: 0, lineHeight: 1.3,
        ...(variant === "decorated" ? { borderBottom: `3px solid ${theme.primaryColor}`, paddingBottom: 8, display: "inline-block" } : {}),
      }}>{text}</h2>
    </div>
  );
}

// ─── Text Block ──────────────────────────────────────────────

function TextBlockPreview({ config, theme, variant }: { config: Record<string, unknown>; theme: ThemeConfig; variant?: string }) {
  const content = (config.content as string) || "<p>Text content here</p>";
  const maxWidth = config.maxWidth === "narrow" ? 400 : config.maxWidth === "medium" ? 600 : undefined;
  const fontSize = config.fontSize === "small" ? 13 : config.fontSize === "large" ? 17 : 15;

  const wrapStyle: React.CSSProperties = variant === "callout"
    ? { backgroundColor: `${theme.primaryColor}08`, border: `1px solid ${theme.primaryColor}30`, borderRadius: theme.borderRadius, padding: 16 }
    : variant === "quote"
    ? { borderLeft: `4px solid ${theme.primaryColor}`, paddingLeft: 16, fontStyle: "italic" }
    : {};

  return (
    <div data-item-label="Text Block" style={{ maxWidth, ...wrapStyle }}>
      <div style={{ fontSize, lineHeight: 1.7, color: "#374151", fontFamily: theme.bodyFont }}
        dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  );
}

// ─── Image Block ─────────────────────────────────────────────

function ImageBlockPreview({ config, theme, variant }: { config: Record<string, unknown>; theme: ThemeConfig; variant?: string }) {
  const imageUrl = (config.imageUrl as string) || "";
  const altText = (config.altText as string) || "Image";
  const caption = (config.caption as string) || "";
  const width = config.width === "small" ? 300 : config.width === "medium" ? 500 : config.width === "large" ? 700 : "100%";
  const borderRadius = typeof config.borderRadius === "number" ? config.borderRadius : theme.borderRadius;
  const isCard = variant === "card";

  if (!imageUrl) {
    return (
      <div data-item-label="Image" style={{ width: typeof width === "number" ? width : "100%", height: 200, backgroundColor: "#f3f4f6", borderRadius, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: 14 }}>
        🏞️ No image URL set
      </div>
    );
  }

  return (
    <figure data-item-label="Image" style={{ margin: 0, maxWidth: typeof width === "number" ? width : "100%", ...(isCard ? { boxShadow: "0 2px 8px rgba(0,0,0,0.1)", borderRadius, overflow: "hidden", border: "1px solid #e5e7eb" } : {}) }}>
      <img src={imageUrl} alt={altText} style={{ width: "100%", display: "block", borderRadius: isCard ? 0 : borderRadius, objectFit: "cover" }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
      {caption && <figcaption style={{ fontSize: 12, color: "#6b7280", textAlign: "center", padding: "8px 12px" }}>{caption}</figcaption>}
    </figure>
  );
}

// ─── Category Picker ─────────────────────────────────────────

function CategoryPickerPreview({ config, theme, resolvedInputs, onOutput }: { config: Record<string, unknown>; theme: ThemeConfig; resolvedInputs: Record<string, unknown>; onOutput: (o: Record<string, unknown>) => void }) {
  const title = (config.title as string) || "Select Products";
  const currency = (config.currency as string) || "CAD";
  const showImages = config.showImages !== false;

  let categories: Array<{ name: string; products: Array<{ id: string; name: string; description?: string; price: number; unit?: string; stock?: number; imageUrl?: string; tags?: string[] }> }> = [];
  try {
    const raw = config.categories;
    if (typeof raw === "string") categories = JSON.parse(raw);
    else if (Array.isArray(raw)) categories = raw as typeof categories;
  } catch {}

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const fmt = (n: number) => new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(n);

  return (
    <div className="space-y-4">
      <h3 style={{ fontFamily: theme.headlineFont, color: theme.primaryColor }} className="text-lg font-semibold">{title}</h3>
      {categories.map((cat, ci) => (
        <div key={ci}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#6b7280", marginBottom: 8, borderBottom: "1px solid #e5e7eb", paddingBottom: 4 }}>{cat.name}</div>
          <div className="space-y-2">
            {cat.products.map((p) => (
              <div key={p.id} data-item-label={p.name} onClick={() => toggle(p.id)} className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
                style={{ borderColor: selected.has(p.id) ? theme.primaryColor : "#e5e7eb", backgroundColor: selected.has(p.id) ? `${theme.primaryColor}08` : "#fff" }}>
                {showImages && p.imageUrl && <img src={p.imageUrl} alt={p.name} style={{ width: 48, height: 48, borderRadius: 6, objectFit: "cover" }} />}
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</div>
                  {p.description && <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.3 }}>{p.description}</div>}
                  {p.tags && p.tags.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {p.tags.map((t, ti) => <span key={ti} style={{ fontSize: 9, padding: "1px 6px", borderRadius: 8, backgroundColor: "#f3f4f6", color: "#6b7280" }}>{t}</span>)}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: theme.primaryColor, whiteSpace: "nowrap" }}>
                  {fmt(p.price)}{p.unit ? `/${p.unit}` : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {categories.length === 0 && <div style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: 20 }}>No categories configured</div>}
    </div>
  );
}

// ─── Text Input ──────────────────────────────────────────────

function TextInputPreview({ config, theme, onOutput }: { config: Record<string, unknown>; theme: ThemeConfig; onOutput: (o: Record<string, unknown>) => void }) {
  const label = (config.label as string) || "Your Answer";
  const placeholder = (config.placeholder as string) || "Type here...";
  const required = config.required === true;
  const helpText = (config.helpText as string) || "";
  const [value, setValue] = useState("");

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && " *"}</label>
      <input type={(config.inputType as string) || "text"} value={value}
        onChange={(e) => { setValue(e.target.value); onOutput({ value: e.target.value }); }}
        onClick={(e) => e.stopPropagation()}
        placeholder={placeholder}
        className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
        style={{ borderColor: "#d1d5db", borderRadius: theme.borderRadius }} />
      {helpText && <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>{helpText}</p>}
    </div>
  );
}

// ─── Textarea Input ──────────────────────────────────────────

function TextareaInputPreview({ config, theme, onOutput }: { config: Record<string, unknown>; theme: ThemeConfig; onOutput: (o: Record<string, unknown>) => void }) {
  const label = (config.label as string) || "Additional Notes";
  const placeholder = (config.placeholder as string) || "Enter your response here...";
  const required = config.required === true;
  const rows = typeof config.rows === "number" ? config.rows : 4;
  const helpText = (config.helpText as string) || "";
  const [value, setValue] = useState("");

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && " *"}</label>
      <textarea value={value}
        onChange={(e) => { setValue(e.target.value); onOutput({ value: e.target.value }); }}
        onClick={(e) => e.stopPropagation()}
        placeholder={placeholder} rows={rows}
        className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none resize-y"
        style={{ borderColor: "#d1d5db", borderRadius: theme.borderRadius }} />
      {helpText && <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>{helpText}</p>}
    </div>
  );
}

// ─── Booking Widget ──────────────────────────────────────────

function BookingWidgetPreview({ config, theme }: { config: Record<string, unknown>; theme: ThemeConfig }) {
  const visible = config.visible !== false;
  const categoryName = (config.categoryName as string) || "Booking Package";

  if (!visible) {
    return (
      <div style={{ padding: 12, backgroundColor: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: theme.borderRadius, textAlign: "center" }}>
        <span style={{ fontSize: 12, color: "#94a3b8" }}>📦 Hidden Booking Widget — <strong>{categoryName}</strong></span>
        <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>Creates booking in background when quote is generated</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, backgroundColor: "#f0fdf4", border: `1px solid ${theme.primaryColor}30`, borderRadius: theme.borderRadius }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: theme.primaryColor, marginBottom: 4 }}>📦 {categoryName}</div>
      <div style={{ fontSize: 12, color: "#6b7280" }}>Booking will be created with all selected products, dates, and guest counts.</div>
    </div>
  );
}

// ─── Payment Widget ──────────────────────────────────────────

function PaymentWidgetPreview({ config, theme }: { config: Record<string, unknown>; theme: ThemeConfig }) {
  const title = (config.title as string) || "Secure Your Booking";
  const amount = typeof config.amount === "number" ? config.amount : 10;
  const amountType = (config.amountType as string) || "percent";
  const description = (config.description as string) || "A deposit is required to secure your dates.";

  const amountLabel = amountType === "percent" ? `${amount}% deposit` : amountType === "full" ? "Full payment" : `$${amount} deposit`;

  return (
    <div className="space-y-3">
      <h3 style={{ fontFamily: theme.headlineFont, color: theme.primaryColor }} className="text-lg font-semibold">{title}</h3>
      <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.5 }}>{description}</p>
      <div style={{ padding: 16, backgroundColor: "#f8fafc", borderRadius: theme.borderRadius, border: "1px solid #e2e8f0" }}>
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>Amount due: <strong style={{ color: theme.primaryColor }}>{amountLabel}</strong></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div><label style={{ fontSize: 11, color: "#9ca3af" }}>Card Number</label><div style={{ padding: "8px 12px", backgroundColor: "#fff", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, color: "#9ca3af" }}>•••• •••• •••• ••••</div></div>
          <div><label style={{ fontSize: 11, color: "#9ca3af" }}>Expiry</label><div style={{ padding: "8px 12px", backgroundColor: "#fff", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, color: "#9ca3af" }}>MM / YY</div></div>
        </div>
        <button style={{ marginTop: 12, width: "100%", padding: "10px", backgroundColor: theme.primaryColor, color: "#fff", border: "none", borderRadius: theme.borderRadius, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          💳 Pay {amountLabel}
        </button>
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
          config={{ ...widget.config, style: widget.variant === "pills" ? "pills" : (widget.config.style || "cards") }}
          theme={theme}
          resolvedInputs={resolvedInputs}
          onOutput={stableOnOutput}
        />
      );
      break;
    case "hero-section":
      content = <HeroSectionPreview config={widget.config} theme={theme} />;
      break;
    case "headline":
      content = <HeadlinePreview config={widget.config} theme={theme} />;
      break;
    case "text-block":
      content = <TextBlockPreview config={widget.config} theme={theme} variant={widget.variant} />;
      break;
    case "image-block":
      content = <ImageBlockPreview config={widget.config} theme={theme} variant={widget.variant} />;
      break;
    case "category-picker":
      content = <CategoryPickerPreview config={widget.config} theme={theme} resolvedInputs={resolvedInputs} onOutput={stableOnOutput} />;
      break;
    case "text-input":
      content = <TextInputPreview config={widget.config} theme={theme} onOutput={stableOnOutput} />;
      break;
    case "textarea-input":
      content = <TextareaInputPreview config={widget.config} theme={theme} onOutput={stableOnOutput} />;
      break;
    case "booking-widget":
      content = <BookingWidgetPreview config={widget.config} theme={theme} />;
      break;
    case "payment-widget":
      content = <PaymentWidgetPreview config={widget.config} theme={theme} />;
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
