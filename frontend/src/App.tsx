import { useEffect, useState } from 'react';
import { useMindMapStore } from './store/mindMapStore';
import MindMapFlow from './MindMapFlow';
import DetailPanel from './components/DetailPanel';
import ProgressBadge from './components/ProgressBadge';
import type { Project } from './types/NodeTypes';

export default function App() {
  const {
    projects, currentProject, loading, error,
    loadProjects, loadProject,
    expandAll, collapseAll,
    displayMode, setDisplayMode,
    layoutDir, setLayoutDir,
    selectedNodeId,
  } = useMindMapStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleSelectProject = (id: string) => {
    loadProject(id);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0f1117] text-slate-200">

      {/* Sidebar — project list */}
      <aside
        className={`flex flex-col border-r border-slate-700/60 bg-[#13192a] transition-all duration-200 shrink-0 ${
          sidebarOpen ? 'w-60' : 'w-0 overflow-hidden'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/60">
          <span className="font-semibold text-slate-100 text-sm tracking-wide">🧠 Mind Maps</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-slate-500 hover:text-white text-lg leading-none transition-colors"
          >×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {projects.length === 0 && (
            <p className="text-xs text-slate-500 p-2">No projects. Make sure the server is running on :3000.</p>
          )}
          {projects.map((p: Project) => (
            <button
              key={p.id}
              onClick={() => handleSelectProject(p.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm mb-1 transition-colors ${
                currentProject?.id === p.id
                  ? 'bg-blue-600/80 text-white'
                  : 'text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              <div className="font-medium truncate">{p.name}</div>
              {p.description && (
                <div className="text-xs text-slate-400 truncate mt-0.5">{p.description}</div>
              )}
            </button>
          ))}
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Top bar */}
        <header className="flex items-center gap-2 px-3 py-2 border-b border-slate-700/60 bg-[#13192a] shrink-0">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-700/50 transition-colors text-sm"
              title="Open project list"
            >☰</button>
          )}

          <span className="text-sm font-semibold text-slate-100 truncate">
            {currentProject ? currentProject.name : 'No project selected'}
          </span>

          {loading && <span className="text-xs text-blue-400 animate-pulse">Loading…</span>}
          {error && <span className="text-xs text-red-400 truncate max-w-xs" title={error}>⚠ {error}</span>}

          {currentProject && (
            <div className="flex items-center gap-1 ml-2">
              {/* Expand / Collapse */}
              <button onClick={expandAll}  className="toolbar-btn" title="Expand all">⊞ <span>All</span></button>
              <button onClick={collapseAll} className="toolbar-btn" title="Collapse all">⊟</button>

              {/* Divider */}
              <span className="w-px h-4 bg-slate-700 mx-1" />

              {/* Full text / Compact toggle */}
              <button
                onClick={() => setDisplayMode('comfortable')}
                className={`toolbar-btn ${displayMode === 'comfortable' ? 'text-blue-400 bg-blue-500/15' : ''}`}
                title="Full text — wider nodes, titles fully visible"
              >
                Full text
              </button>
              <button
                onClick={() => setDisplayMode('compact')}
                className={`toolbar-btn ${displayMode === 'compact' ? 'text-blue-400 bg-blue-500/15' : ''}`}
                title="Compact — smaller nodes, titles truncated"
              >
                Compact
              </button>

              {/* Divider */}
              <span className="w-px h-4 bg-slate-700 mx-1" />

              {/* Layout direction */}
              <button
                onClick={() => setLayoutDir('LR')}
                className={`toolbar-btn ${layoutDir === 'LR' ? 'text-blue-400 bg-blue-500/15' : ''}`}
                title="Horizontal — root left, children right"
              >
                ← → LR
              </button>
              <button
                onClick={() => setLayoutDir('TB')}
                className={`toolbar-btn ${layoutDir === 'TB' ? 'text-blue-400 bg-blue-500/15' : ''}`}
                title="Vertical — root top, children below"
              >
                ↓ TB
              </button>
            </div>
          )}

          <div className="ml-auto text-xs text-slate-600">React Flow</div>
        </header>

        {/* Canvas + Detail Panel row */}
        <div className="flex flex-1 min-h-0">
          <div className="flex-1 relative min-w-0">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-blue-400 animate-pulse text-sm">Loading project…</span>
              </div>
            ) : !currentProject ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="text-5xl opacity-20">🧠</div>
                <p className="text-slate-500 text-sm">Select a project from the sidebar.</p>
                {!sidebarOpen && (
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="text-sm px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white transition-colors"
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
