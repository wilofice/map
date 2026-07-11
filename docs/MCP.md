# Mind Map MCP Server

The MCP (Model Context Protocol) server gives any compatible AI assistant (Claude Desktop, Cursor, etc.) direct, typed read/write access to the Mind Map database — without going through the REST API.

## The Dual Strategy: Action + Context

To get the absolute best results from an AI assistant, you should combine **two** powerful mechanisms. This entirely replaces the old method of manually asking the LLM to write JSON files or generate CLI commands.

1. **The Bundle (`/api/docs/bundle`)**: Provides the AI with the *instructions, rules, and schemas*.
2. **The MCP Server (`mcp.mjs`)**: Provides the AI with the *tools* to execute actions on your database.

### Step-by-Step Guide for AI Assistants

**Step 1: Start the MCP Server locally**
The AI client needs a running instance of your backend. You don't need to start a separate port; the AI will run `mcp.mjs` as a subprocess.

**Step 2: Connect Claude Desktop**
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
*Restart Claude Desktop. A 🔨 tool icon will appear in the chat.*

**Step 3: Connect Cursor (Alternative)**
Open **Cursor Settings → Features → MCP → + Add New MCP Server**, or edit `.cursor/mcp.json`:
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

**Step 4: Prime the AI with Context**
When you start a new chat with your AI, explicitly feed it the bundle endpoint so it learns the project rules *before* using the tools.
> *"Before we begin, please fetch http://localhost:3000/api/docs/bundle to read the project file guide and system prompt rules."*

**Step 5: Command the AI to Invoke Tools**
Instead of asking for JSON or CLI commands, simply tell the AI what you want to achieve.
> *"Review the frontend components for the Mind Map project. Add 3 new tasks under the existing 'UI Refactor' node."*

The AI will now autonomously invoke `get_project_context` to see the current state, and then invoke `bulk_create_nodes` to insert the new tasks. No JSON copy-pasting required!

---

## Tools Exposed by the Server

Once connected, your AI has access to these native database actions:

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
