# Modular Mind Map

AI-based interactive mind mapping application. Commercial-grade architecture built on React Flow with a persistent SQLite backend.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Project Structure](#project-structure)
4. [Getting Started](#getting-started)
5. [Environment Configuration](#environment-configuration)
6. [Backend — Express API](#backend--express-api)
7. [Database Schema](#database-schema)
8. [Frontend — React + React Flow](#frontend--react--react-flow)
9. [State Management](#state-management)
10. [Layout Engine](#layout-engine)
11. [Node Rendering System](#node-rendering-system)
12. [Theme System](#theme-system)
13. [UI Features Reference](#ui-features-reference)
14. [Keyboard Shortcuts](#keyboard-shortcuts)
15. [API Reference](#api-reference)
16. [Network Access (LAN)](#network-access-lan)
17. [CLI Tool](#cli-tool)
18. [Critical Implementation Notes](#critical-implementation-notes)
19. [Known Pitfalls](#known-pitfalls)
20. [Roadmap](#roadmap)

---

## Overview

A mind-mapping tool intended for commercial release. Data is stored in SQLite (persistent across sessions). The UI is a node-based interactive canvas powered by React Flow — the same library used in production tools like LangFlow and Stripe's workflow editors.

**Key capabilities:**
- Hierarchical mind maps with unlimited depth
- Per-node: status, priority, dates, comments, code blocks, AI prompts, CLI commands, audio recordings
- Expand / collapse tree branches
- Automatic Dagre layout (LR, RL, or TB direction — persisted per project)
- Detail panel for full node inspection (keyboard-driven: Enter to open, Escape to close)
- Map locking: nodes cannot be dragged when locked (default: locked)
- Progress badge (completion %) and header progress bar
- Two visual themes: IBM Carbon dark and Dusk (navy/blue-gray node-editor style)
- Accessible over LAN for multi-device use

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Browser (port 5173)               │
│  React 19 + TypeScript + Vite + Tailwind CSS v4      │
│  React Flow (@xyflow/react v12)                      │
│  Zustand v5 (state)   Dagre v3 (layout)              │
└───────────────────┬─────────────────────────────────┘
                    │  /api/* (proxied by Vite)
┌───────────────────▼─────────────────────────────────┐
│              Express.js API (port 3000)              │
│              Node.js + better-sqlite3                │
│              mind_maps.db (SQLite file)              │
└─────────────────────────────────────────────────────┘
```

The Vite dev server proxies all `/api` requests to `localhost:3000`, so the frontend only ever talks to one origin (no CORS issues in dev).

---

## Project Structure

```
map/
├── server.js                 # Express API server — entry point
├── package.json              # Root scripts + backend deps
├── .env                      # Local environment config (not committed)
├── .env.example              # Template for .env
├── mind_maps.db              # SQLite database (auto-created on first run)
│
├── backend/
│   ├── db-manager.js         # DatabaseManager class — all SQL operations
│   ├── database-schema.sql   # Schema reference (auto-applied by db-manager.js)
│   ├── mindmap-models.js     # XML ↔ JSON conversion models
│   ├── pure-json-models.js   # JSON-only project handler
│   ├── xml-sanitizer.js      # XML special character sanitizer
│   ├── xml-to-json-converter.js
│   └── xml-validator.js
│
├── cli/
│   └── mindmap-cli.js        # CLI tool (npx mindmap or npm link)
│
├── data/                     # Static JSON project files (import source)
│   └── *.json
│
├── docs/                     # Historical architecture documents
│
└── frontend/                 # Vite + React + TypeScript SPA
    ├── vite.config.ts
    ├── tsconfig.json
    ├── package.json           # Frontend deps (React Flow, Dagre, Zustand…)
    └── src/
        ├── main.tsx           # React root
        ├── App.tsx            # Root layout: sidebar | canvas | detail panel
        ├── MindMapFlow.tsx    # ReactFlowProvider + canvas component
        │
        ├── theme/
        │   └── themes.ts          # Theme config (IBM, Dusk) — all color tokens
        │
        ├── config/
        │   └── nodeDimensions.ts  # NODE_DIMS, DisplayMode, LayoutDir
        │
        ├── store/
        │   └── mindMapStore.ts    # Zustand store — single source of truth
        │
        ├── layout/
        │   └── dagreLayout.ts     # Dagre layout builder
        │
        ├── nodes/
        │   └── MindMapNode.tsx    # Custom React Flow node component
        │
        ├── components/
        │   ├── DetailPanel.tsx    # Right-side node detail panel
        │   └── ProgressBadge.tsx  # Floating completion % badge
        │
        ├── hooks/
        │   └── useApi.ts          # Typed API client (fetch wrapper)
        │
        └── types/
            └── NodeTypes.ts       # All shared TypeScript types + constants
```

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9

### Install

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### Run (development)

```bash
npm run dev:all
```

This single command:
1. Kills port 3000 (prevents EADDRINUSE on restart)
2. Starts the Express API with nodemon on port 3000
3. Starts Vite dev server on port 5173

Open [http://localhost:5173](http://localhost:5173)

### Run separately

```bash
# API server only
npm run dev

# Frontend only (in a second terminal)
cd frontend && npm run dev
```

### Production build

```bash
npm run build:ui        # Compiles frontend → frontend-dist/
npm start               # Serves the API (static files served from frontend-dist/)
```

---

## Environment Configuration

Copy `.env.example` to `.env` and adjust:

```env
# API server port (default: 3000)
PORT=3000

# Working directory for XML/JSON file imports
WORKING_ROOT_DIR=./data

# Restrict to localhost only (comment out to allow LAN access)
# HOST=localhost

# Verbose server logging
DEBUG=false
```

The database file `mind_maps.db` is auto-created at project root on first run.

---

## Backend — Express API

**Entry point:** `server.js`

The server initialises `DatabaseManager` from `./backend/db-manager.js`. If the database fails to initialise, the server falls back to file-only mode (XML/JSON endpoints still work).

### Port conflict handling

`server.js` wraps `app.listen()` and catches `EADDRINUSE`:

```js
const serverInstance = app.listen(PORT, callback);
serverInstance.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Run: npx kill-port ${PORT}`);
    process.exit(1);
  }
});
```

The `predev:all` npm script also auto-kills port 3000 before every `dev:all` start.

---

## Database Schema

SQLite via `better-sqlite3` (synchronous — no async/await needed in DB layer).

`db-manager.js` runs `runMigrations()` on every startup — idempotent `ALTER TABLE` statements wrapped in try/catch so existing databases are upgraded without data loss.

### Tables

**`projects`**
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| name | TEXT | Required |
| description | TEXT | |
| file_path | TEXT | Original import path |
| collection_id | TEXT | FK → collections |
| layout_dir | TEXT | `'LR'` \| `'RL'` \| `'TB'` — persisted per project |
| display_mode | TEXT | `'comfortable'` \| `'compact'` — persisted per project |
| created_at | DATETIME | Auto |
| updated_at | DATETIME | Auto (trigger) |
| last_opened | DATETIME | Updated on select |

**`nodes`**
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| project_id | TEXT | FK → projects (CASCADE) |
| parent_id | TEXT | NULL = root node |
| title | TEXT | Required |
| content | TEXT | Comments/notes |
| status | TEXT | `pending` \| `in-progress` \| `completed` |
| priority | TEXT | `low` \| `medium` \| `high` |
| start_date | DATE | |
| end_date | DATE | |
| days_spent | INTEGER | |
| code_language | TEXT | |
| code_content | TEXT | |
| task_prompt | TEXT | AI prompt for the task |
| cli_command | TEXT | Terminal command |
| sort_order | INTEGER | Position within parent |
| depth_level | INTEGER | Cached depth (0 = root) |
| created_at | DATETIME | Auto |
| updated_at | DATETIME | Auto (trigger) |

**`node_audio_files`** — Audio recordings attached to nodes
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| node_id | TEXT | FK → nodes (CASCADE) |
| filename | TEXT | Stored filename on disk |
| original_name | TEXT | Original upload name |
| file_size | INTEGER | Bytes |
| duration | REAL | Seconds (if known) |
| created_at | DATETIME | Auto |

**`app_state`** — Key/value store for UI persistence (`last_opened_project`, UI toggles).

### Indexes

```sql
idx_nodes_project_id   -- Fast node fetching per project
idx_nodes_parent_id    -- Fast children lookup
idx_nodes_status       -- Filter by status
idx_nodes_priority     -- Filter by priority
idx_projects_last_opened -- Sidebar ordering
```

### Critical: API response shape

`GET /api/db/projects/:id` returns a **flat** object:

```json
{
  "id": "...",
  "name": "...",
  "description": "...",
  "layout_dir": "LR",
  "display_mode": "comfortable",
  "nodes": [ ... ]
}
```

It is **NOT** `{ project: {...}, nodes: [...] }`. When destructuring in the frontend:

```ts
// CORRECT
const { nodes, ...project } = await api.getProjectWithNodes(id);

// WRONG — project will be undefined
const { project, nodes } = await api.getProjectWithNodes(id);
```

---

## Frontend — React + React Flow

### Tech stack

| Library | Version | Role |
|---------|---------|------|
| React | 19 | UI framework |
| @xyflow/react | 12 | Interactive node canvas |
| Zustand | 5 | State management |
| @dagrejs/dagre | 3 | Auto tree layout |
| Tailwind CSS | 4 | Styling (via @tailwindcss/vite plugin) |
| Vite | 8 | Dev server + bundler |
| TypeScript | 6 | Type safety |

### Vite proxy

`frontend/vite.config.ts` proxies `/api/*` → `http://localhost:3000`. This means:
- Frontend always calls relative paths (`/api/db/projects`)
- No CORS configuration needed
- Works transparently in both dev and production (in prod, Express serves the frontend-dist directly)

---

## State Management

**File:** `frontend/src/store/mindMapStore.ts`

Single Zustand store. No React context, no prop drilling.

### State shape

```ts
{
  projects: Project[]           // sidebar list
  currentProject: Project | null
  rawNodes: MindMapNodeData[]   // flat array, source of truth
  expandedIds: Set<string>      // which nodes show children
  rfNodes: Node[]               // React Flow nodes (computed)
  rfEdges: Edge[]               // React Flow edges (computed)
  loading: boolean
  error: string | null
  displayMode: 'compact' | 'comfortable'    // default: 'comfortable'
  layoutDir: 'LR' | 'RL' | 'TB'           // default: 'LR' (persisted per project)
  theme: 'ibm' | 'dusk'                   // default: 'ibm'
  selectedNodeId: string | null
  detailPanelOpen: boolean                 // default: false
  clickOpensPanel: boolean                 // default: false
  mapLocked: boolean                       // default: true
}
```

### Key actions

| Action | Effect |
|--------|--------|
| `loadProjects()` | Fetches all projects for sidebar |
| `loadProject(id)` | Loads project + nodes, restores saved layout_dir/display_mode |
| `toggleExpand(id)` | Expand/collapse one node, relayouts |
| `expandAll()` | Expands entire tree |
| `collapseAll()` | Collapses to root only |
| `cycleStatus(id)` | Cycles pending → in-progress → completed → pending (cascades to children) |
| `addChild(parentId)` | Creates child node via API, relayouts |
| `deleteNode(id)` | Deletes node + all descendants, relayouts |
| `updateNodeField(id, patch)` | Partial update to any node field |
| `deleteProjects(ids)` | Bulk delete projects |
| `setDisplayMode(mode)` | Switches compact/comfortable, relayouts, persists to DB |
| `setLayoutDir(dir)` | Switches LR/RL/TB, relayouts, persists to DB |
| `setSelectedNodeId(id)` | Sets the selected node (does not open panel) |
| `setDetailPanelOpen(open)` | Explicitly open/close the detail panel |
| `toggleDetailPanel()` | Toggle detail panel open/closed |
| `setClickOpensPanel(v)` | Toggle whether clicking a node auto-opens the panel |
| `setMapLocked(v)` | Toggle node dragging on/off |
| `setTheme(t)` | Switch between `'ibm'` and `'dusk'` themes |

### Layout trigger pattern

Every action that changes visible nodes calls `reLayout()`:

```ts
const { rfNodes, rfEdges } = buildDagreLayout(rawNodes, expandedIds, displayMode, layoutDir);
set({ rfNodes, rfEdges });
```

`rfNodes` and `rfEdges` are never mutated directly — always recomputed from `rawNodes`.

### Stale closure refs pattern

Event handlers registered once in `useEffect` (keyboard, click) read mutable state via refs to avoid stale closures without re-registering the handler:

```ts
const clickOpensPanelRef = useRef(clickOpensPanel);
clickOpensPanelRef.current = clickOpensPanel;  // updated every render
```

---

## Layout Engine

**File:** `frontend/src/layout/dagreLayout.ts`

Uses Dagre to compute x/y positions for a tree layout.

### How it works

1. Collects **visible nodes**: root nodes + children of expanded parents (BFS)
2. Registers each visible node with its `width`/`height` in the Dagre graph
3. Registers edges (parent → child)
4. Calls `dagre.layout(graph)` — Dagre assigns positions
5. Maps Dagre output back to React Flow `Node[]` and `Edge[]`

### Node dimensions (config)

**File:** `frontend/src/config/nodeDimensions.ts`

```ts
export const NODE_DIMS: Record<DisplayMode, {
  width: number;       // node box width
  height: number;      // node box height (must match rendered height exactly)
  lrRanksep: number;   // horizontal gap between levels (LR/RL mode)
  lrNodesep: number;   // vertical gap between siblings (LR/RL mode)
  tbRanksep: number;   // vertical gap between levels (TB mode)
  tbNodesep: number;   // horizontal gap between siblings (TB mode)
}> = {
  compact:     { width: 220, height: 44,  lrRanksep: 50, lrNodesep: 16, tbRanksep: 32, tbNodesep: 20 },
  comfortable: { width: 320, height: 68,  lrRanksep: 64, lrNodesep: 20, tbRanksep: 40, tbNodesep: 24 },
};
```

> **Important:** `height` must match the actual rendered height of the node component. If you add content to `MindMapNode.tsx` that increases height, update `NODE_DIMS` accordingly or nodes will overlap.

### Edge style

Edges are colored by depth:

| Depth | Color |
|-------|-------|
| 1 (direct children of root) | `#3b82f6` blue |
| 2 | `#22d3ee` cyan |
| 3+ | `#818cf8` indigo |

---

## Node Rendering System

**File:** `frontend/src/nodes/MindMapNode.tsx`

Custom React Flow node. Registered as `type: 'mindMapNode'` in `MindMapFlow.tsx`. All colors are driven by the active theme — see [Theme System](#theme-system).

### Props injected by `dagreLayout.ts`

Each node's `data` object receives:
- `hasChildren: boolean`
- `isExpanded: boolean`
- `nodeWidth: number`
- `displayMode: DisplayMode`
- `layoutDir: LayoutDir`

### Handle positions

Handles (connection points) switch position based on `layoutDir`:

```ts
const targetPos = dir === 'LR' ? Position.Left  : dir === 'RL' ? Position.Right : Position.Top;
const sourcePos = dir === 'LR' ? Position.Right : dir === 'RL' ? Position.Left  : Position.Bottom;
```

### Priority left border

Always visible regardless of selection state. Communicates priority through color:

| Priority | Color |
|----------|-------|
| high | `#f87171` red |
| medium | `#facc15` yellow |
| low | `#4ade80` green |

### Status right border

Communicates node status through color on the right edge, mirroring the priority left border. Nodes are visually "bookended" — priority color left, status color right.

| Status | Color |
|--------|-------|
| pending | `#64748b` slate |
| in-progress | `#3b82f6` blue |
| completed | `#22c55e` green |

Status is cycled in the Detail Panel (click the badge) or via `cycleStatus()` in the store.

### Selection ring

When a node is selected, a colored outline appears using `t.selectionRing` from the active theme.

---

## Theme System

**File:** `frontend/src/theme/themes.ts`

All color tokens are defined in a central config. Components read the active theme via `useMindMapStore()` and compute `t = themes[theme]`.

```ts
export type ThemeKey = 'ibm' | 'dusk';
export type BgVariant = 'dots' | 'lines' | 'cross';

export interface AppTheme {
  canvas: string;       // ReactFlow canvas background
  bgDots: string;       // Background pattern color
  bgVariant: BgVariant; // Background pattern type
  shell: string;        // App root background
  surface: string;      // Sidebar + header background
  border: string;       // Sidebar + header borders
  card: string;         // Node card background
  cardBorder: string;   // Node card border
  handle: string;       // Connection handle color
  selectionRing: string;// Active node selection outline
  textPrimary: string;  // Node title color
  textMuted: string;    // Secondary text / expand button
}
```

| Token | IBM Carbon dark | Dusk (navy/blue-gray) |
|-------|----------------|----------------------|
| canvas | `#111111` | `#1a1b27` |
| bgDots | `#2d2d2d` | `#252645` |
| bgVariant | `dots` | `lines` (grid) |
| shell | `#111111` | `#13142a` |
| surface | `#161616` | `#1e2038` |
| border | `#2a2a2a` | `#30325a` |
| card | `#1e1e1e` | `#282a40` |
| cardBorder | `#333333` | `#383a5a` |
| handle | `#525252` | `#39c759` |
| selectionRing | `#4589ff` | `#6c5fff` |
| textPrimary | `#e8e8e8` | `#e0e2f8` |
| textMuted | `#6f6f6f` | `#7272a8` |

ReactFlow controls are themed via CSS class `.theme-${theme}` on the root div (see `index.css`).

The theme is session-only (not persisted) and defaults to `'ibm'`.

---

## UI Features Reference

### Toolbar (visible when a project is open)

| Button | Action |
|--------|--------|
| ⊞ All | Expand all nodes |
| ⊟ | Collapse to root only |
| Full text | Comfortable mode (no title truncation, 320px nodes) |
| Compact | Compact mode (truncated titles, 220px nodes) |
| → LR | Horizontal layout (root left, children right) |
| ← RL | Reverse horizontal layout (root right, children left) |
| ↓ TB | Vertical layout (root top, children below) |
| 🔒 Locked / 🔓 Unlocked | Toggle node dragging on canvas |
| ⊡ Panel on click | Toggle whether clicking a node opens the detail panel |
| 🌙 Dusk / ☀ IBM | Switch visual theme |

### Detail Panel

Opens with the **Enter** key when a node is selected, or automatically on node click when "Panel on click" is enabled.

Shows:
- Title (editable, open by default)
- Status badge (click to cycle) + Priority badge (click to cycle) — open by default
- Start / end dates
- Days spent
- Comment / notes (editable, auto-saved on blur with "✓ Saved" indicator — open by default)
- Code block with language + content
- AI prompt
- CLI command
- Copy buttons for code, prompt, command
- Audio section: record directly in the browser or upload a file; playback via `<audio>` element

Close with **Escape** or the × button.

### Progress Badge

Floating badge at bottom-right of canvas. Shows:
- SVG circular progress arc (blue → green at 100%)
- Percentage + `done/total` count
- Click to expand: shows Completed / In progress / Pending breakdown

### Header progress bar

Thin horizontal bar in the toolbar showing overall completion % for the current project.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Enter | Open/close detail panel for the selected node |
| Escape | Close detail panel (if open); deselect node (if panel already closed) |
| Space | Expand/collapse children of the selected node |
| Arrow keys | Pan the canvas (150px per press) |

Keyboard shortcuts are disabled when focus is inside an `<input>` or `<textarea>`.

---

## API Reference

All endpoints are prefixed `/api`. The frontend uses `/api/db/*` (SQLite-backed).

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/db/projects` | List all projects |
| GET | `/api/db/projects/:id` | Get project + nodes (flat response) |
| POST | `/api/db/projects` | Create project |
| PUT | `/api/db/projects/:id` | Update project metadata (including `layout_dir`, `display_mode`) |
| DELETE | `/api/db/projects/:id` | Delete project + all nodes |
| POST | `/api/db/projects/:id/select` | Mark as last opened |
| GET | `/api/db/projects/search?q=` | Search projects by name |

### Nodes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/db/nodes` | Create node |
| PUT | `/api/db/nodes/:id` | Update node fields |
| DELETE | `/api/db/nodes/:id` | Delete node (cascades to children) |

### Audio

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/db/nodes/:id/audio` | List audio files for a node |
| POST | `/api/db/nodes/:id/audio` | Upload audio file (multipart/form-data) |
| GET | `/api/db/audio/:id/stream` | Stream audio file for playback |
| DELETE | `/api/db/audio/:id` | Delete audio file |

### Import

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/db/import-json` | Import JSON file as new project |

### Utility

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check + DB status |
| GET | `/api/db/stats` | DB statistics |
| POST | `/api/db/backup` | Create timestamped DB backup |
| GET | `/api/db/last-project` | Get last opened project id |

### Frontend API client

**File:** `frontend/src/hooks/useApi.ts`

Typed wrapper around `fetch`. Handles empty `204` responses (returns `undefined` instead of crashing on `JSON.parse('')`).

```ts
import { api } from './hooks/useApi';

await api.getProjects();
await api.getProjectWithNodes(id);
await api.updateNode(id, { status: 'completed' });
await api.createNode({ project_id, title: 'New node', ... });
await api.deleteNode(id);
await api.updateProject(id, { layout_dir: 'TB', display_mode: 'compact' });
await api.getNodeAudio(nodeId);
await api.uploadNodeAudio(nodeId, file);
await api.deleteNodeAudio(audioId);
```

---

## Network Access (LAN)

`frontend/vite.config.ts` has `host: true` which binds Vite to all network interfaces. After `npm run dev:all`:

```
➜  Network: http://192.168.x.x:5173/
```

Use this URL from phones, tablets, or other computers on the same network.

**Windows Firewall (if access is blocked):**

```powershell
New-NetFirewallRule -DisplayName "Vite 5173" -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow
```

---

## CLI Tool

```bash
# Install globally (from project root)
npm link

# Usage
mindmap --help
```

The CLI lives in `cli/mindmap-cli.js` and is registered as the `mindmap` binary in `package.json`.

---

## Critical Implementation Notes

These are non-obvious decisions that burned time. Read before making changes.

### 1. API response is flat (not nested)

`db-manager.js` → `getProjectWithNodes()` returns:

```js
return { ...project, nodes };   // FLAT
```

**Not** `{ project, nodes }`. Always destructure as:

```ts
const { nodes, ...project } = await api.getProjectWithNodes(id);
```

### 2. `selectProject` must be fire-and-forget

```ts
// CORRECT — set project data first, then fire-and-forget
set({ currentProject: project, rawNodes: nodes, ... });
api.selectProject(id).catch(() => {});

// WRONG — if selectProject rejects (204 body), currentProject is never set
await api.selectProject(id);
set({ currentProject: project, ... });
```

### 3. Never use `transition: all` on nodes

CSS `transition: all` animates `border-color` shorthand, which overrides both `border-left-color` (priority) and `border-right-color` (status) during transitions. Both indicators disappear momentarily on selection change. Always specify individual properties:

```ts
// CORRECT
transition: 'box-shadow 0.15s ease'

// WRONG
className="transition-all duration-200"
```

### 4. NODE_DIMS height must match rendered height

Dagre allocates space based on `NODE_DIMS[mode].height`. If the rendered node is taller (due to added content rows), nodes overlap. The current values (44px compact, 68px comfortable) match the minimal header-only node design. If you add content rows back to `MindMapNode.tsx`, recalibrate `height` values.

### 5. Handle positions switch with layout direction

```ts
const targetPos = dir === 'LR' ? Position.Left  : dir === 'RL' ? Position.Right : Position.Top;
const sourcePos = dir === 'LR' ? Position.Right : dir === 'RL' ? Position.Left  : Position.Bottom;
```

Forgetting this makes edges attach to wrong sides when switching layout direction.

### 6. Layout and display mode are persisted per project

`setLayoutDir` and `setDisplayMode` fire `api.updateProject()` as a background side-effect. On `loadProject`, these values are read back from the API response and restored. The store's global default only applies until the first project is loaded.

### 7. Uploads directory is gitignored

Audio files are saved to `uploads/audio/`. The `uploads/` directory, `certs/`, and `*.db` are all in `.gitignore` and must never be committed.

---

## Known Pitfalls

| Symptom | Root cause | Fix |
|---------|-----------|-----|
| Map shows then disappears | `selectProject` awaited before setting state | Fire-and-forget with `.catch(() => {})` |
| Priority/status border disappears on deselect | `transition: all` overrides `border-left-color` / `border-right-color` | Use specific CSS transitions |
| Nodes overlap | `NODE_DIMS.height` doesn't match rendered height | Calibrate height to actual node height |
| Port 3000 EADDRINUSE | Nodemon restart when port not freed | `predev:all` kills port; server catches error |
| `project` is `undefined` after load | Destructured as `{ project, nodes }` instead of `{ nodes, ...project }` | Use flat destructure |
| Empty body 204 crashes `res.json()` | `JSON.parse('')` throws | Read as text first, return `undefined` if empty |
| Layout direction resets on project reload | `layout_dir` column missing from DB | Run server once to trigger `runMigrations()` |

---

## Roadmap

Potential next steps (not yet implemented):

- **Node editing inline** — double-click to edit title directly on canvas
- **Drag-and-drop reparenting** — move nodes between parents
- **Search** — filter/highlight nodes matching a query
- **Multi-user sync** — WebSocket broadcasting on node change
- **Export** — PDF / PNG screenshot of the canvas
- **AI integration** — generate child nodes from a prompt
- **Collections UI** — group projects in the sidebar
- **Theme persistence** — save selected theme per session or globally

---

## Technology Decision: Why ReactFlow

This section documents a deliberate evaluation of graph/node-editor libraries in the context of this project.

### Candidates considered

| Library | Used by | Renderer | Language |
|---------|---------|----------|----------|
| **@xyflow/react (ReactFlow)** | LangFlow, Stripe workflows | DOM + SVG | React / TypeScript |
| **LiteGraph.js** | ComfyUI | HTML Canvas 2D | Vanilla JS |
| **@n8n/canvas** | N8N | Custom Vue canvas | Vue 3 |
| **Blender node editor** | Blender (desktop) | OpenGL/GPU (C) | C/C++ |

---

### LiteGraph.js

LiteGraph.js is the library that powers **ComfyUI** (the AI image generation workflow UI). It was the direct inspiration for the Dusk theme aesthetic — ComfyUI's dark navy node-editor look closely resembles Blender's node editor because it deliberately imitates it.

**Strengths:**
- Canvas 2D renderer — draws everything imperatively, not in the DOM
- Designed for **typed-port node graphs**: each slot has a data type, connections are validated at the port level
- Built-in node widgets rendered inside the canvas (sliders, dropdowns, color pickers)
- Excellent performance for large graphs (hundreds of interconnected nodes)
- Serialization/deserialization built-in

**Why it doesn't fit this project:**
- Vanilla JS — no native React integration. The sidebar, detail panel, Zustand store, and Tailwind layout would all have to live outside the canvas and be manually synchronized with it.
- Its strengths (typed ports, data flow, in-canvas widgets) are irrelevant to a mind map. A mind map has no port types, no data flowing between nodes, and no in-canvas input widgets.
- Adopting it would mean rewriting the entire frontend without gaining anything the current architecture lacks.

> The Blender/ComfyUI aesthetic is achievable in ReactFlow through theming alone — LiteGraph's rendering engine is not required to get that visual style, as demonstrated by the Dusk theme.

---

### N8N's @n8n/canvas

N8N is a workflow automation tool with a node-based UI that superficially resembles this project.

**Key facts:**
- N8N is open source (fair-code license, available on GitHub at `n8n-io/n8n`)
- Their canvas (`@n8n/canvas`) is part of their monorepo — the source is readable
- Built with **Vue 3**, not React
- The canvas is tightly coupled to N8N's internal data model and workflow concepts
- Not published as a standalone npm package — extracting it for another project would be a significant rewrite

**Why it doesn't fit this project:**
- Vue 3 is incompatible with this React + Zustand stack
- Even if ported, it is built for linear workflow graphs (node A → node B → node C), not hierarchical trees
- N8N did **not** use LiteGraph.js — they built their canvas from scratch

---

### Blender node editor

The Blender node editor (shader nodes, geometry nodes, compositor) is what originally inspired the "dark node-editor" aesthetic goal.

**Key facts:**
- Blender is a **desktop application** written in C/C++
- Its node editor is rendered directly by Blender's own OpenGL/GPU drawing code — every panel, node, and wire is drawn imperatively to the GPU
- There is no HTML, no Canvas API, no JavaScript — it cannot be extracted or reused on the web
- ComfyUI is the closest web equivalent in terms of aesthetic, achieved with LiteGraph.js

---

### Conclusion: ReactFlow is the right choice

For a **hierarchical mind map** (tree structure, no typed ports, no data flow between nodes), ReactFlow fits every requirement:

1. **React-native** — nodes are real React components. The detail panel, Zustand store, Tailwind layout, and TypeScript types all integrate without seams.
2. **Tree/flowchart optimized** — ReactFlow is designed for exactly this use case (flowcharts, trees, diagrams). LiteGraph is designed for pipeline graphs.
3. **No wasted complexity** — typed ports, in-canvas widgets, and data-flow serialization (LiteGraph's main value-adds) are all irrelevant to a mind map.
4. **Ecosystem** — active maintenance, good TypeScript support, production use at scale (LangFlow, Stripe).
5. **Aesthetic parity** — the Blender/ComfyUI visual style is achieved through the theme system (`themes.ts`), not through the choice of renderer.

The only scenario where switching to LiteGraph would make sense is if this project evolved into a **data-flow tool** — e.g., an AI pipeline builder where nodes have typed inputs and outputs and data flows between them at runtime.
