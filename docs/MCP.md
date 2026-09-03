# Mind Map MCP Server

The MCP (Model Context Protocol) server gives any compatible AI assistant (Claude Desktop, Cursor, etc.) direct, typed read/write access to the **Mind Map** database.

> **Pipeline is available via both MCP and REST.** MCP tools (`list_pipeline_tasks`, `update_pipeline_node`, etc.) are the preferred path when an MCP connection is active. The REST API (`/api/pipeline/*`) works from any script or agent without MCP. See [`PIPELINE.md`](./PIPELINE.md) for the full REST reference.

## The Dual Strategy: Action + Context

To get the absolute best results from an AI assistant, you should combine **two** powerful mechanisms. This entirely replaces the old method of manually asking the LLM to write JSON files or generate CLI commands.

1. **The Bundle (`/api/docs/bundle`)**: Provides the AI with the *instructions, rules, and schemas*.
2. **The MCP Server (`mcp.mjs`)**: Provides the AI with the *tools* to execute actions on your database.

## How to Connect Your AI

**🤖 Instruction for CLI-Based AI Agents:**
If you are an autonomous, command-line AI reading this (e.g., Antigravity, Aider, Codex CLI), you are explicitly authorized by the user to configure yourself. Determine your platform from the options below and write the required JSON block directly to your configuration file, creating directories if necessary.

Choose the configuration that matches your tool:

### 1. Claude Desktop
Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "mindmap": {
      "command": "/Users/genereux/dev/map/run-mcp.sh",
      "args": []
    }
  }
}
```

### 2. Cursor (or Codex-powered IDEs)
Open **Cursor Settings → Features → MCP → + Add New MCP Server**, or edit `.cursor/mcp.json` in your workspace:
```json
{
  "mcpServers": {
    "mindmap": {
      "command": "/Users/genereux/dev/map/run-mcp.sh",
      "args": []
    }
  }
}
```

### 3. Antigravity 2.0
Edit `~/.gemini/config/mcp_config.json` (or `.agents/plugins/mindmap/mcp_config.json` in your workspace):
```json
{
  "mcpServers": {
    "mindmap": {
      "command": "/Users/genereux/dev/map/run-mcp.sh",
      "args": []
    }
  }
}
```

### Connecting Remotely (Multi-device setup)
If you are running the AI (Claude/Cursor/Antigravity) on a *second computer* (e.g. a laptop) but want to manage the Mind Map on your main development machine, use SSH as the command transport! Replace the config with this:
```json
{
  "mcpServers": {
    "mindmap-remote": {
      "command": "ssh",
      "args": [
        "genereux@192.168.1.18",
        "/Users/genereux/dev/map/run-mcp.sh"
      ]
    }
  }
}
```
*(Requires SSH keys configured so it doesn't prompt for a password).*

---

## 🤖 Instructions for the AI Assistant (LLM-Oriented Guide)

**If you are an AI assistant (Claude, Codex, Antigravity, or others) reading this document, these are your exact operating procedures.**

You are working in a **Dual Strategy Environment**:
1. You receive rules/context from the HTTP `/api/docs/bundle`.
2. You take action using **MCP Tools**, not by generating manual `mindmap` CLI commands for the user.

**Step-by-Step Workflow:**

1. **Assimilate Rules**: If you haven't already, request to read or fetch `http://192.168.1.18:3000/api/docs/bundle`. This bundle contains `PROJECT_FILE_GUIDE_JSON.md`, `AI-COPILOT-GUIDE.md`, `MCP.md`, and `PIPELINE.md` — all rules, schemas, and API references.
2. **Contextualize**: Before attempting to add or modify nodes, invoke the `list_projects` tool to find the target project ID, then invoke `get_project_context` to read the live state of the tree.
3. **Execute via Tools**: Do NOT output raw JSON blocks to the chat asking the user to import them. Instead, autonomously invoke `create_node`, `update_node`, or `bulk_create_nodes` using your tool calling capabilities.
4. **Verify**: The MCP tools return success or error states. If successful, confirm to the user: *"Done — check the map in the web app."* Do not dump the resulting data into the chat.

By following this loop, you achieve zero-friction, atomic updates to the user's mind map database.

---

## Tools Exposed by the Server

Once connected, your AI has access to these native database actions.

### Mind Map tools

| Tool | Description |
|------|-------------|
| `list_projects` | List all projects — **call first** to discover IDs |
| `get_project_context` | Full tree + progress history + stats for one project |
| `get_node` | Single node with progress history |
| `search_nodes` | Keyword search across all projects |
| `create_project` | Create a new project |
| `create_node` | Add one node |
| `bulk_create_nodes` | Atomic batch insert — use for full plans |
| `update_node` | Patch any field on an existing node |
| `delete_node` | Delete node + all descendants (cascades) |
| `add_progress_note` | Log AI work to a node without overwriting content |
| `get_stats` | DB-level totals and file size |

### Pipeline tools

| Tool | Description |
|------|-------------|
| `list_pipeline_collections` | List all collections |
| `list_pipeline_tasks` | List all tasks with node/done counts; optional `collection_id` filter |
| `get_pipeline_task` | Full task: metadata + nodes + edges — **call before updating** |
| `create_pipeline_task` | Create a new task |
| `create_pipeline_node` | Add a step to a task |
| `update_pipeline_node` | Update status, notes, type, or any field on a node |
| `delete_pipeline_node` | Delete a node and its edges |
| `create_pipeline_edge` | Connect two nodes (source must finish before target) |
| `delete_pipeline_edge` | Remove a dependency edge |

### Diagram Studio tools

Use these tools to create and manage Mermaid diagrams stored in the database. Each diagram is a lightweight text record (~2–4 KB) that the Diagram Studio renders as an interactive SVG.

| Tool | Args | Description |
|------|------|-------------|
| `list_diagrams` | `collection_id?` | List all diagrams (metadata, no code). Pass `collection_id` to filter. |
| `get_diagram` | `diagram_id` | Retrieve the full Mermaid source and metadata for one diagram. |
| `create_diagram` | `title`, `code`, `description?`, `type?`, `collection_id?` | Create and persist a new diagram. `type` is one of: `flowchart` \| `sequence` \| `stateDiagram` \| `classDiagram` \| `erDiagram` \| `gantt` \| `mindmap`. |
| `update_diagram` | `diagram_id`, `code?`, `title?`, `description?`, `type?` | Update an existing diagram's source or metadata. |

**Typical agent workflow for diagrams:**
1. Call `list_diagrams` to discover existing diagrams and their IDs.
2. Call `get_diagram(id)` to read the current Mermaid source before editing.
3. Call `update_diagram(id, { code: "..." })` with the full updated source.
4. Or call `create_diagram(...)` to add a new diagram from scratch.

---

## Node field reference

| Field | Required | Notes |
|-------|----------|-------|
| `title` | ✅ | Short label shown on the card |
| `content` | ✅ | Context, acceptance criteria, notes. **Must not be empty.** |
| `status` | — | `pending` \| `in-progress` \| `completed` |
| `priority` | — | `low` \| `medium` \| `high` |
| `cli_command` | — | Shell command the AI or user should run |
| `task_prompt` | — | Sub-prompt for further AI expansion |
| `depth_level` | — | 0 = root, 1 = first children, etc. |
| `sort_order` | — | Controls sibling order within a parent |

## Important rules (enforced via system prompt)

1. The AI must never output raw JSON trees in chat — verify work in the web app.
2. The AI must call `get_project_context` before making any changes.
3. `content` must never be left empty.
4. For large plans, use `bulk_create_nodes` — not one-at-a-time creates.
5. After any write, the AI confirms: *"Done — check the map in the web app."*
