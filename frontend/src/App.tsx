import { useEffect, useState, useCallback, useMemo } from 'react';
import { useMindMapStore } from './store/mindMapStore';
import { themes } from './theme/themes';
import MindMapFlow from './MindMapFlow';
import DetailPanel from './components/DetailPanel';
import SettingsPanel from './components/SettingsPanel';
import ProgressBadge from './components/ProgressBadge';
import type { Project, Collection } from './types/NodeTypes';
import { api } from './hooks/useApi';

export default function App() {
  const {
    projects, currentProject, rawNodes, loading, error,
    loadProjects, loadProject, deleteProjects,
    expandAll, collapseAll,
    displayMode, setDisplayMode,
    layoutDir, setLayoutDir,
    selectedNodeId, detailPanelOpen,
    clickOpensPanel, setClickOpensPanel,
    mapLocked, setMapLocked,
    theme,
    settingsPanelOpen, setSettingsPanelOpen,
    moveToCollection,
  } = useMindMapStore();
  const t = themes[theme];
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [manageMode, setManageMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collapsedColls, setCollapsedColls] = useState<Set<string>>(new Set());
  const [creatingColl, setCreatingColl] = useState(false);
  const [newCollName, setNewCollName] = useState('');

  const toggleSelect = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const exitManage = useCallback(() => {
    setManageMode(false);
    setSelected(new Set());
  }, []);

  const handleDeleteSelected = useCallback(async () => {
    if (selected.size === 0) return;
    const names = projects
      .filter(p => selected.has(p.id))
      .map(p => `• ${p.name}`)
      .join('\n');
    if (!window.confirm(`Delete ${selected.size} map(s)?\n\n${names}`)) return;
    await deleteProjects([...selected]);
    exitManage();
  }, [selected, projects, deleteProjects, exitManage]);

  const handleDeleteOne = useCallback(async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${name}"?`)) return;
    await deleteProjects([id]);
  }, [deleteProjects]);

  useEffect(() => {
    loadProjects();
    api.getCollections().then(setCollections).catch(() => {});
  }, [loadProjects]);

  const toggleColl = useCallback((id: string) => {
    setCollapsedColls(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleCreateColl = useCallback(async () => {
    const name = newCollName.trim();
    if (!name) return;
    try {
      const created = await api.createCollection(name);
      setCollections(prev => [...prev, created]);
      setNewCollName('');
      setCreatingColl(false);
    } catch {}
  }, [newCollName]);

  const handleMoveToCollection = useCallback(async (collectionId: string) => {
    if (selected.size === 0) return;
    await moveToCollection([...selected], collectionId);
    exitManage();
  }, [selected, moveToCollection, exitManage]);

  // Group projects under their collection — preserves collection order from DB
  const grouped = useMemo(() => {
    const map = new Map<string, Collection & { projects: Project[] }>();
    for (const c of collections) map.set(c.id, { ...c, projects: [] });
    for (const p of projects) {
      const key = p.collection_id ?? 'default-collection';
      if (map.has(key)) map.get(key)!.projects.push(p);
    }
    return [...map.values()].filter(g => g.projects.length > 0);
  }, [collections, projects]);

  const handleSelectProject = (id: string) => {
    loadProject(id);
    setSidebarOpen(false);
  };

  return (
    <div className={`flex h-screen w-screen overflow-hidden text-[#f4f4f4] theme-${theme}`} style={{ background: t.shell }}>

      {/* Sidebar — project list */}
      <aside
        className={`flex flex-col border-r transition-all duration-200 shrink-0 ${
          sidebarOpen ? 'w-60' : 'w-0 overflow-hidden'
        }`}
        style={{ background: t.surface, borderColor: t.border }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: t.border }}>
          <span className="font-semibold text-sm tracking-wide" style={{ color: t.textHeading }}>🧠 Mind Maps</span>
          <div className="flex items-center gap-1">
            {manageMode ? (
              <button
                onClick={exitManage}
                className="text-xs px-2 py-0.5 rounded transition-colors"
                style={{ color: t.textUI }}
              >Cancel</button>
            ) : (
              <button
                onClick={() => setManageMode(true)}
                className="text-xs px-2 py-0.5 rounded transition-colors"
                style={{ color: t.textMuted }}
                title="Manage / delete maps"
              >Manage</button>
            )}
            <button
              onClick={() => { setSidebarOpen(false); exitManage(); }}
              className="text-lg leading-none transition-colors ml-1"
              style={{ color: t.textMuted }}
            >×</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {projects.length === 0 && (
            <p className="text-xs p-2" style={{ color: t.textMuted }}>No projects. Make sure the server is running on :3000.</p>
          )}

          {grouped.map(group => (
            <div key={group.id} className="mb-1">
              {/* Collection header — only shown when there is more than one collection */}
              {grouped.length > 1 && (
                <button
                  onClick={() => toggleColl(group.id)}
                  className="w-full flex items-center gap-1.5 px-1 py-1 rounded text-[10px] font-semibold uppercase tracking-widest transition-colors hover:bg-[rgba(255,255,255,0.04)]"
                  style={{ color: t.textMuted }}
                >
                  <span className="text-[8px]">{collapsedColls.has(group.id) ? '▸' : '▾'}</span>
                  <span className="flex-1 text-left truncate">{group.name}</span>
                  <span className="tabular-nums">{group.projects.length}</span>
                </button>
              )}

              {!collapsedColls.has(group.id) && group.projects.map((p: Project) => (
                <div key={p.id} className="relative group mb-0.5">
                  {manageMode ? (
                    <label className={`flex items-center gap-2 px-2 py-2 rounded cursor-pointer transition-colors ${
                      selected.has(p.id) ? 'bg-[#2d0709]' : 'hover:bg-[rgba(128,128,128,0.1)]'
                    }`}>
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => toggleSelect(p.id)}
                        className="accent-[#fa4d56] shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: t.textHeading }}>{p.name}</div>
                        {p.description && (
                          <div className="text-xs truncate" style={{ color: t.textMuted }}>{p.description}</div>
                        )}
                      </div>
                    </label>
                  ) : (
                    <button
                      onClick={() => handleSelectProject(p.id)}
                      className="w-full text-left px-3 py-2 rounded text-sm transition-colors hover:bg-[rgba(128,128,128,0.1)]"
                      style={currentProject?.id === p.id
                        ? { background: t.bgAccent, color: '#ffffff' }
                        : { color: t.textSecondary }}
                    >
                      <div className="font-medium truncate">{p.name}</div>
                      {p.description && (
                        <div className="text-xs truncate mt-0.5" style={{ color: currentProject?.id === p.id ? 'rgba(255,255,255,0.75)' : t.textMuted }}>
                          {p.description}
                        </div>
                      )}
                      {(p.node_count ?? 0) > 0 && (() => {
                        const pct = Math.round(((p.completed_count ?? 0) / (p.node_count ?? 1)) * 100);
                        const isActive = currentProject?.id === p.id;
                        return (
                          <div className="flex items-center gap-1.5 mt-1">
                            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: isActive ? 'rgba(255,255,255,0.25)' : t.progressTrack }}>
                              <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{ width: `${pct}%`, background: pct === 100 ? '#42be65' : isActive ? '#ffffff' : t.bgAccent }}
                              />
                            </div>
                            <span className="text-[10px] tabular-nums" style={{ color: isActive ? 'rgba(255,255,255,0.75)' : t.textUI }}>
                              {pct}%
                            </span>
                          </div>
                        );
                      })()}
                    </button>
                  )}

                  {!manageMode && (
                    <button
                      onClick={(e) => handleDeleteOne(p.id, p.name, e)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-[#2d0709] text-[#6f6f6f] hover:text-[#fa4d56] text-xs"
                      title={`Delete "${p.name}"`}
                    >🗑</button>
                  )}
                </div>
              ))}
            </div>
          ))}

          {/* New collection */}
          <div className="mt-2 px-1">
            {creatingColl ? (
              <div className="flex gap-1 items-center">
                <input
                  autoFocus
                  value={newCollName}
                  onChange={e => setNewCollName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleCreateColl();
                    if (e.key === 'Escape') { setCreatingColl(false); setNewCollName(''); }
                  }}
                  placeholder="Collection name…"
                  className="flex-1 bg-[#1e1e1e] border border-[#4589ff] rounded px-2 h-6 text-xs text-[#c6c6c6] outline-none"
                />
                <button onClick={handleCreateColl} className="text-[11px] text-[#4589ff] hover:text-[#78a9ff] px-1">✓</button>
                <button onClick={() => { setCreatingColl(false); setNewCollName(''); }} className="text-[11px] text-[#6f6f6f] hover:text-[#f4f4f4] px-1">×</button>
              </div>
            ) : (
              <button
                onClick={() => setCreatingColl(true)}
                className="text-[10px] px-1 py-0.5 rounded transition-colors"
                style={{ color: t.textMuted }}
              >+ Collection</button>
            )}
          </div>
        </div>

        {/* Manage mode footer */}
        {manageMode && (
          <div className="shrink-0 border-t p-2 space-y-1.5" style={{ borderColor: t.border }}>
            {/* Move to collection — only when multiple collections exist */}
            {collections.length > 1 && (
              <select
                value=""
                disabled={selected.size === 0}
                onChange={e => { if (e.target.value) handleMoveToCollection(e.target.value); }}
                className="w-full bg-[#1e1e1e] border border-[#393939] rounded px-2 h-7 text-xs text-[#c6c6c6] outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ colorScheme: 'dark' }}
              >
                <option value="" disabled>
                  {selected.size === 0 ? 'Select maps to move…' : `Move ${selected.size} to collection…`}
                </option>
                {collections.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
            <button
              onClick={handleDeleteSelected}
              disabled={selected.size === 0}
              className={`w-full py-1.5 rounded text-sm font-medium transition-colors ${
                selected.size > 0
                  ? 'bg-[#da1e28] text-white hover:bg-[#b81922]'
                  : 'cursor-not-allowed'
              }`}
              style={selected.size === 0 ? { background: t.surface, color: t.textMuted } : undefined}
            >
              {selected.size > 0 ? `Delete ${selected.size} map${selected.size > 1 ? 's' : ''}` : 'Select maps to delete'}
            </button>
          </div>
        )}
      </aside>

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Top bar */}
        <header className="flex items-center gap-2 px-3 py-2 border-b shrink-0" style={{ background: t.surface, borderColor: t.border }}>
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="toolbar-btn px-2 py-1 text-sm"
              title="Open project list"
            >☰</button>
          )}

          <span className="text-sm font-semibold truncate" style={{ color: t.textHeading }}>
            {currentProject ? currentProject.name : 'No project selected'}
          </span>

          {loading && <span className="text-xs text-[#4589ff] animate-pulse">Loading…</span>}
          {error && <span className="text-xs text-[#fa4d56] truncate max-w-xs" title={error}>⚠ {error}</span>}

          {currentProject && (
            <div className="flex items-center gap-1 ml-2">
              {/* Expand / Collapse */}
              <button onClick={expandAll}  className="toolbar-btn" title="Expand all">⊞ <span>All</span></button>
              <button onClick={collapseAll} className="toolbar-btn" title="Collapse all">⊟</button>

              {/* Divider */}
              <span className="w-px h-4 mx-1" style={{ background: t.border }} />

              {/* Full text / Compact toggle */}
              <button
                onClick={() => setDisplayMode('comfortable')}
                className={`toolbar-btn ${displayMode === 'comfortable' ? 'text-[#4589ff] bg-[rgba(69,137,255,0.12)]' : ''}`}
                title="Full text — wider nodes, titles fully visible"
              >
                Full text
              </button>
              <button
                onClick={() => setDisplayMode('compact')}
                className={`toolbar-btn ${displayMode === 'compact' ? 'text-[#4589ff] bg-[rgba(69,137,255,0.12)]' : ''}`}
                title="Compact — smaller nodes, titles truncated"
              >
                Compact
              </button>

              {/* Divider */}
              <span className="w-px h-4 mx-1" style={{ background: t.border }} />

              {/* Layout direction */}
              <button
                onClick={() => setLayoutDir('LR')}
                className={`toolbar-btn ${layoutDir === 'LR' ? 'text-[#4589ff] bg-[rgba(69,137,255,0.12)]' : ''}`}
                title="Horizontal — root left, children right"
              >
                → LR
              </button>
              <button
                onClick={() => setLayoutDir('RL')}
                className={`toolbar-btn ${layoutDir === 'RL' ? 'text-[#4589ff] bg-[rgba(69,137,255,0.12)]' : ''}`}
                title="Reverse horizontal — leaves left, root right"
              >
                ← RL
              </button>
              <button
                onClick={() => setLayoutDir('TB')}
                className={`toolbar-btn ${layoutDir === 'TB' ? 'text-[#4589ff] bg-[rgba(69,137,255,0.12)]' : ''}`}
                title="Vertical — root top, children below"
              >
                ↓ TB
              </button>

              {/* Divider */}
              <span className="w-px h-4 mx-1" style={{ background: t.border }} />

              {/* Map lock toggle */}
              <button
                onClick={() => setMapLocked(!mapLocked)}
                className={`toolbar-btn ${mapLocked ? 'text-[#f4f4f4] bg-[rgba(244,244,244,0.08)]' : 'text-[#f1c21b] bg-[rgba(241,194,27,0.12)]'}`}
                title={mapLocked ? 'Map locked — nodes cannot be dragged (click to unlock)' : 'Map unlocked — nodes can be dragged (click to lock)'}
              >
                {mapLocked ? '🔒 Locked' : '🔓 Unlocked'}
              </button>

              {/* Click-opens-panel toggle */}
              <button
                onClick={() => setClickOpensPanel(!clickOpensPanel)}
                className={`toolbar-btn ${clickOpensPanel ? 'text-[#4589ff] bg-[rgba(69,137,255,0.12)]' : ''}`}
                title={clickOpensPanel ? 'Click opens panel — click to disable' : 'Click on node opens panel (off) — click to enable'}
              >
                {clickOpensPanel ? '⊡ Panel on click' : '⊡ Panel on click'}
              </button>

              {/* Divider */}
              <span className="w-px h-4 mx-1" style={{ background: t.border }} />

              {/* Header progress bar */}
              {(() => {
                const total = rawNodes.length;
                if (total === 0) return null;
                const done  = rawNodes.filter(n => n.status === 'completed').length;
                const inProg = rawNodes.filter(n => n.status === 'in-progress').length;
                const pct   = Math.round((done / total) * 100);
                const color = pct === 100 ? '#42be65' : '#4589ff';
                return (
                  <div className="flex items-center gap-2 ml-1">
                    <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: t.progressTrack }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                    <span className="text-[11px] tabular-nums" style={{ color }}>
                      {pct}%
                    </span>
                    <span className="text-[10px] tabular-nums" style={{ color: t.textUI }}>
                      {done}/{total}
                      {inProg > 0 && <span style={{ color: t.bgAccent }}> · {inProg} active</span>}
                    </span>
                  </div>
                );
              })()}
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setSettingsPanelOpen(!settingsPanelOpen)}
              className={`toolbar-btn ${settingsPanelOpen ? 'bg-[rgba(69,137,255,0.12)]' : ''}`}
              style={{ color: settingsPanelOpen ? t.bgAccent : t.textUI }}
              title="Settings"
            >⚙</button>
            <span className="text-xs" style={{ color: t.textMuted }}>React Flow</span>
          </div>
        </header>

        {/* Canvas + Detail Panel row */}
        <div className="flex flex-1 min-h-0">
          <div className="flex-1 relative min-w-0">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[#4589ff] animate-pulse text-sm">Loading project…</span>
              </div>
            ) : !currentProject ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="text-5xl opacity-20">🧠</div>
                <p className="text-sm" style={{ color: t.textMuted }}>Select a project from the sidebar.</p>
                {!sidebarOpen && (
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="text-sm px-4 py-2 rounded text-white transition-colors"
                    style={{ background: t.bgAccent }}
                  >
                    Open project list
                  </button>
                )}
              </div>
            ) : (
              <MindMapFlow />
            )}
            {currentProject && !loading && <ProgressBadge />}
          </div>

          {/* Detail panel — only shown when explicitly opened via Enter */}
          {detailPanelOpen && selectedNodeId && currentProject && <DetailPanel />}
          {settingsPanelOpen && <SettingsPanel />}
        </div>
      </div>
    </div>
  );
}
