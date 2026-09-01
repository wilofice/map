# Modular Mind Map

AI-driven interactive mind mapping and task pipeline application. Built on React Flow + Cytoscape.js with a persistent SQLite backend and MCP server integration.

*See [docs/CHANGELOG.md](docs/CHANGELOG.md) for the latest updates.*

---

## What's in the app

Two fully independent tools share one server:

| Tool | Route | Description |
|---|---|---|
| **Mind Map** | `/` `/graph` `/collections` | Hierarchical node canvas powered by React Flow |
| **Pipeline** | `/pipeline` `/pipeline/:taskId` | Task graph canvas powered by Cytoscape.js |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Browser (port 5173)               │
│  React 19 + TypeScript + Vite + Tailwind CSS v4      │
│  Mind Map: React Flow + Zustand + Dagre              │
│  Pipeline: Cytoscape.js + Zustand (isolated store)   │
└───────────────────┬─────────────────────────────────┘
                    │  /api/* (proxied by Vite)
┌───────────────────▼─────────────────────────────────┐
│              Express.js API (port 3000)              │
│              Node.js + better-sqlite3                │
│              mind_maps.db (SQLite — both tools)      │
│              MCP Server: mcp.mjs (stdio JSON-RPC)    │
└─────────────────────────────────────────────────────┘
```

---

## Project Structure

```
map/
├── server.js                 # Express API — all routes
├── mcp.mjs                   # MCP server (stdio JSON-RPC for Claude Desktop / Cursor)
├── run-mcp.sh                # Launcher script for MCP server
├── package.json
├── mind_maps.db              # SQLite database (auto-created)
│
├── backend/
│   ├── db-manager.js         # DatabaseManager — all SQL: mind map + pipeline tables
│   └── ...                   # XML/JSON import models
│
├── cli/
│   └── mindmap-cli.js        # CLI tool for the mind map
│
├── docs/
│   ├── PIPELINE.md           # Pipeline feature user guide + REST API reference
│   ├── MCP.md                # MCP server setup and tool reference
│   ├── CHANGELOG.md
│   ├── Artefacts/
│   │   ├── AI-COPILOT-GUIDE.md       # AI agent integration guide (mind map + pipeline)
│   │   └── PROJECT_FILE_GUIDE_JSON.md
│   └── archive/              # Historical implementation docs
│
└── frontend/
    ├── vite.config.ts
    └── src/
        ├── App.tsx            # Root: routes for both tools + shared topbar links
        ├── main.tsx
        │
        ├── pipeline/          # Pipeline — fully isolated (no shared state/styles)
        │   ├── pipelineApi.ts       # Typed API client for /api/pipeline/*
        │   ├── pipelineStore.ts     # Zustand store (isolated from mind map store)
        │   ├── pipelineTheme.ts     # PipelineTheme tokens, dark/light, localStorage
        │   ├── PipelineHome.tsx     # /pipeline — collections sidebar + task card grid
        │   ├── PipelineGraph.tsx    # /pipeline/:taskId — Cytoscape canvas
        │   └── NodePanel.tsx        # Slide-in node detail panel
        │
        ├── store/
        │   └── mindMapStore.ts      # Zustand store for mind map (separate from pipeline)
        ├── theme/
        │   └── themes.ts            # Mind map theme tokens (IBM / Dusk / Light)
        ├── nodes/
        │   └── MindMapNode.tsx
        ├── components/
        │   ├── DetailPanel.tsx
        │   └── ProgressBadge.tsx
        ├── hooks/
        │   └── useApi.ts
        └── types/
            └── NodeTypes.ts
```

---

## Getting Started

### Prerequisites

- Node.js ≥ 18, npm ≥ 9

### Install

```bash
npm install
cd frontend && npm install && cd ..
```

### Run (development)

```bash
npm run dev:all
```

Opens at [http://localhost:5173](http://localhost:5173). Vite proxies `/api/*` to port 3000.

### Production build

```bash
npm run build:ui    # frontend → frontend-dist/
npm start           # serves API + static files
```

---

## Mind Map

Interactive hierarchical canvas for planning and knowledge organisation.

### Features

- Unlimited-depth node trees
- Per-node: status, priority, dates, notes, code blocks, AI prompts, CLI commands, audio recordings
- Expand/collapse branches with Focus Mode
- Dagre auto-layout (LR / RL / TB) persisted per project
- Node Splitting: divide large nodes evenly
- Three themes: IBM Carbon dark, Dusk (navy/blue-gray), Light
- Keyboard-driven animation mode with Auto-Play + Cascade animations
- Mini Map overlay for large workspace navigation
- MCP Server integration for AI clients (Claude Desktop, Cursor)

### Key keyboard shortcuts

| Key | Action |
|-----|--------|
| Enter | Open/close detail panel |
| Escape | Close panel / deselect |
| Space | Expand/collapse selected node |
| N | Next node in animation mode |
| Arrow keys | Pan canvas |

### MCP Server (AI direct access)

Connect Claude Desktop, Cursor, or any MCP-compatible client to manipulate mind map data directly:

```json
{
  "mcpServers": {
    "mindmap": {
      "command": "/Users/genereux/dev/map/run-mcp.sh"
    }
  }
}
```

Available tools: `list_projects`, `get_project_context`, `create_node`, `bulk_create_nodes`, `update_node`, `delete_node`, `search_nodes`, `add_progress_note`, `get_stats`.

See [docs/MCP.md](docs/MCP.md) for full setup.

---

## Pipeline — Task Dashboard

Model any project as a directed graph of steps. Each step is a node with status, type, description, and CLI command. Nodes are connected by dependency edges.

Navigate to **`/pipeline`** (click "⬡ Pipeline" in the top bar).

### Features

- **Collections** — group tasks by project or sprint
- **Task cards** — progress bar, priority, type icon, collection colour dot
- **Cytoscape.js graph canvas** — pan, zoom, drag nodes, auto-layout
- **Display modes**:
  - **Labels** — 210×84 nodes with text, auto-layout via dagre LR
  - **Dots** — compact 52×52 nodes, no labels, type-based shapes preserved (click any dot to open its panel)
- **Node shapes by type**: step = rounded rect, decision = diamond, milestone = star, review = hexagon — applied in both display modes
- **Status colours + glow**: pending (slate), in-progress (blue glow), done (green glow)
- **Layout algorithms**: Auto (dagre LR), Tree (breadthfirst), Grid, Free (drag to position, auto-saved)
- **Light / dark theme** — persisted to localStorage, shared between home and graph views
- **Node detail panel** — slide-in, shows all fields, auto-save on blur, connection management
- **REST API** — full CRUD for collections, tasks, nodes, edges — use from any LLM or script

### Quick REST example

```bash
# Get all tasks
curl http://localhost:3000/api/pipeline/tasks

# Mark a node done with notes
curl -X PUT http://localhost:3000/api/pipeline/nodes/<node-id> \
  -H 'Content-Type: application/json' \
  -d '{"status":"done","notes":"Output saved to ./build/out.mp4"}'
```

See [docs/PIPELINE.md](docs/PIPELINE.md) for the full REST API reference, schema, and user guide.

---

## AI Integration

### Context bundle

Any LLM can fetch all documentation in one request:

```bash
GET http://localhost:3000/api/docs/bundle
```

Returns: `AI-COPILOT-GUIDE.md`, `PROJECT_FILE_GUIDE_JSON.md`, `MCP.md`, `PIPELINE.md` — everything an AI needs to create, update, and query both tools.

### Recommended agent workflow

1. Fetch the bundle to load rules and schemas
2. For **mind map**: use MCP tools (`get_project_context`, `create_node`, etc.)
3. For **pipeline**: use REST API (`GET /api/pipeline/tasks/:id`, `PUT /api/pipeline/nodes/:id`)

See [docs/Artefacts/AI-COPILOT-GUIDE.md](docs/Artefacts/AI-COPILOT-GUIDE.md) for the complete agent integration guide.

---

## API Reference

### Mind Map

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/db/projects` | List all projects |
| GET | `/api/db/projects/:id` | Get project + nodes (flat) |
| POST | `/api/db/projects` | Create project |
| PUT | `/api/db/projects/:id` | Update project metadata |
| DELETE | `/api/db/projects/:id` | Delete project + nodes |
| POST | `/api/db/nodes` | Create node |
| PUT | `/api/db/nodes/:id` | Update node fields |
| DELETE | `/api/db/nodes/:id` | Delete node (cascades) |
| GET | `/api/ai/search?q=` | Search nodes |
| POST | `/api/db/import-json` | Import JSON project |

### Pipeline

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/pipeline/collections` | List / create collections |
| PUT/DELETE | `/api/pipeline/collections/:id` | Update / delete collection |
| GET/POST | `/api/pipeline/tasks` | List / create tasks |
| GET/PUT/DELETE | `/api/pipeline/tasks/:id` | Get (with nodes+edges) / update / delete task |
| POST | `/api/pipeline/nodes` | Create node |
| PUT/DELETE | `/api/pipeline/nodes/:id` | Update / delete node |
| POST | `/api/pipeline/edges` | Create dependency edge |
| DELETE | `/api/pipeline/edges/:id` | Delete edge |

### Docs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/docs` | List available docs |
| GET | `/api/docs/:filename` | Get a doc as markdown |
| GET | `/api/docs/bundle` | All AI docs as JSON |

---

## Database

SQLite (`mind_maps.db`), managed by `backend/db-manager.js`. Migrations run automatically on every server start (idempotent).

**Mind Map tables:** `projects`, `nodes`, `node_audio_files`, `collections`, `app_state`

**Pipeline tables:** `pipeline_collections`, `pipeline_tasks`, `pipeline_nodes`, `pipeline_edges`

---

## Network Access (LAN)

Vite binds to all interfaces (`host: true`). After `dev:all`:

```
➜  Network: http://192.168.x.x:5173/
```

The Express API is also reachable at `http://192.168.x.x:3000` from other devices on the LAN.
