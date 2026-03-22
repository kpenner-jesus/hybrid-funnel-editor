import type { FunnelDefinition, Step, WidgetInstance, ThemeConfig } from "./types";

/**
 * Generates a complete JSX funnel file string from a FunnelDefinition.
 * The output is designed to work with the Everybooking bundler which
 * auto-injects React imports. The generated file follows the
 * wilderness-edge-funnel.jsx pattern exactly — using window.__EverybookingAPI,
 * apiRef, correct clampQuantity(value, param) signature, initQuantities,
 * buildParameterTree, syncBooking with products array, and InvoiceWidget
 * with sessionId + currencyId props.
 *
 * Default mode: live (connects to real Everybooking API).
 */
export function generateFunnelJSX(funnel: FunnelDefinition): string {
  const lines: string[] = [];

  // --- Imports (no React — bundler auto-injects) ---
  lines.push(`/**`);
  lines.push(` * ${escapeJsx(funnel.name)} — Typeform-inspired design with GuestRoomsWidget plugin.`);
  lines.push(` * Responsive from mobile to 4K displays.`);
  lines.push(` * Rooms step uses wide layout (3-4 col grid on large screens).`);
  lines.push(` * Other steps use narrow centered layout for readability.`);
  lines.push(` * Material Design 3 design system.`);
  lines.push(` */`);
  lines.push(`// React hooks are auto-injected by the bundler — do NOT import from 'react'`);
  lines.push(`import InvoiceWidget from 'widget-sdk/InvoiceWidget';`);
  lines.push(`import { buildParameterTree, initQuantities, clampQuantity } from 'widget-sdk/utils';`);
  lines.push(``);

  // --- Theme ---
  lines.push(generateThemeBlock(funnel.theme));
  lines.push(``);

  // --- Helper functions ---
  lines.push(generateHelperFunctions());
  lines.push(``);

  // --- Collect category IDs from widget configs ---
  const catInfo = collectCategoryInfo(funnel);

  // --- Shared UI components ---
  lines.push(generateSharedUI());
  lines.push(``);

  // --- Widget-specific components based on what's used ---
  const usedTemplates = new Set<string>();
  for (const step of funnel.steps) {
    for (const widget of step.widgets) {
      usedTemplates.add(widget.templateId);
    }
  }

  if (usedTemplates.has("date-picker")) {
    lines.push(generateDateRangePickerComponent());
    lines.push(``);
  }
  if (usedTemplates.has("guest-rooms")) {
    lines.push(generateGuestRoomsComponents());
    lines.push(``);
  }
  if (usedTemplates.has("segment-picker")) {
    lines.push(generateSegmentPickerComponent());
    lines.push(``);
  }
  if (usedTemplates.has("meal-picker")) {
    lines.push(generateMealTimeslotGrid());
    lines.push(``);
  }

  // --- Main funnel component ---
  lines.push(generateMainFunnel(funnel, catInfo, usedTemplates));

  return lines.join("\n");
}

// ────────────────────────────────────────────────────────────
// Collect category info from widget configs
// ────────────────────────────────────────────────────────────

interface CategoryInfo {
  roomCatIds: number[];
  mealCatIds: number[];
  meetingMealCatIds: number[];
  activityCatIds: number[];
}

function collectCategoryInfo(funnel: FunnelDefinition): CategoryInfo {
  const roomCatIds: number[] = [];
  const mealCatIds: number[] = [];
  const activityCatIds: number[] = [];
  const meetingMealCatIds: number[] = [];

  for (const step of funnel.steps) {
    for (const widget of step.widgets) {
      const cfg = widget.config as Record<string, unknown>;
      // Try both categoryId and category_id (handle different serialization)
      const catId = (cfg.categoryId ?? cfg.category_id) as number | undefined;
      const meetingCatId = (cfg.meetingMealCategoryId ?? cfg.meeting_meal_category_id) as number | undefined;

      switch (widget.templateId) {
        case "guest-rooms":
          if (catId && !roomCatIds.includes(catId)) roomCatIds.push(catId);
          break;
        case "meal-picker":
          if (catId && !mealCatIds.includes(catId)) mealCatIds.push(catId);
          if (meetingCatId && !meetingMealCatIds.includes(meetingCatId)) meetingMealCatIds.push(meetingCatId);
          break;
        case "activity-picker":
          if (catId && !activityCatIds.includes(catId)) activityCatIds.push(catId);
          break;
      }
    }
  }

  // No fallbacks — each venue has its own category IDs set via widget config
  return { roomCatIds, mealCatIds, meetingMealCatIds, activityCatIds };
}

// ────────────────────────────────────────────────────────────
// Theme block — M3 color system
// ────────────────────────────────────────────────────────────

function generateThemeBlock(theme: ThemeConfig): string {
  const pc = theme.primaryColor;
  const sc = theme.secondaryColor;
  return `const THEME = {
  primary: '${pc}', primaryContainer: '${lighten(pc, 0.6)}', onPrimary: '#ffffff', onPrimaryContainer: '${darken(pc, 0.3)}',
  secondary: '${sc}', secondaryContainer: '${lighten(sc, 0.6)}',
  surface: '${theme.surfaceColor}', surfaceContainerLow: '${adjustSurface(theme.surfaceColor, 0.02)}', surfaceContainer: '${adjustSurface(theme.surfaceColor, 0.04)}',
  surfaceContainerHigh: '${adjustSurface(theme.surfaceColor, 0.08)}', surfaceContainerHighest: '${adjustSurface(theme.surfaceColor, 0.12)}', surfaceContainerLowest: '#ffffff',
  onSurface: '#151c27', onSurfaceVariant: '#3d4a42', outline: '#6c7a72', outlineVariant: '#bbcac0',
  error: '#ba1a1a',
  serif: "'${theme.headlineFont}', 'Georgia', serif", sans: "'${theme.bodyFont}', system-ui, sans-serif",
};
const GRADIENT_BG = \`linear-gradient(180deg, \${THEME.surface} 0%, \${THEME.primary}08 100%)\`;`;
}

/** Attempt to lighten a hex color. Falls back to original if unparseable. */
function lighten(hex: string, factor: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const [r, g, b] = rgb;
  return toHex(
    Math.round(r + (255 - r) * factor),
    Math.round(g + (255 - g) * factor),
    Math.round(b + (255 - b) * factor),
  );
}

/** Attempt to darken a hex color. */
function darken(hex: string, factor: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const [r, g, b] = rgb;
  return toHex(
    Math.round(r * (1 - factor)),
    Math.round(g * (1 - factor)),
    Math.round(b * (1 - factor)),
  );
}

/** Slightly shift a surface color darker for container variants. */
function adjustSurface(hex: string, amount: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const [r, g, b] = rgb;
  return toHex(
    Math.max(0, Math.round(r - 255 * amount)),
    Math.max(0, Math.round(g - 255 * amount)),
    Math.max(0, Math.round(b - 255 * amount)),
  );
}

function parseHex(hex: string): [number, number, number] | null {
  const m = hex.match(/^#?([0-9a-f]{6})$/i);
  if (!m) return null;
  const h = m[1];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function toHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

// ────────────────────────────────────────────────────────────
// Helper functions — matches wilderness-edge-funnel.jsx
// ────────────────────────────────────────────────────────────

function generateHelperFunctions(): string {
  return `function getBasePrice(p) { if (typeof p.price === 'number') return p.price; const e = Object.values(p.price || {}); return e.length ? (parseFloat(e[0]?.base_price) || 0) : 0; }
function getMaxPrice(p) { if (p.max_price != null) return parseFloat(p.max_price) || 0; let m = 0; for (const e of Object.values(p.price || {})) { const b = parseFloat(e?.base_price) || 0; if (b > m) m = b; } return m; }
function calculateGroupPrice(pe, q) { if (!pe) return 0; const b = parseFloat(pe.base_price) || 0; if (pe.group_price) { for (const t of Object.values(pe.group_price)) { if (q >= (parseInt(t.from) || 0) && q <= (parseInt(t.to) || Infinity)) { const a = parseFloat(t.amount) || 0; return t.type === 'quantity' ? a * q : a; } } } return b; }
function fmtCurrency(v) { return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(v); }
function buildProductEntries(product, qty, startDate, endDate, childAges = []) {
  const params = product.parameters || [];
  // Kids meal with childage parameter
  if (params.some(p => p.report_id === 'childage')) {
    return childAges.slice(0, qty).map(age => ({ sku: product.sku, startDate, endDate: startDate, quantities: { childage: age, qty: 1 } }));
  }
  const k = params[0]?.report_id || 'qty';
  // Check if product uses timeslots (meal products)
  const isTimeslot = product.booking_unit === 'Timeslots' || product.booking_unit === 'timeslot' || (product.timeslots && product.timeslots.length > 0);
  if (isTimeslot) {
    // For timeslot products, include the timeslot index (0 = first available)
    return [{ sku: product.sku, startDate, endDate, quantities: { [k]: qty, timeslot: 0 }, bookingUnit: 'timeslot' }];
  }
  return [{ sku: product.sku, startDate, endDate, quantities: { [k]: qty } }];
}`;
}

// ────────────────────────────────────────────────────────────
// Shared UI — SafeHtml, TypeformStep, BottomNav, TFButton,
// CompactQtyPicker, BigQtyPicker, BigGuestCounter
// Matches wilderness-edge-funnel.jsx exactly.
// ────────────────────────────────────────────────────────────

function generateSharedUI(): string {
  return `function SafeHtml({ html, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !html) return;
    ref.current.innerHTML = String(html).replace(/<script[\\s\\S]*?<\\/script>/gi, '').replace(/<iframe[\\s\\S]*?<\\/iframe>/gi, '').replace(/\\s+on\\w+="[^"]*"/gi, '');
  }, [html]);
  if (!html) return null;
  return <div ref={ref} className={className} />;
}

function TypeformStep({ stepNum, stepLabel, title, subtitle, image, children, footer, wide }) {
  return (
    <div className={wide ? 'max-w-2xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl mx-auto' : 'max-w-2xl lg:max-w-3xl mx-auto'} style={{ fontFamily: THEME.sans }}>
      <div className="px-4 py-5 sm:px-6 lg:px-8" style={{ paddingBottom: '120px' }}>
        {image && <div className="relative h-48 sm:h-52 lg:h-64 overflow-hidden mb-5" style={{ borderRadius: '2rem', boxShadow: '0 24px 40px rgba(0,0,0,0.08)' }}><img src={image} alt="" className="w-full h-full object-cover" /><div className="absolute inset-0" style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.35) 0%, transparent 50%)' }} /></div>}
        {stepNum && stepLabel && (
          <div className="mb-4 text-[0.7rem] font-bold uppercase tracking-[0.2em]" style={{ color: THEME.secondary }}>
            STEP {stepNum} — {stepLabel}
          </div>
        )}
        {typeof title === 'string'
          ? <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight mb-1" style={{ fontFamily: THEME.serif, color: THEME.onSurface }}>{title}</h2>
          : <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight mb-1" style={{ fontFamily: THEME.serif, color: THEME.onSurface }}>{title[0]}<em style={{ color: THEME.primary, fontStyle: 'italic' }}>{title[1]}</em>{title[2]}</h2>
        }
        {subtitle && <p className="text-sm lg:text-base mb-5 mt-1" style={{ color: THEME.outline, lineHeight: '1.6' }}>{subtitle}</p>}
        {children}
        {footer}
      </div>
    </div>
  );
}

function BottomNav({ onBack, onNext, nextLabel = 'Continue', loading, loadingText, disabled, showBack = true }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50" style={{
      background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderRadius: '3rem 3rem 0 0', boxShadow: '0 -8px 40px rgba(0,0,0,0.08)', padding: '16px 20px 24px',
    }}>
      <div className="max-w-2xl lg:max-w-3xl mx-auto flex items-center gap-3">
        {showBack && onBack && (
          <button onClick={onBack} className="text-xs font-bold uppercase tracking-widest px-4 py-3" style={{ color: THEME.outline }}>
            ← BACK
          </button>
        )}
        <button
          onClick={onNext} disabled={loading || disabled}
          className="flex-1 py-4 text-white font-bold text-sm uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: loading || disabled ? THEME.primary : \`linear-gradient(135deg, \${THEME.primary} 0%, \${THEME.primaryContainer} 100%)\`,
            borderRadius: '9999px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          }}
        >
          {loading ? (loadingText || 'Loading...') : nextLabel}
        </button>
      </div>
    </div>
  );
}

function TFButton({ onClick, loading, loadingText, disabled, children }) {
  return (
    <button onClick={onClick} disabled={loading || disabled}
      className="w-full py-4 text-white font-bold text-sm uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ background: loading || disabled ? THEME.primary : \`linear-gradient(135deg, \${THEME.primary} 0%, \${THEME.primaryContainer} 100%)\`, borderRadius: '9999px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
      {loading ? (loadingText || 'Loading...') : children}
    </button>
  );
}

function CompactQtyPicker({ value, onChange, min = 0, max = 9999 }) {
  const adj = d => onChange(Math.max(min, Math.min(max, value + d)));
  return (
    <div className="flex items-center justify-center gap-1">
      <div className="inline-flex items-center rounded-full" style={{ background: THEME.surfaceContainerLow, padding: '4px' }}>
        <button onClick={() => adj(-1)} disabled={value <= min}
          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ color: value > min ? THEME.primary : THEME.outline }}>−</button>
        <div className="w-12 text-center">
          <span className="text-lg font-bold" style={{ color: THEME.onSurface, fontFamily: THEME.serif }}>{value}</span>
        </div>
        <button onClick={() => adj(1)} disabled={value >= max}
          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ background: THEME.primary }}>+</button>
      </div>
    </div>
  );
}

function BigQtyPicker({ value, onChange, min = 0, max = 9999 }) {
  const adj = d => onChange(Math.max(min, Math.min(max, value + d)));
  return (
    <div className="flex items-center gap-3 w-full justify-center">
      <button onClick={() => adj(-1)} disabled={value <= min} className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-2xl transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-90" style={{ border: \`2px solid \${value > min ? THEME.primary : THEME.outlineVariant}\`, color: value > min ? THEME.primary : THEME.outline, background: value > min ? \`\${THEME.primary}10\` : 'rgba(255,255,255,0.6)' }}>−</button>
      <div className="flex-1 max-w-[100px] text-center"><div className="text-4xl font-bold leading-none" style={{ color: THEME.onSurface, fontFamily: THEME.serif }}>{value}</div></div>
      <button onClick={() => adj(1)} disabled={value >= max} className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-2xl text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-90" style={{ background: THEME.primary, boxShadow: \`0 4px 16px \${THEME.primary}59\` }}>+</button>
    </div>
  );
}

function BigGuestCounter({ label, value, min, max, onChange }) {
  return <div className="p-5 rounded-[2rem]" style={{ background: THEME.surfaceContainerLowest, border: \`1px solid \${THEME.surfaceContainerHigh}4D\`, boxShadow: '0 24px 40px rgba(0,0,0,0.04)' }}><div className="mb-4"><div className="font-semibold text-base" style={{ color: THEME.onSurface, fontFamily: THEME.serif }}>{label}</div>{min > 1 && <div className="text-xs mt-0.5" style={{ color: THEME.outline }}>Minimum {min}</div>}</div><BigQtyPicker value={value} onChange={onChange} min={min} max={max} /></div>;
}`;
}

// ────────────────────────────────────────────────────────────
// MealTimeslotGrid — date × meal grid with availability bars
// Matches the Everybooking booking_widget meal display
// ────────────────────────────────────────────────────────────

function generateMealTimeslotGrid(): string {
  return `function MealTimeslotGrid({ meals, startDate, endDate, adults, currency = 'CAD', apiRef }) {
  // Build date range array
  const dates = useMemo(() => {
    if (!startDate || !endDate) return [];
    const result = [];
    const s = new Date(startDate + 'T00:00:00');
    const e = new Date(endDate + 'T00:00:00');
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      result.push(new Date(d));
    }
    return result;
  }, [startDate, endDate]);

  const dateCount = dates.length;

  // Timeslot selections: key = "dateIdx-mealIdx", value = timeslot label or null
  const [selections, setSelections] = useState({});
  // Select-all per date row
  const [selectAllState, setSelectAllState] = useState({});

  // Determine cell availability: 'selectable', 'unselectable', or 'optional'
  function cellState(meal, dateIdx) {
    if (dateIdx === 0) return meal.allowCheckIn || 'selectable';
    if (dateIdx === dateCount - 1) return meal.allowCheckOut || 'selectable';
    return meal.allowMiddle || 'selectable';
  }

  // Get the default timeslot for a meal
  function defaultTimeslot(meal) {
    if (!meal.timeslots || meal.timeslots.length === 0) return null;
    const ts = meal.timeslots[0];
    return formatTime(ts.startTime || ts.start_time) + ' - ' + formatTime(ts.endTime || ts.end_time);
  }

  function formatTime(t) {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return h12 + ':' + String(m).padStart(2, '0') + ' ' + ampm;
  }

  // Format date for display
  function formatDate(d, idx) {
    const label = d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
    if (idx === 0) return { label, sub: 'Check-in' };
    if (idx === dateCount - 1) return { label, sub: 'Check-out' };
    return { label, sub: null };
  }

  // Toggle a cell
  function toggleCell(dateIdx, mealIdx) {
    const key = dateIdx + '-' + mealIdx;
    setSelections(prev => {
      const cur = prev[key];
      if (cur) return { ...prev, [key]: null };
      return { ...prev, [key]: defaultTimeslot(meals[mealIdx]) || 'selected' };
    });
  }

  // Select all for a date row
  function handleSelectAll(dateIdx) {
    const allSelected = meals.every((meal, mi) => {
      const state = cellState(meal, dateIdx);
      if (state === 'unselectable') return true;
      return !!selections[dateIdx + '-' + mi];
    });
    const newSelections = { ...selections };
    meals.forEach((meal, mi) => {
      const state = cellState(meal, dateIdx);
      if (state === 'unselectable') return;
      const key = dateIdx + '-' + mi;
      newSelections[key] = allSelected ? null : (defaultTimeslot(meal) || 'selected');
    });
    setSelections(newSelections);
    setSelectAllState(prev => ({ ...prev, [dateIdx]: !allSelected }));
  }

  // Count selected meals
  const selectedCount = Object.values(selections).filter(Boolean).length;

  // Bar color
  function barColor(dateIdx, mealIdx) {
    const state = cellState(meals[mealIdx], dateIdx);
    if (state === 'unselectable') return '#ef4444'; // red
    const key = dateIdx + '-' + mealIdx;
    if (selections[key]) return '#22c55e'; // green
    return '#eab308'; // yellow (available but not selected)
  }

  // Cell display
  function cellDisplay(dateIdx, mealIdx) {
    const meal = meals[mealIdx];
    const state = cellState(meal, dateIdx);
    const key = dateIdx + '-' + mealIdx;
    const selected = selections[key];

    if (state === 'unselectable') {
      return { text: 'Unavailable', disabled: true, color: '#ef4444' };
    }
    if (selected) {
      return { text: selected === 'selected' ? meal.name : selected, disabled: false, color: '#22c55e' };
    }
    return { text: 'Optional ' + meal.name, disabled: false, color: '#eab308' };
  }

  const fmtPrice = (p) => new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(p);

  if (dates.length === 0) {
    return <div className="text-center py-8 text-gray-400 text-sm">Select dates first to see meal options</div>;
  }

  return (
    <div className="overflow-x-auto mb-6" style={{ WebkitOverflowScrolling: 'touch' }}>
      {/* Kids rate notice */}
      <div className="text-center mb-4">
        <span style={{ color: '#dc2626', fontWeight: 'bold', fontSize: '0.875rem' }}>Special rates</span>
        <span className="text-sm text-gray-600"> for <strong>kids under 10</strong></span>
      </div>

      <table className="w-full border-separate" style={{ borderSpacing: '0 8px', minWidth: meals.length * 180 + 120 }}>
        <thead>
          <tr>
            <th className="text-left p-2 text-xs font-medium text-gray-500 w-28">Date</th>
            {meals.map((meal, mi) => (
              <th key={mi} className="text-center p-2" style={{ minWidth: 160 }}>
                <div className="flex items-center justify-center gap-1">
                  <span className="font-bold text-sm" style={{ color: '#1f2937' }}>{meal.name}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                </div>
                <div className="text-xs font-semibold mt-0.5" style={{ color: '#2563eb' }}>
                  Starting at {fmtPrice(meal.adultPrice)}/persons
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dates.map((date, di) => {
            const { label, sub } = formatDate(date, di);
            return (
              <tr key={di}>
                <td className="p-2 align-top">
                  <div className="text-sm font-medium text-gray-700">{label}</div>
                  {sub && <div className="text-xs text-gray-400">{sub}</div>}
                </td>
                {meals.map((meal, mi) => {
                  const bColor = barColor(di, mi);
                  const cell = cellDisplay(di, mi);
                  const state = cellState(meal, di);
                  const key = di + '-' + mi;
                  const hasTimeslots = meal.timeslots && meal.timeslots.length > 0;

                  return (
                    <td key={mi} className="p-1 align-top">
                      {/* Availability bar */}
                      <div className="w-full h-2 rounded-full mb-1" style={{ backgroundColor: bColor }} />

                      {state === 'unselectable' ? (
                        <div className="w-full px-2 py-2 rounded-lg text-sm text-gray-400 bg-gray-50 border border-gray-200">
                          Unavailable
                        </div>
                      ) : hasTimeslots && meal.timeslots.length > 1 ? (
                        <select
                          className="w-full px-2 py-2 rounded-lg text-sm border border-gray-200 bg-white cursor-pointer"
                          style={{ color: selections[key] ? '#1f2937' : '#9ca3af' }}
                          value={selections[key] || ''}
                          onChange={e => setSelections(prev => ({ ...prev, [key]: e.target.value || null }))}
                        >
                          <option value="">Optional {meal.name}</option>
                          {meal.timeslots.map((ts, ti) => {
                            const label2 = formatTime(ts.startTime || ts.start_time) + ' - ' + formatTime(ts.endTime || ts.end_time);
                            return <option key={ti} value={label2}>{label2}</option>;
                          })}
                        </select>
                      ) : (
                        <select
                          className="w-full px-2 py-2 rounded-lg text-sm border border-gray-200 bg-white cursor-pointer"
                          style={{ color: selections[key] ? '#1f2937' : '#9ca3af' }}
                          value={selections[key] || ''}
                          onChange={e => setSelections(prev => ({ ...prev, [key]: e.target.value || null }))}
                        >
                          <option value="">Optional {meal.name}</option>
                          <option value={defaultTimeslot(meal) || meal.name}>{defaultTimeslot(meal) || meal.name}</option>
                        </select>
                      )}
                    </td>
                  );
                })}
                <td className="p-1 align-top text-right">
                  <button
                    onClick={() => handleSelectAll(di)}
                    className="text-xs font-semibold whitespace-nowrap mt-3"
                    style={{ color: '#2563eb' }}
                  >
                    {selectAllState[di] ? 'Clear All' : 'Select All'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="text-right text-sm text-gray-500 mt-2">
        {selectedCount} meals selected for {adults || 0} adults
      </div>
    </div>
  );
}`;
}

// ────────────────────────────────────────────────────────────
// DateRangePicker — matches wilderness-edge-funnel.jsx exactly
// ────────────────────────────────────────────────────────────

function generateDateRangePickerComponent(): string {
  return `function DateRangePicker({ startDate, endDate, onStartDate, onEndDate }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [vy, setVY] = useState(today.getFullYear()), [vm, setVM] = useState(today.getMonth());
  const [hover, setHover] = useState(null), [selEnd, setSelEnd] = useState(!!startDate);
  const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'], MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const toDS = (y, m, d) => \`\${y}-\${String(m + 1).padStart(2, '0')}-\${String(d).padStart(2, '0')}\`;
  const pD = s => s ? new Date(s + 'T00:00:00') : null;
  const sD = pD(startDate), eD = pD(endDate);
  const nightCount = startDate && endDate ? Math.max(0, Math.round((new Date(endDate + 'T00:00:00').getTime() - new Date(startDate + 'T00:00:00').getTime()) / 86400000)) : 0;
  function click(ds) { const c = new Date(ds + 'T00:00:00'); if (c < today) return; if (!startDate || !selEnd) { onStartDate(ds); onEndDate(''); setSelEnd(true); } else { if (c <= sD) { onStartDate(ds); onEndDate(''); setSelEnd(true); } else { onEndDate(ds); setSelEnd(false); } } }
  function dayState(ds) { const d = new Date(ds + 'T00:00:00'), hD = hover ? new Date(hover + 'T00:00:00') : null; return { isPast: d < today, isStart: startDate === ds, isEnd: endDate === ds, inRange: startDate && endDate && sD && eD && d > sD && d < eD, inHover: startDate && !endDate && hD && selEnd && sD && d > sD && d < hD }; }
  const prev = () => { if (vm === 0) { setVY(y => y - 1); setVM(11); } else setVM(m => m - 1); };
  const next = () => { if (vm === 11) { setVY(y => y + 1); setVM(0); } else setVM(m => m + 1); };
  const m2 = vm === 11 ? 0 : vm + 1, y2 = vm === 11 ? vy + 1 : vy;
  const fmt = s => s ? new Date(s + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }) : null;

  function renderMonth(year, month) {
    const totalDays = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const cells = []; for (let i = 0; i < firstDay; i++) cells.push(null); for (let d = 1; d <= totalDays; d++) cells.push(d);
    return (
      <div className="flex-1 min-w-0">
        <div className="text-center font-bold text-sm mb-2" style={{ color: THEME.primary, fontFamily: THEME.serif }}>{MONTHS[month]} {year}</div>
        <div className="grid grid-cols-7 mb-1">{DAYS.map(d => <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wider py-0.5" style={{ color: THEME.outlineVariant }}>{d}</div>)}</div>
        <div className="grid grid-cols-7 gap-y-0.5">{cells.map((day, i) => {
          if (!day) return <div key={\`e-\${i}\`} />;
          const ds = toDS(year, month, day);
          const { isPast, isStart, isEnd, inRange, inHover } = dayState(ds);
          const isSel = isStart || isEnd, isIR = inRange || inHover;
          let bg = 'transparent', col = isPast ? THEME.outlineVariant : THEME.onSurface, fw = '500', br = '50%';
          if (isSel) { bg = THEME.primary; col = '#fff'; fw = '700'; } else if (isIR) { bg = \`\${THEME.primary}15\`; col = THEME.primary; br = '0'; }
          if (isStart && (inRange || inHover)) br = '50% 0 0 50%'; if (isEnd && inRange) br = '0 50% 50% 0';
          return <div key={ds} className="flex items-center justify-center" style={{ height: 34 }}><button disabled={isPast} onClick={() => click(ds)} onMouseEnter={() => { if (selEnd && startDate && !isPast) setHover(ds); }} onMouseLeave={() => setHover(null)} className="w-8 h-8 text-xs flex items-center justify-center disabled:cursor-not-allowed transition-colors" style={{ background: bg, color: col, fontWeight: fw, borderRadius: br, fontSize: 12 }}>{day}</button></div>;
        })}</div>
      </div>
    );
  }

  return (
    <div className="mb-5">
      <div className="grid grid-cols-2 gap-3 mb-4">{[{ l: 'Check-In', v: startDate }, { l: 'Check-Out', v: endDate }].map(({ l, v }) => <div key={l} className="p-3.5 rounded-2xl text-center" style={{ background: v ? \`\${THEME.primary}08\` : THEME.surfaceContainerLow, border: \`1.5px solid \${v ? THEME.primary : THEME.outlineVariant}\` }}><div className="text-[11px] font-bold uppercase tracking-[0.2em] mb-0.5" style={{ color: v ? THEME.primary : THEME.outline }}>{l}</div><div className="text-sm font-semibold" style={{ color: v ? THEME.onPrimaryContainer : THEME.outlineVariant, fontFamily: THEME.serif }}>{v ? fmt(v) : 'Select date'}</div></div>)}</div>
      <div className="rounded-[2rem] overflow-hidden" style={{ background: THEME.surfaceContainerLowest, border: \`1px solid \${THEME.surfaceContainerHigh}4D\`, boxShadow: '0 24px 40px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: \`1px solid \${THEME.surfaceContainerHigh}\` }}>
          <button onClick={prev} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100" style={{ color: THEME.outline }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg></button>
          <span className="font-bold text-base" style={{ color: THEME.onSurface, fontFamily: THEME.serif }}>{MONTHS[vm]} {vy}</span>
          <button onClick={next} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100" style={{ color: THEME.outline }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg></button>
        </div>
        <div className="flex gap-4 px-3 py-3">
          {renderMonth(vy, vm)}
          <div className="hidden sm:block w-px shrink-0" style={{ background: THEME.outlineVariant + '40' }} />
          <div className="hidden sm:flex flex-1 min-w-0">{renderMonth(y2, m2)}</div>
        </div>
        <div className="px-5 pb-3 text-center"><p className="text-xs" style={{ color: THEME.outlineVariant }}>{!startDate ? 'Tap to select your arrival date' : !endDate ? 'Now tap your departure date' : \`\${nightCount} night\${nightCount !== 1 ? 's' : ''} selected\`}</p></div>
      </div>
    </div>
  );
}`;
}

// ────────────────────────────────────────────────────────────
// GuestRooms — ImageCarousel, UniqueInventoryPicker, RoomCard
// Full implementation matching wilderness-edge-funnel.jsx
// ────────────────────────────────────────────────────────────

function generateGuestRoomsComponents(): string {
  return `function ImageCarousel({ images = [], alt = '' }) {
  const [index, setIndex] = useState(0);
  if (!images.length) return null;
  const single = images.length === 1;
  return (
    <div className="relative overflow-hidden group" style={{ height: '160px', background: THEME.surfaceContainerLow }}>
      <img src={images[index]?.url || images[index]} alt={\`\${alt} \${index + 1}\`} className="w-full h-full object-cover" loading="lazy" />
      {!single && (<>
        <button type="button" onClick={e => { e.stopPropagation(); setIndex(i => i === 0 ? images.length - 1 : i - 1); }}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: THEME.onSurface }}>‹</button>
        <button type="button" onClick={e => { e.stopPropagation(); setIndex(i => i === images.length - 1 ? 0 : i + 1); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: THEME.onSurface }}>›</button>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, i) => (
            <button key={i} type="button" onClick={e => { e.stopPropagation(); setIndex(i); }}
              className={\`w-2 h-2 rounded-full transition-all \${i === index ? 'bg-white scale-110 shadow' : 'bg-white/50'}\`} />
          ))}
        </div>
      </>)}
    </div>
  );
}

function UniqueInventoryPicker({ unitIndex, unit, uniqueStockItems = [], selectedUnitIds = new Set(), childParams = [], priceObj = {}, onChange }) {
  const ap = childParams.find(p => /adult/i.test(p.report_id) || /adult/i.test(p.name));
  const cp = childParams.find(p => /child/i.test(p.report_id) || /child/i.test(p.name));
  const adults = unit?.adults || [], kids = unit?.children || [];
  const aSurcharge = ap && priceObj[ap.report_id] ? calculateGroupPrice(priceObj[ap.report_id], adults.length) : 0;
  const cSurcharge = cp && priceObj[cp.report_id] ? calculateGroupPrice(priceObj[cp.report_id], kids.length) : 0;
  const iCls = "flex-1 min-w-0 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 border-none";
  return (
    <div className="space-y-4">
      {uniqueStockItems.length > 0 && (
        <select value={unit?.unitId || ''} onChange={e => onChange(unitIndex, { ...unit, unitId: e.target.value })}
          className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 border-none"
          style={{ background: THEME.surfaceContainerHigh, color: THEME.onSurface, '--tw-ring-color': THEME.primary }}>
          <option value="">Select room...</option>
          {uniqueStockItems.map(item => (
            <option key={item.id} value={item.id} disabled={selectedUnitIds.has(item.id) && unit?.unitId !== item.id}>{item.name}</option>
          ))}
        </select>
      )}
      {ap && (<div>
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: THEME.outline }}>
          {adults.length} / {ap.max || '∞'} {ap.name || 'Adults'}
          {aSurcharge > 0 && <span className="ml-1 normal-case font-normal" style={{ color: THEME.secondary }}>+{fmtCurrency(aSurcharge)}</span>}
        </div>
        <div className="space-y-2">
          {adults.map((a, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="text" value={a.name} onChange={e => { const n = adults.map((x, j) => j === i ? { ...x, name: e.target.value } : x); onChange(unitIndex, { ...unit, adults: n }); }}
                placeholder="Enter name" className={iCls} style={{ background: THEME.surfaceContainerHigh, color: THEME.onSurface }} />
              {adults.length > (ap.min || 0) && (
                <button type="button" onClick={() => onChange(unitIndex, { ...unit, adults: adults.filter((_, j) => j !== i) })}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-50" style={{ color: THEME.outline }}>×</button>
              )}
            </div>
          ))}
        </div>
        {adults.length < (ap.max || 99) && (
          <button type="button" onClick={() => onChange(unitIndex, { ...unit, adults: [...adults, { name: '' }] })}
            className="mt-2 w-full py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] rounded-full text-white hover:opacity-90 active:scale-[0.99]"
            style={{ background: THEME.primary }}>+ ADD {(ap.name || 'ADULT').toUpperCase()} TO QTY</button>
        )}
      </div>)}
      {cp && (<div>
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: THEME.outline }}>
          {kids.length} / {cp.max || '∞'} {cp.name || 'Children'}
          {cSurcharge > 0 && <span className="ml-1 normal-case font-normal" style={{ color: THEME.secondary }}>+{fmtCurrency(cSurcharge)}</span>}
        </div>
        <div className="space-y-2">
          {kids.map((c, i) => (
            <div key={i} className="space-y-1">
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                <input type="text" value={c.name} onChange={e => { const n = kids.map((x, j) => j === i ? { ...x, name: e.target.value } : x); onChange(unitIndex, { ...unit, children: n }); }}
                  placeholder="Enter child name" className={iCls} style={{ background: THEME.surfaceContainerHigh, color: THEME.onSurface }} />
                <input type="number" value={c.age || ''} onChange={e => { const n = kids.map((x, j) => j === i ? { ...x, age: parseInt(e.target.value) || 0 } : x); onChange(unitIndex, { ...unit, children: n }); }}
                  placeholder="Age" min={0} max={17}
                  className="w-14 sm:w-16 rounded-lg px-2 py-3 text-sm text-center focus:outline-none focus:ring-2 border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  style={{ background: THEME.surfaceContainerHigh, color: THEME.onSurface }} />
                {kids.length > (cp.min || 0) && (
                  <button type="button" onClick={() => onChange(unitIndex, { ...unit, children: kids.filter((_, j) => j !== i) })}
                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-50" style={{ color: THEME.outline }}>×</button>
                )}
              </div>
              <div className="flex items-center gap-2 pl-0.5">
                <input type="range" min={0} max={17} value={c.age || 0}
                  onChange={e => { const n = kids.map((x, j) => j === i ? { ...x, age: parseInt(e.target.value) || 0 } : x); onChange(unitIndex, { ...unit, children: n }); }}
                  className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ background: \`linear-gradient(to right, \${THEME.primary} \${((c.age || 0) / 17) * 100}%, \${THEME.outlineVariant} \${((c.age || 0) / 17) * 100}%)\` }} />
                <span className="text-xs w-8 text-right font-medium" style={{ color: THEME.outline }}>{c.age || 0}yr</span>
              </div>
            </div>
          ))}
        </div>
        {kids.length < (cp.max || 99) && (
          <button type="button" onClick={() => onChange(unitIndex, { ...unit, children: [...kids, { name: '', age: 0 }] })}
            className="mt-2 w-full py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] rounded-full text-white hover:opacity-90 active:scale-[0.99]"
            style={{ background: THEME.primary }}>+ ADD {(cp.name || 'CHILD').toUpperCase()} TO QTY</button>
        )}
      </div>)}
    </div>
  );
}

function RoomCard({ product, selection, onSelectionChange, availability }) {
  const [showDetails, setShowDetails] = useState(false);
  const [showInventory, setShowInventory] = useState(true);
  const tree = buildParameterTree(product);
  const invParam = (product.parameters || []).find(p => p.controls_inventory) || tree.roots[0];
  const childParams = invParam ? (tree.childrenOf[invParam.id] || []) : [];
  const qty = selection?.qty || 0, quantities = selection?.quantities || initQuantities(product), units = selection?.units || [];
  const maxQty = availability?.available_quantity ?? product.stock ?? (invParam?.max || 10);
  const totalAvail = availability?.total_available ?? product.stock ?? maxQty;
  const isUnavail = availability && availability.available === false;
  const hasUnique = !!(product.unique_inventory && product.unique_stock_items?.length > 0);
  const hasAC = childParams.some(p => (p.fields && p.fields.length > 0) || /adult/i.test(p.report_id) || /adult/i.test(p.name) || /child/i.test(p.report_id) || /child/i.test(p.name));
  const needsUnits = hasUnique || hasAC;
  const curPrice = availability?.price_for_dates != null ? parseFloat(availability.price_for_dates) : getBasePrice(product);
  const regPrice = getMaxPrice(product);
  const isSale = curPrice > 0 && regPrice > 0 && curPrice < regPrice;
  const images = product.images?.length > 0 ? product.images : (product.image ? [{ url: product.image }] : []);
  const tags = product.tags || [];
  const selUnitIds = new Set(units.filter(u => u?.unitId).map(u => u.unitId));
  const isSel = qty > 0;

  function handleQty(nq) {
    if (nq <= 0) { onSelectionChange(product.id, null); return; }
    const nQuant = { ...initQuantities(product) };
    if (invParam) nQuant[invParam.report_id] = clampQuantity(nq, invParam);
    if (selection?.quantities) { for (const c of childParams) { if (selection.quantities[c.report_id] != null) nQuant[c.report_id] = selection.quantities[c.report_id]; } }
    let nu = [...(selection?.units || [])];
    if (needsUnits) {
      while (nu.length < nq) {
        const ap = childParams.find(p => /adult/i.test(p.report_id) || /adult/i.test(p.name));
        const cp = childParams.find(p => /child/i.test(p.report_id) || /child/i.test(p.name));
        nu.push({ unitId: '', adults: ap ? Array.from({ length: ap.min || 1 }, () => ({ name: '' })) : [], children: cp ? Array.from({ length: cp.min || 0 }, () => ({ name: '', age: 0 })) : [] });
      }
      while (nu.length > nq) nu.pop();
    }
    onSelectionChange(product.id, { qty: nq, quantities: nQuant, units: nu });
  }

  function handleUnit(idx, u) {
    const nu = units.map((x, i) => i === idx ? u : x);
    const nq = { ...quantities };
    for (const c of childParams) {
      if (/adult/i.test(c.report_id) || /adult/i.test(c.name)) nq[c.report_id] = nu.reduce((s, x) => s + (x.adults?.length || 0), 0);
      if (/child/i.test(c.report_id) || /child/i.test(c.name)) nq[c.report_id] = nu.reduce((s, x) => s + (x.children?.length || 0), 0);
    }
    onSelectionChange(product.id, { ...selection, quantities: nq, units: nu });
  }

  return (
    <div className="overflow-hidden transition-all duration-200" style={{
      background: THEME.surfaceContainerLowest, borderRadius: '2rem',
      border: \`2px solid \${isSel ? THEME.primary : THEME.surfaceContainerHigh + '4D'}\`,
      boxShadow: isSel ? '0 8px 32px rgba(0,0,0,0.12)' : '0 24px 40px rgba(0,0,0,0.04)',
      opacity: isUnavail ? 0.5 : 1,
    }}>
      <div className="relative">
        <ImageCarousel images={images} alt={product.name} />
        {curPrice != null && (
          <div className="absolute top-3 right-3 px-3 py-1.5 rounded-xl font-bold text-sm text-white"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
            {fmtCurrency(curPrice)} <span className="font-normal text-xs opacity-80">CAD/night</span>
          </div>
        )}
        {isSel && (
          <div className="absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: THEME.primary, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
        )}
        {isSale && (
          <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg text-xs font-bold"
            style={{ background: THEME.secondaryContainer, color: THEME.secondary }}>SALE — was {fmtCurrency(regPrice)}</div>
        )}
        {!isUnavail && totalAvail > 0 && totalAvail <= 5 && (
          <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg text-xs font-bold"
            style={{ background: THEME.secondaryContainer, color: THEME.secondary }}>Only {totalAvail} left!</div>
        )}
      </div>
      <div className="p-4" style={{ background: isSel ? THEME.primary + '08' : 'transparent' }}>
        <div className="font-bold text-base leading-tight mb-2" style={{ color: THEME.onSurface, fontFamily: THEME.serif }}>{product.name}</div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {tags.slice(0, 5).map(t => (
              <span key={t.id || t.name || t} className="text-[11px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider"
                style={{ background: THEME.surfaceContainerHigh, color: THEME.primary }}>{t.name || t}</span>
            ))}
          </div>
        )}
        {(product.details || product.description) && (
          <button type="button" onClick={() => setShowDetails(!showDetails)}
            className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2 flex items-center gap-1" style={{ color: THEME.secondary }}>
            Details {showDetails ? '▾' : '›'}
          </button>
        )}
        {showDetails && product.details && <SafeHtml html={product.details} className="mb-3" />}
        {showDetails && !product.details && product.description && (
          <p className="text-xs mb-3 leading-relaxed" style={{ color: THEME.outline }}>{product.description}</p>
        )}
        {!isUnavail && maxQty != null && (
          <div className="mb-3 flex items-center gap-1.5">
            <span className={\`w-1.5 h-1.5 rounded-full \${maxQty > 3 ? 'bg-green-500' : maxQty > 0 ? 'bg-amber-500' : 'bg-red-500'}\`} />
            <span className="text-xs" style={{ color: THEME.outline }}>{maxQty}/{totalAvail} Available</span>
          </div>
        )}
        {isUnavail && <div className="text-xs font-medium py-1 mb-2" style={{ color: THEME.error }}>Not available for selected dates</div>}
        <div className="pt-3" style={{ borderTop: \`1px solid \${THEME.outlineVariant}40\` }}>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] mb-3 text-center" style={{ color: THEME.outline }}>Rooms</p>
          <CompactQtyPicker value={qty} onChange={handleQty} min={0} max={isUnavail ? 0 : maxQty} />
        </div>
      </div>
      {qty > 0 && needsUnits && (
        <div className="px-4 pb-2">
          <button type="button" onClick={() => setShowInventory(!showInventory)}
            className="w-full py-2 text-[11px] font-bold uppercase tracking-[0.2em] rounded-full hover:bg-gray-50 transition-colors"
            style={{ border: \`1px solid \${THEME.outlineVariant}\`, color: THEME.outline }}>
            {showInventory ? 'Hide Inventory' : 'Show Inventory'}
          </button>
        </div>
      )}
      {qty > 0 && needsUnits && showInventory && (
        <div style={{ borderTop: \`1px solid \${THEME.outlineVariant}40\` }}>
          {units.map((u, i) => (
            <div key={i} className="p-4" style={{ borderBottom: i < units.length - 1 ? \`1px solid \${THEME.surfaceContainerHigh}\` : 'none' }}>
              {units.length > 1 && <div className="text-[11px] font-bold uppercase tracking-[0.2em] mb-3" style={{ color: THEME.outline }}>Room {i + 1} of {units.length}</div>}
              <UniqueInventoryPicker unitIndex={i} unit={u}
                uniqueStockItems={hasUnique ? (product.unique_stock_items || []) : []}
                selectedUnitIds={selUnitIds} childParams={childParams}
                priceObj={product.price || {}} onChange={handleUnit} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}`;
}

// ────────────────────────────────────────────────────────────
// SegmentPicker — M3-styled option cards with branching
// ────────────────────────────────────────────────────────────

function generateSegmentPickerComponent(): string {
  return `function SegmentPicker({ options = [], selected, onSelect, allowMultiple = false, selectedMulti = [], onSelectMulti }) {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const handleClick = (opt) => {
    if (allowMultiple && onSelectMulti) {
      const exists = selectedMulti.includes(opt.id);
      onSelectMulti(exists ? selectedMulti.filter(id => id !== opt.id) : [...selectedMulti, opt.id]);
    } else {
      onSelect(opt);
    }
  };
  return (
    <div className="space-y-2.5">
      {options.map((opt, idx) => {
        const isSel = allowMultiple ? selectedMulti.includes(opt.id) : selected === opt.id;
        return (
          <button key={opt.id} type="button" onClick={() => handleClick(opt)}
            className="w-full flex items-center gap-3.5 p-4 rounded-[1.5rem] text-left transition-all hover:shadow-md active:scale-[0.99]"
            style={{
              background: isSel ? \`\${THEME.primary}08\` : THEME.surfaceContainerLowest,
              border: \`2px solid \${isSel ? THEME.primary : THEME.surfaceContainerHigh + '4D'}\`,
              boxShadow: isSel ? '0 8px 32px rgba(0,0,0,0.08)' : '0 2px 8px rgba(0,0,0,0.03)',
            }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: isSel ? THEME.primary : \`\${THEME.primary}12\`, color: isSel ? '#fff' : THEME.primary }}>
              {letters[idx] || idx + 1}
            </div>
            {opt.icon && <span className="text-2xl shrink-0">{opt.icon}</span>}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm" style={{ color: isSel ? THEME.primary : THEME.onSurface, fontFamily: THEME.serif }}>{opt.label}</div>
              {opt.description && <div className="text-xs mt-0.5" style={{ color: THEME.outline }}>{opt.description}</div>}
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isSel ? THEME.primary : THEME.outlineVariant} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        );
      })}
    </div>
  );
}`;
}

// ────────────────────────────────────────────────────────────
// Main funnel component
// ────────────────────────────────────────────────────────────

function generateMainFunnel(
  funnel: FunnelDefinition,
  catInfo: CategoryInfo,
  usedTemplates: Set<string>,
): string {
  let componentName = funnel.name
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("")
    + "Funnel";
  // JS identifiers can't start with a number — prefix with "The" if needed
  if (/^[0-9]/.test(componentName)) {
    componentName = "The" + componentName;
  }

  const stepNames = funnel.steps.map((s) => s.id);
  const hasRooms = usedTemplates.has("guest-rooms");
  const hasMeals = usedTemplates.has("meal-picker");
  const hasActivities = usedTemplates.has("activity-picker");
  const hasContactForm = usedTemplates.has("contact-form");
  const hasInvoice = usedTemplates.has("invoice");
  const hasDatePicker = usedTemplates.has("date-picker");
  const hasGuestCounter = usedTemplates.has("guest-counter");

  const lines: string[] = [];

  lines.push(`export default function ${componentName}() {`);

  // --- apiRef and state ---
  lines.push(`  const apiRef = useRef(null);`);
  lines.push(`  const [step, setStep] = useState('${stepNames[0] || "welcome"}');`);
  lines.push(`  const [loading, setLoading] = useState(true);`);
  lines.push(`  const [error, setError] = useState(null);`);
  lines.push(`  const [submitting, setSubmitting] = useState(false);`);
  lines.push(`  const [sdkReady, setSdkReady] = useState(false);`);
  lines.push(`  const [bookingRef, setBookingRef] = useState(null);`);
  lines.push(`  const [animating, setAnimating] = useState(false);`);

  if (hasRooms) {
    lines.push(`  const [roomProducts, setRoomProducts] = useState([]);`);
    lines.push(`  const [roomSelections, setRoomSelections] = useState({});`);
    lines.push(`  const [availability, setAvailability] = useState({});`);
    lines.push(`  const [checkingAvail, setCheckingAvail] = useState(false);`);
  }
  if (hasMeals) {
    lines.push(`  const [mealProducts, setMealProducts] = useState([]);`);
    lines.push(`  const [mealMeetingProducts, setMealMeetingProducts] = useState([]);`);
    lines.push(`  const [selectedMeals, setSelectedMeals] = useState({});`);
    lines.push(`  const [selectedMeetingMeals, setSelectedMeetingMeals] = useState({});`);
  }
  if (hasActivities) {
    lines.push(`  const [activityProducts, setActivityProducts] = useState([]);`);
    lines.push(`  const [selectedActivities, setSelectedActivities] = useState({});`);
  }
  if (hasDatePicker) {
    lines.push(`  const [startDate, setStartDate] = useState('');`);
    lines.push(`  const [endDate, setEndDate] = useState('');`);
  }
  if (hasGuestCounter) {
    // Check for default values from config
    const guestWidget = findWidgetByTemplate(funnel, "guest-counter");
    const defaultAdults = (guestWidget?.config as Record<string, unknown>)?.defaultAdults as number || 2;
    lines.push(`  const [adults, setAdults] = useState(${defaultAdults});`);
    lines.push(`  const [children, setChildren] = useState(0);`);
    lines.push(`  const [childAges, setChildAges] = useState([]);`);
  }
  if (hasContactForm) {
    lines.push(`  const [contact, setContact] = useState({ first_name: '', last_name: '', email: '', phone: '', company: '', notes: '', gdprAccepted: false });`);
  }
  if (usedTemplates.has("segment-picker")) {
    lines.push(`  const [selectedSegment, setSelectedSegment] = useState(null);`);
    lines.push(`  const [selectedSegments, setSelectedSegments] = useState([]);`);
  }
  // Option-picker state — one state variable per option-picker widget instance
  if (usedTemplates.has("option-picker")) {
    for (const step of funnel.steps) {
      for (const widget of step.widgets) {
        if (widget.templateId === "option-picker") {
          const stateKey = `optPick_${widget.instanceId.slice(-6)}`;
          const capitalized = stateKey.charAt(0).toUpperCase() + stateKey.slice(1);
          if (widget.config.multiSelect) {
            lines.push(`  const [${stateKey}, set${capitalized}] = useState([]);`);
          } else {
            lines.push(`  const [${stateKey}, set${capitalized}] = useState(null);`);
          }
        }
      }
    }
  }
  // Category-picker state — one state variable per category-picker widget instance
  if (usedTemplates.has("category-picker")) {
    for (const step of funnel.steps) {
      for (const widget of step.widgets) {
        if (widget.templateId === "category-picker") {
          const stateKey = `catPick_${widget.instanceId.slice(-6)}`;
          const capitalized = stateKey.charAt(0).toUpperCase() + stateKey.slice(1);
          lines.push(`  const [${stateKey}, set${capitalized}] = useState([]);`);
        }
      }
    }
  }
  lines.push(``);

  // --- Rich-text style injection (matches wilderness-edge-funnel.jsx) ---
  lines.push(`  useEffect(() => { const id = 'funnel-rich-text-styles'; if (document.getElementById(id)) return; const s = document.createElement('style'); s.id = id; s.textContent = \`.we-rich-text{font-size:12px;line-height:1.6;color:\${THEME.outline}}.we-rich-text ul{list-style:disc;padding-left:1.2em;margin:4px 0}.we-rich-text p{margin:4px 0}.we-rich-text strong{font-weight:700;color:\${THEME.onSurface}}.we-rich-text a{color:\${THEME.primary};text-decoration:underline}\`; document.head.appendChild(s); }, []);`);
  lines.push(``);

  // --- Animation helper (matches wilderness-edge-funnel.jsx) ---
  lines.push(`  const animRef = useRef(null);`);
  lines.push(`  const goTo = useCallback(ns => { if (animRef.current) clearTimeout(animRef.current); setAnimating(true); animRef.current = setTimeout(() => { setStep(ns); setAnimating(false); setError(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }, 180); }, []);`);
  lines.push(`  useEffect(() => () => { if (animRef.current) clearTimeout(animRef.current); }, []);`);
  lines.push(``);

  // --- SDK init effect (matches wilderness-edge-funnel.jsx pattern exactly) ---
  lines.push(`  useEffect(() => { (async () => {`);
  lines.push(`    if (!window.__EverybookingAPI) { setError('Booking system unavailable.'); setLoading(false); return; }`);
  lines.push(`    apiRef.current = window.__EverybookingAPI;`);
  lines.push(`    try {`);
  lines.push(`      await apiRef.current.ready();`);
  lines.push(`      const cats = await apiRef.current.getCategories();`);

  // Category-based product fetching — always use .find(c => c.id === ID)?.products
  if (hasRooms) {
    if (catInfo.roomCatIds.length === 1) {
      lines.push(`      setRoomProducts(cats.find(c => c.id === ${catInfo.roomCatIds[0]})?.products || []);`);
    } else if (catInfo.roomCatIds.length > 1) {
      lines.push(`      setRoomProducts([${catInfo.roomCatIds.map(id => `...(cats.find(c => c.id === ${id})?.products || [])`).join(", ")}]);`);
    } else {
      lines.push(`      console.warn('[Funnel] No categoryId configured for rooms');`);
      lines.push(`      setRoomProducts([]);`);
    }
  }
  if (hasMeals) {
    if (catInfo.mealCatIds.length === 1) {
      lines.push(`      setMealProducts(cats.find(c => c.id === ${catInfo.mealCatIds[0]})?.products || []);`);
    } else if (catInfo.mealCatIds.length > 1) {
      lines.push(`      setMealProducts([${catInfo.mealCatIds.map(id => `...(cats.find(c => c.id === ${id})?.products || [])`).join(", ")}]);`);
    } else {
      lines.push(`      setMealProducts([]);`);
    }
  }
  // Meeting meal products — use configured category ID from widget config
  if (catInfo.meetingMealCatIds.length > 0) {
    const meetingMealCatId = catInfo.meetingMealCatIds[0];
    lines.push(`      setMealMeetingProducts(cats.find(c => c.id === ${meetingMealCatId})?.products || []);`);
  } else {
    lines.push(`      setMealMeetingProducts([]);`);
  }

  if (hasActivities) {
    if (catInfo.activityCatIds.length === 1) {
      lines.push(`      setActivityProducts(cats.find(c => c.id === ${catInfo.activityCatIds[0]})?.products || []);`);
    } else if (catInfo.activityCatIds.length > 1) {
      lines.push(`      setActivityProducts([${catInfo.activityCatIds.map(id => `...(cats.find(c => c.id === ${id})?.products || [])`).join(", ")}]);`);
    } else {
      lines.push(`      setActivityProducts([]);`);
    }
  }

  lines.push(`      setSdkReady(true);`);
  lines.push(`    } catch (e) { console.error('[init]', e); setError('Failed to load. Please refresh.'); }`);
  lines.push(`    finally { setLoading(false); }`);
  lines.push(`  })(); }, []);`);
  lines.push(``);

  // --- Nights calculation ---
  if (hasDatePicker) {
    lines.push(`  const nights = useMemo(() => { if (!startDate || !endDate) return 0; return Math.max(0, (new Date(endDate) - new Date(startDate)) / 86400000); }, [startDate, endDate]);`);
    lines.push(``);
  }

  // --- childAges sync effect ---
  if (hasGuestCounter) {
    lines.push(`  useEffect(() => { setChildAges(p => { const n = [...p]; while (n.length < children) n.push(8); return n.slice(0, children); }); }, [children]);`);
    lines.push(``);
  }

  // --- Availability check for rooms ---
  if (hasRooms && hasDatePicker) {
    const roomStepId = findStepIdForTemplate(funnel, "guest-rooms");
    lines.push(`  useEffect(() => { if (step !== '${roomStepId}' || !startDate || roomProducts.length === 0 || !apiRef.current) return; setCheckingAvail(true); Promise.all(roomProducts.map(async p => { try { return [p.id, await apiRef.current.getAvailability(p.id, { startDate, endDate: endDate || startDate })]; } catch { return [p.id, { available: true, unlimited: true }]; } })).then(r => { setAvailability(Object.fromEntries(r)); setCheckingAvail(false); }); }, [step, startDate, endDate, roomProducts]);`);
    lines.push(``);
  }

  // --- Room change handler ---
  if (hasRooms) {
    lines.push(`  function handleRoomChange(pid, data) { setRoomSelections(p => { const n = { ...p }; if (data === null) delete n[pid]; else n[pid] = data; return n; }); }`);
    lines.push(`  const selRoomCount = Object.values(roomSelections).reduce((s, v) => s + (v?.qty || 0), 0);`);
    lines.push(``);
  }

  // --- handleGenerateInvoice ---
  if (hasInvoice) {
    lines.push(`  async function handleGenerateInvoice() {`);
    if (hasDatePicker) {
      lines.push(`    if (!startDate || !endDate) { setError('Please select dates.'); return; }`);
    }
    if (hasContactForm) {
      lines.push(`    if (!contact.first_name || !contact.email || !contact.phone) { setError('Please fill in required fields.'); return; }`);
    }
    lines.push(`    const api = apiRef.current; if (!api) { setError('Booking system unavailable.'); return; }`);
    lines.push(`    setSubmitting(true); setError(null);`);
    lines.push(`    try {`);
    lines.push(`      const products = [];`);

    if (hasRooms) {
      lines.push(`      roomProducts.forEach(product => { const sel = roomSelections[product.id]; if (!sel || sel.qty <= 0) return; const q = { ...initQuantities(product), ...sel.quantities }; (product.parameters || []).forEach(p => { if (p.controls_inventory) q[p.report_id] = clampQuantity(sel.qty, p); }); const hi = (product.parameters || []).some(p => p.controls_inventory); if (!hi) { buildParameterTree(product).roots.forEach(r => { q[r.report_id] = sel.qty; }); } const e = { sku: product.sku, startDate, endDate: endDate || startDate, quantities: q, bookingUnit: product.booking_unit }; if (sel.units?.length > 0) e.units = sel.units.map(u => ({ unitId: u.unitId, adults: u.adults || [], children: u.children || [] })); products.push(e); });`);
    }
    if (hasMeals) {
      const hasChildAges = hasGuestCounter;
      lines.push(`      Object.entries(selectedMeals).forEach(([id, qty]) => { if (qty <= 0) return; const p = mealProducts.find(m => m.id === parseInt(id)); if (p) products.push(...buildProductEntries(p, qty, startDate, endDate${hasChildAges ? ", childAges" : ""})); });`);
    }
    if (hasActivities) {
      const hasChildAges = hasGuestCounter;
      lines.push(`      Object.entries(selectedActivities).forEach(([id, qty]) => { if (qty <= 0) return; const p = activityProducts.find(a => a.id === parseInt(id)); if (p) products.push(...buildProductEntries(p, qty, startDate, endDate${hasChildAges ? ", childAges" : ""})); });`);
    }

    lines.push(`      if (products.length === 0) { setError('Please select at least one item.'); setSubmitting(false); return; }`);
    lines.push(`      await api.syncBooking({`);
    lines.push(`        products,`);
    if (hasContactForm) {
      lines.push(`        customerInfo: { first_name: contact.first_name, last_name: contact.last_name, email: contact.email, phone: contact.phone },`);
    }
    lines.push(`      });`);
    lines.push(`      await api.generateInvoice();`);
    lines.push(`      goTo('${findStepIdForTemplate(funnel, "invoice")}');`);
    lines.push(`    } catch (e) { console.error('[invoice]', e); setError('Failed to generate quote.'); }`);
    lines.push(`    finally { setSubmitting(false); }`);
    lines.push(`  }`);
    lines.push(``);

    // --- handleComplete ---
    lines.push(`  async function handleComplete() { const api = apiRef.current; if (!api) { setError('Booking system unavailable.'); return; } setSubmitting(true); setError(null); try { const r = await api.completeBooking(); setBookingRef(r.booking_reference || r.booking_id || 'REF-' + Date.now()); goTo('confirmation'); } catch (e) { console.error('[complete]', e); setError('Failed to complete booking.'); } finally { setSubmitting(false); } }`);
    lines.push(``);
  }

  // --- Progress calculation (matches wilderness-edge-funnel.jsx pattern) ---
  const stepLabels = funnel.steps.map(s => `'${escapeJsString(deriveStepLabel(s))}'`);
  lines.push(`  const progressSteps = [${stepLabels.join(", ")}];`);
  lines.push(`  const stepOrder = [${stepNames.map((s) => `'${s}'`).join(", ")}];`);
  lines.push(`  const currentIdx = stepOrder.indexOf(step);`);
  lines.push(`  const pPct = stepOrder.length > 1 && currentIdx >= 0 ? Math.min(100, Math.round((currentIdx / (stepOrder.length - 1)) * 100)) : 0;`);
  lines.push(``);

  // --- inputCls for contact form ---
  if (hasContactForm) {
    lines.push(`  const inputCls = \`w-full rounded-lg px-4 py-4 focus:outline-none focus:ring-2 transition-all text-base border-none\`;`);
    lines.push(``);
  }

  // --- Meal filtering (adult vs kids meals) ---
  if (hasMeals) {
    lines.push(`  const adultMeals = useMemo(() => mealProducts.filter(m => { const pr = Object.values(m.price || {})?.[0]?.base_price; return pr && pr > 0 && !(m.parameters || []).some(p => p.report_id === 'childage') && (m.parameters || []).length <= 1; }).slice(0, 10), [mealProducts]);`);
    lines.push(`  const kidsMeals = useMemo(() => mealProducts.filter(m => (m.parameters || []).some(p => p.report_id === 'childage')), [mealProducts]);`);
    lines.push(``);
  }

  // --- Loading state ---
  lines.push(`  if (loading) return <div className="min-h-[60vh] flex items-center justify-center" style={{ background: THEME.surface, fontFamily: THEME.sans }}><div className="text-center"><div className="w-12 h-12 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderWidth: '3px', borderStyle: 'solid', borderColor: THEME.primary, borderTopColor: 'transparent' }} /><p style={{ fontFamily: THEME.serif, color: THEME.primary }} className="font-semibold text-lg">Loading...</p></div></div>;`);
  lines.push(``);

  // --- Render ---
  lines.push(`  return (`);
  lines.push(`    <div className="min-h-screen" style={{ background: GRADIENT_BG, fontFamily: THEME.sans }}>`);

  // Header + progress bar
  lines.push(`      <div className="sticky top-0 z-40" style={{ background: 'rgba(255,255,255,0.90)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>`);
  lines.push(`        <div className="max-w-2xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-center">`);
  lines.push(`          <span className="text-xl font-bold italic" style={{ fontFamily: THEME.serif, color: THEME.primary }}>${escapeJsx(funnel.name)}</span>`);
  lines.push(`        </div>`);
  lines.push(`        {step !== 'confirmation' && step !== '${findStepIdForTemplate(funnel, "invoice")}' && progressSteps.length > 0 && (`);
  lines.push(`          <div className="h-1 w-full" style={{ background: THEME.surfaceContainerHigh }}><div className="h-full transition-all duration-500" style={{ width: \`\${pPct}%\`, background: THEME.primary }} /></div>`);
  lines.push(`        )}`);
  lines.push(`      </div>`);

  // Error banner
  lines.push(`      {error && <div className="max-w-2xl lg:max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-4"><div className="p-4 rounded-2xl text-sm flex items-center gap-2" style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: THEME.error }}><span>⚠</span><span className="flex-1">{error}</span><button onClick={() => setError(null)} className="ml-auto font-bold opacity-60 hover:opacity-100">✕</button></div></div>}`);

  // Animation wrapper
  lines.push(`      <div className={\`transition-opacity duration-200 \${animating ? 'opacity-0' : 'opacity-100'}\`}>`);
  lines.push(``);

  // --- Step rendering ---
  for (let i = 0; i < funnel.steps.length; i++) {
    const step = funnel.steps[i];
    const prevStepId = i > 0 ? funnel.steps[i - 1].id : null;
    // Determine next step: explicit navigation.next > default next in list
    let nextStepId = step.navigation.next || (i < funnel.steps.length - 1 ? funnel.steps[i + 1].id : null);
    const hasConditionalNav = step.navigation.conditionalNext && step.navigation.conditionalNext.length > 0;
    const widgetTemplates = step.widgets.map((w) => w.templateId);

    lines.push(`        {step === '${step.id}' && (`);

    if (widgetTemplates.includes("invoice")) {
      // Invoice step — matches wilderness-edge-funnel.jsx invoice step
      const invoiceCfg = step.widgets.find((w) => w.templateId === "invoice")?.config as Record<string, unknown> | undefined;
      const currency = (invoiceCfg?.currency as string) || "CAD";

      lines.push(`          <div className="max-w-2xl lg:max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">`);
      lines.push(`            <div className="mb-6">`);
      lines.push(`              <div className="mb-3 text-[0.7rem] font-bold uppercase tracking-[0.2em]" style={{ color: THEME.secondary }}>YOUR QUOTE</div>`);
      lines.push(`              <h2 className="text-2xl lg:text-3xl font-bold" style={{ fontFamily: THEME.serif, color: THEME.onSurface }}>Your <em style={{ color: THEME.primary, fontStyle: 'italic' }}>Personalized</em> Quote</h2>`);
      lines.push(`              <p className="text-sm mt-1" style={{ color: THEME.outline }}>All taxes included</p>`);
      lines.push(`            </div>`);
      lines.push(`            <InvoiceWidget`);
      lines.push(`              sessionId={apiRef.current?.getSessionId()}`);
      lines.push(`              currencyId="${currency}"`);
      lines.push(`              className="rounded-[2rem] p-6 mb-5"`);
      lines.push(`              itemClassName="flex justify-between items-center py-3 border-b text-sm last:border-0"`);
      lines.push(`              loadingClassName="flex items-center justify-center py-10"`);
      lines.push(`            />`);
      lines.push(`            <TFButton onClick={handleComplete} loading={submitting} loadingText="Securing Your Booking...">CONFIRM & SECURE MY BOOKING</TFButton>`);
      lines.push(`          </div>`);
    } else {
      // Normal step — use TypeformStep
      const isWide = widgetTemplates.includes("guest-rooms") || widgetTemplates.includes("activity-picker");
      const stepNum = String(i + 1).padStart(2, "0");
      const stepLabel = deriveStepLabel(step);

      // Build title as [before, italic, after] array for TypeformStep
      const titleParts = buildTitleParts(step.title);

      lines.push(`          <TypeformStep stepNum="${stepNum}" stepLabel="${escapeJsx(stepLabel)}" title={${titleParts}} ${isWide ? "wide" : ""}>`);

      // Render each widget
      for (const widget of step.widgets) {
        lines.push(generateWidgetInStep(widget, funnel, step, prevStepId, nextStepId));
      }

      // Bottom navigation
      const isLastBeforeInvoice = nextStepId && funnel.steps.find((s) => s.id === nextStepId)?.widgets.some((w) => w.templateId === "invoice");
      const isContactStep = widgetTemplates.includes("contact-form");

      if (isContactStep && isLastBeforeInvoice) {
        lines.push(`            <BottomNav`);
        if (prevStepId) lines.push(`              onBack={() => goTo('${prevStepId}')}`);
        lines.push(`              onNext={handleGenerateInvoice}`);
        lines.push(`              nextLabel="${escapeJsx(step.navigation.nextLabel || "Generate My Quote")}"`);
        lines.push(`              loading={submitting}`);
        lines.push(`              loadingText="Generating Your Quote..."`);
        lines.push(`            />`);
      } else {
        lines.push(`            <BottomNav`);
        if (prevStepId) lines.push(`              onBack={() => goTo('${prevStepId}')}`);
        if (nextStepId) {
          // Add validation logic before advancing
          if (widgetTemplates.includes("guest-rooms")) {
            lines.push(`              onNext={() => { if (selRoomCount === 0) { setError('Select at least one room.'); return; } goTo('${nextStepId}'); }}`);
          } else if (widgetTemplates.includes("date-picker")) {
            lines.push(`              onNext={() => { if (!startDate || !endDate) { setError('Please select both dates.'); return; } goTo('${nextStepId}'); }}`);
          } else if (widgetTemplates.includes("segment-picker")) {
            lines.push(`              onNext={() => { if (!selectedSegment) { setError('Please select an option.'); return; } goTo('${nextStepId}'); }}`);
          } else if (hasConditionalNav) {
            // Generate conditional navigation function
            const condRules = step.navigation.conditionalNext!;
            const condLines: string[] = [];
            condLines.push(`              onNext={() => {`);
            for (const rule of condRules) {
              if (rule.operator === "equals") {
                condLines.push(`                if (selectedSegment === '${escapeJsx(rule.value)}') { goTo('${rule.targetStepId}'); return; }`);
              } else if (rule.operator === "not_equals") {
                condLines.push(`                if (selectedSegment !== '${escapeJsx(rule.value)}') { goTo('${rule.targetStepId}'); return; }`);
              } else if (rule.operator === "contains") {
                condLines.push(`                if (selectedSegment && selectedSegment.includes('${escapeJsx(rule.value)}')) { goTo('${rule.targetStepId}'); return; }`);
              }
            }
            condLines.push(`                goTo('${nextStepId}');`);
            condLines.push(`              }}`);
            lines.push(condLines.join("\n"));
          } else {
            lines.push(`              onNext={() => goTo('${nextStepId}')}`);
          }
        }
        lines.push(`              nextLabel="${escapeJsx(step.navigation.nextLabel || "Continue")}"`);
        lines.push(`            />`);
      }

      lines.push(`          </TypeformStep>`);
    }

    lines.push(`        )}`);
    lines.push(``);
  }

  // --- Confirmation step (always append, matches wilderness-edge-funnel.jsx) ---
  lines.push(`        {step === 'confirmation' && (`);
  lines.push(`          <div className="max-w-2xl lg:max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">`);
  lines.push(`            <div className="p-6" style={{ background: THEME.surfaceContainerLowest, borderRadius: '2rem', border: \`1px solid \${THEME.surfaceContainerHigh}4D\`, boxShadow: '0 24px 40px rgba(0,0,0,0.04)' }}>`);
  lines.push(`              <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: THEME.serif, color: THEME.onSurface }}>Booking <em style={{ color: THEME.primary, fontStyle: 'italic' }}>Confirmed!</em></h2>`);
  lines.push(`              {bookingRef && (`);
  lines.push(`                <div className="my-3 p-3 rounded-2xl flex items-center gap-2" style={{ background: \`\${THEME.primary}08\`, border: \`1px solid \${THEME.primary}20\` }}>`);
  lines.push(`                  <span className="font-bold text-sm" style={{ color: THEME.primary }}>Reference:</span>`);
  lines.push(`                  <span className="font-mono font-bold text-sm" style={{ color: THEME.onPrimaryContainer }}>{bookingRef}</span>`);
  lines.push(`                </div>`);
  lines.push(`              )}`);
  lines.push(`              <p className="text-sm" style={{ color: THEME.onSurfaceVariant }}>Thank you! We'll be in touch soon.</p>`);
  lines.push(`              <div className="text-[11px] font-bold uppercase tracking-[0.2em] mb-3 mt-5 flex items-center gap-2" style={{ color: THEME.secondary }}><span className="inline-block w-4 h-px" style={{ background: THEME.secondary }} /> What happens next</div>`);
  lines.push(`              <ul className="space-y-3">`);
  lines.push(`                {['Confirmation email with your quote and booking details', 'Your team will reach out within 1–2 business days'].map((tx, i) => (`);
  lines.push(`                  <li key={i} className="flex items-start gap-3 text-sm p-3 rounded-xl" style={{ background: THEME.surfaceContainerLow, color: THEME.onSurfaceVariant }}>`);
  lines.push(`                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: THEME.surfaceContainerHigh, color: THEME.primary }}>{i + 1}</span>`);
  lines.push(`                    <span>{tx}</span>`);
  lines.push(`                  </li>`);
  lines.push(`                ))}`);
  lines.push(`              </ul>`);
  lines.push(`            </div>`);
  lines.push(`          </div>`);
  lines.push(`        )}`);
  lines.push(``);

  lines.push(`      </div>`);
  lines.push(`    </div>`);
  lines.push(`  );`);
  lines.push(`}`);

  return lines.join("\n");
}

// ────────────────────────────────────────────────────────────
// Per-widget rendering inside a step
// ────────────────────────────────────────────────────────────

function generateWidgetInStep(
  widget: WidgetInstance,
  funnel: FunnelDefinition,
  _step: Step,
  _prevStepId: string | null,
  _nextStepId: string | null,
): string {
  const cfg = widget.config as Record<string, unknown>;

  switch (widget.templateId) {
    case "date-picker":
      return [
        `            <DateRangePicker startDate={startDate} endDate={endDate} onStartDate={setStartDate} onEndDate={setEndDate} />`,
        `            {nights > 0 && <div className="mb-5 p-3.5 rounded-2xl flex items-center gap-2.5 text-sm font-semibold" style={{ background: \`\${THEME.primary}08\`, border: \`1px solid \${THEME.primary}20\`, color: THEME.onPrimaryContainer }}><strong>{nights}</strong> night{nights !== 1 ? 's' : ''} selected</div>}`,
      ].join("\n");

    case "guest-counter": {
      const maxAdults = (cfg.maxAdults as number) || 400;
      const maxChildren = (cfg.maxChildren as number) || 200;
      const minAdults = (cfg.minAdults as number) || 1;
      return [
        `            <div className="space-y-3 mb-6">`,
        `              <BigGuestCounter label="Adults (18+)" value={adults} min={${minAdults}} max={${maxAdults}} onChange={setAdults} />`,
        `              <BigGuestCounter label="Children / Youth (under 18)" value={children} min={0} max={${maxChildren}} onChange={setChildren} />`,
        `            </div>`,
        `            {children > 0 && <div className="mb-5 p-4 rounded-[2rem]" style={{ background: THEME.surfaceContainerLowest, border: \`1px solid \${THEME.surfaceContainerHigh}4D\`, boxShadow: '0 24px 40px rgba(0,0,0,0.04)' }}><p className="text-[11px] font-bold uppercase tracking-[0.2em] mb-3" style={{ color: THEME.outline }}>Child Ages (for meal pricing)</p><div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">{childAges.map((age, i) => <div key={i} className="text-center"><label className="text-xs mb-1 block" style={{ color: THEME.outline }}>Child {i + 1}</label><input type="number" min={1} max={17} value={age} onChange={e => setChildAges(p => { const n = [...p]; n[i] = Math.max(1, Math.min(17, parseInt(e.target.value) || 1)); return n; })} className="w-full text-center rounded-lg py-2 text-sm font-bold focus:outline-none focus:ring-2 border-none" style={{ background: THEME.surfaceContainerHigh, color: THEME.onSurface }} /></div>)}</div></div>}`,
      ].join("\n");
    }

    case "guest-rooms":
      return [
        `            {checkingAvail && <div className="mb-4 flex items-center gap-2 p-3.5 rounded-2xl text-sm" style={{ background: \`\${THEME.primary}08\`, border: \`1px solid \${THEME.primary}20\` }}><div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: THEME.primary, borderTopColor: 'transparent' }} /><span style={{ color: THEME.onPrimaryContainer }}>Checking availability...</span></div>}`,
        `            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5 mb-6">`,
        `              {roomProducts.map(p => <RoomCard key={p.id} product={p} selection={roomSelections[p.id]} onSelectionChange={handleRoomChange} availability={availability[p.id]} />)}`,
        `            </div>`,
        `            {selRoomCount > 0 && <div className="mb-4 p-3.5 rounded-2xl flex items-center gap-2.5" style={{ background: \`\${THEME.primary}08\`, border: \`1px solid \${THEME.primary}20\` }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={THEME.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg><span className="text-sm font-semibold" style={{ color: THEME.onPrimaryContainer }}>{selRoomCount} room{selRoomCount !== 1 ? 's' : ''} selected</span></div>}`,
      ].join("\n");

    case "meal-picker": {
      // Extract meal config - try meals JSON first, then fall back to venue data
      let mealsJson = "[]";
      try {
        const rawMeals = cfg.meals;
        if (typeof rawMeals === "string" && rawMeals.startsWith("[")) {
          mealsJson = rawMeals;
        } else if (Array.isArray(rawMeals)) {
          mealsJson = JSON.stringify(rawMeals);
        }
      } catch { /* fall through */ }

      // Parse meals to build the config array for MealTimeslotGrid
      let parsedMeals: Array<{
        name: string;
        adultPrice: number;
        timeslots: Array<{ startTime: string; endTime: string }>;
        allowCheckIn: string;
        allowMiddle: string;
        allowCheckOut: string;
      }> = [];
      try { parsedMeals = JSON.parse(mealsJson); } catch { /* ignore */ }

      // If no meals config, use defaults
      if (parsedMeals.length === 0) {
        parsedMeals = [
          { name: "Breakfast", adultPrice: 18, timeslots: [{ startTime: "07:00", endTime: "09:00" }], allowCheckIn: "unselectable", allowMiddle: "selectable", allowCheckOut: "selectable" },
          { name: "Lunch", adultPrice: 20, timeslots: [{ startTime: "12:00", endTime: "14:00" }], allowCheckIn: "selectable", allowMiddle: "selectable", allowCheckOut: "selectable" },
          { name: "Supper", adultPrice: 25, timeslots: [{ startTime: "18:00", endTime: "20:00" }], allowCheckIn: "selectable", allowMiddle: "selectable", allowCheckOut: "unselectable" },
          { name: "Night Snack", adultPrice: 8, timeslots: [{ startTime: "20:00", endTime: "22:00" }], allowCheckIn: "selectable", allowMiddle: "selectable", allowCheckOut: "unselectable" },
        ];
      }

      const mealsConfigStr = JSON.stringify(parsedMeals).replace(/'/g, "\\'");
      const currency = (cfg.currency as string) || "CAD";

      return [
        `            <MealTimeslotGrid`,
        `              meals={${mealsConfigStr}}`,
        `              startDate={startDate}`,
        `              endDate={endDate}`,
        `              adults={adults}`,
        `              currency="${currency}"`,
        `              apiRef={apiRef}`,
        `            />`,
      ].join("\n");
    }

    case "activity-picker":
      return [
        `            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5 mb-6">{activityProducts.map(a => { const q = selectedActivities[a.id] || 0, sel = q > 0, pr = Object.values(a.price || {})?.[0]?.base_price, free = !pr || pr === 0, img = (a.images || [])[0]?.url; return <div key={a.id} className="overflow-hidden transition-all duration-200" style={{ background: THEME.surfaceContainerLowest, borderRadius: '2rem', border: \`2px solid \${sel ? THEME.primary : THEME.surfaceContainerHigh + '4D'}\`, boxShadow: sel ? '0 8px 32px rgba(0,0,0,0.12)' : '0 24px 40px rgba(0,0,0,0.04)' }}><div className="relative overflow-hidden" style={{ height: '140px', background: THEME.surfaceContainerLow }}>{img ? <img src={img} alt={a.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><span className="text-5xl opacity-20">🌲</span></div>}<div className="absolute top-3 right-3 px-3 py-1.5 rounded-xl font-bold text-sm text-white" style={{ background: free ? 'rgba(0,128,0,0.85)' : 'rgba(0,0,0,0.7)' }}>{free ? 'Free' : fmtCurrency(pr)}</div>{sel && <div className="absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: THEME.primary }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg></div>}</div><div className="p-4" style={{ background: sel ? \`\${THEME.primary}08\` : 'transparent' }}><div className="font-bold text-sm leading-tight mb-1" style={{ color: THEME.onSurface, fontFamily: THEME.serif }}>{a.name}</div>{a.details && <SafeHtml html={a.details} className="mb-3" />}<div className="pt-3" style={{ borderTop: \`1px solid \${THEME.outlineVariant}40\` }}><p className="text-[11px] font-bold uppercase tracking-[0.2em] mb-3 text-center" style={{ color: THEME.outline }}>{free ? 'Add to Itinerary' : 'Quantity'}</p><CompactQtyPicker value={q} onChange={v => setSelectedActivities(p => ({ ...p, [a.id]: v }))} min={0} /></div></div></div>; })}</div>`,
      ].join("\n");

    case "contact-form": {
      const showPhone = cfg.showPhone !== false; // default true
      const showCompany = !!cfg.showCompany;
      const showNotes = cfg.showNotes !== false; // default true
      const requireEmail = cfg.requireEmail !== false;
      const requirePhone = !!cfg.requirePhone;
      const gdprConsent = !!cfg.gdprConsent;
      const gdprText = (cfg.gdprText as string) || "I agree to the processing of my personal data.";

      const labelStyle = `className="block text-[11px] font-bold uppercase tracking-[0.2em] mb-1.5" style={{ color: THEME.outline }}`;
      const reqStar = `<span style={{ color: THEME.error }}>*</span>`;
      const optTag = `<span style={{ color: THEME.outlineVariant }}>(optional)</span>`;
      const inputStyle = `className={inputCls} style={{ background: THEME.surfaceContainerHigh, color: THEME.onSurface, '--tw-ring-color': THEME.primary }}`;

      const formLines: string[] = [];
      formLines.push(`            <div className="space-y-3.5 mb-5" style={{ paddingBottom: '80px' }}>`);
      // Name row — always shown
      formLines.push(`              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">`);
      formLines.push(`                <div><label ${labelStyle}>First Name ${reqStar}</label><input type="text" value={contact.first_name} onChange={e => setContact(p => ({ ...p, first_name: e.target.value }))} placeholder="Jane" ${inputStyle} /></div>`);
      formLines.push(`                <div><label ${labelStyle}>Last Name ${reqStar}</label><input type="text" value={contact.last_name} onChange={e => setContact(p => ({ ...p, last_name: e.target.value }))} placeholder="Smith" ${inputStyle} /></div>`);
      formLines.push(`              </div>`);
      // Email — always shown
      formLines.push(`              <div><label ${labelStyle}>Email ${requireEmail ? reqStar : optTag}</label><input type="email" value={contact.email} onChange={e => setContact(p => ({ ...p, email: e.target.value }))} placeholder="jane@example.com" ${inputStyle} /></div>`);
      // Phone — conditional
      if (showPhone) {
        formLines.push(`              <div><label ${labelStyle}>Phone ${requirePhone ? reqStar : optTag}</label><input type="tel" value={contact.phone} onChange={e => setContact(p => ({ ...p, phone: e.target.value }))} placeholder="+1 (555) 000-0000" ${inputStyle} /></div>`);
      }
      // Company — conditional
      if (showCompany) {
        formLines.push(`              <div><label ${labelStyle}>Company / Organization ${optTag}</label><input type="text" value={contact.company || ''} onChange={e => setContact(p => ({ ...p, company: e.target.value }))} placeholder="Organization name" ${inputStyle} /></div>`);
      }
      // Notes — conditional
      if (showNotes) {
        formLines.push(`              <div><label ${labelStyle}>Notes ${optTag}</label><textarea rows={2} value={contact.notes || ''} onChange={e => setContact(p => ({ ...p, notes: e.target.value }))} placeholder="Anything else..." ${inputStyle.replace('inputCls', "inputCls + ' resize-none'")} /></div>`);
      }
      // GDPR consent — conditional
      if (gdprConsent) {
        formLines.push(`              <label className="flex items-start gap-2 mt-2 cursor-pointer">`);
        formLines.push(`                <input type="checkbox" checked={contact.gdprAccepted || false} onChange={e => setContact(p => ({ ...p, gdprAccepted: e.target.checked }))} className="mt-0.5" />`);
        formLines.push(`                <span className="text-xs" style={{ color: THEME.outline }}>${escapeJsx(gdprText)}</span>`);
        formLines.push(`              </label>`);
      }
      formLines.push(`            </div>`);
      return formLines.join("\n");
    }

    case "option-picker": {
      const title = (cfg.title as string) || "";
      // Parse options from config (same pattern as segment-picker)
      let parsedOpts: Array<{ id: string; label: string; description?: string; icon?: string }> = [];
      try {
        const raw = cfg.options;
        if (typeof raw === "string") parsedOpts = JSON.parse(raw as string);
        else if (Array.isArray(raw)) parsedOpts = raw as typeof parsedOpts;
      } catch {
        parsedOpts = [];
      }
      const isMulti = !!cfg.multiSelect;
      const columns = (cfg.columns as number) || 2;
      const optsJson = JSON.stringify(parsedOpts);

      // Generate an OptionPicker using the same SegmentPicker component
      // (it handles both single and multi select with the same card UI)
      const optLines: string[] = [];
      if (title) {
        optLines.push(`            <h3 className="font-semibold text-lg mb-3" style={{ fontFamily: THEME.serif, color: THEME.onSurface }}>${escapeJsx(title)}</h3>`);
      }
      if (isMulti) {
        // Multi-select: use SegmentPicker with allowMultiple
        const stateKey = `optPick_${widget.instanceId.slice(-6)}`;
        optLines.push(`            <SegmentPicker`);
        optLines.push(`              options={${optsJson}}`);
        optLines.push(`              allowMultiple`);
        optLines.push(`              selectedMulti={${stateKey} || []}`);
        optLines.push(`              onSelectMulti={ids => set${stateKey.charAt(0).toUpperCase() + stateKey.slice(1)}(ids)}`);
        optLines.push(`            />`);
      } else {
        // Single-select with auto-advance
        const defaultNext = _nextStepId ? `'${_nextStepId}'` : "null";
        const stateKey = `optPick_${widget.instanceId.slice(-6)}`;
        optLines.push(`            <SegmentPicker`);
        optLines.push(`              options={${optsJson}}`);
        optLines.push(`              selected={${stateKey}}`);
        optLines.push(`              onSelect={opt => {`);
        optLines.push(`                set${stateKey.charAt(0).toUpperCase() + stateKey.slice(1)}(opt.id);`);
        optLines.push(`                const target = ${defaultNext};`);
        optLines.push(`                if (target) setTimeout(() => goTo(target), 250);`);
        optLines.push(`              }}`);
        optLines.push(`            />`);
      }
      return optLines.join("\n");
    }

    case "segment-picker": {
      // Parse options from config
      let parsedOptions: Array<{ id: string; label: string; description?: string; icon?: string; nextStep?: string }> = [];
      try {
        const raw = cfg.options;
        if (typeof raw === "string") parsedOptions = JSON.parse(raw as string);
        else if (Array.isArray(raw)) parsedOptions = raw as typeof parsedOptions;
      } catch {
        parsedOptions = [];
      }

      const isMulti = !!cfg.allowMultiple;
      const optionsJson = JSON.stringify(parsedOptions);

      // Determine the default next step (used when an option has no specific nextStep)
      const defaultNext = _nextStepId ? `'${_nextStepId}'` : "null";

      const segmentLines: string[] = [];

      if (isMulti) {
        segmentLines.push(`            <SegmentPicker`);
        segmentLines.push(`              options={${optionsJson}}`);
        segmentLines.push(`              allowMultiple`);
        segmentLines.push(`              selectedMulti={selectedSegments}`);
        segmentLines.push(`              onSelectMulti={ids => { setSelectedSegments(ids); setSelectedSegment(ids[0] || null); }}`);
        segmentLines.push(`            />`);
      } else {
        // Single select — on click, set segment and optionally branch
        segmentLines.push(`            <SegmentPicker`);
        segmentLines.push(`              options={${optionsJson}}`);
        segmentLines.push(`              selected={selectedSegment}`);
        segmentLines.push(`              onSelect={opt => {`);
        segmentLines.push(`                setSelectedSegment(opt.id);`);
        segmentLines.push(`                setSelectedSegments([opt.id]);`);
        segmentLines.push(`                const target = opt.nextStep || ${defaultNext};`);
        segmentLines.push(`                if (target) setTimeout(() => goTo(target), 250);`);
        segmentLines.push(`              }}`);
        segmentLines.push(`            />`);
      }

      return segmentLines.join("\n");
    }

    case "invoice":
      // Handled at step level
      return "";

    // --- Content widgets ---
    case "hero-section": {
      const bgUrl = (cfg.backgroundImageUrl as string) || "";
      const headline = (cfg.headline as string) || "";
      const subtitle = (cfg.subtitle as string) || "";
      const heroLines: string[] = [];
      heroLines.push(`            <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundImage: 'url(${escapeJsx(bgUrl)})', backgroundSize: 'cover', backgroundPosition: 'center' }}>`);
      heroLines.push(`              <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)' }} />`);
      heroLines.push(`              <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: 24, maxWidth: 600 }}>`);
      if (headline) heroLines.push(`                <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 800, fontFamily: THEME.serif, lineHeight: 1.2, marginBottom: 8 }}>${escapeJsx(headline)}</h1>`);
      if (subtitle) heroLines.push(`                <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, lineHeight: 1.5 }}>${escapeJsx(subtitle)}</p>`);
      heroLines.push(`              </div>`);
      heroLines.push(`            </div>`);
      return heroLines.join("\n");
    }

    case "headline": {
      const headlineText = (cfg.text as string) || "Section Title";
      const level = (cfg.level as string) || "h2";
      const Tag = level === "h1" ? "h1" : level === "h3" ? "h3" : "h2";
      const fontSize = Tag === "h1" ? 28 : Tag === "h3" ? 18 : 22;
      return `            <${Tag} style={{ fontFamily: THEME.serif, color: THEME.primary, fontSize: ${fontSize}, fontWeight: 700, margin: '8px 0' }}>${escapeJsx(headlineText)}</${Tag}>`;
    }

    case "text-block": {
      const html = (cfg.html as string) || (cfg.text as string) || "";
      if (!html) return "";
      return `            <div style={{ fontSize: 14, lineHeight: 1.7, color: THEME.onSurface }} dangerouslySetInnerHTML={{ __html: ${JSON.stringify(html)} }} />`;
    }

    case "image-block": {
      const imgUrl = (cfg.url as string) || (cfg.imageUrl as string) || "";
      const alt = (cfg.alt as string) || "";
      const imgWidth = (cfg.width as string) || "100%";
      if (!imgUrl) return "";
      return `            <img src="${escapeJsx(imgUrl)}" alt="${escapeJsx(alt)}" style={{ width: '${imgWidth}', maxWidth: '100%', borderRadius: 12, margin: '8px auto', display: 'block' }} />`;
    }

    case "text-input": {
      const inputLabel = (cfg.label as string) || "Text";
      const inputPlaceholder = (cfg.placeholder as string) || "";
      return `            <div><label className="block text-[11px] font-bold uppercase tracking-[0.2em] mb-1.5" style={{ color: THEME.outline }}>${escapeJsx(inputLabel)}</label><input type="text" placeholder="${escapeJsx(inputPlaceholder)}" className={inputCls} style={{ background: THEME.surfaceContainerHigh, color: THEME.onSurface }} /></div>`;
    }

    case "textarea-input": {
      const taLabel = (cfg.label as string) || "Notes";
      const taPlaceholder = (cfg.placeholder as string) || "";
      return `            <div><label className="block text-[11px] font-bold uppercase tracking-[0.2em] mb-1.5" style={{ color: THEME.outline }}>${escapeJsx(taLabel)}</label><textarea rows={3} placeholder="${escapeJsx(taPlaceholder)}" className={inputCls + ' resize-none'} style={{ background: THEME.surfaceContainerHigh, color: THEME.onSurface }} /></div>`;
    }

    case "category-picker": {
      const catTitle = (cfg.title as string) || "Select Products";
      const catCurrency = (cfg.currency as string) || "CAD";
      const catStateKey = `catPick_${widget.instanceId.slice(-6)}`;
      const catSetKey = `set${catStateKey.charAt(0).toUpperCase() + catStateKey.slice(1)}`;
      let catData: Array<{ name: string; products: Array<{ id: string; name: string; description?: string; price: number; unit?: string; imageUrl?: string; tags?: string[] }> }> = [];
      try {
        const raw = cfg.categories;
        if (typeof raw === "string") catData = JSON.parse(raw);
        else if (Array.isArray(raw)) catData = raw as typeof catData;
      } catch {}
      const fmtCat = `new Intl.NumberFormat('en-CA', { style: 'currency', currency: '${catCurrency}' })`;
      const catLines: string[] = [];
      catLines.push(`            <h3 className="font-semibold text-lg mb-3" style={{ fontFamily: THEME.serif, color: THEME.onSurface }}>${escapeJsx(catTitle)}</h3>`);
      catLines.push(`            <div className="space-y-4">`);
      for (const cat of catData) {
        catLines.push(`              <div>`);
        catLines.push(`                <div className="text-[11px] font-bold uppercase tracking-wider mb-2 pb-1 border-b" style={{ color: THEME.outline, borderColor: THEME.outlineVariant }}>${escapeJsx(cat.name)}</div>`);
        catLines.push(`                <div className="space-y-2">`);
        for (const p of cat.products) {
          const pId = JSON.stringify(p.id);
          catLines.push(`                  <div onClick={() => ${catSetKey}(prev => prev.includes(${pId}) ? prev.filter(x => x !== ${pId}) : [...prev, ${pId}])} className="flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all" style={{ background: ${catStateKey}.includes(${pId}) ? THEME.primary + '08' : THEME.surfaceContainerLowest, border: '2px solid ' + (${catStateKey}.includes(${pId}) ? THEME.primary : THEME.surfaceContainerHigh + '4D'), boxShadow: ${catStateKey}.includes(${pId}) ? '0 4px 12px rgba(0,0,0,0.08)' : '0 2px 6px rgba(0,0,0,0.03)' }}>`);
          if (p.imageUrl) catLines.push(`                    <img src="${escapeJsx(p.imageUrl)}" alt="${escapeJsx(p.name)}" style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover' }} />`);
          catLines.push(`                    <div className="flex-1">`);
          catLines.push(`                      <div className="font-semibold text-sm" style={{ fontFamily: THEME.serif, color: THEME.onSurface }}>${escapeJsx(p.name)}</div>`);
          if (p.description) catLines.push(`                      <div className="text-xs mt-0.5" style={{ color: THEME.outline }}>${escapeJsx(p.description)}</div>`);
          if (p.tags && p.tags.length > 0) catLines.push(`                      <div className="flex gap-1 mt-1 flex-wrap">${p.tags.map(t => `<span className="px-1.5 py-0.5 rounded text-[9px]" style={{ background: THEME.surfaceContainerHigh, color: THEME.outline }}>${escapeJsx(t)}</span>`).join("")}</div>`);
          catLines.push(`                    </div>`);
          catLines.push(`                    <div className="text-right">`);
          catLines.push(`                      <div className="font-bold text-sm" style={{ color: THEME.primary }}>{${fmtCat}.format(${p.price})}</div>`);
          if (p.unit) catLines.push(`                      <div className="text-[10px]" style={{ color: THEME.outline }}>per ${escapeJsx(p.unit)}</div>`);
          catLines.push(`                    </div>`);
          if (cfg.multiSelect !== false) {
            catLines.push(`                    {${catStateKey}.includes(${pId}) && <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: THEME.primary }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg></div>}`);
          }
          catLines.push(`                  </div>`);
        }
        catLines.push(`                </div>`);
        catLines.push(`              </div>`);
      }
      catLines.push(`            </div>`);
      return catLines.join("\n");
    }

    case "booking-widget": {
      // The booking widget creates a hidden booking in the Everybooking backend
      // In generated React funnels, this is handled by syncBooking in handleGenerateInvoice
      const bwCategoryName = (cfg.categoryName as string) || "Booking";
      const bwVisible = cfg.visible !== false;
      if (!bwVisible) {
        return `            {/* Hidden booking widget: ${escapeJsx(bwCategoryName)} — booking created via syncBooking */}`;
      }
      return `            <div className="p-4 rounded-xl" style={{ background: THEME.surfaceContainerLow, border: '1px solid ' + THEME.outlineVariant }}><div className="text-sm font-semibold" style={{ color: THEME.onSurface }}>${escapeJsx(bwCategoryName)}</div><div className="text-xs mt-1" style={{ color: THEME.outline }}>Booking will be created when you generate your quote.</div></div>`;
    }

    case "payment-widget": {
      const pwTitle = (cfg.title as string) || "Secure Your Booking";
      const pwAmount = (cfg.amount as number) || 10;
      const pwType = (cfg.amountType as string) || "percent";
      const pwDesc = (cfg.description as string) || "";
      const payLines: string[] = [];
      payLines.push(`            <div className="p-6 rounded-2xl text-center" style={{ background: THEME.surfaceContainerLowest, border: '2px solid ' + THEME.primary + '30', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>`);
      payLines.push(`              <h3 className="font-bold text-lg mb-2" style={{ fontFamily: THEME.serif, color: THEME.onSurface }}>${escapeJsx(pwTitle)}</h3>`);
      if (pwDesc) payLines.push(`              <p className="text-sm mb-4" style={{ color: THEME.outline }}>${escapeJsx(pwDesc)}</p>`);
      payLines.push(`              <div className="inline-block px-6 py-3 rounded-xl font-bold text-lg" style={{ background: THEME.primary + '10', color: THEME.primary }}>${pwType === "percent" ? `${pwAmount}% Deposit Required` : pwType === "full" ? "Full Payment" : `$${pwAmount} Deposit`}</div>`);
      payLines.push(`              <div className="mt-4 text-xs" style={{ color: THEME.outline }}>Secure payment processed by Everybooking</div>`);
      payLines.push(`            </div>`);
      return payLines.join("\n");
    }

    default:
      return `            {/* Unknown widget: ${widget.templateId} */}`;
  }
}

// ────────────────────────────────────────────────────────────
// Utility helpers
// ────────────────────────────────────────────────────────────

function escapeJsx(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/`/g, "\\`");
}

/** Escape for use inside JavaScript single-quoted strings (not JSX text) */
function escapeJsString(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}

function findStepIdForTemplate(funnel: FunnelDefinition, templateId: string): string {
  for (const step of funnel.steps) {
    for (const widget of step.widgets) {
      if (widget.templateId === templateId) return step.id;
    }
  }
  return "unknown";
}

function findWidgetByTemplate(funnel: FunnelDefinition, templateId: string): WidgetInstance | null {
  for (const step of funnel.steps) {
    for (const widget of step.widgets) {
      if (widget.templateId === templateId) return widget;
    }
  }
  return null;
}

function deriveStepLabel(step: Step): string {
  const templates = step.widgets.map((w) => w.templateId);
  if (templates.includes("date-picker")) return "Dates";
  if (templates.includes("guest-counter")) return "Guests";
  if (templates.includes("guest-rooms")) return "Rooms";
  if (templates.includes("meal-picker")) return "Meals";
  if (templates.includes("activity-picker")) return "Activities";
  if (templates.includes("contact-form")) return "Details";
  if (templates.includes("invoice")) return "Quote";
  if (templates.includes("option-picker")) return "Options";
  if (templates.includes("segment-picker")) return "Welcome";
  return step.title.slice(0, 12);
}

/**
 * Splits a step title into [before, emphatic, after] for TypeformStep's italic emphasis.
 * Heuristic: find the first key word to emphasize. Falls back to plain string.
 */
function buildTitleParts(title: string): string {
  // Common patterns: "Select your rooms", "Choose meals", etc.
  // Try to find a good word to italicize
  const emphasisWords = [
    "rooms", "room", "meals", "meal", "dates", "date", "guests", "guest",
    "activities", "activity", "details", "stay", "quote", "started",
    "done", "party", "event", "attendees", "experiences", "welcome",
    "segment", "type", "journey",
  ];
  const lower = title.toLowerCase();
  for (const word of emphasisWords) {
    const idx = lower.indexOf(word);
    if (idx !== -1) {
      const before = title.slice(0, idx);
      const match = title.slice(idx, idx + word.length);
      const after = title.slice(idx + word.length);
      return `['${escapeJsx(before)}', '${escapeJsx(match)}', '${escapeJsx(after)}']`;
    }
  }
  // Fallback: just use plain string
  return `'${escapeJsx(title)}'`;
}
