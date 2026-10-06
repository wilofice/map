import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { getStoredToken } from '../store/authStore';
import { themes } from '../theme/themes';
import { useMindMapStore } from '../store/mindMapStore';

interface Project {
  id: string;
  name: string;
  description: string;
  updated_at: string;
  node_count: number;
  completed_count?: number;
}

interface PipelineTask {
  id: string;
  name: string;
  type: string;
  status: string;
  priority: string;
  updated_at: string;
}

interface Diagram {
  id: string;
  title: string;
  type: string;
  description: string;
  updated_at: string;
}

interface Stats {
  projects: number;
  nodes: number;
  completed_nodes: number;
  pipeline_tasks: number;
  diagrams: number;
}

interface Summary {
  projects: Project[];
  tasks: PipelineTask[];
  diagrams: Diagram[];
  stats: Stats;
}

async function fetchSummary(): Promise<Summary> {
  const token = getStoredToken();
  const res = await fetch('/api/home/summary', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Failed to load summary');
  return res.json();
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'à l\'instant';
  if (mins < 60) return `il y a ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `il y a ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `il y a ${days}j`;
  return new Date(dateStr).toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' });
}

const PRIORITY_COLOR: Record<string, string> = {
  high: '#fa4d56',
  medium: '#f1c21b',
  low: '#42be65',
};

const STATUS_COLOR: Record<string, string> = {
  pending: '#6f6f6f',
  'in-progress': '#4589ff',
  done: '#42be65',
};

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { loadProject } = useMindMapStore();
  const theme = useMindMapStore(s => s.theme);
  const t = themes[theme];

  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSummary()
      .then(setSummary)
      .catch(e => setError(e.message));
  }, []);

  function openProject(id: string) {
    loadProject(id);
    navigate('/canvas');
  }

  const s = {
    page: {
      minHeight: '100vh',
      background: t.shell,
      color: t.textPrimary,
      fontFamily: 'system-ui, sans-serif',
    } as React.CSSProperties,
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 28px',
      borderBottom: `1px solid ${t.border}`,
      background: t.surface,
    } as React.CSSProperties,
    headerTitle: {
      fontSize: 18,
      fontWeight: 700,
      color: t.textHeading,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    } as React.CSSProperties,
    navLinks: {
      display: 'flex',
      gap: 8,
    } as React.CSSProperties,
    navBtn: {
      padding: '6px 14px',
      background: 'transparent',
      border: `1px solid ${t.border}`,
      borderRadius: 6,
      color: t.textUI,
      fontSize: 13,
      cursor: 'pointer',
    } as React.CSSProperties,
    body: {
      maxWidth: 1100,
      margin: '0 auto',
      padding: '32px 28px',
    } as React.CSSProperties,
    greeting: {
      fontSize: 22,
      fontWeight: 600,
      color: t.textHeading,
      marginBottom: 28,
    } as React.CSSProperties,
    statsRow: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 16,
      marginBottom: 40,
    } as React.CSSProperties,
    statCard: {
      background: t.surface,
      border: `1px solid ${t.border}`,
      borderRadius: 10,
      padding: '18px 22px',
    } as React.CSSProperties,
    statNum: {
      fontSize: 28,
      fontWeight: 700,
      color: t.bgAccent,
    } as React.CSSProperties,
    statLabel: {
      fontSize: 12,
      color: t.textMuted,
      marginTop: 4,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
    },
    section: {
      marginBottom: 36,
    } as React.CSSProperties,
    sectionHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    } as React.CSSProperties,
    sectionTitle: {
      fontSize: 15,
      fontWeight: 600,
      color: t.textHeading,
    } as React.CSSProperties,
    seeAll: {
      fontSize: 12,
      color: t.bgAccent,
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
    } as React.CSSProperties,
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
      gap: 12,
    } as React.CSSProperties,
    card: {
      background: t.card,
      border: `1px solid ${t.cardBorder}`,
      borderRadius: 10,
      padding: '14px 16px',
      cursor: 'pointer',
      transition: 'border-color 0.15s',
    } as React.CSSProperties,
  };

  return (
    <div style={s.page}>
      {/* Top nav */}
      <header style={s.header}>
        <div style={s.headerTitle}>
          🧠 <span>Mind Map Studio</span>
        </div>
        <nav style={s.navLinks}>
          <button style={s.navBtn} onClick={() => navigate('/canvas')}>Cartes</button>
          <button style={s.navBtn} onClick={() => navigate('/pipeline')}>Pipeline</button>
          <button style={s.navBtn} onClick={() => navigate('/diagrams')}>Diagrammes</button>
          <button style={s.navBtn} onClick={() => navigate('/navigator')}>Navigator</button>
        </nav>
        <div style={{ fontSize: 13, color: t.textMuted }}>
          👤 {user?.display_name}
        </div>
      </header>

      <main style={s.body}>
        <div style={s.greeting}>
          Bonjour, {user?.display_name?.split(' ')[0]} 👋
        </div>

        {error && (
          <div style={{ color: '#fa4d56', marginBottom: 20, fontSize: 13 }}>{error}</div>
        )}

        {/* Stats */}
        {summary && (
          <div style={s.statsRow}>
            <div style={s.statCard}>
              <div style={s.statNum}>{summary.stats.projects ?? summary.projects.length}</div>
              <div style={s.statLabel}>Cartes mentales</div>
            </div>
            <div style={s.statCard}>
              <div style={s.statNum}>{summary.stats.pipeline_tasks ?? summary.tasks.length}</div>
              <div style={s.statLabel}>Pipelines</div>
            </div>
            <div style={s.statCard}>
              <div style={s.statNum}>{summary.stats.diagrams ?? summary.diagrams.length}</div>
              <div style={s.statLabel}>Diagrammes</div>
            </div>
            <div style={s.statCard}>
              <div style={s.statNum}>
                {summary.stats.nodes
                  ? `${Math.round((summary.stats.completed_nodes / summary.stats.nodes) * 100)}%`
                  : '—'}
              </div>
              <div style={s.statLabel}>Noeuds complétés</div>
            </div>
          </div>
        )}

        {/* Projects */}
        <div style={s.section}>
          <div style={s.sectionHeader}>
            <span style={s.sectionTitle}>Cartes mentales récentes</span>
            <button style={s.seeAll} onClick={() => navigate('/canvas')}>Voir tout →</button>
          </div>
          <div style={s.grid}>
            {summary?.projects.map(p => (
              <div
                key={p.id}
                style={s.card}
                onClick={() => openProject(p.id)}
                onMouseEnter={e => (e.currentTarget.style.borderColor = t.bgAccent)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = t.cardBorder)}
              >
                <div style={{ fontWeight: 600, fontSize: 14, color: t.textHeading, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.name}
                </div>
                {p.description && (
                  <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {p.description}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: t.textMuted }}>
                  <span>{p.node_count} nœuds</span>
                  <span>{timeAgo(p.updated_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pipeline tasks */}
        <div style={s.section}>
          <div style={s.sectionHeader}>
            <span style={s.sectionTitle}>Pipelines récents</span>
            <button style={s.seeAll} onClick={() => navigate('/pipeline')}>Voir tout →</button>
          </div>
          <div style={s.grid}>
            {summary?.tasks.map(task => (
              <div
                key={task.id}
                style={s.card}
                onClick={() => navigate(`/pipeline/${task.id}`)}
                onMouseEnter={e => (e.currentTarget.style.borderColor = t.bgAccent)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = t.cardBorder)}
              >
                <div style={{ fontWeight: 600, fontSize: 14, color: t.textHeading, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {task.name}
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4, background: `${PRIORITY_COLOR[task.priority]}20`, color: PRIORITY_COLOR[task.priority] }}>
                    {task.priority}
                  </span>
                  <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4, background: `${STATUS_COLOR[task.status]}20`, color: STATUS_COLOR[task.status] }}>
                    {task.status}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: t.textMuted }}>{timeAgo(task.updated_at)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Diagrams */}
        <div style={s.section}>
          <div style={s.sectionHeader}>
            <span style={s.sectionTitle}>Diagrammes récents</span>
            <button style={s.seeAll} onClick={() => navigate('/diagrams')}>Voir tout →</button>
          </div>
          <div style={s.grid}>
            {summary?.diagrams.map(d => (
              <div
                key={d.id}
                style={s.card}
                onClick={() => navigate('/diagrams')}
                onMouseEnter={e => (e.currentTarget.style.borderColor = t.bgAccent)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = t.cardBorder)}
              >
                <div style={{ fontWeight: 600, fontSize: 14, color: t.textHeading, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.title}
                </div>
                <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {d.type}
                </div>
                {d.description && (
                  <div style={{ fontSize: 12, color: t.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.description}
                  </div>
                )}
                <div style={{ fontSize: 11, color: t.textMuted, marginTop: 6 }}>{timeAgo(d.updated_at)}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
