# Mind Map MCP Server

The MCP (Model Context Protocol) server gives any compatible AI assistant (Claude Desktop, Cursor, etc.) direct, typed read/write access to the Mind Map database — without going through the REST API.

## How it works

`mcp.mjs` is a **stdio MCP server**. The AI client (Claude Desktop, Cursor…) spawns it as a subprocess and communicates over standard input/output using the MCP JSON-RPC protocol. No separate HTTP port is needed; the server is started on-demand by the AI client.

```
AI Client (Claude / Cursor)
    │  stdin/stdout (JSON-RPC)
    ▼
node mcp.mjs          ← this file
    │  direct import
    ▼
backend/db-manager.js ← SQLite via better-sqlite3
    │
    ▼
mind_maps.db
```

## Tools exposed

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

**Resource:** `mindmap://projects` — always-fresh project list  
**Prompt:** `mindmap-assistant` — system instructions that enforce the Mind Map conventions

## Quick start

```bash
# From the project root
npm run mcp
# or
node mcp.mjs
```

The server logs to **stderr** only. Stdout is reserved for MCP JSON-RPC frames.

## Connecting to Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mindmap": {
      "command": "node",
      "args": ["/Users/genereux/dev/map/mcp.mjs"],
      "cwd": "/Users/genereux/dev/map"
    }
  }
}
```

Restart Claude Desktop. The 🔨 tool icon will appear in the chat input bar.

## Connecting to Cursor

Open **Cursor Settings → Features → MCP → + Add New MCP Server**, or edit `.cursor/mcp.json` in your workspace:

```json
{
  "mcpServers": {
    "mindmap": {
      "command": "node",
      "args": ["/Users/genereux/dev/map/mcp.mjs"],
      "cwd": "/Users/genereux/dev/map"
    }
  }
}
```

## Verify connection

In the AI chat:

> *Use the MindMap tools to list my projects and show me the stats.*

The assistant will call `list_projects` and `get_stats` and respond with your real data. It will **not** dump raw JSON into the chat — the built-in `mindmap-assistant` prompt forbids it.

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
