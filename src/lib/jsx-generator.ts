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
  return { roomCatIds, mealCatIds, activityCatIds };
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
function buildProductEntries(product, qty, startDate, endDate, childAges = []) { const params = product.parameters || []; if (params.some(p => p.report_id === 'childage')) { return childAges.slice(0, qty).map(age => ({ sku: product.sku, startDate, endDate: startDate, quantities: { childage: age, qty: 1 } })); } const k = params[0]?.report_id || 'qty'; return [{ sku: product.sku, startDate, endDate, quantities: { [k]: qty } }]; }`;
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
  function click(ds) { const c = new Date(ds + 'T00:00:00'); if (c < today) return; if (!startDate || !selEnd) { onStartDate(ds); onEndDate(''); setSelEnd(true); } else { if (c <= sD) { onStartDate(ds); onEndDate(''); setSelEnd(true); } else { onEndDate(ds); setSelEnd(false); } } }
  function state(ds) { const d = new Date(ds + 'T00:00:00'), hD = hover ? new Date(hover + 'T00:00:00') : null; return { isPast: d < today, isStart: startDate === ds, isEnd: endDate === ds, inRange: startDate && endDate && d > sD && d < eD, inHover: startDate && !endDate && hD && selEnd && d > sD && d < hD }; }
  const prev = () => { if (vm === 0) { setVY(y => y - 1); setVM(11); } else setVM(m => m - 1); };
  const next = () => { if (vm === 11) { setVY(y => y + 1); setVM(0); } else setVM(m => m + 1); };
  const td = new Date(vy, vm + 1, 0).getDate(), fd = new Date(vy, vm, 1).getDay();
  const cells = []; for (let i = 0; i < fd; i++) cells.push(null); for (let d = 1; d <= td; d++) cells.push(d);
  const fmt = s => s ? new Date(s + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }) : null;
  return (
    <div className="mb-5">
      <div className="grid grid-cols-2 gap-3 mb-4">{[{ l: 'Check-In', v: startDate }, { l: 'Check-Out', v: endDate }].map(({ l, v }) => <div key={l} className="p-3.5 rounded-2xl text-center" style={{ background: v ? \`\${THEME.primary}08\` : THEME.surfaceContainerLow, border: \`1.5px solid \${v ? THEME.primary : THEME.outlineVariant}\` }}><div className="text-[11px] font-bold uppercase tracking-[0.2em] mb-0.5" style={{ color: v ? THEME.primary : THEME.outline }}>{l}</div><div className="text-sm font-semibold" style={{ color: v ? THEME.onPrimaryContainer : THEME.outlineVariant, fontFamily: THEME.serif }}>{v ? fmt(v) : 'Select date'}</div></div>)}</div>
      <div className="rounded-[2rem] overflow-hidden" style={{ background: THEME.surfaceContainerLowest, border: \`1px solid \${THEME.surfaceContainerHigh}4D\`, boxShadow: '0 24px 40px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: \`1px solid \${THEME.surfaceContainerHigh}\` }}>
          <button onClick={prev} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100" style={{ color: THEME.outline }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg></button>
          <span className="font-bold text-base" style={{ color: THEME.onSurface, fontFamily: THEME.serif }}>{MONTHS[vm]} {vy}</span>
          <button onClick={next} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100" style={{ color: THEME.outline }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg></button>
        </div>
        <div className="grid grid-cols-7 px-3 pt-3 pb-1">{DAYS.map(d => <div key={d} className="text-center text-[11px] font-bold uppercase tracking-wider py-1" style={{ color: THEME.outlineVariant }}>{d}</div>)}</div>
        <div className="grid grid-cols-7 px-3 pb-4 gap-y-1">{cells.map((day, i) => {
          if (!day) return <div key={\`e-\${i}\`} />;
          const ds = toDS(vy, vm, day), { isPast, isStart, isEnd, inRange, inHover } = state(ds), isSel = isStart || isEnd, isIR = inRange || inHover;
          let bg = 'transparent', col = isPast ? THEME.outlineVariant : THEME.onSurface, fw = '500', br = '50%';
          if (isSel) { bg = THEME.primary; col = '#fff'; fw = '700'; } else if (isIR) { bg = \`\${THEME.primary}10\`; col = THEME.primary; br = '0'; }
          if (isStart && (inRange || inHover)) br = '50% 0 0 50%'; if (isEnd && inRange) br = '0 50% 50% 0';
          return <div key={ds} className="flex items-center justify-center" style={{ height: '38px' }}><button disabled={isPast} onClick={() => click(ds)} onMouseEnter={() => { if (selEnd && startDate && !isPast) setHover(ds); }} onMouseLeave={() => setHover(null)} className="w-9 h-9 text-sm flex items-center justify-center disabled:cursor-not-allowed" style={{ background: bg, color: col, fontWeight: fw, borderRadius: br, fontSize: '13px' }}>{day}</button></div>;
        })}</div>
        <div className="px-5 pb-4 text-center"><p className="text-xs" style={{ color: THEME.outlineVariant }}>{!startDate ? 'Tap to select your arrival date' : !endDate ? 'Now tap your departure date' : '✓ Dates selected'}</p></div>
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
  const componentName = funnel.name
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("")
    + "Funnel";

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
    lines.push(`  const [contact, setContact] = useState({ first_name: '', last_name: '', email: '', phone: '', notes: '' });`);
  }
  if (usedTemplates.has("segment-picker")) {
    lines.push(`  const [selectedSegment, setSelectedSegment] = useState(null);`);
    lines.push(`  const [selectedSegments, setSelectedSegments] = useState([]);`);
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
  // Meeting meal products (category 39 — always include for conference support)
  lines.push(`      setMealMeetingProducts(cats.find(c => c.id === 39)?.products || []);`);

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
  const stepLabels = funnel.steps.map(s => `'${deriveStepLabel(s)}'`);
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
    const nextStepId = i < funnel.steps.length - 1 ? funnel.steps[i + 1].id : null;
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

    case "meal-picker":
      return [
        `            <div className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2.5 flex items-center gap-2" style={{ color: THEME.outline }}><span className="inline-block w-4 h-px" style={{ background: THEME.outlineVariant }} /> Adult Meals</div>`,
        `            <div className="space-y-3 mb-5">{adultMeals.map(m => { const q = selectedMeals[m.id] || 0, pr = Object.values(m.price || {})?.[0]?.base_price, pm = (m.parameters || [])[0]; return <div key={m.id} className="p-5 rounded-[2rem]" style={{ background: q > 0 ? \`\${THEME.primary}05\` : THEME.surfaceContainerLowest, border: \`2px solid \${q > 0 ? THEME.primary : THEME.surfaceContainerHigh + '4D'}\`, boxShadow: '0 24px 40px rgba(0,0,0,0.04)' }}><div className="flex items-start justify-between mb-3"><div className="flex-1"><div className="font-semibold text-sm" style={{ color: THEME.onSurface, fontFamily: THEME.serif }}>{m.name}</div>{pr > 0 && <div className="font-bold text-xs mt-0.5" style={{ color: THEME.secondary }}>{fmtCurrency(pr)} <span className="font-normal" style={{ color: THEME.outline }}>/ {pm?.name || 'person'}</span></div>}</div></div><CompactQtyPicker value={q} onChange={v => setSelectedMeals(p => ({ ...p, [m.id]: v }))} min={0} /></div>; })}</div>`,
        `            {children > 0 && kidsMeals.length > 0 && <><div className="text-[11px] font-bold uppercase tracking-[0.2em] mb-2.5 flex items-center gap-2" style={{ color: THEME.outline }}><span className="inline-block w-4 h-px" style={{ background: THEME.outlineVariant }} /> Kids Meals</div><div className="space-y-3 mb-5">{kidsMeals.map(m => { const q = selectedMeals[m.id] || 0; return <div key={m.id} className="p-5 rounded-[2rem]" style={{ background: q > 0 ? \`\${THEME.primary}05\` : THEME.surfaceContainerLowest, border: \`2px solid \${q > 0 ? THEME.primary : THEME.surfaceContainerHigh + '4D'}\`, boxShadow: '0 24px 40px rgba(0,0,0,0.04)' }}><div className="font-semibold text-sm mb-3" style={{ color: THEME.onSurface, fontFamily: THEME.serif }}>{m.name}</div><CompactQtyPicker value={q} max={children} onChange={v => setSelectedMeals(p => ({ ...p, [m.id]: v }))} min={0} /></div>; })}</div></>}`,
      ].join("\n");

    case "activity-picker":
      return [
        `            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5 mb-6">{activityProducts.map(a => { const q = selectedActivities[a.id] || 0, sel = q > 0, pr = Object.values(a.price || {})?.[0]?.base_price, free = !pr || pr === 0, img = (a.images || [])[0]?.url; return <div key={a.id} className="overflow-hidden transition-all duration-200" style={{ background: THEME.surfaceContainerLowest, borderRadius: '2rem', border: \`2px solid \${sel ? THEME.primary : THEME.surfaceContainerHigh + '4D'}\`, boxShadow: sel ? '0 8px 32px rgba(0,0,0,0.12)' : '0 24px 40px rgba(0,0,0,0.04)' }}><div className="relative overflow-hidden" style={{ height: '140px', background: THEME.surfaceContainerLow }}>{img ? <img src={img} alt={a.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><span className="text-5xl opacity-20">🌲</span></div>}<div className="absolute top-3 right-3 px-3 py-1.5 rounded-xl font-bold text-sm text-white" style={{ background: free ? 'rgba(0,128,0,0.85)' : 'rgba(0,0,0,0.7)' }}>{free ? 'Free' : fmtCurrency(pr)}</div>{sel && <div className="absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: THEME.primary }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg></div>}</div><div className="p-4" style={{ background: sel ? \`\${THEME.primary}08\` : 'transparent' }}><div className="font-bold text-sm leading-tight mb-1" style={{ color: THEME.onSurface, fontFamily: THEME.serif }}>{a.name}</div>{a.details && <SafeHtml html={a.details} className="mb-3" />}<div className="pt-3" style={{ borderTop: \`1px solid \${THEME.outlineVariant}40\` }}><p className="text-[11px] font-bold uppercase tracking-[0.2em] mb-3 text-center" style={{ color: THEME.outline }}>{free ? 'Add to Itinerary' : 'Quantity'}</p><CompactQtyPicker value={q} onChange={v => setSelectedActivities(p => ({ ...p, [a.id]: v }))} min={0} /></div></div></div>; })}</div>`,
      ].join("\n");

    case "contact-form":
      return [
        `            <div className="space-y-3.5 mb-5" style={{ paddingBottom: '80px' }}>`,
        `              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">`,
        `                <div><label className="block text-[11px] font-bold uppercase tracking-[0.2em] mb-1.5" style={{ color: THEME.outline }}>First Name <span style={{ color: THEME.error }}>*</span></label><input type="text" value={contact.first_name} onChange={e => setContact(p => ({ ...p, first_name: e.target.value }))} placeholder="Jane" className={inputCls} style={{ background: THEME.surfaceContainerHigh, color: THEME.onSurface, '--tw-ring-color': THEME.primary }} /></div>`,
        `                <div><label className="block text-[11px] font-bold uppercase tracking-[0.2em] mb-1.5" style={{ color: THEME.outline }}>Last Name <span style={{ color: THEME.error }}>*</span></label><input type="text" value={contact.last_name} onChange={e => setContact(p => ({ ...p, last_name: e.target.value }))} placeholder="Smith" className={inputCls} style={{ background: THEME.surfaceContainerHigh, color: THEME.onSurface, '--tw-ring-color': THEME.primary }} /></div>`,
        `              </div>`,
        `              <div><label className="block text-[11px] font-bold uppercase tracking-[0.2em] mb-1.5" style={{ color: THEME.outline }}>Email <span style={{ color: THEME.error }}>*</span></label><input type="email" value={contact.email} onChange={e => setContact(p => ({ ...p, email: e.target.value }))} placeholder="jane@example.com" className={inputCls} style={{ background: THEME.surfaceContainerHigh, color: THEME.onSurface, '--tw-ring-color': THEME.primary }} /></div>`,
        `              <div><label className="block text-[11px] font-bold uppercase tracking-[0.2em] mb-1.5" style={{ color: THEME.outline }}>Phone <span style={{ color: THEME.error }}>*</span></label><input type="tel" value={contact.phone} onChange={e => setContact(p => ({ ...p, phone: e.target.value }))} placeholder="+1 (555) 000-0000" className={inputCls} style={{ background: THEME.surfaceContainerHigh, color: THEME.onSurface, '--tw-ring-color': THEME.primary }} /></div>`,
        `              <div><label className="block text-[11px] font-bold uppercase tracking-[0.2em] mb-1.5" style={{ color: THEME.outline }}>Notes <span style={{ color: THEME.outlineVariant }}>(optional)</span></label><textarea rows={2} value={contact.notes || ''} onChange={e => setContact(p => ({ ...p, notes: e.target.value }))} placeholder="Anything else..." className={inputCls + ' resize-none'} style={{ background: THEME.surfaceContainerHigh, color: THEME.onSurface, '--tw-ring-color': THEME.primary }} /></div>`,
        `            </div>`,
      ].join("\n");

    case "option-picker": {
      const title = (cfg.title as string) || "";
      return [
        title
          ? `            <h3 className="font-semibold text-lg mb-3" style={{ fontFamily: THEME.serif, color: THEME.onSurface }}>${escapeJsx(title)}</h3>`
          : "",
        `            {/* Option picker — implement per-funnel options here */}`,
      ]
        .filter(Boolean)
        .join("\n");
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
