# AI Co-Pilot Integration Guide

This guide is for AI agents (Claude, Codex, Copilot, Gemini, etc.) that interact with the Mind Map application. Read this before creating, updating, or designing any mind map.

---

## ⚠️ Critical: What the App Already Does — Do NOT Replicate

**The UI renders all visual state automatically from data fields. Never encode visual information in node titles.**

| Data field | What the app renders automatically |
|---|---|
| `status: "pending"` | Grey right border on the node card |
| `status: "in-progress"` | Blue right border + animated pulse dot |
| `status: "completed"` | Green right border |
| `priority: "high"` | Red left border |
| `priority: "medium"` | Yellow left border |
| `priority: "low"` | Green left border |
| Node depth | Animated edge color (blue → cyan → indigo) |
| Project progress | Header progress bar + floating badge + sidebar bars |
| Themes | IBM Carbon dark / Dusk navy / Light — all rendering is theme-aware |

**Node titles must be plain text — concise, 3-15 words, no emoji, no markdown, no status labels.**

Bad titles an AI must never create:
- `"✅ [DONE] Authentication API"` — status is already shown visually
- `"🔴 HIGH PRIORITY: Database Setup"` — priority is already shown visually
- `"[IN PROGRESS] Frontend Components (60%)"` — progress is tracked automatically
- `"**Bold Task**"` — markdown is displayed as literal characters

Good titles:
- `"Authentication API"`
- `"Database Setup"`
- `"Frontend Components"`

---

## Server Connection

| Service | Default URL | Notes |
|---|---|---|
| Backend API (HTTP) | `http://<server-ip>:3000` | Main API — use this for CLI and direct requests |
| Backend API (HTTPS) | `https://<server-ip>:3443` | LAN access with self-signed cert |
| Frontend (dev) | `https://<server-ip>:5173` | Vite dev server — proxies `/api` to port 3000 |

The port can be overridden with the `PORT` environment variable. Default is **3000**.

Health check:
```bash
curl http://localhost:3000/api/db/projects
```

---

## REST API Reference

All endpoints are at `http://<server>:3000`. No authentication required (LAN-only app).

### Projects

```bash
# List all projects (with node counts and progress)
GET /api/db/projects

# Get one project with all its nodes (flat array)
GET /api/db/projects/:id

# Create a new empty project
POST /api/db/projects
Body: { "name": "My Project", "description": "...", "collection_id": "default-collection" }

# Update project metadata
PUT /api/db/projects/:id
Body: { "name": "...", "description": "...", "layout_dir": "LR|RL|TB", "display_mode": "comfortable|compact" }

# Delete a project and all its nodes
DELETE /api/db/projects/:id

# Import a project from a JSON file (nested node tree)
POST /api/db/import-json
Body: <project JSON — see PROJECT_FILE_GUIDE_JSON.md>
```

### Nodes

```bash
# Create a node
POST /api/db/nodes
Body: {
  "project_id": "...",
  "parent_id": "...",           # null for root
  "title": "Node title",
  "status": "pending",          # pending | in-progress | completed
  "priority": "medium",         # low | medium | high
  "content": "Notes text",
  "sort_order": 0,
  "depth_level": 1,
  "code_language": "typescript",
  "code_content": "// code here",
  "task_prompt": "AI prompt...",
  "cli_command": "npm run build"
}

# Update a node (any subset of fields)
PUT /api/db/nodes/:id
Body: { "status": "completed", "content": "Updated notes" }

# Delete a node and all its descendants
DELETE /api/db/nodes/:id
```

### Collections

```bash
# List all collections (with project counts)
GET /api/db/collections

# Create a collection
POST /api/db/collections
Body: { "name": "My Collection", "description": "..." }

# Delete a collection (moves its projects to uncollected)
DELETE /api/db/collections/:id
```

### Search & Task Discovery

```bash
# Search nodes across all projects
GET /api/ai/search?q=authentication&priority=high&status=pending&limit=10

# Get a single node
GET /api/ai/nodes/:id

# Update node status
PUT /api/ai/nodes/:id/status
Body: { "status": "in-progress" }
```

### AI: Generate Child Nodes

```bash
# Generate child node suggestions using Codex CLI (runs on the server)
POST /api/ai/generate-children
Body: {
  "node_id": "...",
  "extra_prompt": "Focus on backend concerns",   # optional
  "count": 5,                                    # 3, 5, or 7
  "provider": "codex"                            # currently only codex
}

# Response:
{
  "suggestions": [
    { "title": "API rate limiting", "priority": "high", "status": "pending", "content": "..." },
    ...
  ]
}
```

The suggestions are previewed in the UI (Detail Panel → ✨ Generate Children) where the user selects which ones to add.

### Documentation API

```bash
# List all docs in docs/Artefacts/
GET /api/docs
# → { "docs": [{ "filename": "AI-COPILOT-GUIDE.md", "title": "...", "bytes": 4200, "url": "/api/docs/AI-COPILOT-GUIDE.md" }, ...] }

# Get a specific doc as markdown text
GET /api/docs/AI-COPILOT-GUIDE.md
GET /api/docs/PROJECT_FILE_GUIDE_JSON.md

# Get all docs as a single JSON bundle
GET /api/docs/bundle
# → { "AI-COPILOT-GUIDE.md": "...", "PROJECT_FILE_GUIDE_JSON.md": "...", ... }
```

---

## CLI Reference

The CLI (`node mindmap-cli.js`) is a convenience wrapper around the REST API. Use it when working from a terminal in the repo directory.

```bash
# List all collections and projects
node mindmap-cli.js collections
node mindmap-cli.js projects

# Create a collection and a project
node mindmap-cli.js create-collection "My Collection" --description="Team work"
node mindmap-cli.js create-project "My Project" --collection-id=<id> --description="..."

# Import a project from JSON
node mindmap-cli.js import-json ./data/myproject.json --collection-id=<id>

# Task discovery
node mindmap-cli.js list-tasks --priority=high --limit=10
node mindmap-cli.js filter-tasks --project-id=<id> --status=pending --limit=20
node mindmap-cli.js highest-priority-task <project-id>
node mindmap-cli.js search "authentication" --status=pending

# Get details
node mindmap-cli.js get-project <id> --show-nodes
node mindmap-cli.js get-node <node-id>

# Update nodes
node mindmap-cli.js update-status <node-id> in-progress
node mindmap-cli.js update-status <node-id> completed
node mindmap-cli.js add-progress <node-id> "Completed auth module"

# JSON-based operations
node mindmap-cli.js update-node-json <node-id> --file=./update.json
node mindmap-cli.js create-node-json --file=./node.json --project-id=<id>

# Assign project to collection
node mindmap-cli.js assign-project-collection <project-id> --collection-id=<collection-id>
node mindmap-cli.js assign-project-collection <project-id> --remove
```

Output formats: `--format=json` for machine parsing, default is human-readable.

---

## Typical AI Agent Workflow

### 1. Read a project and find work

```bash
# Get all projects
curl http://localhost:3000/api/db/projects

# Get project details + all nodes
curl http://localhost:3000/api/db/projects/<id>

# Or via CLI
node mindmap-cli.js filter-tasks --priority=high --status=pending --format=json
```

### 2. Start working on a task

```bash
curl -X PUT http://localhost:3000/api/db/nodes/<id> \
  -H "Content-Type: application/json" \
  -d '{"status": "in-progress"}'
```

### 3. Add progress notes

```bash
# The "content" field is the node's notes/comment field
curl -X PUT http://localhost:3000/api/db/nodes/<id> \
  -H "Content-Type: application/json" \
  -d '{"content": "Completed database schema. Next: API endpoints."}'
```

### 4. Mark complete

```bash
curl -X PUT http://localhost:3000/api/db/nodes/<id> \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'
```

---

## Creating a Project from Scratch

Use the JSON import endpoint. See `PROJECT_FILE_GUIDE_JSON.md` for the full format.

```bash
curl -X POST http://localhost:3000/api/db/import-json \
  -H "Content-Type: application/json" \
  -d @./data/myproject.json
```

Or via CLI:
```bash
node mindmap-cli.js import-json ./data/myproject.json --collection-id=default-collection
```

---

## What the UI Provides (No Agent Action Needed)

When a user opens the app in a browser, these features are available out of the box:

- **Canvas**: pan, zoom, fit-to-screen (React Flow)
- **Layout**: auto-layout via Dagre (LR, RL, TB directions)
- **Node cards**: priority left-border + status right-border + title
- **Expand/collapse**: branches can be collapsed to reduce clutter
- **Detail Panel**: per-node editor for title, notes, dates, code, AI prompt, CLI command, audio
- **Status cycling**: click the status badge to cycle pending→in-progress→completed (cascades to children)
- **Progress tracking**: header bar, floating badge, sidebar per-project bars
- **Themes**: IBM Carbon dark / Dusk / Light (toggle in top bar)
- **Undo/redo**: Ctrl+Z / Ctrl+Y for add and delete operations
- **AI generate children**: ✨ Generate Children section in the Detail Panel (uses Codex on server)
- **Search**: available via the AI search API
- **Keyboard shortcuts**: Arrow keys (pan), Space (expand/collapse), Enter (open detail), Escape (close)

**An agent designing a graph structure does not need to worry about any of this.** Focus on: node titles, hierarchy (parent_id / children), status, priority, and content/notes.

---

## Quick Reference

| Task | REST | CLI |
|---|---|---|
| List projects | `GET /api/db/projects` | `mindmap projects` |
| List collections | `GET /api/db/collections` | `mindmap collections` |
| Create collection | `POST /api/db/collections` | `mindmap create-collection "Name"` |
| Import project | `POST /api/db/import-json` | `mindmap import-json file.json` |
| Get nodes | `GET /api/db/projects/:id` | `mindmap get-project <id> --show-nodes` |
| Update node | `PUT /api/db/nodes/:id` | `mindmap update-status <id> completed` |
| Search | `GET /api/ai/search?q=...` | `mindmap search "query"` |
| Get all docs | `GET /api/docs/bundle` | — |
