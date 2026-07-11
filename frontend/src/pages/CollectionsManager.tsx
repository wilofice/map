import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMindMapStore } from '../store/mindMapStore';
import { themes } from '../theme/themes';
import type { Project, Collection } from '../types/NodeTypes';

const COLLECTION_COLORS = [
  '#fa4d56', '#ff832b', '#f1c21b', '#42be65',
  '#08bdba', '#4589ff', '#8a3ffc', '#ff7eb6',
];

export default function CollectionsManager() {
  const navigate = useNavigate();
  const {
    projects,
    collections,
    theme,
    loadCollections,
    loadProjects,
    createCollection,
    updateCollection,
    deleteCollection,
    deleteProjects,
    moveToCollection,
    loadProject,
  } = useMindMapStore();
  const t = themes[theme];

  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Local state for edits
  const [isCreating, setIsCreating] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  
  // Color picker state
  const [colorPickerCollId, setColorPickerCollId] = useState<string | null>(null);

  // Projects selection
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCollections();
    loadProjects();
  }, [loadCollections, loadProjects]);

  // Derived data
  const groups = useMemo(() => {
    const map = new Map<string, Collection & { projects: Project[] }>();
    for (const c of collections) {
      map.set(c.id, { ...c, projects: [] });
    }
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
    return map;
  }, [collections, projects]);

  const collectionsList = useMemo(() => {
    const list = [...groups.values()];
    // sort so Default is at the bottom or top depending on preference, we'll put it at top if it has items
    return list.filter(g => g.id !== 'default-collection' || g.projects.length > 0);
  }, [groups]);

  const activeCollection = selectedCollectionId 
    ? groups.get(selectedCollectionId) 
    : collectionsList[0];

  const filteredProjects = useMemo(() => {
    if (!activeCollection) return [];
    let list = activeCollection.projects;
    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      // If searching, we could filter across ALL collections, but for now let's filter the active one, 
      // or if they want to search all, we should show all.
      // Requirements said: "Search input in top bar filters projects across ALL collections by name"
      list = projects.filter(p => p.name.toLowerCase().includes(lowerQ));
    }
    return list;
  }, [activeCollection, projects, searchQuery]);

  // Handlers
  const handleCreateSubmit = async () => {
    if (newCollectionName.trim()) {
      await createCollection(newCollectionName.trim());
      setNewCollectionName('');
      setIsCreating(false);
    }
  };

  const handleRenameSubmit = async (id: string) => {
    if (editingName.trim()) {
      await updateCollection(id, { name: editingName.trim() });
    }
    setEditingCollectionId(null);
  };

  const handleDeleteCollection = async (id: string, name: string) => {
    if (window.confirm(`Delete collection "${name}"? Projects will be moved to Default.`)) {
      await deleteCollection(id);
      if (selectedCollectionId === id) setSelectedCollectionId(null);
    }
  };

  const toggleProjectSelection = (id: string) => {
    setSelectedProjects(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedProjects.size > 0 && window.confirm(`Delete ${selectedProjects.size} selected projects?`)) {
      await deleteProjects(Array.from(selectedProjects));
      setSelectedProjects(new Set());
    }
  };

  const handleMoveProject = async (projectId: string, targetColId: string) => {
    await moveToCollection([projectId], targetColId);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden text-sm" style={{ background: t.shell, color: t.textPrimary }}>
      {/* Top Bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b shrink-0" style={{ background: t.surface, borderColor: t.border }}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[rgba(128,128,128,0.1)] transition-colors"
            style={{ color: t.textMuted }}
            title="Back to Canvas"
          >
            ←
          </button>
          <h1 className="font-semibold text-lg" style={{ color: t.textHeading }}>Collections</h1>
        </div>
        <div className="relative w-64">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50" style={{ color: t.textMuted }}>🔍</span>
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-md border text-sm outline-none transition-colors"
            style={{ background: t.shell, borderColor: t.border, color: t.textPrimary }}
          />
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Left Column: Collections */}
        <div className="w-[300px] flex flex-col border-r shrink-0" style={{ borderColor: t.border, background: t.surface }}>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {collectionsList.map(coll => {
              const isActive = (selectedCollectionId === coll.id) || (!selectedCollectionId && activeCollection?.id === coll.id);
              return (
                <div
                  key={coll.id}
                  onClick={() => setSelectedCollectionId(coll.id)}
                  className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    isActive ? '' : 'hover:bg-[rgba(128,128,128,0.05)]'
                  }`}
                  style={isActive ? { background: 'rgba(69,137,255,0.1)', color: t.textHeading } : { color: t.textSecondary }}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0 relative">
                    {/* Color dot */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setColorPickerCollId(colorPickerCollId === coll.id ? null : coll.id);
                      }}
                      className="w-3 h-3 rounded-full shrink-0 hover:scale-110 transition-transform"
                      style={{ background: coll.color || t.border }}
                      title="Set color"
                    />
                    
                    {/* Color picker popover */}
                    {colorPickerCollId === coll.id && (
                      <div 
                        className="absolute left-0 top-6 z-10 p-2 rounded-md shadow-lg flex gap-1 border"
                        style={{ background: t.surface, borderColor: t.border }}
                        onClick={e => e.stopPropagation()}
                      >
                        {COLLECTION_COLORS.map(c => (
                          <button
                            key={c}
                            className="w-4 h-4 rounded-full hover:scale-110 transition-transform"
                            style={{ background: c }}
                            onClick={async () => {
                              await updateCollection(coll.id, { color: c });
                              setColorPickerCollId(null);
                            }}
                          />
                        ))}
                      </div>
                    )}

                    {/* Name */}
                    {editingCollectionId === coll.id ? (
                      <input
                        autoFocus
                        value={editingName}
                        onChange={e => setEditingName(e.target.value)}
                        onBlur={() => handleRenameSubmit(coll.id)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleRenameSubmit(coll.id);
                          if (e.key === 'Escape') setEditingCollectionId(null);
                        }}
                        className="flex-1 min-w-0 bg-transparent border-b outline-none"
                        style={{ borderColor: t.bgAccent }}
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <span 
                        className="flex-1 truncate font-medium"
                        onDoubleClick={(e) => {
                          if (coll.id === 'default-collection') return;
                          e.stopPropagation();
                          setEditingName(coll.name);
                          setEditingCollectionId(coll.id);
                        }}
                      >
                        {coll.name}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    {coll.id !== 'default-collection' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCollection(coll.id, coll.name);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-[#fa4d56] transition-opacity"
                        title="Delete collection"
                      >
                        🗑
                      </button>
                    )}
                    <span className="tabular-nums text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(128,128,128,0.1)', color: t.textMuted }}>
                      {coll.projects.length}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Create new collection */}
          <div className="p-3 border-t" style={{ borderColor: t.border }}>
            {isCreating ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  placeholder="Collection name..."
                  value={newCollectionName}
                  onChange={e => setNewCollectionName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleCreateSubmit();
                    if (e.key === 'Escape') { setIsCreating(false); setNewCollectionName(''); }
                  }}
                  className="flex-1 px-2 py-1.5 rounded-md border text-sm outline-none"
                  style={{ background: t.shell, borderColor: t.border, color: t.textPrimary }}
                />
                <button onClick={handleCreateSubmit} className="px-2 text-[#42be65]">✓</button>
                <button onClick={() => { setIsCreating(false); setNewCollectionName(''); }} className="px-2" style={{ color: t.textMuted }}>×</button>
              </div>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className="w-full py-2 flex items-center justify-center gap-2 rounded-md hover:bg-[rgba(128,128,128,0.05)] transition-colors"
                style={{ color: t.textMuted }}
              >
                + New Collection
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Projects */}
        <div className="flex-1 flex flex-col min-w-0" style={{ background: t.shell }}>
          {activeCollection ? (
            <>
              <div className="px-6 py-5 border-b" style={{ borderColor: t.border }}>
                <h2 className="text-xl font-semibold flex items-center gap-2" style={{ color: t.textHeading }}>
                  {activeCollection.color && (
                    <div className="w-4 h-4 rounded-full" style={{ background: activeCollection.color }} />
                  )}
                  {searchQuery ? `Search Results: "${searchQuery}"` : activeCollection.name}
                </h2>
                {activeCollection.description && !searchQuery && (
                  <p className="mt-1" style={{ color: t.textMuted }}>{activeCollection.description}</p>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-1">
                  {filteredProjects.length === 0 ? (
                    <div className="text-center py-10" style={{ color: t.textMuted }}>
                      No projects found.
                    </div>
                  ) : (
                    filteredProjects.map(p => {
                      const pct = Math.round(((p.completed_count ?? 0) / (p.node_count ?? 1)) * 100) || 0;
                      let statusColor = '#8d8d8d';
                      if (pct === 100) statusColor = '#42be65';
                      else if (pct > 0) statusColor = '#f1c21b';

                      return (
                        <div
                          key={p.id}
                          className="group flex items-center gap-4 px-4 py-3 rounded-lg transition-colors border border-transparent hover:border-[rgba(128,128,128,0.1)] hover:bg-[rgba(128,128,128,0.02)]"
                        >
                          <input
                            type="checkbox"
                            checked={selectedProjects.has(p.id)}
                            onChange={() => toggleProjectSelection(p.id)}
                            className="cursor-pointer accent-[#4589ff]"
                          />
                          
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: statusColor }} />
                          
                          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => {
                            loadProject(p.id);
                            navigate('/');
                          }}>
                            <div className="font-medium truncate" style={{ color: t.textHeading }}>{p.name}</div>
                            {searchQuery && (
                              <div className="text-xs truncate opacity-60">
                                In collection: {groups.get(p.collection_id ?? 'default-collection')?.name}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-6 shrink-0 text-sm" style={{ color: t.textMuted }}>
                            <span className="tabular-nums">{p.node_count ?? 0} nodes</span>
                            <span className="tabular-nums w-10 text-right">{pct}%</span>
                            
                            {/* Move dropdown */}
                            <select
                              value={p.collection_id ?? 'default-collection'}
                              onChange={(e) => handleMoveProject(p.id, e.target.value)}
                              className="opacity-0 group-hover:opacity-100 bg-transparent border rounded px-1 py-0.5 text-xs outline-none transition-opacity"
                              style={{ borderColor: t.border, color: t.textPrimary }}
                            >
                              <option disabled>Move to...</option>
                              {collectionsList.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>

                            <button
                              onClick={() => deleteProjects([p.id])}
                              className="opacity-0 group-hover:opacity-100 hover:text-[#fa4d56] transition-opacity p-1"
                              title="Delete project"
                            >
                              🗑
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Bulk actions footer */}
              {selectedProjects.size > 0 && (
                <div className="p-4 border-t flex items-center justify-between" style={{ borderColor: t.border, background: t.surface }}>
                  <span style={{ color: t.textHeading }}>
                    {selectedProjects.size} project(s) selected
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedProjects(new Set())}
                      className="px-4 py-1.5 rounded-md hover:bg-[rgba(128,128,128,0.1)] transition-colors"
                      style={{ color: t.textMuted }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      className="px-4 py-1.5 rounded-md bg-[#da1e28] text-white hover:bg-[#b81922] transition-colors"
                    >
                      Delete Selected
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center" style={{ color: t.textMuted }}>
              Select a collection to view projects.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
