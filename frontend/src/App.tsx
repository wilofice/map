import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useMindMapStore } from './store/mindMapStore';
import { themes } from './theme/themes';
import MindMapFlow from './MindMapFlow';
import DetailPanel from './components/DetailPanel';
import SettingsPanel from './components/SettingsPanel';
import ProgressBadge from './components/ProgressBadge';
import CollectionsSidebar from './components/CollectionsSidebar';
import CollectionsManager from './pages/CollectionsManager';

function CanvasView() {
  const {
    currentProject, rawNodes, loading, error,
    expandAll, collapseAll,
    displayMode, setDisplayMode,
    layoutDir, setLayoutDir,
    selectedNodeId, focusedNodeId, setFocusedNodeId, detailPanelOpen,
    clickOpensPanel, setClickOpensPanel,
    mapLocked, setMapLocked,
    theme,
    settingsPanelOpen, setSettingsPanelOpen,
  } = useMindMapStore();
  
  const t = themes[theme];
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className={`flex h-screen w-screen overflow-hidden text-[#f4f4f4] theme-${theme}`} style={{ background: t.shell }}>
      <CollectionsSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

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
              <button onClick={expandAll} className="toolbar-btn" title="Expand all">⊞ <span>All</span></button>
              <button onClick={collapseAll} className="toolbar-btn" title="Collapse all">⊟</button>

              {focusedNodeId && (
                <>
                  <span className="w-px h-4 mx-1" style={{ background: t.border }} />
                  <button
                    onClick={() => setFocusedNodeId(null)}
                    className="toolbar-btn text-[#f1c21b] bg-[rgba(241,194,27,0.12)] font-semibold"
                    title="Exit Focus Mode (Show entire map)"
                  >
                    ⌖ Exit Focus Mode
                  </button>
                </>
              )}

              <span className="w-px h-4 mx-1" style={{ background: t.border }} />

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

              <span className="w-px h-4 mx-1" style={{ background: t.border }} />

              <button
                onClick={() => setLayoutDir('LR')}
                className={`toolbar-btn ${layoutDir === 'LR' ? 'text-[#4589ff] bg-[rgba(69,137,255,0.12)]' : ''}`}
              >
                → LR
              </button>
              <button
                onClick={() => setLayoutDir('RL')}
                className={`toolbar-btn ${layoutDir === 'RL' ? 'text-[#4589ff] bg-[rgba(69,137,255,0.12)]' : ''}`}
              >
                ← RL
              </button>
              <button
                onClick={() => setLayoutDir('TB')}
                className={`toolbar-btn ${layoutDir === 'TB' ? 'text-[#4589ff] bg-[rgba(69,137,255,0.12)]' : ''}`}
              >
                ↓ TB
              </button>

              <span className="w-px h-4 mx-1" style={{ background: t.border }} />

              <button
                onClick={() => setMapLocked(!mapLocked)}
                className={`toolbar-btn ${mapLocked ? 'text-[#f4f4f4] bg-[rgba(244,244,244,0.08)]' : 'text-[#f1c21b] bg-[rgba(241,194,27,0.12)]'}`}
              >
                {mapLocked ? '🔒 Locked' : '🔓 Unlocked'}
              </button>

              <button
                onClick={() => setClickOpensPanel(!clickOpensPanel)}
                className={`toolbar-btn ${clickOpensPanel ? 'text-[#4589ff] bg-[rgba(69,137,255,0.12)]' : ''}`}
              >
                {clickOpensPanel ? '⊡ Panel on click' : '⊡ Panel on click'}
              </button>

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

          {detailPanelOpen && selectedNodeId && currentProject && <DetailPanel />}
          {settingsPanelOpen && <SettingsPanel />}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { loadProjects } = useMindMapStore();

  useEffect(() => {
    // Ensure we load projects at least once on startup
    loadProjects();
  }, [loadProjects]);

  return (
    <Routes>
      <Route path="/" element={<CanvasView />} />
      <Route path="/collections" element={<CollectionsManager />} />
    </Routes>
  );
}
