import { useState, useMemo, useEffect } from 'react';
import { useGraphStore } from './cytoscapeStore';
import { useMindMapStore } from '../store/mindMapStore';
import { themes } from '../theme/themes';
import type { AppTheme } from '../theme/themes';
import CytoscapeFlow from './CytoscapeFlow';
import GraphToolbar from './GraphToolbar';
import GraphDetailPanel from './GraphDetailPanel';

export default function GraphView() {
  const { currentProject, detailPanelOpen, selectedNodeId } = useGraphStore();
  const { theme } = useMindMapStore();
  const t = themes[theme];
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div
      className={`flex h-screen w-screen overflow-hidden text-[#f4f4f4] theme-${theme}`}
      style={{ background: t.shell }}
    >
      {/* Reuse the same sidebar — it navigates via router so selecting a project
          in graph view loads it into the graphStore via the sidebar's loadProject call.
          We wire the sidebar's project click to also load into graphStore below. */}
      <GraphSidebarBridge open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0">
        <GraphToolbar />

        <div className="flex flex-1 min-h-0">
          <div className="flex-1 relative min-w-0">
            {!currentProject ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="text-5xl opacity-20">⬡</div>
                <p className="text-sm" style={{ color: t.textMuted }}>Select a project from the sidebar.</p>
                {!sidebarOpen && (
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="text-sm px-4 py-2 rounded text-white"
                    style={{ background: t.bgAccent }}
                  >
                    Open project list
                  </button>
                )}
              </div>
            ) : (
              <CytoscapeFlow />
            )}
          </div>

          {detailPanelOpen && selectedNodeId && currentProject && <GraphDetailPanel />}
        </div>
      </div>
    </div>
  );
}

// Bridge: wraps CollectionsSidebar so clicking a project loads it into graphStore
function GraphSidebarBridge({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { loadProject } = useGraphStore();
  const { theme } = useMindMapStore();
  const t = themes[theme];

  // We override CollectionsSidebar's behaviour by patching the store's loadProject
  // just before the sidebar renders. CollectionsSidebar reads from useMindMapStore,
  // so we also need to keep mindMapStore's project in sync (for sidebar highlighting).
  // The cleanest way: GraphSidebarBridge provides its own sidebar built from the same
  // data but with graphStore's loadProject wired in.
  return (
    <GraphSidebar open={open} onClose={onClose} loadGraphProject={loadProject} theme={theme} t={t} />
  );
}

// Standalone sidebar for graph view — identical visual to CollectionsSidebar
// but calls graphStore.loadProject instead of mindMapStore.loadProject
import { useNavigate } from 'react-router-dom';
import type { Project, Collection } from '../types/NodeTypes';

function GraphSidebar({
  open, onClose, loadGraphProject, theme: _theme, t,
}: {
  open: boolean;
  onClose: () => void;
  loadGraphProject: (id: string) => Promise<void>;
  theme: string;
  t: AppTheme;
}) {
  const navigate = useNavigate();
  const { projects, collections, loadCollections } = useMindMapStore();
  const { currentProject } = useGraphStore();
  const [collapsedColls, setCollapsedColls] = useState<Set<string>>(new Set());

  useEffect(() => { loadCollections(); }, [loadCollections]);

  const grouped = useMemo(() => {
    const map = new Map<string, Collection & { projects: Project[] }>();
    for (const c of collections) map.set(c.id, { ...c, projects: [] });
    if (!map.has('default-collection')) map.set('default-collection', { id: 'default-collection', name: 'Default', projects: [] });
    for (const p of projects) {
      const key = p.collection_id ?? 'default-collection';
      if (map.has(key)) map.get(key)!.projects.push(p);
    }
    return [...map.values()].filter(g => g.projects.length > 0 || g.id !== 'default-collection');
  }, [collections, projects]);

  useEffect(() => {
    setCollapsedColls(prev => {
      const next = new Set(prev);
      for (const g of grouped) if (!next.has(g.id)) next.add(g.id);
      return next;
    });
  }, [grouped]);

  const toggle = (id: string) => setCollapsedColls(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const handleSelect = async (id: string) => {
    await loadGraphProject(id);
    onClose();
  };

  return (
    <aside
      className={`flex flex-col border-r transition-all duration-200 shrink-0 ${open ? 'w-64' : 'w-0 overflow-hidden'}`}
      style={{ background: t.surface, borderColor: t.border }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: t.border }}>
        <span className="font-semibold text-sm tracking-wide" style={{ color: t.textHeading }}>⬡ Graph View</span>
        <button onClick={onClose} className="text-lg leading-none p-1" style={{ color: t.textMuted }}>×</button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-4 mt-2">
        {grouped.map(group => (
          <div key={group.id} className="mb-2">
            <button
              onClick={() => toggle(group.id)}
              className="w-full flex items-center gap-2 px-2 py-1 rounded text-[11px] font-semibold uppercase tracking-widest transition-colors hover:bg-[rgba(128,128,128,0.1)]"
              style={{ color: t.textMuted }}
            >
              <span className="text-[9px] w-3 flex justify-center">{collapsedColls.has(group.id) ? '▸' : '▾'}</span>
              {group.color && <div className="w-2 h-2 rounded-full" style={{ background: group.color }} />}
              <span className="flex-1 text-left truncate">{group.name}</span>
              <span className="tabular-nums text-[10px] bg-[rgba(128,128,128,0.1)] px-1.5 py-0.5 rounded-full">{group.projects.length}</span>
            </button>

            {!collapsedColls.has(group.id) && (
              <div className="mt-1 space-y-0.5">
                {group.projects.map((p: Project) => {
                  const isActive = currentProject?.id === p.id;
                  const pct = Math.round(((p.completed_count ?? 0) / (p.node_count ?? 1)) * 100) || 0;
                  const statusColor = pct === 100 ? '#42be65' : pct > 0 ? '#f1c21b' : '#8d8d8d';
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelect(p.id)}
                      className="w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors flex items-center gap-2"
                      style={isActive
                        ? { background: 'rgba(69,137,255,0.15)', color: t.textHeading }
                        : { color: t.textSecondary }}
                    >
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: statusColor }} />
                      <div className="font-medium truncate flex-1">{p.name}</div>
                      {(p.node_count ?? 0) > 0 && (
                        <span className="text-[10px] tabular-nums shrink-0" style={{ color: isActive ? t.textHeading : t.textMuted }}>{pct}%</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-3 border-t shrink-0 flex flex-col gap-2" style={{ borderColor: t.border }}>
        <button
          onClick={() => { navigate('/'); onClose(); }}
          className="w-full py-1.5 rounded text-xs font-medium transition-colors hover:bg-[rgba(128,128,128,0.1)]"
          style={{ color: t.textSecondary }}
        >
          ← Back to Mind Map
        </button>
        <button
          onClick={() => { navigate('/collections'); onClose(); }}
          className="w-full py-1.5 rounded text-xs font-medium transition-colors hover:bg-[rgba(128,128,128,0.1)]"
          style={{ color: t.textSecondary }}
        >
          Manage Collections…
        </button>
      </div>
    </aside>
  );
}
