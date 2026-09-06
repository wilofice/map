import { useEffect, useState, useCallback } from 'react';
import { useMindMapStore } from '../store/mindMapStore';
import { themes } from '../theme/themes';

const API = '/api/weekly-reports';

interface Alert { level: 'success' | 'warning' | 'danger' | 'info'; message: string; }

interface WeekReport {
  week_number: number;
  year: number;
  generated_at: string;
  lessons_completed: number;
  pipeline_tasks_done: number;
  high_priority_nodes_done: number;
  high_priority_nodes_blocked: number;
  energy_physical: number | null;
  energy_mental: number | null;
  energy_emotional: number | null;
  energy_blocker: string | null;
  eta_current_section_weeks: number | null;
  eta_full_course_weeks: number | null;
  eta_first_revenue_weeks: number | null;
  velocity_4w_avg: number | null;
  alerts: Alert[];
}

interface HistoryWeek {
  week: number; year: number; velocity: number;
  energy_avg: string | null; eta_course: number | null;
}

// ─── Gauge ────────────────────────────────────────────────────────────────────
function Gauge({ value, max = 10, label, color }: { value: number | null; max?: number; label: string; color: string }) {
  const pct = value != null ? Math.min(100, (value / max) * 100) : 0;
  const displayVal = value != null ? value : '—';
  return (
    <div style={{ textAlign: 'center', minWidth: 90 }}>
      <svg width={80} height={80} viewBox="0 0 80 80">
        <circle cx={40} cy={40} r={32} fill="none" stroke="rgba(128,128,128,0.15)" strokeWidth={8} />
        <circle
          cx={40} cy={40} r={32} fill="none"
          stroke={value == null ? 'rgba(128,128,128,0.3)' : color}
          strokeWidth={8}
          strokeDasharray={`${(pct / 100) * 201} 201`}
          strokeLinecap="round"
          transform="rotate(-90 40 40)"
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
        <text x={40} y={44} textAnchor="middle" fontSize={18} fontWeight={700} fill={value == null ? '#888' : color}>
          {displayVal}
        </text>
      </svg>
      <div style={{ fontSize: 11, marginTop: 4, opacity: 0.7 }}>{label}</div>
    </div>
  );
}

// ─── Bar ──────────────────────────────────────────────────────────────────────
function Bar({ weeks, accent }: { weeks: HistoryWeek[]; accent: string }) {
  if (!weeks.length) return <p style={{ fontSize: 12, opacity: 0.5 }}>Pas d'historique.</p>;
  const max = Math.max(...weeks.map(w => w.velocity), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 64, padding: '0 4px' }}>
      {[...weeks].reverse().map(w => (
        <div key={`${w.week}-${w.year}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <div style={{ fontSize: 10, opacity: 0.6 }}>{w.velocity}</div>
          <div style={{ width: '100%', background: accent, borderRadius: 3, height: `${Math.max(4, (w.velocity / max) * 48)}px`, opacity: w.velocity === 0 ? 0.2 : 0.85 }} />
          <div style={{ fontSize: 9, opacity: 0.5, whiteSpace: 'nowrap' }}>S{w.week}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Energy form ──────────────────────────────────────────────────────────────
function EnergyForm({ onSubmit, border, text, muted, accent, bgCard }: {
  onSubmit: (scores: { energy_physical: number; energy_mental: number; energy_emotional: number; energy_blocker: string }) => void;
  border: string; text: string; muted: string; accent: string; bgCard: string;
}) {
  const [p, setP] = useState(7);
  const [m, setM] = useState(7);
  const [e, setE] = useState(7);
  const [blocker, setBlocker] = useState('');

  const sliderStyle = { width: '100%', accentColor: accent };
  const labelStyle = { fontSize: 12, color: muted, display: 'flex', justifyContent: 'space-between' as const };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[
        { label: 'Physique', val: p, set: setP },
        { label: 'Mental', val: m, set: setM },
        { label: 'Émotionnel', val: e, set: setE },
      ].map(({ label, val, set }) => (
        <div key={label}>
          <div style={labelStyle}><span>{label}</span><span style={{ color: text, fontWeight: 600 }}>{val}/10</span></div>
          <input type="range" min={1} max={10} value={val} onChange={ev => set(Number(ev.target.value))} style={sliderStyle} />
        </div>
      ))}
      <div>
        <div style={{ ...labelStyle, marginBottom: 4 }}><span>Blocage principal</span></div>
        <input
          value={blocker}
          onChange={e => setBlocker(e.target.value)}
          placeholder="Optionnel — décris le principal frein cette semaine"
          style={{ width: '100%', padding: '6px 10px', fontSize: 12, background: bgCard, border: `1px solid ${border}`, borderRadius: 5, color: text, outline: 'none', boxSizing: 'border-box' as const }}
        />
      </div>
      <button
        onClick={() => onSubmit({ energy_physical: p, energy_mental: m, energy_emotional: e, energy_blocker: blocker })}
        style={{ padding: '8px 16px', background: accent, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
      >Enregistrer l'énergie</button>
    </div>
  );
}

// ─── Alert badge ──────────────────────────────────────────────────────────────
const ALERT_COLORS: Record<string, string> = {
  success: '#22c55e', warning: '#f59e0b', danger: '#ef4444', info: '#6366f1',
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function WeeklyNavigator() {
  const { theme } = useMindMapStore();
  const t = themes[theme];
  const isDark = theme !== 'light';

  const border = t.border;
  const bg = t.surface;
  const bgCard = t.card;
  const text = t.textPrimary;
  const muted = t.textMuted;
  const accent = t.bgAccent;

  const [report, setReport] = useState<WeekReport | null>(null);
  const [history, setHistory] = useState<HistoryWeek[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, sRes] = await Promise.all([
        fetch(`${API}/current`),
        fetch(`${API}/stats?weeks=8`),
      ]);
      if (rRes.ok) setReport(await rRes.json());
      if (sRes.ok) { const s = await sRes.json(); setHistory(s.weeks || []); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadReport(); }, [loadReport]);

  const generate = async () => {
    setGenerating(true);
    const res = await fetch(`${API}/generate`, { method: 'POST' });
    if (res.ok) { setReport(await res.json()); setFeedback('Rapport généré ✓'); setTimeout(() => setFeedback(null), 3000); }
    setGenerating(false);
    const sRes = await fetch(`${API}/stats?weeks=8`);
    if (sRes.ok) { const s = await sRes.json(); setHistory(s.weeks || []); }
  };

  const submitEnergy = async (scores: { energy_physical: number; energy_mental: number; energy_emotional: number; energy_blocker: string }) => {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scores),
    });
    if (res.ok) {
      setReport(await res.json());
      setShowForm(false);
      setFeedback('Énergie enregistrée ✓');
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const energyAvg = report && report.energy_physical != null && report.energy_mental != null && report.energy_emotional != null
    ? ((report.energy_physical + report.energy_mental + report.energy_emotional) / 3)
    : null;

  const gaugeColor = (val: number | null) => {
    if (val == null) return muted;
    if (val >= 8) return '#22c55e';
    if (val >= 6) return '#f59e0b';
    return '#ef4444';
  };

  const cardStyle = {
    background: bgCard,
    border: `1px solid ${border}`,
    borderRadius: 10,
    padding: '16px 20px',
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: t.shell, color: muted, fontSize: 14 }}>
        Chargement…
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: t.shell, color: text, fontFamily: 'inherit', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ padding: '20px 28px 0', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>
            🗺️ Weekly Navigator
            {report && <span style={{ fontSize: 14, fontWeight: 400, marginLeft: 10, color: muted }}>Semaine {report.week_number} / {report.year}</span>}
          </div>
          {report && <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>Généré le {new Date(report.generated_at).toLocaleString('fr-CA')}</div>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {feedback && <span style={{ fontSize: 12, color: '#22c55e' }}>{feedback}</span>}
          <button onClick={() => setShowForm(v => !v)} style={{ padding: '6px 14px', background: showForm ? accent : 'transparent', color: showForm ? '#fff' : muted, border: `1px solid ${border}`, borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
            🔋 Énergie
          </button>
          <button onClick={generate} disabled={generating} style={{ padding: '6px 14px', background: accent, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, opacity: generating ? 0.6 : 1 }}>
            {generating ? 'Calcul…' : '↻ Recalculer'}
          </button>
        </div>
      </div>

      {/* Energy form */}
      {showForm && (
        <div style={{ margin: '16px 28px 0', ...cardStyle }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Rapport Énergie — Semaine {report?.week_number ?? '?'}</div>
          <EnergyForm onSubmit={submitEnergy} border={border} text={text} muted={muted} accent={accent} bgCard={bgCard} />
        </div>
      )}

      {/* No report yet */}
      {!report && !loading && (
        <div style={{ margin: 28, ...cardStyle, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          <p style={{ color: muted, fontSize: 14, marginBottom: 16 }}>Aucun rapport pour la semaine courante.</p>
          <button onClick={generate} style={{ padding: '10px 24px', background: accent, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
            Générer le rapport
          </button>
        </div>
      )}

      {/* 4 instruments grid */}
      {report && (
        <div style={{ padding: '16px 28px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>

          {/* Instrument 1 — Velocity */}
          <div style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>⚡ Vélocité</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: report.high_priority_nodes_done > 0 ? '#22c55e' : '#f59e0b' }}>
              {report.high_priority_nodes_done}
            </div>
            <div style={{ fontSize: 11, color: muted, marginBottom: 8 }}>nœuds high-priority complétés</div>
            <div style={{ fontSize: 11, color: muted }}>Pipeline terminés: <strong style={{ color: text }}>{report.pipeline_tasks_done}</strong></div>
            {report.velocity_4w_avg != null && (
              <div style={{ fontSize: 11, color: muted, marginTop: 4 }}>Moy. 4 sem: <strong style={{ color: text }}>{Number(report.velocity_4w_avg).toFixed(1)}/sem</strong></div>
            )}
          </div>

          {/* Instrument 2 — Alignment */}
          <div style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>🧭 Cap</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: report.high_priority_nodes_blocked === 0 ? '#22c55e' : '#ef4444' }}>
              {report.high_priority_nodes_blocked === 0 ? '✅' : `${report.high_priority_nodes_blocked}`}
            </div>
            <div style={{ fontSize: 11, color: muted, marginBottom: 8 }}>
              {report.high_priority_nodes_blocked === 0 ? 'Sur le cap' : `nœud(s) bloqué(s)`}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: report.high_priority_nodes_blocked === 0 ? '#22c55e' : '#ef4444' }}>
              {report.high_priority_nodes_blocked === 0 ? 'Aligné ✓' : 'Hors Cap ⚠️'}
            </div>
          </div>

          {/* Instrument 3 — Energy */}
          <div style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>🔋 Énergie</div>
            {energyAvg != null ? (
              <>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 8 }}>
                  <Gauge value={report.energy_physical} label="Physique" color={gaugeColor(report.energy_physical)} />
                  <Gauge value={report.energy_mental} label="Mental" color={gaugeColor(report.energy_mental)} />
                  <Gauge value={report.energy_emotional} label="Émotionnel" color={gaugeColor(report.energy_emotional)} />
                </div>
                <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: gaugeColor(energyAvg) }}>
                  Moyenne: {energyAvg.toFixed(1)}/10
                </div>
                {report.energy_blocker && (
                  <div style={{ marginTop: 8, fontSize: 11, color: muted, fontStyle: 'italic' }}>"{report.energy_blocker}"</div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', paddingTop: 12 }}>
                <div style={{ fontSize: 24, opacity: 0.3, marginBottom: 8 }}>—</div>
                <div style={{ fontSize: 11, color: muted }}>Non renseigné cette semaine</div>
                <button onClick={() => setShowForm(true)} style={{ marginTop: 8, fontSize: 11, padding: '4px 10px', background: 'transparent', border: `1px solid ${border}`, borderRadius: 4, cursor: 'pointer', color: muted }}>
                  Saisir →
                </button>
              </div>
            )}
          </div>

          {/* Instrument 4 — ETA */}
          <div style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>⏱️ ETA</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: '📅 Section courante', val: report.eta_current_section_weeks },
                { label: '📅 Cours complet', val: report.eta_full_course_weeks },
                { label: '💰 Premiers revenus', val: report.eta_first_revenue_weeks },
              ].map(({ label, val }) => (
                <div key={label}>
                  <div style={{ fontSize: 11, color: muted, marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: val != null ? text : muted }}>
                    {val != null ? `~${val} semaines` : '—'}
                  </div>
                  {val != null && (
                    <div style={{ height: 3, borderRadius: 2, background: `rgba(128,128,128,0.15)`, marginTop: 4 }}>
                      <div style={{ height: '100%', borderRadius: 2, background: accent, width: `${Math.min(100, (1 / Math.max(val, 1)) * 400)}%` }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Velocity trend */}
      {history.length > 0 && (
        <div style={{ padding: '0 28px 16px' }}>
          <div style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
              📈 Tendance vélocité — {history.length} dernières semaines
            </div>
            <Bar weeks={history} accent={accent} />
          </div>
        </div>
      )}

      {/* Alerts */}
      {report && report.alerts && report.alerts.length > 0 && (
        <div style={{ padding: '0 28px 28px' }}>
          <div style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>🚨 Alertes & Recommandations</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {report.alerts.map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: ALERT_COLORS[a.level] ?? muted, marginTop: 4, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: text }}>{a.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
