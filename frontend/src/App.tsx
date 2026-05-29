import { useEffect, useState, useCallback } from 'react';
import { useMindMapStore } from './store/mindMapStore';
import MindMapFlow from './MindMapFlow';
import DetailPanel from './components/DetailPanel';
import ProgressBadge from './components/ProgressBadge';
import type { Project } from './types/NodeTypes';

export default function App() {
  const {
    projects, currentProject, loading, error,
    loadProjects, loadProject, deleteProjects,
    expandAll, collapseAll,
    displayMode, setDisplayMode,
    layoutDir, setLayoutDir,
    selectedNodeId,
  } = useMindMapStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [manageMode, setManageMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

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
  }, [loadProjects]);

  const handleSelectProject = (id: string) => {
    loadProject(id);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f4f4f4] text-[#161616]">

      {/* Sidebar — project list */}
      <aside
        className={`flex flex-col border-r border-[#e0e0e0] bg-white transition-all duration-200 shrink-0 ${
          sidebarOpen ? 'w-60' : 'w-0 overflow-hidden'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#e0e0e0]">
          <span className="font-semibold text-[#161616] text-sm tracking-wide">🧠 Mind Maps</span>
          <div className="flex items-center gap-1">
            {manageMode ? (
              <button
                onClick={exitManage}
                className="text-xs text-[#525252] hover:text-[#161616] px-2 py-0.5 rounded hover:bg-[#e8e8e8] transition-colors"
              >Cancel</button>
            ) : (
              <button
                onClick={() => setManageMode(true)}
                className="text-[#8d8d8d] hover:text-[#161616] text-xs px-2 py-0.5 rounded hover:bg-[#e8e8e8] transition-colors"
                title="Manage / delete maps"
              >Manage</button>
            )}
            <button
              onClick={() => { setSidebarOpen(false); exitManage(); }}
              className="text-[#8d8d8d] hover:text-[#161616] text-lg leading-none transition-colors ml-1"
            >×</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {projects.length === 0 && (
            <p className="text-xs text-[#a8a8a8] p-2">No projects. Make sure the server is running on :3000.</p>
          )}
          {projects.map((p: Project) => (
            <div key={p.id} className="relative group mb-1">
              {manageMode ? (
                /* ── Manage mode row ── */
                <label className={`flex items-center gap-2 px-2 py-2 rounded cursor-pointer transition-colors ${
                  selected.has(p.id) ? 'bg-[#fff1f1]' : 'hover:bg-[#e8e8e8]'
                }`}>
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggleSelect(p.id)}
                    className="accent-[#da1e28] shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[#161616] truncate">{p.name}</div>
                    {p.description && (
                      <div className="text-xs text-[#6f6f6f] truncate">{p.description}</div>
                    )}
                  </div>
                </label>
              ) : (
                /* ── Normal row ── */
                <button
                  onClick={() => handleSelectProject(p.id)}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    currentProject?.id === p.id
                      ? 'bg-[#0f62fe] text-white'
                      : 'text-[#525252] hover:bg-[#e8e8e8]'
                  }`}
                >
                  <div className="font-medium truncate">{p.name}</div>
                  {p.description && (
                    <div className={`text-xs truncate mt-0.5 ${currentProject?.id === p.id ? 'text-blue-100' : 'text-[#6f6f6f]'}`}>
                      {p.description}
                    </div>
                  )}
                </button>
              )}

              {/* Quick delete — hover trash icon (normal mode only) */}
              {!manageMode && (
                <button
                  onClick={(e) => handleDeleteOne(p.id, p.name, e)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-[#fff1f1] text-[#8d8d8d] hover:text-[#da1e28] text-xs"
                  title={`Delete "${p.name}"`}
                >🗑</button>
              )}
            </div>
          ))}
        </div>

        {/* Manage mode footer */}
        {manageMode && (
          <div className="shrink-0 border-t border-[#e0e0e0] p-2">
            <button
              onClick={handleDeleteSelected}
              disabled={selected.size === 0}
              className={`w-full py-1.5 rounded text-sm font-medium transition-colors ${
                selected.size > 0
                  ? 'bg-[#da1e28] text-white hover:bg-[#b81922]'
                  : 'bg-[#f4f4f4] text-[#a8a8a8] cursor-not-allowed'
              }`}
            >
              {selected.size > 0 ? `Delete ${selected.size} map${selected.size > 1 ? 's' : ''}` : 'Select maps to delete'}
            </button>
          </div>
        )}
      </aside>

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Top bar */}
        <header className="flex items-center gap-2 px-3 py-2 border-b border-[#e0e0e0] bg-white shrink-0">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-[#6f6f6f] hover:text-[#161616] px-2 py-1 rounded hover:bg-[#e8e8e8] transition-colors text-sm"
              title="Open project list"
            >☰</button>
          )}

          <span className="text-sm font-semibold text-[#161616] truncate">
            {currentProject ? currentProject.name : 'No project selected'}
          </span>

          {loading && <span className="text-xs text-[#0f62fe] animate-pulse">Loading…</span>}
          {error && <span className="text-xs text-[#da1e28] truncate max-w-xs" title={error}>⚠ {error}</span>}

          {currentProject && (
            <div className="flex items-center gap-1 ml-2">
              {/* Expand / Collapse */}
              <button onClick={expandAll}  className="toolbar-btn" title="Expand all">⊞ <span>All</span></button>
              <button onClick={collapseAll} className="toolbar-btn" title="Collapse all">⊟</button>

              {/* Divider */}
              <span className="w-px h-4 bg-[#e0e0e0] mx-1" />

              {/* Full text / Compact toggle */}
              <button
                onClick={() => setDisplayMode('comfortable')}
                className={`toolbar-btn ${displayMode === 'comfortable' ? 'text-[#0f62fe] bg-[#0f62fe]/10' : ''}`}
                title="Full text — wider nodes, titles fully visible"
              >
                Full text
              </button>
              <button
                onClick={() => setDisplayMode('compact')}
                className={`toolbar-btn ${displayMode === 'compact' ? 'text-[#0f62fe] bg-[#0f62fe]/10' : ''}`}
                title="Compact — smaller nodes, titles truncated"
              >
                Compact
              </button>

              {/* Divider */}
              <span className="w-px h-4 bg-[#e0e0e0] mx-1" />

              {/* Layout direction */}
              <button
                onClick={() => setLayoutDir('LR')}
                className={`toolbar-btn ${layoutDir === 'LR' ? 'text-[#0f62fe] bg-[#0f62fe]/10' : ''}`}
                title="Horizontal — root left, children right"
              >
                → LR
              </button>
              <button
                onClick={() => setLayoutDir('RL')}
                className={`toolbar-btn ${layoutDir === 'RL' ? 'text-[#0f62fe] bg-[#0f62fe]/10' : ''}`}
                title="Reverse horizontal — leaves left, root right"
              >
                ← RL
              </button>
              <button
                onClick={() => setLayoutDir('TB')}
                className={`toolbar-btn ${layoutDir === 'TB' ? 'text-[#0f62fe] bg-[#0f62fe]/10' : ''}`}
                title="Vertical — root top, children below"
              >
                ↓ TB
              </button>
            </div>
          )}

          <div className="ml-auto text-xs text-[#a8a8a8]">React Flow</div>
        </header>

        {/* Canvas + Detail Panel row */}
        <div className="flex flex-1 min-h-0">
          <div className="flex-1 relative min-w-0">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[#0f62fe] animate-pulse text-sm">Loading project…</span>
              </div>
            ) : !currentProject ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="text-5xl opacity-20">🧠</div>
                <p className="text-[#6f6f6f] text-sm">Select a project from the sidebar.</p>
                {!sidebarOpen && (
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="text-sm px-4 py-2 bg-[#0f62fe] hover:bg-[#0043ce] rounded text-white transition-colors"
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

          {/* Detail panel slides in when a node is selected */}
          {selectedNodeId && currentProject && <DetailPanel />}
        </div>
      </div>
    </div>
  );
}
