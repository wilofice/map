import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMindMapStore } from '../store/mindMapStore';
import { themes } from '../theme/themes';
import type { Project, Collection } from '../types/NodeTypes';

export default function CollectionsSidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const {
    projects,
    collections,
    currentProject,
    theme,
    loadProject,
    loadCollections,
  } = useMindMapStore();
  
  const t = themes[theme];
  
  // Collapse by default
  const [collapsedColls, setCollapsedColls] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  // Group projects under their collection
  const grouped = useMemo(() => {
    const map = new Map<string, Collection & { projects: Project[] }>();
    for (const c of collections) {
      map.set(c.id, { ...c, projects: [] });
    }
    // ensure default exists
    if (!map.has('default-collection')) {
      map.set('default-collection', {
        id: 'default-collection',
        name: 'Default',
        projects: [],
      });
    }

    for (const p of projects) {
      const key = p.collection_id ?? 'default-collection';
      if (map.has(key)) map.get(key)!.projects.push(p);
    }
    
    // Sort collections: actual collections first, then default
    const result = [...map.values()].filter(g => g.projects.length > 0 || g.id !== 'default-collection');
    return result;
  }, [collections, projects]);

  // Initialize collapsed states on first render/load
  useEffect(() => {
    setCollapsedColls(prev => {
      const next = new Set(prev);
      for (const g of grouped) {
        if (!next.has(g.id)) next.add(g.id); // collapse all by default
      }
      return next;
    });
  }, [grouped]);

  const toggleColl = (id: string) => {
    setCollapsedColls(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSelectProject = (id: string) => {
    loadProject(id);
    onClose();
    navigate('/');
  };

  return (
    <aside
      className={`flex flex-col border-r transition-all duration-200 shrink-0 ${
        open ? 'w-64' : 'w-0 overflow-hidden'
      }`}
      style={{ background: t.surface, borderColor: t.border }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: t.border }}>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm tracking-wide" style={{ color: t.textHeading }}>
            🧠 Mind Maps
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onClose}
            className="text-lg leading-none transition-colors p-1"
            style={{ color: t.textMuted }}
            title="Close sidebar"
          >×</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-4 mt-2">
        {grouped.map(group => (
          <div key={group.id} className="mb-2">
            <button
              onClick={() => toggleColl(group.id)}
              className="w-full flex items-center gap-2 px-2 py-1 rounded text-[11px] font-semibold uppercase tracking-widest transition-colors hover:bg-[rgba(128,128,128,0.1)] group"
              style={{ color: t.textMuted }}
            >
              <span className="text-[9px] w-3 flex justify-center text-opacity-50 transition-transform">
                {collapsedColls.has(group.id) ? '▸' : '▾'}
              </span>
              {group.color && (
                <div className="w-2 h-2 rounded-full" style={{ background: group.color }} />
              )}
              <span className="flex-1 text-left truncate">{group.name}</span>
              <span className="tabular-nums text-[10px] bg-[rgba(128,128,128,0.1)] px-1.5 py-0.5 rounded-full opacity-70 group-hover:opacity-100 transition-opacity">
                {group.projects.length}
              </span>
            </button>

            {!collapsedColls.has(group.id) && (
              <div className="mt-1 space-y-0.5">
                {group.projects.map((p: Project) => {
                  const isActive = currentProject?.id === p.id;
                  const pct = Math.round(((p.completed_count ?? 0) / (p.node_count ?? 1)) * 100) || 0;
                  
                  let statusColor = '#8d8d8d'; // grey/pending
                  if (pct === 100) statusColor = '#42be65'; // green/completed
                  else if (pct > 0) statusColor = '#f1c21b'; // amber/in-progress

                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelectProject(p.id)}
                      className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors flex items-center gap-2 group ${
                        isActive ? '' : 'hover:bg-[rgba(128,128,128,0.1)]'
                      }`}
                      style={isActive 
                        ? { background: 'rgba(69,137,255,0.15)', color: t.textHeading } 
                        : { color: t.textSecondary }
                      }
                    >
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: statusColor }} />
                      <div className="font-medium truncate flex-1">{p.name}</div>
                      {(p.node_count ?? 0) > 0 && (
                        <span className="text-[10px] tabular-nums shrink-0" style={{ color: isActive ? t.textHeading : t.textMuted }}>
                          {pct}%
                        </span>
                      )}
                    </button>
                  );
                })}
                {group.projects.length === 0 && (
                  <div className="px-5 py-1 text-xs italic opacity-50" style={{ color: t.textMuted }}>
                    No projects
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-3 border-t shrink-0 flex flex-col gap-2" style={{ borderColor: t.border }}>
        <button
          onClick={() => {
            navigate('/graph');
            onClose();
          }}
          className="w-full py-1.5 rounded text-xs font-medium transition-colors hover:bg-[rgba(128,128,128,0.1)]"
          style={{ color: t.textSecondary }}
        >
          ⬡ Graph View
        </button>
        <button
          onClick={() => {
            navigate('/collections');
            onClose();
          }}
          className="w-full py-1.5 rounded text-xs font-medium transition-colors hover:bg-[rgba(128,128,128,0.1)]"
          style={{ color: t.textSecondary }}
        >
          Manage Collections…
        </button>
      </div>
    </aside>
  );
}
