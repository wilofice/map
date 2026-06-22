import { useMindMapStore } from '../store/mindMapStore';
import { themes } from '../theme/themes';
import type { AppTheme, ThemeKey } from '../theme/themes';
import type { DisplayMode, LayoutDir } from '../config/nodeDimensions';

function ToggleRow({ label, value, onChange, t }: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  t: AppTheme;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs" style={{ color: t.textSecondary }}>{label}</span>
      <button
        onClick={() => onChange(!value)}
        className="w-9 h-5 rounded-full transition-colors relative shrink-0 ml-3"
        style={{ background: value ? t.bgAccent : t.border }}
      >
        <span
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-150"
          style={{ left: value ? 'calc(100% - 18px)' : '2px' }}
        />
      </button>
    </div>
  );
}

function SliderRow({ label, value, min, max, step, onChange, t }: {
  label: string;
  value: number;
  min: number; max: number; step: number;
  onChange: (v: number) => void;
  t: AppTheme;
}) {
  return (
    <div className="mb-3">
      <span className="text-xs block mb-1" style={{ color: t.textSecondary }}>{label}</span>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: t.bgAccent }}
      />
    </div>
  );
}

function SegmentedRow<T extends string>({ options, value, onChange, t }: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  t: AppTheme;
}) {
  return (
    <div className="flex gap-1">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className="flex-1 py-1 text-xs rounded border transition-colors"
          style={{
            background: value === opt.value ? t.bgAccent : 'transparent',
            borderColor: value === opt.value ? t.bgAccent : t.border,
            color: value === opt.value ? '#fff' : t.textUI,
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Section({ title, t, children }: { title: string; t: AppTheme; children: React.ReactNode }) {
  return (
    <section>
      <h3
        className="text-[10px] font-semibold uppercase tracking-widest mb-3"
        style={{ color: t.textMuted }}
      >{title}</h3>
      {children}
    </section>
  );
}

function FieldLabel({ label, t }: { label: string; t: AppTheme }) {
  return <span className="text-xs block mb-1.5" style={{ color: t.textSecondary }}>{label}</span>;
}

export default function SettingsPanel() {
  const {
    theme, setTheme,
    displayMode, setDisplayMode,
    layoutDir, setLayoutDir,
    mapLocked, setMapLocked,
    clickOpensPanel, setClickOpensPanel,
    animEntranceMode, setAnimEntranceMode,
    animStaggerMs, setAnimStaggerMs,
    animSpringDuration, setAnimSpringDuration,
    typewriterEnabled, setTypewriterEnabled,
    typewriterSpeedMs, setTypewriterSpeedMs,
    setSettingsPanelOpen,
  } = useMindMapStore();
  const t = themes[theme];

  return (
    <div
      className="w-64 shrink-0 border-l flex flex-col"
      style={{ background: t.surface, borderColor: t.border }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{ borderColor: t.border }}
      >
        <span className="font-semibold text-sm" style={{ color: t.textHeading }}>Settings</span>
        <button
          onClick={() => setSettingsPanelOpen(false)}
          className="text-lg leading-none transition-colors"
          style={{ color: t.textMuted }}
        >×</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">

        {/* ── Appearance ── */}
        <Section title="Appearance" t={t}>
          <div className="mb-3">
            <FieldLabel label="Theme" t={t} />
            <SegmentedRow<ThemeKey>
              options={[
                { value: 'ibm',   label: '⬛ IBM'   },
                { value: 'dusk',  label: '🌙 Dusk'  },
                { value: 'light', label: '☀ Light'  },
              ]}
              value={theme}
              onChange={setTheme}
              t={t}
            />
          </div>
          <div>
            <FieldLabel label="Node size" t={t} />
            <SegmentedRow<DisplayMode>
              options={[
                { value: 'comfortable', label: 'Full text' },
                { value: 'compact',     label: 'Compact'   },
              ]}
              value={displayMode}
              onChange={setDisplayMode}
              t={t}
            />
          </div>
        </Section>

        {/* ── Canvas ── */}
        <Section title="Canvas" t={t}>
          <div className="mb-3">
            <FieldLabel label="Layout direction" t={t} />
            <SegmentedRow<LayoutDir>
              options={[
                { value: 'LR', label: '→ LR' },
                { value: 'RL', label: '← RL' },
                { value: 'TB', label: '↓ TB' },
              ]}
              value={layoutDir}
              onChange={setLayoutDir}
              t={t}
            />
          </div>
          <div className="space-y-0.5">
            <ToggleRow label="Lock map (no dragging)" value={mapLocked} onChange={setMapLocked} t={t} />
            <ToggleRow label="Click node opens panel" value={clickOpensPanel} onChange={setClickOpensPanel} t={t} />
          </div>
        </Section>

        {/* ── Animations ── */}
        <Section title="Animations" t={t}>

          {/* Entrance mode */}
          <div className="mb-3">
            <FieldLabel label="Branch entrance" t={t} />
            <SegmentedRow<'cascade' | 'sequential'>
              options={[
                { value: 'cascade',    label: 'Cascade'    },
                { value: 'sequential', label: 'Sequential' },
              ]}
              value={animEntranceMode}
              onChange={setAnimEntranceMode}
              t={t}
            />
            <p className="text-[10px] mt-1.5 leading-relaxed" style={{ color: t.textMuted }}>
              {animEntranceMode === 'cascade'
                ? 'Children roll in with a fixed offset between each.'
                : 'Each node waits for the previous to fully settle before appearing.'}
            </p>
          </div>

          {/* Stagger interval — cascade only */}
          {animEntranceMode === 'cascade' && (
            <SliderRow
              label={`Stagger interval — ${animStaggerMs} ms`}
              value={animStaggerMs}
              min={20} max={400} step={10}
              onChange={setAnimStaggerMs}
              t={t}
            />
          )}

          {/* Spring duration */}
          <SliderRow
            label={`Spring duration — ${animSpringDuration.toFixed(1)} s`}
            value={Math.round(animSpringDuration * 10)}
            min={1} max={30} step={1}
            onChange={v => setAnimSpringDuration(v / 10)}
            t={t}
          />

          {/* Typewriter */}
          <div className="mb-1">
            <ToggleRow label="Typewriter text" value={typewriterEnabled} onChange={setTypewriterEnabled} t={t} />
          </div>
          {typewriterEnabled && (
            <SliderRow
              label={`Typewriter speed — ${typewriterSpeedMs} ms / char`}
              value={typewriterSpeedMs}
              min={5} max={120} step={5}
              onChange={setTypewriterSpeedMs}
              t={t}
            />
          )}
        </Section>

      </div>
    </div>
  );
}
