import type { FunnelDefinition, Step, WidgetInstance, ThemeConfig } from "./types";

/**
 * Generates a complete JSX funnel file string from a FunnelDefinition.
 * The output is designed to work with the Everybooking bundler which
 * auto-injects React imports. The generated file follows the
 * wilderness-edge-funnel.jsx pattern.
 */
export function generateFunnelJSX(funnel: FunnelDefinition): string {
  const lines: string[] = [];

  // --- Imports (no React — bundler auto-injects) ---
  lines.push(`import InvoiceWidget from 'widget-sdk/InvoiceWidget';`);
  lines.push(`import { buildParameterTree, initQuantities, clampQuantity } from 'widget-sdk/utils';`);
  lines.push(``);

  // --- Theme constants ---
  lines.push(`// ── Theme ──────────────────────────────────────────`);
  lines.push(generateThemeBlock(funnel.theme));
  lines.push(``);

  // --- Helper components ---
  lines.push(`// ── Shared UI helpers ──────────────────────────────`);
  lines.push(generateSharedHelpers(funnel.theme));
  lines.push(``);

  // --- Widget components (one per template type used) ---
  const usedTemplates = new Set<string>();
  for (const step of funnel.steps) {
    for (const widget of step.widgets) {
      usedTemplates.add(widget.templateId);
    }
  }

  lines.push(`// ── Widget Components ──────────────────────────────`);

  if (usedTemplates.has("date-picker")) {
    lines.push(generateDateRangePickerComponent(funnel.theme));
    lines.push(``);
  }
  if (usedTemplates.has("guest-counter")) {
    lines.push(generateGuestCounterComponent(funnel.theme));
    lines.push(``);
  }
  if (usedTemplates.has("option-picker")) {
    lines.push(generateOptionPickerComponent(funnel.theme));
    lines.push(``);
  }
  if (usedTemplates.has("guest-rooms")) {
    lines.push(generateGuestRoomsComponent(funnel.theme));
    lines.push(``);
  }
  if (usedTemplates.has("meal-picker")) {
    lines.push(generateMealPickerComponent(funnel.theme));
    lines.push(``);
  }
  if (usedTemplates.has("activity-picker")) {
    lines.push(generateActivityPickerComponent(funnel.theme));
    lines.push(``);
  }
  if (usedTemplates.has("contact-form")) {
    lines.push(generateContactFormComponent(funnel.theme));
    lines.push(``);
  }

  // --- Main funnel component ---
  lines.push(`// ── Main Funnel ───────────────────────────────────`);
  lines.push(generateMainFunnel(funnel));

  return lines.join("\n");
}

// ────────────────────────────────────────────────────────────
// Theme block
// ────────────────────────────────────────────────────────────

function generateThemeBlock(theme: ThemeConfig): string {
  return `const THEME = {
  primary: '${theme.primaryColor}',
  secondary: '${theme.secondaryColor}',
  surface: '${theme.surfaceColor}',
  headlineFont: '${theme.headlineFont}',
  bodyFont: '${theme.bodyFont}',
  borderRadius: ${theme.borderRadius},
  cardStyle: '${theme.cardStyle}',
};

const primaryLight = THEME.primary + '1a'; // 10% opacity trick`;
}

// ────────────────────────────────────────────────────────────
// Shared helpers
// ────────────────────────────────────────────────────────────

function generateSharedHelpers(theme: ThemeConfig): string {
  return `function StepShell({ title, children, onNext, onBack, nextLabel, backLabel }) {
  return (
    <div style={{ fontFamily: THEME.bodyFont, maxWidth: 720, margin: '0 auto', padding: 24 }}>
      <h2 style={{ fontFamily: THEME.headlineFont, fontSize: 24, marginBottom: 20, color: '#1a1a1a' }}>
        {title}
      </h2>
      {children}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32, gap: 12 }}>
        {onBack ? (
          <button
            onClick={onBack}
            style={{
              padding: '12px 28px',
              borderRadius: THEME.borderRadius,
              border: '1px solid #ccc',
              background: '#fff',
              cursor: 'pointer',
              fontFamily: THEME.bodyFont,
              fontSize: 15,
            }}
          >
            {backLabel || 'Back'}
          </button>
        ) : <div />}
        {onNext && (
          <button
            onClick={onNext}
            style={{
              padding: '12px 28px',
              borderRadius: THEME.borderRadius,
              border: 'none',
              background: THEME.primary,
              color: '#fff',
              cursor: 'pointer',
              fontFamily: THEME.bodyFont,
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            {nextLabel || 'Continue'}
          </button>
        )}
      </div>
    </div>
  );
}

function CompactQtyPicker({ value, onChange, min = 0, max = 99, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {label && <span style={{ fontSize: 14, minWidth: 60 }}>{label}</span>}
      <button
        onClick={() => onChange(clampQuantity(value - 1, min, max))}
        disabled={value <= min}
        style={{
          width: 32, height: 32, borderRadius: '50%',
          border: '1px solid #ccc', background: '#fff',
          cursor: value > min ? 'pointer' : 'default',
          fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >-</button>
      <span style={{ minWidth: 24, textAlign: 'center', fontSize: 16, fontWeight: 600 }}>{value}</span>
      <button
        onClick={() => onChange(clampQuantity(value + 1, min, max))}
        disabled={value >= max}
        style={{
          width: 32, height: 32, borderRadius: '50%',
          border: '1px solid #ccc', background: '#fff',
          cursor: value < max ? 'pointer' : 'default',
          fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >+</button>
    </div>
  );
}`;
}

// ────────────────────────────────────────────────────────────
// DateRangePicker
// ────────────────────────────────────────────────────────────

function generateDateRangePickerComponent(theme: ThemeConfig): string {
  return `function DateRangePicker({ checkIn, checkOut, onChange }) {
  const fmt = (d) => d ? new Date(d).toISOString().slice(0, 10) : '';
  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 180 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: '#555' }}>
          Check-in
        </label>
        <input
          type="date"
          value={fmt(checkIn)}
          onChange={(e) => onChange({ checkIn: e.target.value, checkOut })}
          style={{
            width: '100%', padding: '10px 12px',
            borderRadius: THEME.borderRadius, border: '1px solid #ccc',
            fontSize: 15, fontFamily: THEME.bodyFont,
          }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 180 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: '#555' }}>
          Check-out
        </label>
        <input
          type="date"
          value={fmt(checkOut)}
          min={fmt(checkIn)}
          onChange={(e) => onChange({ checkIn, checkOut: e.target.value })}
          style={{
            width: '100%', padding: '10px 12px',
            borderRadius: THEME.borderRadius, border: '1px solid #ccc',
            fontSize: 15, fontFamily: THEME.bodyFont,
          }}
        />
      </div>
    </div>
  );
}`;
}

// ────────────────────────────────────────────────────────────
// GuestCounter (BigGuestCounter style)
// ────────────────────────────────────────────────────────────

function generateGuestCounterComponent(theme: ThemeConfig): string {
  return `function BigGuestCounter({ guests, onChange, maxAdults = 10, maxChildren = 6, showInfants = false }) {
  const update = (key, val) => onChange({ ...guests, [key]: clampQuantity(val, 0, key === 'adults' ? maxAdults : maxChildren) });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: 16, background: '#fff', borderRadius: THEME.borderRadius,
        border: '1px solid #e5e5e5',
      }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Adults</div>
          <div style={{ fontSize: 13, color: '#777' }}>Age 13+</div>
        </div>
        <CompactQtyPicker value={guests.adults || 0} onChange={(v) => update('adults', v)} min={1} max={maxAdults} />
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: 16, background: '#fff', borderRadius: THEME.borderRadius,
        border: '1px solid #e5e5e5',
      }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Children</div>
          <div style={{ fontSize: 13, color: '#777' }}>Age 2-12</div>
        </div>
        <CompactQtyPicker value={guests.children || 0} onChange={(v) => update('children', v)} min={0} max={maxChildren} />
      </div>
      {showInfants && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: 16, background: '#fff', borderRadius: THEME.borderRadius,
          border: '1px solid #e5e5e5',
        }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Infants</div>
            <div style={{ fontSize: 13, color: '#777' }}>Under 2</div>
          </div>
          <CompactQtyPicker value={guests.infants || 0} onChange={(v) => update('infants', v)} min={0} max={4} />
        </div>
      )}
    </div>
  );
}`;
}

// ────────────────────────────────────────────────────────────
// OptionPicker
// ────────────────────────────────────────────────────────────

function generateOptionPickerComponent(theme: ThemeConfig): string {
  return `function OptionPicker({ options, selected, onSelect }) {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {(options || []).map((opt, i) => {
        const active = selected === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onSelect(opt.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 18px',
              borderRadius: THEME.borderRadius,
              border: active ? \`2px solid \${THEME.primary}\` : '1px solid #ddd',
              background: active ? primaryLight : '#fff',
              cursor: 'pointer', textAlign: 'left', width: '100%',
            }}
          >
            <span style={{
              width: 32, height: 32, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: active ? THEME.primary : '#eee',
              color: active ? '#fff' : '#555',
              fontWeight: 700, fontSize: 14,
            }}>
              {letters[i] || i + 1}
            </span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{opt.label}</div>
              {opt.description && <div style={{ fontSize: 13, color: '#777', marginTop: 2 }}>{opt.description}</div>}
            </div>
          </button>
        );
      })}
    </div>
  );
}`;
}

// ────────────────────────────────────────────────────────────
// GuestRooms (RoomCard + ImageCarousel + UniqueInventoryPicker)
// ────────────────────────────────────────────────────────────

function generateGuestRoomsComponent(theme: ThemeConfig): string {
  return `function ImageCarousel({ images }) {
  const [idx, setIdx] = useState(0);
  if (!images || images.length === 0) return null;
  return (
    <div style={{ position: 'relative', width: '100%', height: 200, borderRadius: THEME.borderRadius, overflow: 'hidden' }}>
      <img src={images[idx]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      {images.length > 1 && (
        <>
          <button onClick={() => setIdx((idx - 1 + images.length) % images.length)}
            style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', color: '#fff', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer' }}>
            &lt;
          </button>
          <button onClick={() => setIdx((idx + 1) % images.length)}
            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', color: '#fff', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer' }}>
            &gt;
          </button>
        </>
      )}
    </div>
  );
}

function UniqueInventoryPicker({ stock, value, onChange }) {
  return (
    <CompactQtyPicker value={value} onChange={onChange} min={0} max={stock} />
  );
}

function RoomCard({ room, qty, onQtyChange }) {
  return (
    <div style={{
      borderRadius: THEME.borderRadius, overflow: 'hidden',
      border: qty > 0 ? \`2px solid \${THEME.primary}\` : '1px solid #e5e5e5',
      background: '#fff',
    }}>
      <ImageCarousel images={[room.imageUrl]} />
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <h3 style={{ fontFamily: THEME.headlineFont, fontSize: 17, fontWeight: 600, margin: 0 }}>{room.name}</h3>
            <div style={{ fontSize: 13, color: '#777', marginTop: 4 }}>{room.description}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {(room.tags || []).map((tag) => (
            <span key={tag} style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 99,
              background: primaryLight, color: THEME.primary, fontWeight: 500,
            }}>{tag}</span>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: THEME.primary }}>
            {room.currency} {room.pricePerNight}<span style={{ fontSize: 13, fontWeight: 400, color: '#777' }}>/night</span>
          </div>
          <UniqueInventoryPicker stock={room.stock} value={qty} onChange={onQtyChange} />
        </div>
      </div>
    </div>
  );
}

function RoomSelector({ rooms, selections, onChange }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300, 1fr))', gap: 20 }}>
      {(rooms || []).map((room) => (
        <RoomCard
          key={room.id}
          room={room}
          qty={selections[room.id] || 0}
          onQtyChange={(v) => onChange({ ...selections, [room.id]: v })}
        />
      ))}
    </div>
  );
}`;
}

// ────────────────────────────────────────────────────────────
// MealPicker
// ────────────────────────────────────────────────────────────

function generateMealPickerComponent(theme: ThemeConfig): string {
  return `function MealPicker({ meals, selections, onChange, priceLabel = 'per person' }) {
  const categories = [...new Set((meals || []).map((m) => m.category))];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {categories.map((cat) => (
        <div key={cat}>
          <h3 style={{
            fontFamily: THEME.headlineFont, fontSize: 16, fontWeight: 600,
            textTransform: 'capitalize', marginBottom: 12, color: '#333',
          }}>{cat}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {meals.filter((m) => m.category === cat).map((meal) => {
              const qty = selections[meal.id] || 0;
              return (
                <div
                  key={meal.id}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: 14, borderRadius: THEME.borderRadius,
                    border: qty > 0 ? \`2px solid \${THEME.primary}\` : '1px solid #e5e5e5',
                    background: qty > 0 ? primaryLight : '#fff',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{meal.name}</div>
                    <div style={{ fontSize: 13, color: '#777', marginTop: 2 }}>{meal.description}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: THEME.primary, marginTop: 4 }}>
                      {meal.currency} {meal.pricePerPerson} <span style={{ fontWeight: 400, color: '#999' }}>{priceLabel}</span>
                    </div>
                  </div>
                  <CompactQtyPicker value={qty} onChange={(v) => onChange({ ...selections, [meal.id]: v })} min={0} max={20} />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}`;
}

// ────────────────────────────────────────────────────────────
// ActivityPicker
// ────────────────────────────────────────────────────────────

function generateActivityPickerComponent(theme: ThemeConfig): string {
  return `function ActivityCard({ activity, qty, onQtyChange }) {
  return (
    <div style={{
      borderRadius: THEME.borderRadius, overflow: 'hidden',
      border: qty > 0 ? \`2px solid \${THEME.primary}\` : '1px solid #e5e5e5',
      background: '#fff',
    }}>
      <img src={activity.imageUrl} alt={activity.name} style={{ width: '100%', height: 160, objectFit: 'cover' }} />
      <div style={{ padding: 14 }}>
        <h3 style={{ fontFamily: THEME.headlineFont, fontSize: 16, fontWeight: 600, margin: '0 0 4px' }}>
          {activity.name}
        </h3>
        <div style={{ fontSize: 13, color: '#777', marginBottom: 8 }}>{activity.description}</div>
        <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>
          Duration: {activity.durationMinutes} min &middot; Max {activity.maxParticipants} people
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: THEME.primary }}>
            {activity.currency} {activity.pricePerPerson}<span style={{ fontSize: 13, fontWeight: 400, color: '#777' }}>/person</span>
          </div>
          <CompactQtyPicker value={qty} onChange={onQtyChange} min={0} max={activity.maxParticipants} />
        </div>
      </div>
    </div>
  );
}

function ActivityPicker({ activities, selections, onChange }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280, 1fr))', gap: 20 }}>
      {(activities || []).map((act) => (
        <ActivityCard
          key={act.id}
          activity={act}
          qty={selections[act.id] || 0}
          onQtyChange={(v) => onChange({ ...selections, [act.id]: v })}
        />
      ))}
    </div>
  );
}`;
}

// ────────────────────────────────────────────────────────────
// ContactForm
// ────────────────────────────────────────────────────────────

function generateContactFormComponent(theme: ThemeConfig): string {
  return `function ContactForm({ contactInfo, onChange, showPhone = true, showCompany = false, showNotes = false }) {
  const set = (key, val) => onChange({ ...contactInfo, [key]: val });
  const inputStyle = {
    width: '100%', padding: '10px 12px',
    borderRadius: THEME.borderRadius, border: '1px solid #ccc',
    fontSize: 15, fontFamily: THEME.bodyFont,
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: '#555' }}>First Name *</label>
          <input value={contactInfo.firstName || ''} onChange={(e) => set('firstName', e.target.value)} style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: '#555' }}>Last Name *</label>
          <input value={contactInfo.lastName || ''} onChange={(e) => set('lastName', e.target.value)} style={inputStyle} />
        </div>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: '#555' }}>Email *</label>
        <input type="email" value={contactInfo.email || ''} onChange={(e) => set('email', e.target.value)} style={inputStyle} />
      </div>
      {showPhone && (
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: '#555' }}>Phone</label>
          <input type="tel" value={contactInfo.phone || ''} onChange={(e) => set('phone', e.target.value)} style={inputStyle} />
        </div>
      )}
      {showCompany && (
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: '#555' }}>Company / Group Name</label>
          <input value={contactInfo.company || ''} onChange={(e) => set('company', e.target.value)} style={inputStyle} />
        </div>
      )}
      {showNotes && (
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: '#555' }}>Special Requests</label>
          <textarea rows={3} value={contactInfo.notes || ''} onChange={(e) => set('notes', e.target.value)}
            style={{ ...inputStyle, resize: 'vertical' }} />
        </div>
      )}
    </div>
  );
}`;
}

// ────────────────────────────────────────────────────────────
// Main funnel component
// ────────────────────────────────────────────────────────────

function generateMainFunnel(funnel: FunnelDefinition): string {
  const slug = funnel.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const componentName = funnel.name
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("")
    + "Funnel";

  const lines: string[] = [];

  // open component
  lines.push(`export default function ${componentName}() {`);

  // state declarations
  lines.push(`  const [step, setStep] = useState(0);`);
  lines.push(`  const [loading, setLoading] = useState(true);`);
  lines.push(`  const [categories, setCategories] = useState([]);`);
  lines.push(`  const [checkIn, setCheckIn] = useState('');`);
  lines.push(`  const [checkOut, setCheckOut] = useState('');`);
  lines.push(`  const [guests, setGuests] = useState({ adults: 2, children: 0, infants: 0 });`);
  lines.push(`  const [roomSelections, setRoomSelections] = useState({});`);
  lines.push(`  const [mealSelections, setMealSelections] = useState({});`);
  lines.push(`  const [activitySelections, setActivitySelections] = useState({});`);
  lines.push(`  const [contactInfo, setContactInfo] = useState({});`);
  lines.push(`  const [bookingId, setBookingId] = useState(null);`);
  lines.push(``);

  // API init effect
  lines.push(`  // ── Everybooking API init ──`);
  lines.push(`  useEffect(() => {`);
  lines.push(`    let mounted = true;`);
  lines.push(`    async function boot() {`);
  lines.push(`      try {`);
  lines.push(`        await api.ready();`);
  lines.push(`        const cats = await api.getCategories();`);
  lines.push(`        if (mounted) {`);
  lines.push(`          setCategories(cats);`);
  lines.push(`          setLoading(false);`);
  lines.push(`        }`);
  lines.push(`      } catch (err) {`);
  lines.push(`        console.error('Funnel init failed:', err);`);
  lines.push(`        if (mounted) setLoading(false);`);
  lines.push(`      }`);
  lines.push(`    }`);
  lines.push(`    boot();`);
  lines.push(`    return () => { mounted = false; };`);
  lines.push(`  }, []);`);
  lines.push(``);

  // sync booking helper
  lines.push(`  // ── Sync booking on changes ──`);
  lines.push(`  useEffect(() => {`);
  lines.push(`    if (!checkIn || !checkOut) return;`);
  lines.push(`    const params = buildParameterTree({`);
  lines.push(`      checkIn, checkOut, guests, roomSelections, mealSelections, activitySelections,`);
  lines.push(`    });`);
  lines.push(`    api.syncBooking(params).then((res) => {`);
  lines.push(`      if (res?.bookingId) setBookingId(res.bookingId);`);
  lines.push(`    }).catch(console.error);`);
  lines.push(`  }, [checkIn, checkOut, guests, roomSelections, mealSelections, activitySelections]);`);
  lines.push(``);

  // total steps
  const totalSteps = funnel.steps.length;
  lines.push(`  const totalSteps = ${totalSteps};`);
  lines.push(`  const goNext = () => setStep((s) => Math.min(s + 1, totalSteps - 1));`);
  lines.push(`  const goBack = () => setStep((s) => Math.max(s - 1, 0));`);
  lines.push(``);

  // loading guard
  lines.push(`  if (loading) {`);
  lines.push(`    return (`);
  lines.push(`      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, fontFamily: THEME.bodyFont }}>Loading...</div>`);
  lines.push(`    );`);
  lines.push(`  }`);
  lines.push(``);

  // progress bar
  lines.push(`  const progress = ((step + 1) / totalSteps) * 100;`);
  lines.push(``);

  // render
  lines.push(`  return (`);
  lines.push(`    <div style={{ fontFamily: THEME.bodyFont, background: THEME.surface, minHeight: '100vh' }}>`);
  lines.push(`      {/* Progress bar */}`);
  lines.push(`      <div style={{ height: 4, background: '#e5e5e5' }}>`);
  lines.push(`        <div style={{ height: '100%', width: progress + '%', background: THEME.primary, transition: 'width 0.3s' }} />`);
  lines.push(`      </div>`);
  lines.push(``);

  // step rendering
  for (let i = 0; i < funnel.steps.length; i++) {
    const step = funnel.steps[i];
    const isFirst = i === 0;
    const isLast = i === funnel.steps.length - 1;
    const nextLabel = step.navigation.nextLabel || "Continue";
    const backLabel = step.navigation.backLabel || "Back";

    lines.push(`      {step === ${i} && (`);
    lines.push(`        <StepShell`);
    lines.push(`          title="${escapeJsx(step.title)}"`);
    if (!isFirst) {
      lines.push(`          onBack={goBack}`);
      lines.push(`          backLabel="${escapeJsx(backLabel)}"`);
    }
    if (!isLast) {
      lines.push(`          onNext={goNext}`);
      lines.push(`          nextLabel="${escapeJsx(nextLabel)}"`);
    } else {
      lines.push(`          onNext={() => { api.submitBooking(bookingId).then(() => alert('Booking submitted!')).catch(console.error); }}`);
      lines.push(`          nextLabel="${escapeJsx(nextLabel)}"`);
    }
    lines.push(`        >`);

    // Render widgets in this step
    for (const widget of step.widgets) {
      lines.push(generateWidgetJSX(widget, funnel));
    }

    lines.push(`        </StepShell>`);
    lines.push(`      )}`);
    lines.push(``);
  }

  lines.push(`    </div>`);
  lines.push(`  );`);
  lines.push(`}`);

  return lines.join("\n");
}

// ────────────────────────────────────────────────────────────
// Per-widget JSX inside a step
// ────────────────────────────────────────────────────────────

function generateWidgetJSX(widget: WidgetInstance, funnel: FunnelDefinition): string {
  const cfg = widget.config as Record<string, unknown>;
  const title = (cfg.title as string) || "";

  switch (widget.templateId) {
    case "date-picker":
      return [
        `          {/* Date Range Picker */}`,
        title ? `          <h3 style={{ fontFamily: THEME.headlineFont, fontSize: 18, marginBottom: 12 }}>${escapeJsx(title)}</h3>` : "",
        `          <DateRangePicker`,
        `            checkIn={checkIn}`,
        `            checkOut={checkOut}`,
        `            onChange={({ checkIn: ci, checkOut: co }) => { setCheckIn(ci); setCheckOut(co); }}`,
        `          />`,
      ]
        .filter(Boolean)
        .join("\n");

    case "guest-counter": {
      const maxAdults = (cfg.maxAdults as number) || 10;
      const maxChildren = (cfg.maxChildren as number) || 6;
      const showInfants = cfg.showInfants !== false;
      return [
        `          {/* Guest Counter */}`,
        title ? `          <h3 style={{ fontFamily: THEME.headlineFont, fontSize: 18, margin: '24px 0 12px' }}>${escapeJsx(title)}</h3>` : "",
        `          <BigGuestCounter`,
        `            guests={guests}`,
        `            onChange={setGuests}`,
        `            maxAdults={${maxAdults}}`,
        `            maxChildren={${maxChildren}}`,
        `            showInfants={${showInfants}}`,
        `          />`,
      ]
        .filter(Boolean)
        .join("\n");
    }

    case "option-picker":
      return [
        `          {/* Option Picker */}`,
        title ? `          <h3 style={{ fontFamily: THEME.headlineFont, fontSize: 18, marginBottom: 12 }}>${escapeJsx(title)}</h3>` : "",
        `          <OptionPicker options={categories} selected={null} onSelect={() => {}} />`,
      ]
        .filter(Boolean)
        .join("\n");

    case "guest-rooms":
      return [
        `          {/* Room Selection */}`,
        `          <RoomSelector`,
        `            rooms={categories.find(c => c.type === 'rooms')?.items || categories}`,
        `            selections={roomSelections}`,
        `            onChange={setRoomSelections}`,
        `          />`,
      ].join("\n");

    case "meal-picker":
      return [
        `          {/* Meal Packages */}`,
        `          <MealPicker`,
        `            meals={categories.find(c => c.type === 'meals')?.items || []}`,
        `            selections={mealSelections}`,
        `            onChange={setMealSelections}`,
        `            priceLabel="per person"`,
        `          />`,
      ].join("\n");

    case "activity-picker":
      return [
        `          {/* Activities */}`,
        `          <ActivityPicker`,
        `            activities={categories.find(c => c.type === 'activities')?.items || []}`,
        `            selections={activitySelections}`,
        `            onChange={setActivitySelections}`,
        `          />`,
      ].join("\n");

    case "contact-form": {
      const showPhone = cfg.showPhone !== false;
      const showCompany = cfg.showCompany === true;
      const showNotes = cfg.showNotes === true;
      return [
        `          {/* Contact Form */}`,
        `          <ContactForm`,
        `            contactInfo={contactInfo}`,
        `            onChange={setContactInfo}`,
        `            showPhone={${showPhone}}`,
        `            showCompany={${showCompany}}`,
        `            showNotes={${showNotes}}`,
        `          />`,
      ].join("\n");
    }

    case "invoice":
      return [
        `          {/* Invoice / Booking Summary */}`,
        `          <InvoiceWidget`,
        `            bookingId={bookingId}`,
        `            checkIn={checkIn}`,
        `            checkOut={checkOut}`,
        `            guests={guests}`,
        `            roomSelections={roomSelections}`,
        `            mealSelections={mealSelections}`,
        `            activitySelections={activitySelections}`,
        `            contactInfo={contactInfo}`,
        `            currency="${(cfg.currency as string) || "CHF"}"`,
        `            showTax={${cfg.showTax !== false}}`,
        `            taxRate={${(cfg.taxRate as number) || 7.7}}`,
        `          />`,
      ].join("\n");

    default:
      return `          {/* Unknown widget: ${widget.templateId} */}`;
  }
}

// ────────────────────────────────────────────────────────────
// Utility
// ────────────────────────────────────────────────────────────

function escapeJsx(str: string): string {
  return str.replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
