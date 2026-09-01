import { useGraphStore, type GraphLayoutName } from './cytoscapeStore';
import { themes } from '../theme/themes';

const LAYOUTS: { key: GraphLayoutName; label: string; title: string }[] = [
  { key: 'dagre',       label: '⇉ Dagre',       title: 'Hierarchical tree (left-right)' },
  { key: 'cose',        label: '⬡ Force',        title: 'Force-directed (organic)' },
  { key: 'breadthfirst',label: '↓ BFS',          title: 'Breadth-first tree (top-down)' },
  { key: 'circle',      label: '◎ Circle',       title: 'Circular arrangement' },
  { key: 'grid',        label: '⊞ Grid',         title: 'Regular grid' },
  { key: 'manual',      label: '✥ Manual',       title: 'Use saved drag positions' },
];

export default function GraphToolbar() {
  const {
    currentProject, rawNodes, layoutName, setLayoutName,
    loading, error, theme,
  } = useGraphStore();

  const t = themes[theme];

  const total   = rawNodes.length;
  const done    = rawNodes.filter(n => n.status === 'completed').length;
  const inProg  = rawNodes.filter(n => n.status === 'in-progress').length;
  const pending = total - done - inProg;
  const pct     = total > 0 ? Math.round((done / total) * 100) : 0;
  const barColor = pct === 100 ? '#42be65' : '#4589ff';

  return (
    <header
      className="flex items-center gap-2 px-3 py-2 border-b shrink-0 overflow-x-auto"
      style={{ background: t.surface, borderColor: t.border }}
    >
      <span className="text-sm font-semibold truncate shrink-0" style={{ color: t.textHeading }}>
        {currentProject ? currentProject.name : 'No project selected'}
      </span>

      {loading && <span className="text-xs text-[#4589ff] animate-pulse shrink-0">Loading…</span>}
      {error   && <span className="text-xs text-[#fa4d56] shrink-0 truncate max-w-xs" title={error}>⚠ {error}</span>}

      {currentProject && (
        <>
          <span className="w-px h-4 shrink-0 mx-1" style={{ background: t.border }} />

          {/* Layout picker */}
          <div className="flex items-center gap-1 shrink-0">
            {LAYOUTS.map(l => (
              <button
                key={l.key}
                onClick={() => setLayoutName(l.key)}
                title={l.title}
                className="toolbar-btn"
                style={layoutName === l.key
                  ? { color: '#4589ff', background: 'rgba(69,137,255,0.12)' }
                  : { color: t.textUI }}
              >
                {l.label}
              </button>
            ))}
          </div>

          <span className="w-px h-4 shrink-0 mx-1" style={{ background: t.border }} />

          {/* Progress */}
          {total > 0 && (
            <div className="flex items-center gap-4 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: t.progressTrack }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: barColor }}
                  />
                </div>
                <span className="text-xs font-semibold tabular-nums" style={{ color: barColor }}>{pct}%</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] tabular-nums uppercase tracking-wide font-medium" style={{ color: t.textMuted }}>
                <div className="flex items-center gap-1" title="Completed">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#42be65]" />
                  <span>{done}</span>
                </div>
                <div className="flex items-center gap-1" title="In Progress">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4589ff] animate-pulse" />
                  <span>{inProg}</span>
                </div>
                <div className="flex items-center gap-1" title="Pending">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8d8d8d]" />
                  <span>{pending}</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <div className="ml-auto flex items-center gap-2 shrink-0">
        <span className="text-xs" style={{ color: t.textMuted }}>Cytoscape</span>
      </div>
    </header>
  );
}
