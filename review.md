What works well ✅
Data layer is solid — SQLite backend, cascade deletes, activity log, full REST API
Layout engine — Dagre with LR/RL/TB, expand/collapse, the reLayout architecture is clean
Dark theme — palette is coherent and visually intentional
Status cascade — cycling a parent correctly propagates to all descendants
Progress badge — clean arc chart, live, always visible
Critical gaps — the app is currently read-only 🔴
1. The Detail Panel cannot edit anything    | VALIDATED
You can read every field. You cannot type in a title, change a description, set dates, write a prompt, or change priority from the panel. Only status can be cycled (via the badge). This is the biggest missing piece — the app is essentially an importer + viewer right now.

What's needed: Each field in DetailPanel needs an editable input/textarea that calls updateNodeField on blur.

2. New nodes are created as "New node" with no way to rename
addChild creates a node, it appears on the canvas, but clicking it only opens the read-only panel. There's no inline rename, no auto-focus input. The node is permanently named "New node" unless you reload and edit the DB manually.

Fix: After addChild, immediately select the new node and open the panel in edit mode — or show an inline text input directly on the canvas node.

3. getLastProject exists on the API but is never called
The backend saves last_opened_project to app_state on every project select. The frontend has api.getLastProject() in useApi.ts. But App.tsx never calls it on mount. Every page reload shows the empty "Select a project" state.

Fix: One line in useEffect on mount — call getLastProject, and if it returns a valid ID, call loadProject(id).

Interaction gaps 🟡
4. Keyboard navigation is incomplete  | VALIDATED
Enter to expand/collapse ✅ (just added)
Escape to deselect a node / close the detail panel — missing
Delete / Backspace on a selected node — missing
Arrow keys to move between sibling nodes — missing (nice to have)
5. Node dragging is misleading  | VALIDATED disable draggring
React Flow lets you drag nodes freely. But the positions are never saved to the DB, and any layout recalculation (expand, collapse, status change) snaps everything back. A user who drags nodes to organize them will lose all their work silently.

Fix: Either disable dragging entirely (nodesDraggable={false}) or implement position persistence.

6. No way to create a new project from the UI 
The sidebar lists projects, has a "Manage" mode for deletion, but zero way to create one. The backend supports POST /api/db/projects. Users are stuck with whatever is in the DB.

Design & visual issues 🟡
7. Node heights are fixed in the layout but dynamic in reality  | VALIDATED
NODE_DIMS.comfortable.height = 68. A node with a 3-line wrapping title is taller than 68px. Dagre uses the fixed value for spacing, so tall nodes visually overlap their neighbors.

Fix: Either switch comfortable mode to truncate (same as compact) or increase height to ~90-100px to accommodate wrapping, or measure actual heights post-render and trigger a re-layout.

8. The progress badge counts expanded/collapsed nodes indiscriminately 
If you collapse a branch with 40 completed nodes, the badge still counts them. This is correct for "total project progress" but could feel disconnected from what's visible on screen. At minimum, a tooltip explaining "out of N total nodes" helps.

9. Sidebar project cards have no status signal  | VALIDATED
Each card shows name + description only. With 3 projects it's fine. With 10+, you can't tell at a glance which project is 80% done or has blocked tasks without opening it.

Suggestion: A tiny inline progress bar or done/total count on each project card.

10. No empty-canvas state when a project has 0 nodes 
If you create a project without nodes, the canvas is a blank dark void with no guidance. A centered placeholder ("This project has no nodes. Click + on a node to start.") would help.

11. Error messages are swallowed in the header 
Errors appear as a short truncated red string next to the project name. They don't persist — the next loading: true replaces them. A toast/snackbar or a dedicated error zone would be more reliable.

Architecture notes
12. nodeWidth is recalculated inside MindMapNode instead of using data.nodeWidth  | VALIDATED
MindMapNode.tsx:27 reads NODE_DIMS[mode].width directly, making the nodeWidth prop passed from the layout unused. Minor, but it creates an inconsistency if dims ever change.

13. The server still carries ~1200 lines of dead XML/legacy endpoints  | VALIDATED
server.js has full XML load/save/merge infrastructure, pure JSON handlers, and a filesystem browser — none of which the React frontend uses. This is legacy from before the SQLite migration. It doesn't break anything, but it's noise. The active surface is /api/db/* only.

Priority order for next work
#	What	Effort
1	Auto-load last project on mount	5 min
2	Escape key → deselect / close panel	10 min  | VALIDATED
3	Disable node dragging (or save positions)	5 min  | VALIDATED disable
4	Editable Detail Panel — inline inputs for title, description, priority, dates	1–2h  | VALIDATED
5	Auto-focus new node — open panel in edit mode after addChild	30 min 
6	Create project from sidebar	30 min
7	Mini progress in sidebar project rows	20 min  | VALIDATED
Items 1–3 are trivial one-liners. Item 4 (editable panel) is the most impactful and the most work. Want to start with the quick wins or go straight to the editing?