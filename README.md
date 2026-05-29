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
12. [UI Features Reference](#ui-features-reference)
13. [API Reference](#api-reference)
14. [Network Access (LAN)](#network-access-lan)
15. [CLI Tool](#cli-tool)
16. [Critical Implementation Notes](#critical-implementation-notes)
17. [Known Pitfalls](#known-pitfalls)
18. [Roadmap](#roadmap)

---

## Overview

A mind-mapping tool intended for commercial release. Data is stored in SQLite (persistent across sessions). The UI is a node-based interactive canvas powered by React Flow — the same library used in production tools like LangFlow and Stripe's workflow editors.

**Key capabilities:**
- Hierarchical mind maps with unlimited depth
- Per-node: status, priority, dates, comments, code blocks, AI prompts, CLI commands
- Expand / collapse tree branches
- Automatic Dagre layout (horizontal LR or vertical TB)
- Detail panel for full node inspection
- Progress badge (completion %)
- Two visual themes: Neon Dark and Glassmorphism
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
        ├── config/
        │   └── nodeDimensions.ts   # NODE_DIMS, DisplayMode, LayoutDir, NodeStyle
        │
        ├── store/
        │   └── mindMapStore.ts     # Zustand store — single source of truth
        │
        ├── layout/
        │   └── dagreLayout.ts      # Dagre layout builder
        │
        ├── nodes/
        │   └── MindMapNode.tsx     # Custom React Flow node component
        │
        ├── components/
        │   ├── DetailPanel.tsx     # Right-side node detail panel
        │   └── ProgressBadge.tsx   # Floating completion % badge
        │
        ├── hooks/
        │   └── useApi.ts           # Typed API client (fetch wrapper)
        │
        └── types/
            └── NodeTypes.ts        # All shared TypeScript types + constants
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

### Tables

**`projects`**
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| name | TEXT | Required |
| description | TEXT | |
| file_path | TEXT | Original import path |
| collection_id | TEXT | FK → collections |
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

### LAN access

`host: true` in `vite.config.ts` binds Vite to `0.0.0.0`. After `npm run dev:all`, Vite prints:

```
➜  Local:   http://localhost:5173/
➜  Network: http://192.168.x.x:5173/
```

Use the Network URL from any machine on the same Wi-Fi. If blocked, add a Windows Firewall rule:

```powershell
New-NetFirewallRule -DisplayName "Vite 5173" -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow
```

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
  displayMode: 'compact' | 'comfortable'   // default: 'comfortable'
  layoutDir: 'LR' | 'TB'                  // default: 'LR'
  nodeStyle: 'neon' | 'glass'             // default: 'neon'
  selectedNodeId: string | null
}
```

### Key actions

| Action | Effect |
|--------|--------|
| `loadProjects()` | Fetches all projects for sidebar |
| `loadProject(id)` | Loads project + nodes, computes layout |
| `toggleExpand(id)` | Expand/collapse one node, relayouts |
| `expandAll()` | Expands entire tree |
| `collapseAll()` | Collapses to root only |
| `cycleStatus(id)` | Cycles pending → in-progress → completed → pending |
| `addChild(parentId)` | Creates child node via API, relayouts |
| `deleteNode(id)` | Deletes node + all descendants, relayouts |
| `updateNodeField(id, patch)` | Partial update to any node field |
| `setDisplayMode(mode)` | Switches compact/comfortable, relayouts |
| `setLayoutDir(dir)` | Switches LR/TB, relayouts |
| `setNodeStyle(style)` | Switches neon/glass (no relayout needed) |
| `setSelectedNodeId(id)` | Opens detail panel |

### Layout trigger pattern

Every action that changes visible nodes calls `reLayout()`:

```ts
const { rfNodes, rfEdges } = buildDagreLayout(rawNodes, expandedIds, displayMode, layoutDir);
set({ rfNodes, rfEdges });
```

`rfNodes` and `rfEdges` are never mutated directly — always recomputed from `rawNodes`.

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
  lrRanksep: number;   // horizontal gap between levels (LR mode)
  lrNodesep: number;   // vertical gap between siblings (LR mode)
  tbRanksep: number;   // vertical gap between levels (TB mode)
  tbNodesep: number;   // horizontal gap between siblings (TB mode)
}> = {
  compact:     { width: 220, height: 44,  lrRanksep: 50, lrNodesep: 16, tbRanksep: 32, tbNodesep: 20 },
  comfortable: { width: 320, height: 68,  lrRanksep: 64, lrNodesep: 20, tbRanksep: 40, tbNodesep: 24 },
};
```

> **Important:** `height` must match the actual rendered height of the node component. If you add content to `MindMapNode.tsx` that increases height, update `NODE_DIMS` accordingly or nodes will overlap.

### Edge style

Edges are colored by depth and animated (flowing dash effect):

| Depth | Color | Glow |
|-------|-------|------|
| 1 (direct children of root) | `#3b82f6` blue | 5px |
| 2 | `#22d3ee` cyan | 3px |
| 3+ | `#818cf8` indigo | 3px |

---

## Node Rendering System

**File:** `frontend/src/nodes/MindMapNode.tsx`

Custom React Flow node. Registered as `type: 'mindMapNode'` in `MindMapFlow.tsx`.

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
const targetPos = dir === 'LR' ? Position.Left  : Position.Top;
const sourcePos = dir === 'LR' ? Position.Right : Position.Bottom;
```

### Visual hierarchy by depth

| Depth | Background | Font size |
|-------|-----------|-----------|
| 0 (root) | `#0d1829` | 14px semibold |
| 1 | `#080e1a` | 13px medium |
| 2+ | `#060b16` | 12px regular |

### Node styles (Neon vs Glass)

The `nodeStyle` state drives two completely different visual treatments:

**Neon:**
- Solid dark background + radial gradient bleed from priority color on left
- Priority-tinted `box-shadow` glow
- Selection = blue ring + strong glow

**Glass:**
- Semi-transparent background (`rgba`)
- `backdropFilter: blur(14px)` — blurs canvas dots/edges behind the node
- Subtle white glass border
- Selection = white frosted ring

> **CSS pitfall:** Never use `transition: all` on the node `div`. It causes `border-color` shorthand transitions to override `border-left-color` (the priority indicator), making the priority color disappear on deselect. Use specific transitions only:
>
> ```ts
> transition: 'box-shadow 0.2s ease, background 0.2s ease'
> ```

### Priority left border

Always visible regardless of selection state. Set via separate inline properties:

```ts
borderColor: nodeBorder,       // sets top/right/bottom
borderLeftWidth: isRoot ? 5 : 4,
borderLeftColor: priorityColor, // always priority color — never changes
```

### Priority colors

| Priority | Color |
|----------|-------|
| high | `#f87171` red |
| medium | `#facc15` yellow |
| low | `#4ade80` green |

### Status dots

| Status | Color | Animation |
|--------|-------|-----------|
| pending | `#64748b` slate | none |
| in-progress | `#3b82f6` blue | pulse |
| completed | `#22c55e` green | none |

Click a status dot to cycle through statuses. The change is persisted to the API immediately.

---

## UI Features Reference

### Toolbar (visible when a project is open)

| Button | Action |
|--------|--------|
| ⊞ All | Expand all nodes |
| ⊟ | Collapse to root only |
| Full text | Comfortable mode (no title truncation, 320px nodes) |
| Compact | Compact mode (truncated titles, 220px nodes) |
| ← → LR | Horizontal layout (root left, children right) |
| ↓ TB | Vertical layout (root top, children below) |
| ⚡ Neon | Neon Dark visual theme |
| 🪟 Glass | Glassmorphism visual theme |

### Detail Panel

Opens when clicking any node. Shows:
- Status badge (click to cycle)
- Priority badge
- Start / end dates
- Days spent
- Comment / notes
- Code block with language + content
- AI prompt
- CLI command
- Copy buttons for code, prompt, command

Close by clicking on the empty canvas.

### Progress Badge

Floating badge at bottom-right of canvas. Shows:
- SVG circular progress arc (blue → green at 100%)
- Percentage + `done/total` count
- Click to expand: shows Completed / In progress / Pending breakdown

---

## API Reference

All endpoints are prefixed `/api`. The frontend uses `/api/db/*` (SQLite-backed).

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/db/projects` | List all projects |
| GET | `/api/db/projects/:id` | Get project + nodes (flat response) |
| POST | `/api/db/projects` | Create project |
| PUT | `/api/db/projects/:id` | Update project metadata |
| DELETE | `/api/db/projects/:id` | Delete project + all nodes |
| POST | `/api/db/projects/:id/select` | Mark as last opened |
| GET | `/api/db/projects/search?q=` | Search projects by name |

### Nodes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/db/nodes` | Create node |
| PUT | `/api/db/nodes/:id` | Update node fields |
| DELETE | `/api/db/nodes/:id` | Delete node (cascades to children) |

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
| GET | `/api/db/app-state` | Get persisted UI state |
| POST | `/api/db/app-state` | Save UI state key/value |

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

CSS `transition: all` animates `border-color` shorthand, which overrides `border-left-color` (priority indicator) during the transition. Result: priority color disappears for 200ms when deselecting a node. Always specify individual properties:

```ts
// CORRECT
transition: 'box-shadow 0.2s ease, background 0.2s ease'

// WRONG
className="transition-all duration-200"
```

### 4. NODE_DIMS height must match rendered height

Dagre allocates space based on `NODE_DIMS[mode].height`. If the rendered node is taller (due to added content rows), nodes overlap. The current values (44px compact, 68px comfortable) match the minimal header-only node design. If you add content rows back to `MindMapNode.tsx`, recalibrate `height` values.

### 5. Handle positions switch with layout direction

```ts
const targetPos = layoutDir === 'LR' ? Position.Left  : Position.Top;
const sourcePos = layoutDir === 'LR' ? Position.Right : Position.Bottom;
```

Forgetting this makes edges attach to wrong sides in TB mode.

---

## Known Pitfalls

| Symptom | Root cause | Fix |
|---------|-----------|-----|
| Map shows then disappears | `selectProject` awaited before setting state | Fire-and-forget with `.catch(() => {})` |
| Priority border disappears on deselect | `transition: all` overrides `border-left-color` | Use specific CSS transitions |
| Nodes overlap | `NODE_DIMS.height` doesn't match rendered height | Calibrate height to actual node height |
| Port 3000 EADDRINUSE | Nodemon restart when port not freed | `predev:all` kills port; server catches error |
| `project` is `undefined` after load | Destructured as `{ project, nodes }` instead of `{ nodes, ...project }` | Use flat destructure |
| Empty body 204 crashes `res.json()` | `JSON.parse('')` throws | Read as text first, return `undefined` if empty |

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
- **Keyboard shortcuts** — N (new child), Del (delete), E (expand), C (collapse)
