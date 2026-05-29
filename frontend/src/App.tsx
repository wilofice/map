import { useEffect, useState } from 'react';
import { useMindMapStore } from './store/mindMapStore';
import MindMapFlow from './MindMapFlow';
import type { Project } from './types/NodeTypes';

export default function App() {
  const { projects, currentProject, loading, error, loadProjects, loadProject } = useMindMapStore();
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
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r border-slate-700 bg-[#161b27] transition-all duration-200 ${
          sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-700 shrink-0">
          <span className="font-semibold text-slate-100 text-sm">🧠 Mind Maps</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-slate-400 hover:text-white text-lg leading-none"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {projects.length === 0 && (
            <p className="text-xs text-slate-500 p-2">No projects found. Start the Express server on :3000.</p>
          )}
          {projects.map((p: Project) => (
            <button
              key={p.id}
              onClick={() => handleSelectProject(p.id)}
              className={`w-full text-left px-3 py-2 rounded text-sm mb-1 transition-colors ${
                currentProject?.id === p.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700'
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
        <header className="flex items-center gap-3 px-4 py-2 border-b border-slate-700 bg-[#161b27] shrink-0">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-slate-400 hover:text-white text-sm px-2 py-1 rounded hover:bg-slate-700"
              title="Open project list"
            >
              ☰
            </button>
          )}
          <span className="text-sm font-semibold text-slate-100 truncate">
            {currentProject ? currentProject.name : 'No project selected'}
          </span>
          {loading && (
            <span className="text-xs text-blue-400 animate-pulse ml-2">Loading…</span>
          )}
          {error && (
            <span className="text-xs text-red-400 ml-2 truncate" title={error}>
              ⚠ {error}
            </span>
          )}
          <div className="ml-auto text-xs text-slate-500">
            React Flow · @xyflow/react
          </div>
        </header>

        {/* Canvas */}
        <div className="flex-1 relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-blue-400 animate-pulse text-sm">Loading project…</span>
            </div>
          ) : !currentProject ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="text-4xl">🧠</div>
              <p className="text-slate-400 text-sm">Select a project from the sidebar to view its mind map.</p>
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="text-sm px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white"
                >
                  Open project list
                </button>
              )}
            </div>
          ) : (
            <MindMapFlow />
          )}
        </div>
      </div>
    </div>
  );
}
