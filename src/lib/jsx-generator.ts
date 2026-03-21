import type { FunnelDefinition, Step, WidgetInstance, ThemeConfig } from "./types";

/**
 * Generates a complete JSX funnel file string from a FunnelDefinition.
 * The output is designed to work with the Everybooking bundler which
 * auto-injects React imports. The generated file follows the
 * wilderness-edge-funnel.jsx pattern — using window.__EverybookingAPI,
 * apiRef, correct clampQuantity(value, param) signature, initQuantities,
 * buildParameterTree, syncBooking with products array, and InvoiceWidget
 * with sessionId + currencyId props.
 *
 * Default mode: live (connects to real Everybooking API).
 */
export function generateFunnelJSX(funnel: FunnelDefinition): string {
  const lines: string[] = [];

  // --- Imports (no React — bundler auto-injects) ---
  lines.push(`// React hooks are auto-injected by the bundler — do NOT import from 'react'`);
  lines.push(`import InvoiceWidget from 'widget-sdk/InvoiceWidget';`);
  lines.push(`import { buildParameterTree, initQuantities, clampQuantity } from 'widget-sdk/utils';`);
  lines.push(``);

  // --- Theme ---
  lines.push(`// ── Theme ──────────────────────────────────────────`);
  lines.push(generateThemeBlock(funnel.theme));
  lines.push(``);

  // --- Helper functions ---
  lines.push(`// ── Helpers ────────────────────────────────────────`);
  lines.push(generateHelperFunctions());
  lines.push(``);

  // --- Collect category IDs from widget configs ---
  const catInfo = collectCategoryInfo(funnel);

  // --- Shared UI components ---
  lines.push(`// ── Shared UI ─────────────────────────────────────`);
  lines.push(generateSharedUI());
  lines.push(``);

  // --- Widget-specific components based on what's used ---
  const usedTemplates = new Set<string>();
  for (const step of funnel.steps) {
    for (const widget of step.widgets) {
      usedTemplates.add(widget.templateId);
    }
  }

  lines.push(`// ── Widget Components ──────────────────────────────`);

  if (usedTemplates.has("date-picker")) {
    lines.push(generateDateRangePickerComponent());
    lines.push(``);
  }
  if (usedTemplates.has("guest-counter")) {
    lines.push(generateGuestCounterComponent());
    lines.push(``);
  }
  if (usedTemplates.has("guest-rooms")) {
    lines.push(generateGuestRoomsComponents());
    lines.push(``);
  }
  if (usedTemplates.has("meal-picker")) {
    lines.push(generateMealPickerComponent());
    lines.push(``);
  }
  if (usedTemplates.has("activity-picker")) {
    lines.push(generateActivityPickerComponent());
    lines.push(``);
  }
  if (usedTemplates.has("contact-form")) {
    lines.push(generateContactFormComponent());
    lines.push(``);
  }

  // --- Main funnel component ---
  lines.push(`// ── Main Funnel ───────────────────────────────────`);
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

  for (const step of funnel.steps) {
    for (const widget of step.widgets) {
      const cfg = widget.config as Record<string, unknown>;
      const catId = cfg.categoryId as number | undefined;
      if (!catId) continue;
      switch (widget.templateId) {
        case "guest-rooms":
          if (!roomCatIds.includes(catId)) roomCatIds.push(catId);
          break;
        case "meal-picker":
          if (!mealCatIds.includes(catId)) mealCatIds.push(catId);
          break;
        case "activity-picker":
          if (!activityCatIds.includes(catId)) activityCatIds.push(catId);
          break;
      }
    }
  }

  return { roomCatIds, mealCatIds, activityCatIds };
}

// ────────────────────────────────────────────────────────────
// Theme block — M3 color system
// ────────────────────────────────────────────────────────────

function generateThemeBlock(theme: ThemeConfig): string {
  return `const THEME = {
  primary: '${theme.primaryColor}',
  primaryContainer: '${adjustColor(theme.primaryColor, 0.6)}',
  onPrimary: '#ffffff',
  onPrimaryContainer: '${adjustColor(theme.primaryColor, -0.3)}',
  secondary: '${theme.secondaryColor}',
  secondaryContainer: '${adjustColor(theme.secondaryColor, 0.6)}',
  surface: '${theme.surfaceColor}',
  surfaceContainerLow: '${adjustColor(theme.surfaceColor, -0.02)}',
  surfaceContainer: '${adjustColor(theme.surfaceColor, -0.04)}',
  surfaceContainerHigh: '${adjustColor(theme.surfaceColor, -0.08)}',
  surfaceContainerHighest: '${adjustColor(theme.surfaceColor, -0.12)}',
  surfaceContainerLowest: '#ffffff',
  onSurface: '#151c27',
  onSurfaceVariant: '#3d4a42',
  outline: '#6c7a72',
  outlineVariant: '#bbcac0',
  error: '#ba1a1a',
  serif: "'${theme.headlineFont}', 'Georgia', serif",
  sans: "'${theme.bodyFont}', system-ui, sans-serif",
};
const GRADIENT_BG = \`linear-gradient(180deg, \${THEME.surface} 0%, \${THEME.primary}08 100%)\`;`;
}

// simple placeholder for color adjustment — we just pass through hex
function adjustColor(hex: string, _factor: number): string {
  // In a real implementation you'd lighten/darken. For now return the hex.
  return hex;
}

// ────────────────────────────────────────────────────────────
// Helper functions (price, currency, product entries)
// Matches the working wilderness-edge-funnel.jsx pattern
// ────────────────────────────────────────────────────────────

function generateHelperFunctions(): string {
  return `function getBasePrice(p) {
  if (typeof p.price === 'number') return p.price;
  const e = Object.values(p.price || {});
  return e.length ? (parseFloat(e[0]?.base_price) || 0) : 0;
}

function getMaxPrice(p) {
  if (p.max_price != null) return parseFloat(p.max_price) || 0;
  let m = 0;
  for (const e of Object.values(p.price || {})) {
    const b = parseFloat(e?.base_price) || 0;
    if (b > m) m = b;
  }
  return m;
}

function calculateGroupPrice(pe, q) {
  if (!pe) return 0;
  const b = parseFloat(pe.base_price) || 0;
  if (pe.group_price) {
    for (const t of Object.values(pe.group_price)) {
      if (q >= (parseInt(t.from) || 0) && q <= (parseInt(t.to) || Infinity)) {
        const a = parseFloat(t.amount) || 0;
        return t.type === 'quantity' ? a * q : a;
      }
    }
  }
  return b;
}

function fmtCurrency(v) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency', currency: 'CAD',
    minimumFractionDigits: 0, maximumFractionDigits: 2,
  }).format(v);
}

function buildProductEntries(product, qty, startDate, endDate, childAges = []) {
  const params = product.parameters || [];
  if (params.some(p => p.report_id === 'childage')) {
    return childAges.slice(0, qty).map(age => ({
      sku: product.sku, startDate, endDate: startDate,
      quantities: { childage: age, qty: 1 },
    }));
  }
  const k = params[0]?.report_id || 'qty';
  return [{ sku: product.sku, startDate, endDate, quantities: { [k]: qty } }];
}`;
}

// ────────────────────────────────────────────────────────────
// Shared UI — StepShell, BottomNav, CompactQtyPicker, etc.
// ────────────────────────────────────────────────────────────

function generateSharedUI(): string {
  return `function SafeHtml({ html, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !html) return;
    ref.current.innerHTML = String(html)
      .replace(/<script[\\s\\S]*?<\\/script>/gi, '')
      .replace(/<iframe[\\s\\S]*?<\\/iframe>/gi, '')
      .replace(/\\s+on\\w+="[^"]*"/gi, '');
  }, [html]);
  if (!html) return null;
  return <div ref={ref} className={className} />;
}

function StepShell({ stepNum, stepLabel, title, subtitle, children, footer, wide }) {
  return (
    <div className={wide ? 'max-w-2xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl mx-auto' : 'max-w-2xl lg:max-w-3xl mx-auto'} style={{ fontFamily: THEME.sans }}>
      <div className="px-4 py-5 sm:px-6 lg:px-8" style={{ paddingBottom: '120px' }}>
        {stepNum && stepLabel && (
          <div className="mb-4 text-xs font-bold uppercase tracking-widest" style={{ color: THEME.secondary }}>
            STEP {stepNum} — {stepLabel}
          </div>
        )}
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight mb-1" style={{ fontFamily: THEME.serif, color: THEME.onSurface }}>{title}</h2>
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

function BigGuestCounter({ label, value, min, max, onChange }) {
  return (
    <div className="p-5 rounded-3xl" style={{
      background: THEME.surfaceContainerLowest,
      border: \`1px solid \${THEME.surfaceContainerHigh}4D\`,
      boxShadow: '0 24px 40px rgba(0,0,0,0.04)',
    }}>
      <div className="mb-4">
        <div className="font-semibold text-base" style={{ color: THEME.onSurface, fontFamily: THEME.serif }}>{label}</div>
        {min > 1 && <div className="text-xs mt-0.5" style={{ color: THEME.outline }}>Minimum {min}</div>}
      </div>
      <CompactQtyPicker value={value} onChange={onChange} min={min} max={max} />
    </div>
  );
}`;
}

// ────────────────────────────────────────────────────────────
// DateRangePicker
// ────────────────────────────────────────────────────────────

function generateDateRangePickerComponent(): string {
  return `function DateRangePicker({ startDate, endDate, onStartDate, onEndDate }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [vy, setVY] = useState(today.getFullYear()), [vm, setVM] = useState(today.getMonth());
  const [hover, setHover] = useState(null), [selEnd, setSelEnd] = useState(!!startDate);
  const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const toDS = (y, m, d) => \`\${y}-\${String(m + 1).padStart(2, '0')}-\${String(d).padStart(2, '0')}\`;
  const pD = s => s ? new Date(s + 'T00:00:00') : null;
  const sD = pD(startDate), eD = pD(endDate);
  function click(ds) {
    const c = new Date(ds + 'T00:00:00');
    if (c < today) return;
    if (!startDate || !selEnd) { onStartDate(ds); onEndDate(''); setSelEnd(true); }
    else { if (c <= sD) { onStartDate(ds); onEndDate(''); setSelEnd(true); } else { onEndDate(ds); setSelEnd(false); } }
  }
  function state(ds) {
    const d = new Date(ds + 'T00:00:00'), hD = hover ? new Date(hover + 'T00:00:00') : null;
    return {
      isPast: d < today, isStart: startDate === ds, isEnd: endDate === ds,
      inRange: startDate && endDate && d > sD && d < eD,
      inHover: startDate && !endDate && hD && selEnd && d > sD && d < hD,
    };
  }
  const prev = () => { if (vm === 0) { setVY(y => y - 1); setVM(11); } else setVM(m => m - 1); };
  const next = () => { if (vm === 11) { setVY(y => y + 1); setVM(0); } else setVM(m => m + 1); };
  const td = new Date(vy, vm + 1, 0).getDate(), fd = new Date(vy, vm, 1).getDay();
  const cells = []; for (let i = 0; i < fd; i++) cells.push(null); for (let d = 1; d <= td; d++) cells.push(d);
  const fmt = s => s ? new Date(s + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }) : null;
  return (
    <div className="mb-5">
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[{ l: 'Check-In', v: startDate }, { l: 'Check-Out', v: endDate }].map(({ l, v }) => (
          <div key={l} className="p-3.5 rounded-2xl text-center" style={{
            background: v ? \`\${THEME.primary}08\` : THEME.surfaceContainerLow,
            border: \`1.5px solid \${v ? THEME.primary : THEME.outlineVariant}\`,
          }}>
            <div className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: v ? THEME.primary : THEME.outline }}>{l}</div>
            <div className="text-sm font-semibold" style={{ color: v ? THEME.onPrimaryContainer : THEME.outlineVariant, fontFamily: THEME.serif }}>
              {v ? fmt(v) : 'Select date'}
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-3xl overflow-hidden" style={{
        background: THEME.surfaceContainerLowest,
        border: \`1px solid \${THEME.surfaceContainerHigh}4D\`,
        boxShadow: '0 24px 40px rgba(0,0,0,0.04)',
      }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: \`1px solid \${THEME.surfaceContainerHigh}\` }}>
          <button onClick={prev} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100" style={{ color: THEME.outline }}>‹</button>
          <span className="font-bold text-base" style={{ color: THEME.onSurface, fontFamily: THEME.serif }}>{MONTHS[vm]} {vy}</span>
          <button onClick={next} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100" style={{ color: THEME.outline }}>›</button>
        </div>
        <div className="grid grid-cols-7 px-3 pt-3 pb-1">
          {DAYS.map(d => <div key={d} className="text-center text-xs font-bold uppercase tracking-wider py-1" style={{ color: THEME.outlineVariant }}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 px-3 pb-4 gap-y-1">
          {cells.map((day, i) => {
            if (!day) return <div key={\`e-\${i}\`} />;
            const ds = toDS(vy, vm, day), { isPast, isStart, isEnd, inRange, inHover } = state(ds);
            const isSel = isStart || isEnd, isIR = inRange || inHover;
            let bg = 'transparent', col = isPast ? THEME.outlineVariant : THEME.onSurface, fw = '500', br = '50%';
            if (isSel) { bg = THEME.primary; col = '#fff'; fw = '700'; }
            else if (isIR) { bg = \`\${THEME.primary}10\`; col = THEME.primary; br = '0'; }
            if (isStart && (inRange || inHover)) br = '50% 0 0 50%';
            if (isEnd && inRange) br = '0 50% 50% 0';
            return (
              <div key={ds} className="flex items-center justify-center" style={{ height: '38px' }}>
                <button disabled={isPast} onClick={() => click(ds)}
                  onMouseEnter={() => { if (selEnd && startDate && !isPast) setHover(ds); }}
                  onMouseLeave={() => setHover(null)}
                  className="w-9 h-9 text-sm flex items-center justify-center disabled:cursor-not-allowed"
                  style={{ background: bg, color: col, fontWeight: fw, borderRadius: br, fontSize: '13px' }}>
                  {day}
                </button>
              </div>
            );
          })}
        </div>
        <div className="px-5 pb-4 text-center">
          <p className="text-xs" style={{ color: THEME.outlineVariant }}>
            {!startDate ? 'Tap to select your arrival date' : !endDate ? 'Now tap your departure date' : '✓ Dates selected'}
          </p>
        </div>
      </div>
    </div>
  );
}`;
}

// ────────────────────────────────────────────────────────────
// GuestCounter
// ────────────────────────────────────────────────────────────

function generateGuestCounterComponent(): string {
  // BigGuestCounter is already in shared UI; this is a placeholder
  // in case additional guest-counter logic is needed
  return `// BigGuestCounter is defined in shared UI above`;
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
// MealPicker
// ────────────────────────────────────────────────────────────

function generateMealPickerComponent(): string {
  return `function MealPicker({ products, selections, onChange }) {
  return (
    <div className="space-y-3 mb-5">
      {products.map(m => {
        const q = selections[m.id] || 0;
        const pr = Object.values(m.price || {})?.[0]?.base_price;
        const pm = (m.parameters || [])[0];
        return (
          <div key={m.id} className="p-5 rounded-3xl" style={{
            background: q > 0 ? THEME.primary + '05' : THEME.surfaceContainerLowest,
            border: \`2px solid \${q > 0 ? THEME.primary : THEME.surfaceContainerHigh + '4D'}\`,
            boxShadow: '0 24px 40px rgba(0,0,0,0.04)',
          }}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="font-semibold text-sm" style={{ color: THEME.onSurface, fontFamily: THEME.serif }}>{m.name}</div>
                {pr > 0 && (
                  <div className="font-bold text-xs mt-0.5" style={{ color: THEME.secondary }}>
                    {fmtCurrency(pr)} <span className="font-normal" style={{ color: THEME.outline }}>/ {pm?.name || 'person'}</span>
                  </div>
                )}
              </div>
            </div>
            <CompactQtyPicker value={q} onChange={v => onChange(prev => ({ ...prev, [m.id]: v }))} min={0} />
          </div>
        );
      })}
    </div>
  );
}`;
}

// ────────────────────────────────────────────────────────────
// ActivityPicker
// ────────────────────────────────────────────────────────────

function generateActivityPickerComponent(): string {
  return `function ActivityPicker({ products, selections, onChange }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5 mb-6">
      {products.map(a => {
        const q = selections[a.id] || 0;
        const sel = q > 0;
        const pr = Object.values(a.price || {})?.[0]?.base_price;
        const free = !pr || pr === 0;
        const img = (a.images || [])[0]?.url;
        return (
          <div key={a.id} className="overflow-hidden transition-all duration-200" style={{
            background: THEME.surfaceContainerLowest, borderRadius: '2rem',
            border: \`2px solid \${sel ? THEME.primary : THEME.surfaceContainerHigh + '4D'}\`,
            boxShadow: sel ? '0 8px 32px rgba(0,0,0,0.12)' : '0 24px 40px rgba(0,0,0,0.04)',
          }}>
            <div className="relative overflow-hidden" style={{ height: '140px', background: THEME.surfaceContainerLow }}>
              {img ? <img src={img} alt={a.name} className="w-full h-full object-cover" /> : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-5xl opacity-20">🌲</span>
                </div>
              )}
              <div className="absolute top-3 right-3 px-3 py-1.5 rounded-xl font-bold text-sm text-white"
                style={{ background: free ? 'rgba(0,128,0,0.85)' : 'rgba(0,0,0,0.7)' }}>
                {free ? 'Free' : fmtCurrency(pr)}
              </div>
              {sel && (
                <div className="absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: THEME.primary }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                </div>
              )}
            </div>
            <div className="p-4" style={{ background: sel ? THEME.primary + '08' : 'transparent' }}>
              <div className="font-bold text-sm leading-tight mb-1" style={{ color: THEME.onSurface, fontFamily: THEME.serif }}>{a.name}</div>
              {a.details && <SafeHtml html={a.details} className="mb-3" />}
              <div className="pt-3" style={{ borderTop: \`1px solid \${THEME.outlineVariant}40\` }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-3 text-center" style={{ color: THEME.outline }}>
                  {free ? 'Add to Itinerary' : 'Quantity'}
                </p>
                <CompactQtyPicker value={q} onChange={v => onChange(prev => ({ ...prev, [a.id]: v }))} min={0} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}`;
}

// ────────────────────────────────────────────────────────────
// ContactForm
// ────────────────────────────────────────────────────────────

function generateContactFormComponent(): string {
  return `function ContactForm({ contact, onChange }) {
  const inputCls = 'w-full rounded-lg px-4 py-4 focus:outline-none focus:ring-2 transition-all text-base border-none';
  return (
    <div className="space-y-3.5 mb-5" style={{ paddingBottom: '80px' }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: THEME.outline }}>
            First Name <span style={{ color: THEME.error }}>*</span>
          </label>
          <input type="text" value={contact.first_name} onChange={e => onChange(p => ({ ...p, first_name: e.target.value }))}
            placeholder="Jane" className={inputCls}
            style={{ background: THEME.surfaceContainerHigh, color: THEME.onSurface }} />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: THEME.outline }}>
            Last Name <span style={{ color: THEME.error }}>*</span>
          </label>
          <input type="text" value={contact.last_name} onChange={e => onChange(p => ({ ...p, last_name: e.target.value }))}
            placeholder="Smith" className={inputCls}
            style={{ background: THEME.surfaceContainerHigh, color: THEME.onSurface }} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: THEME.outline }}>
          Email <span style={{ color: THEME.error }}>*</span>
        </label>
        <input type="email" value={contact.email} onChange={e => onChange(p => ({ ...p, email: e.target.value }))}
          placeholder="jane@example.com" className={inputCls}
          style={{ background: THEME.surfaceContainerHigh, color: THEME.onSurface }} />
      </div>
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: THEME.outline }}>
          Phone <span style={{ color: THEME.error }}>*</span>
        </label>
        <input type="tel" value={contact.phone} onChange={e => onChange(p => ({ ...p, phone: e.target.value }))}
          placeholder="+1 (555) 000-0000" className={inputCls}
          style={{ background: THEME.surfaceContainerHigh, color: THEME.onSurface }} />
      </div>
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: THEME.outline }}>
          Notes <span style={{ color: THEME.outlineVariant }}>(optional)</span>
        </label>
        <textarea rows={2} value={contact.notes || ''} onChange={e => onChange(p => ({ ...p, notes: e.target.value }))}
          placeholder="Anything else..." className={inputCls + ' resize-none'}
          style={{ background: THEME.surfaceContainerHigh, color: THEME.onSurface }} />
      </div>
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

  // Build step name list — use step.id as the step key
  const stepNames = funnel.steps.map((s) => s.id);
  const hasRooms = usedTemplates.has("guest-rooms");
  const hasMeals = usedTemplates.has("meal-picker");
  const hasActivities = usedTemplates.has("activity-picker");
  const hasContactForm = usedTemplates.has("contact-form");
  const hasInvoice = usedTemplates.has("invoice");
  const hasDatePicker = usedTemplates.has("date-picker");
  const hasGuestCounter = usedTemplates.has("guest-counter");

  // Build the ROOM_CAT_ID / MEAL_CAT_ID / ACTIVITY_CAT_ID constants
  const catConstants: string[] = [];
  if (catInfo.roomCatIds.length > 0) {
    catConstants.push(`const ROOM_CAT_IDS = [${catInfo.roomCatIds.join(", ")}];`);
  }
  if (catInfo.mealCatIds.length > 0) {
    catConstants.push(`const MEAL_CAT_IDS = [${catInfo.mealCatIds.join(", ")}];`);
  }
  if (catInfo.activityCatIds.length > 0) {
    catConstants.push(`const ACTIVITY_CAT_IDS = [${catInfo.activityCatIds.join(", ")}];`);
  }

  const lines: string[] = [];

  if (catConstants.length > 0) {
    lines.push(catConstants.join("\n"));
    lines.push(``);
  }

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
    lines.push(`  const [selectedMeals, setSelectedMeals] = useState({});`);
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
    lines.push(`  const [adults, setAdults] = useState(2);`);
    lines.push(`  const [children, setChildren] = useState(0);`);
    lines.push(`  const [childAges, setChildAges] = useState([]);`);
  }
  if (hasContactForm) {
    lines.push(`  const [contact, setContact] = useState({ first_name: '', last_name: '', email: '', phone: '', notes: '' });`);
  }
  lines.push(``);

  // --- Animation helper ---
  lines.push(`  const animRef = useRef(null);`);
  lines.push(`  const goTo = useCallback(ns => {`);
  lines.push(`    if (animRef.current) clearTimeout(animRef.current);`);
  lines.push(`    setAnimating(true);`);
  lines.push(`    animRef.current = setTimeout(() => {`);
  lines.push(`      setStep(ns); setAnimating(false); setError(null);`);
  lines.push(`      window.scrollTo({ top: 0, behavior: 'smooth' });`);
  lines.push(`    }, 180);`);
  lines.push(`  }, []);`);
  lines.push(`  useEffect(() => () => { if (animRef.current) clearTimeout(animRef.current); }, []);`);
  lines.push(``);

  // --- childAges sync effect ---
  if (hasGuestCounter) {
    lines.push(`  useEffect(() => { setChildAges(p => { const n = [...p]; while (n.length < children) n.push(8); return n.slice(0, children); }); }, [children]);`);
    lines.push(``);
  }

  // --- SDK init effect ---
  lines.push(`  // ── Everybooking API init (live mode) ──`);
  lines.push(`  useEffect(() => {`);
  lines.push(`    (async () => {`);
  lines.push(`      if (!window.__EverybookingAPI) { setError('Booking system unavailable.'); setLoading(false); return; }`);
  lines.push(`      apiRef.current = window.__EverybookingAPI;`);
  lines.push(`      try {`);
  lines.push(`        await apiRef.current.ready();`);
  lines.push(`        const cats = await apiRef.current.getCategories();`);

  // Category-based product fetching — always use .find(c => c.id === ID)?.products
  // Never fall back to positional indexing (cats[0], cats[1], etc.)
  if (hasRooms) {
    if (catInfo.roomCatIds.length === 1) {
      lines.push(`        setRoomProducts(cats.find(c => c.id === ${catInfo.roomCatIds[0]})?.products || []);`);
    } else if (catInfo.roomCatIds.length > 1) {
      lines.push(`        setRoomProducts(ROOM_CAT_IDS.flatMap(id => cats.find(c => c.id === id)?.products || []));`);
    } else {
      // No categoryId configured — warn but use empty array; user must configure categoryId
      lines.push(`        // WARNING: No categoryId configured for rooms. Set categoryId in widget config.`);
      lines.push(`        setRoomProducts([]);`);
    }
  }
  if (hasMeals) {
    if (catInfo.mealCatIds.length === 1) {
      lines.push(`        setMealProducts(cats.find(c => c.id === ${catInfo.mealCatIds[0]})?.products || []);`);
    } else if (catInfo.mealCatIds.length > 1) {
      lines.push(`        setMealProducts(MEAL_CAT_IDS.flatMap(id => cats.find(c => c.id === id)?.products || []));`);
    } else {
      lines.push(`        // WARNING: No categoryId configured for meals. Set categoryId in widget config.`);
      lines.push(`        setMealProducts([]);`);
    }
  }
  if (hasActivities) {
    if (catInfo.activityCatIds.length === 1) {
      lines.push(`        setActivityProducts(cats.find(c => c.id === ${catInfo.activityCatIds[0]})?.products || []);`);
    } else if (catInfo.activityCatIds.length > 1) {
      lines.push(`        setActivityProducts(ACTIVITY_CAT_IDS.flatMap(id => cats.find(c => c.id === id)?.products || []));`);
    } else {
      lines.push(`        // WARNING: No categoryId configured for activities. Set categoryId in widget config.`);
      lines.push(`        setActivityProducts([]);`);
    }
  }

  lines.push(`        setSdkReady(true);`);
  lines.push(`      } catch (e) {`);
  lines.push(`        console.error('[init]', e);`);
  lines.push(`        setError('Failed to load. Please refresh.');`);
  lines.push(`      } finally {`);
  lines.push(`        setLoading(false);`);
  lines.push(`      }`);
  lines.push(`    })();`);
  lines.push(`  }, []);`);
  lines.push(``);

  // --- Availability check for rooms ---
  if (hasRooms && hasDatePicker) {
    lines.push(`  // ── Check availability when on rooms step ──`);
    lines.push(`  useEffect(() => {`);
    lines.push(`    if (step !== '${findStepIdForTemplate(funnel, "guest-rooms")}' || !startDate || roomProducts.length === 0 || !apiRef.current) return;`);
    lines.push(`    setCheckingAvail(true);`);
    lines.push(`    Promise.all(roomProducts.map(async p => {`);
    lines.push(`      try { return [p.id, await apiRef.current.getAvailability(p.id, { startDate, endDate: endDate || startDate })]; }`);
    lines.push(`      catch { return [p.id, { available: true, unlimited: true }]; }`);
    lines.push(`    })).then(r => { setAvailability(Object.fromEntries(r)); setCheckingAvail(false); });`);
    lines.push(`  }, [step, startDate, endDate, roomProducts]);`);
    lines.push(``);
  }

  // --- Room change handler ---
  if (hasRooms) {
    lines.push(`  function handleRoomChange(pid, data) {`);
    lines.push(`    setRoomSelections(p => { const n = { ...p }; if (data === null) delete n[pid]; else n[pid] = data; return n; });`);
    lines.push(`  }`);
    lines.push(`  const selRoomCount = Object.values(roomSelections).reduce((s, v) => s + (v?.qty || 0), 0);`);
    lines.push(``);
  }

  // --- Nights calculation ---
  if (hasDatePicker) {
    lines.push(`  const nights = useMemo(() => {`);
    lines.push(`    if (!startDate || !endDate) return 0;`);
    lines.push(`    return Math.max(0, (new Date(endDate) - new Date(startDate)) / 86400000);`);
    lines.push(`  }, [startDate, endDate]);`);
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
    lines.push(`    const api = apiRef.current;`);
    lines.push(`    if (!api) { setError('Booking system unavailable.'); return; }`);
    lines.push(`    setSubmitting(true); setError(null);`);
    lines.push(`    try {`);
    lines.push(`      const products = [];`);
    if (hasRooms) {
      lines.push(`      roomProducts.forEach(product => {`);
      lines.push(`        const sel = roomSelections[product.id];`);
      lines.push(`        if (!sel || sel.qty <= 0) return;`);
      lines.push(`        const q = { ...initQuantities(product), ...sel.quantities };`);
      lines.push(`        (product.parameters || []).forEach(p => {`);
      lines.push(`          if (p.controls_inventory) q[p.report_id] = clampQuantity(sel.qty, p);`);
      lines.push(`        });`);
      lines.push(`        const hi = (product.parameters || []).some(p => p.controls_inventory);`);
      lines.push(`        if (!hi) { buildParameterTree(product).roots.forEach(r => { q[r.report_id] = sel.qty; }); }`);
      lines.push(`        const e = {`);
      lines.push(`          sku: product.sku, startDate, endDate: endDate || startDate,`);
      lines.push(`          quantities: q, bookingUnit: product.booking_unit,`);
      lines.push(`        };`);
      lines.push(`        if (sel.units?.length > 0) e.units = sel.units.map(u => ({ unitId: u.unitId, adults: u.adults || [], children: u.children || [] }));`);
      lines.push(`        products.push(e);`);
      lines.push(`      });`);
    }
    if (hasMeals) {
      lines.push(`      Object.entries(selectedMeals).forEach(([id, qty]) => {`);
      lines.push(`        if (qty <= 0) return;`);
      lines.push(`        const p = mealProducts.find(m => m.id === parseInt(id));`);
      if (hasGuestCounter) {
        lines.push(`        if (p) products.push(...buildProductEntries(p, qty, startDate, endDate, childAges));`);
      } else {
        lines.push(`        if (p) products.push(...buildProductEntries(p, qty, startDate, endDate));`);
      }
      lines.push(`      });`);
    }
    if (hasActivities) {
      lines.push(`      Object.entries(selectedActivities).forEach(([id, qty]) => {`);
      lines.push(`        if (qty <= 0) return;`);
      lines.push(`        const p = activityProducts.find(a => a.id === parseInt(id));`);
      if (hasGuestCounter) {
        lines.push(`        if (p) products.push(...buildProductEntries(p, qty, startDate, endDate, childAges));`);
      } else {
        lines.push(`        if (p) products.push(...buildProductEntries(p, qty, startDate, endDate));`);
      }
      lines.push(`      });`);
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
    lines.push(`    } catch (e) {`);
    lines.push(`      console.error('[invoice]', e);`);
    lines.push(`      setError('Failed to generate quote.');`);
    lines.push(`    } finally {`);
    lines.push(`      setSubmitting(false);`);
    lines.push(`    }`);
    lines.push(`  }`);
    lines.push(``);

    // --- handleComplete ---
    lines.push(`  async function handleComplete() {`);
    lines.push(`    const api = apiRef.current;`);
    lines.push(`    if (!api) { setError('Booking system unavailable.'); return; }`);
    lines.push(`    setSubmitting(true); setError(null);`);
    lines.push(`    try {`);
    lines.push(`      const r = await api.completeBooking();`);
    lines.push(`      setBookingRef(r.booking_reference || r.booking_id || 'REF-' + Date.now());`);
    lines.push(`      goTo('confirmation');`);
    lines.push(`    } catch (e) {`);
    lines.push(`      console.error('[complete]', e);`);
    lines.push(`      setError('Failed to complete booking.');`);
    lines.push(`    } finally {`);
    lines.push(`      setSubmitting(false);`);
    lines.push(`    }`);
    lines.push(`  }`);
    lines.push(``);
  }

  // --- Progress calculation ---
  lines.push(`  const stepOrder = [${stepNames.map((s) => `'${s}'`).join(", ")}];`);
  lines.push(`  const currentIdx = stepOrder.indexOf(step);`);
  lines.push(`  const pPct = stepOrder.length > 1 && currentIdx >= 0 ? Math.round((currentIdx / (stepOrder.length - 1)) * 100) : 0;`);
  lines.push(``);

  // --- Loading state ---
  lines.push(`  if (loading) return (`);
  lines.push(`    <div className="min-h-screen flex items-center justify-center" style={{ background: THEME.surface, fontFamily: THEME.sans }}>`);
  lines.push(`      <div className="text-center">`);
  lines.push(`        <div className="w-12 h-12 border-t-transparent rounded-full animate-spin mx-auto mb-4"`);
  lines.push(`          style={{ borderWidth: '3px', borderStyle: 'solid', borderColor: THEME.primary, borderTopColor: 'transparent' }} />`);
  lines.push(`        <p style={{ fontFamily: THEME.serif, color: THEME.primary }} className="font-semibold text-lg">Loading...</p>`);
  lines.push(`      </div>`);
  lines.push(`    </div>`);
  lines.push(`  );`);
  lines.push(``);

  // --- Render ---
  lines.push(`  return (`);
  lines.push(`    <div className="min-h-screen" style={{ background: GRADIENT_BG, fontFamily: THEME.sans }}>`);

  // Header + progress bar
  lines.push(`      <div className="sticky top-0 z-40" style={{ background: 'rgba(255,255,255,0.90)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>`);
  lines.push(`        <div className="max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-center">`);
  lines.push(`          <span className="text-xl font-bold italic" style={{ fontFamily: THEME.serif, color: THEME.primary }}>${escapeJsx(funnel.name)}</span>`);
  lines.push(`        </div>`);
  lines.push(`        <div className="h-1 w-full" style={{ background: THEME.surfaceContainerHigh }}>`);
  lines.push(`          <div className="h-full transition-all duration-500" style={{ width: pPct + '%', background: THEME.primary }} />`);
  lines.push(`        </div>`);
  lines.push(`      </div>`);

  // Error banner
  lines.push(`      {error && (`);
  lines.push(`        <div className="max-w-2xl lg:max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">`);
  lines.push(`          <div className="p-4 rounded-2xl text-sm flex items-center gap-2" style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: THEME.error }}>`);
  lines.push(`            <span>⚠</span><span className="flex-1">{error}</span>`);
  lines.push(`            <button onClick={() => setError(null)} className="ml-auto font-bold opacity-60 hover:opacity-100">✕</button>`);
  lines.push(`          </div>`);
  lines.push(`        </div>`);
  lines.push(`      )}`);

  // Animation wrapper
  lines.push(`      <div className={\`transition-opacity duration-200 \${animating ? 'opacity-0' : 'opacity-100'}\`}>`);
  lines.push(``);

  // --- Step rendering ---
  for (let i = 0; i < funnel.steps.length; i++) {
    const step = funnel.steps[i];
    const prevStepId = i > 0 ? funnel.steps[i - 1].id : null;
    const nextStepId = i < funnel.steps.length - 1 ? funnel.steps[i + 1].id : null;

    lines.push(`        {step === '${step.id}' && (`);

    // Determine what widgets are in this step to generate appropriate rendering
    const widgetTemplates = step.widgets.map((w) => w.templateId);

    if (widgetTemplates.includes("invoice")) {
      // Invoice step — special rendering
      const invoiceCfg = step.widgets.find((w) => w.templateId === "invoice")?.config as Record<string, unknown> | undefined;
      const currency = (invoiceCfg?.currency as string) || "CAD";

      lines.push(`          <div className="max-w-2xl lg:max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">`);
      lines.push(`            <div className="mb-6">`);
      lines.push(`              <div className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: THEME.secondary }}>YOUR QUOTE</div>`);
      lines.push(`              <h2 className="text-2xl lg:text-3xl font-bold" style={{ fontFamily: THEME.serif, color: THEME.onSurface }}>${escapeJsx(step.title)}</h2>`);
      lines.push(`            </div>`);
      lines.push(`            <InvoiceWidget`);
      lines.push(`              sessionId={apiRef.current?.getSessionId()}`);
      lines.push(`              currencyId="${currency}"`);
      lines.push(`              className="rounded-3xl p-6 mb-5"`);
      lines.push(`            />`);
      lines.push(`            <button`);
      lines.push(`              onClick={handleComplete} disabled={submitting}`);
      lines.push(`              className="w-full py-4 text-white font-bold text-sm uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed"`);
      lines.push(`              style={{ background: THEME.primary, borderRadius: '9999px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}`);
      lines.push(`            >`);
      lines.push(`              {submitting ? 'Securing Your Booking...' : 'CONFIRM & SECURE MY BOOKING'}`);
      lines.push(`            </button>`);
      lines.push(`          </div>`);
    } else {
      // Normal step — use StepShell with widgets
      const isWide = widgetTemplates.includes("guest-rooms") || widgetTemplates.includes("activity-picker");
      const stepNum = String(i + 1).padStart(2, "0");
      const stepLabel = deriveStepLabel(step);

      lines.push(`          <StepShell stepNum="${stepNum}" stepLabel="${escapeJsx(stepLabel)}" title="${escapeJsx(step.title)}" ${isWide ? "wide" : ""}>`);

      // Render each widget
      for (const widget of step.widgets) {
        lines.push(generateWidgetInStep(widget, funnel, step, prevStepId, nextStepId));
      }

      // Bottom navigation
      const isLastBeforeInvoice = nextStepId && funnel.steps.find((s) => s.id === nextStepId)?.widgets.some((w) => w.templateId === "invoice");
      const isContactStep = widgetTemplates.includes("contact-form");

      if (isContactStep && isLastBeforeInvoice) {
        // Contact step before invoice — generate invoice on next
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
          lines.push(`              onNext={() => goTo('${nextStepId}')}`);
        }
        lines.push(`              nextLabel="${escapeJsx(step.navigation.nextLabel || "Continue")}"`);
        lines.push(`            />`);
      }

      lines.push(`          </StepShell>`);
    }

    lines.push(`        )}`);
    lines.push(``);
  }

  // --- Confirmation step (always append) ---
  lines.push(`        {step === 'confirmation' && (`);
  lines.push(`          <div className="max-w-2xl lg:max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">`);
  lines.push(`            <div className="p-6 rounded-3xl" style={{ background: THEME.surfaceContainerLowest, border: \`1px solid \${THEME.surfaceContainerHigh}4D\` }}>`);
  lines.push(`              <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: THEME.serif, color: THEME.onSurface }}>Booking Confirmed!</h2>`);
  lines.push(`              {bookingRef && (`);
  lines.push(`                <div className="my-3 p-3 rounded-2xl flex items-center gap-2" style={{ background: THEME.primary + '08', border: \`1px solid \${THEME.primary}20\` }}>`);
  lines.push(`                  <span className="font-bold text-sm" style={{ color: THEME.primary }}>Reference:</span>`);
  lines.push(`                  <span className="font-mono font-bold text-sm" style={{ color: THEME.onPrimaryContainer }}>{bookingRef}</span>`);
  lines.push(`                </div>`);
  lines.push(`              )}`);
  lines.push(`              <p className="text-sm" style={{ color: THEME.onSurfaceVariant }}>Thank you! We'll be in touch soon.</p>`);
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
  step: Step,
  _prevStepId: string | null,
  _nextStepId: string | null,
): string {
  const cfg = widget.config as Record<string, unknown>;

  switch (widget.templateId) {
    case "date-picker":
      return [
        `            <DateRangePicker startDate={startDate} endDate={endDate} onStartDate={setStartDate} onEndDate={setEndDate} />`,
        `            {nights > 0 && (`,
        `              <div className="mb-5 p-3.5 rounded-2xl flex items-center gap-2.5 text-sm font-semibold"`,
        `                style={{ background: THEME.primary + '08', border: \`1px solid \${THEME.primary}20\`, color: THEME.onPrimaryContainer }}>`,
        `                <strong>{nights}</strong> night{nights !== 1 ? 's' : ''} selected`,
        `              </div>`,
        `            )}`,
      ].join("\n");

    case "guest-counter": {
      const maxAdults = (cfg.maxAdults as number) || 400;
      const maxChildren = (cfg.maxChildren as number) || 200;
      return [
        `            <div className="space-y-3 mb-6">`,
        `              <BigGuestCounter label="Adults (18+)" value={adults} min={1} max={${maxAdults}} onChange={setAdults} />`,
        `              <BigGuestCounter label="Children (under 18)" value={children} min={0} max={${maxChildren}} onChange={setChildren} />`,
        `            </div>`,
      ].join("\n");
    }

    case "guest-rooms":
      return [
        `            {checkingAvail && (`,
        `              <div className="mb-4 flex items-center gap-2 p-3.5 rounded-2xl text-sm" style={{ background: THEME.primary + '08', border: \`1px solid \${THEME.primary}20\` }}>`,
        `                <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: THEME.primary, borderTopColor: 'transparent' }} />`,
        `                <span style={{ color: THEME.onPrimaryContainer }}>Checking availability...</span>`,
        `              </div>`,
        `            )}`,
        `            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5 mb-6">`,
        `              {roomProducts.map(p => (`,
        `                <RoomCard key={p.id} product={p} selection={roomSelections[p.id]} onSelectionChange={handleRoomChange} availability={availability[p.id]} />`,
        `              ))}`,
        `            </div>`,
        `            {selRoomCount > 0 && (`,
        `              <div className="mb-4 p-3.5 rounded-2xl flex items-center gap-2.5" style={{ background: THEME.primary + '08', border: \`1px solid \${THEME.primary}20\` }}>`,
        `                <span className="text-sm font-semibold" style={{ color: THEME.onPrimaryContainer }}>{selRoomCount} room{selRoomCount !== 1 ? 's' : ''} selected</span>`,
        `              </div>`,
        `            )}`,
      ].join("\n");

    case "meal-picker":
      return `            <MealPicker products={mealProducts} selections={selectedMeals} onChange={setSelectedMeals} />`;

    case "activity-picker":
      return `            <ActivityPicker products={activityProducts} selections={selectedActivities} onChange={setSelectedActivities} />`;

    case "contact-form":
      return `            <ContactForm contact={contact} onChange={setContact} />`;

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

function deriveStepLabel(step: Step): string {
  const templates = step.widgets.map((w) => w.templateId);
  if (templates.includes("date-picker")) return "DATES";
  if (templates.includes("guest-counter")) return "GUESTS";
  if (templates.includes("guest-rooms")) return "ROOMS";
  if (templates.includes("meal-picker")) return "DINING";
  if (templates.includes("activity-picker")) return "ACTIVITIES";
  if (templates.includes("contact-form")) return "DETAILS";
  if (templates.includes("invoice")) return "QUOTE";
  if (templates.includes("option-picker")) return "OPTIONS";
  return step.title.toUpperCase().slice(0, 12);
}
