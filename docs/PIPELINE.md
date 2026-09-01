# Pipeline — Task Management Dashboard

The **Pipeline** is a fully independent task-management dashboard built into the same server as the Mind Map. It lets you model any piece of work as a **directed graph of steps** — each step is a node, nodes are connected by dependency edges, and the canvas shows status with colour and glow in real time.

Access it at **`/pipeline`** (click "⬡ Pipeline" in the Mind Map top bar, or navigate directly).

---

## Concepts

| Term | Meaning |
|---|---|
| **Collection** | A named group of tasks (e.g. "YouTube Projects", "Sprint 42"). Optional — tasks can exist without a collection. |
| **Task** | The top-level work item (e.g. "Build LLM video"). Each task has its own graph canvas. |
| **Node** | One step inside a task. Has a status, type, description, notes, and optional CLI command. |
| **Edge** | A directed dependency between two nodes: source must be done before target can start. |

---

## Home Page — `/pipeline`

The home page lists all your tasks. On the left there is a **collection sidebar**; the main area shows a **card grid**.

### Creating a Collection

Click **+** next to "Collections" in the sidebar. Choose a name and pick a colour from the 8 swatches. Collections are purely organisational — no required fields.

### Creating a Task

Click **+ New Task** (top right). Fill in:

| Field | Notes |
|---|---|
| **Name** | Required. Short label shown on the card and graph topbar. |
| **Description** | Optional. Shown truncated on the card. |
| **Type** | `general` `code` `video` `design` `research` `review` — controls the icon on the card. |
| **Priority** | `low` `medium` `high` — shown as a colour dot on the card. |
| **Collection** | Optional. Assign to a collection for filtering. |

After clicking **Create & Open** you land directly on the task's graph canvas.

### Task Card

Each card shows:
- Type icon + task name + truncated description
- Progress bar (done steps / total steps)
- Status badge, priority dot, collection dot
- `×` delete button (with confirmation)

Click anywhere on a card to open the graph view for that task.

---

## Graph Canvas — `/pipeline/:taskId`

The canvas is powered by **Cytoscape.js**. Each node in your task appears as a shape; edges are arrows representing dependencies.

### Topbar Controls

| Control | Description |
|---|---|
| **← Back** | Return to the home list |
| **Task name + progress bar** | Shows live done/total count |
| **≡ Labels / ⬤ Dots** | Display mode toggle (see below) |
| **Auto / Tree / Grid / Free** | Layout algorithm switcher |
| **☀ / ☽** | Toggle light/dark colour theme |
| **+ Node** | Add a new step to this task |

### Display Modes

**Labels mode (≡)** — Full rectangular nodes showing the step title. Node shape reflects its type:

| Type | Shape |
|---|---|
| `step` | Rounded rectangle |
| `decision` | Diamond ◇ |
| `milestone` | Star ★ |
| `review` | Hexagon ⬡ |

**Dots mode (⬤)** — Compact 52 × 52 nodes with no text. The same type-based shapes are preserved. Use this for a high-level overview of flow when you have many steps. Click any dot to open its detail panel.

### Status Colours

Status is shown with background colour and a glow effect:

| Status | Colour | Glow |
|---|---|---|
| To Do | Dark slate | None |
| In Progress | Deep blue | Blue glow |
| Done | Dark green | Green glow |

Edges leading out of "Done" nodes are rendered in green.

### Layout Algorithms

| Button | Algorithm | Best for |
|---|---|---|
| Auto | `dagre` LR | Linear pipelines — default |
| Tree | `breadthfirst` | Tree-shaped dependencies |
| Grid | `grid` | Large flat lists |
| Free | Manual drag | Custom positioning |

Dragging a node in any layout auto-saves its position. Switching layout re-runs the algorithm but saved positions are restored on next page load.

### Adding Nodes

Click **+ Node** in the topbar, type a title, press Enter or click **Add**. The node appears near the centre of the current viewport. Drag it to position, then open it to fill in details.

### Navigating

- **Pan**: click-drag the background
- **Zoom**: scroll wheel (sensitivity reduced for precision)
- **Fit all**: use the layout buttons to re-run Auto which fits the graph
- **Select a node**: single click → opens the detail panel on the right

---

## Node Detail Panel

Click any node to open a slide-in panel on the right with full details.

### Status

Three quick-toggle buttons: **To Do** · **In Progress** · **Done**. Clicking saves immediately — the canvas colour updates in real time.

### Type

Choose from `step` · `decision` · `milestone` · `review`. Changes the shape on the canvas immediately.

### Fields

| Field | Notes |
|---|---|
| **Title** | Edits auto-save on blur (click outside the field) |
| **Description** | What this step involves. Auto-saves on blur. |
| **Notes** | Additional context, links, references. Auto-saves on blur. |
| **CLI Command** | Optional shell command to run for this step (shown in monospace green). Auto-saves on blur. |
| **Due Date** | Date picker, saves immediately on change. |

### Connections

The **Connections** section shows all incoming (←) and outgoing (→) edges for this node. Each edge has an `×` button to remove it.

Click **+ Connect** to draw a new edge: pick a target node from the dropdown, click **Add →**.

### Delete

The **Delete Node** button (footer, red) removes the node and all its edges after confirmation.

---

## Themes

Click **☀ / ☽** in the topbar to switch between:

- **Dark** — Slate-navy palette. Deep background (`#131e32`), blue-tinted surfaces, purple/indigo accent.
- **Light** — Blue-white palette. Light blue-gray background (`#eef2fb`), white surfaces, same indigo accent.

The theme is saved to `localStorage` and shared between the home page and the graph canvas.

---

## Using the REST API (for LLMs and automation)

All pipeline data is accessible via a REST API on the same Express server. No authentication required (LAN-only). Base URL: `http://<server>:3000`.

### Collections

```bash
# List all collections
GET /api/pipeline/collections

# Create a collection
POST /api/pipeline/collections
Body: { "name": "YouTube Projects", "color": "#7c3aed", "description": "..." }

# Update a collection
PUT /api/pipeline/collections/:id
Body: { "name": "...", "color": "..." }

# Delete a collection
DELETE /api/pipeline/collections/:id
```

### Tasks

```bash
# List all tasks (optionally filter by collection)
GET /api/pipeline/tasks
GET /api/pipeline/tasks?collection_id=<id>

# Get one task with all its nodes and edges
GET /api/pipeline/tasks/:id

# Create a task
POST /api/pipeline/tasks
Body: {
  "name": "Build LLM video",
  "description": "Full production pipeline...",
  "type": "video",           # general | code | video | design | research | review
  "priority": "high",        # low | medium | high
  "status": "in-progress",   # pending | in-progress | done
  "collection_id": "<id>"    # optional
}

# Update a task
PUT /api/pipeline/tasks/:id
Body: { "status": "done", "name": "..." }

# Delete a task and all its nodes/edges
DELETE /api/pipeline/tasks/:id
```

### Nodes

```bash
# Create a node
POST /api/pipeline/nodes
Body: {
  "task_id": "<task-id>",
  "title": "Record voiceover",
  "description": "...",
  "status": "pending",          # pending | in-progress | done
  "type": "step",               # step | decision | milestone | review
  "notes": "...",
  "cli_command": "obs-cli ...",
  "position_x": 400,            # canvas X position (optional)
  "position_y": 200,            # canvas Y position (optional)
  "sort_order": 3               # ordering hint (optional)
}

# Update a node (any subset of fields)
PUT /api/pipeline/nodes/:id
Body: { "status": "done" }

# Delete a node (edges cascade)
DELETE /api/pipeline/nodes/:id
```

### Edges

```bash
# Create an edge (dependency: source must finish before target)
POST /api/pipeline/edges
Body: {
  "task_id": "<task-id>",
  "source_id": "<node-id>",
  "target_id": "<node-id>",
  "label": ""     # optional
}

# Delete an edge
DELETE /api/pipeline/edges/:id
```

### Typical LLM Workflow

To update a pipeline task programmatically:

```bash
# 1. Find the task
curl http://localhost:3000/api/pipeline/tasks

# 2. Get full task detail (nodes + edges)
curl http://localhost:3000/api/pipeline/tasks/<task-id>

# 3. Mark a node as in-progress
curl -X PUT http://localhost:3000/api/pipeline/nodes/<node-id> \
  -H 'Content-Type: application/json' \
  -d '{"status": "in-progress"}'

# 4. Mark it done when finished
curl -X PUT http://localhost:3000/api/pipeline/nodes/<node-id> \
  -H 'Content-Type: application/json' \
  -d '{"status": "done", "notes": "Completed. Output saved to ./raw/voiceover.wav"}'

# 5. Create a new step if needed
curl -X POST http://localhost:3000/api/pipeline/nodes \
  -H 'Content-Type: application/json' \
  -d '{
    "task_id": "<task-id>",
    "title": "Upload to YouTube",
    "status": "pending",
    "type": "milestone"
  }'
```

---

## Database Schema

```sql
pipeline_collections (id, name, description, color, created_at, updated_at)

pipeline_tasks (
  id, collection_id FK,
  name, description, type, status, priority, due_date,
  created_at, updated_at
)

pipeline_nodes (
  id, task_id FK CASCADE,
  title, description, status, type,
  notes, cli_command, due_date,
  position_x, position_y, sort_order,
  created_at, updated_at
)

pipeline_edges (
  id, task_id FK CASCADE,
  source_id FK CASCADE, target_id FK CASCADE,
  label
)
```

All tables live in `mind_maps.db` alongside the Mind Map tables. Migrations run automatically on server start.
