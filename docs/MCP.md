# Mind Map MCP Server

The MCP (Model Context Protocol) server gives any compatible AI assistant (Claude Desktop, Cursor, etc.) direct, typed read/write access to the Mind Map database — without going through the REST API.

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
      "command": "node",
      "args": ["/Users/genereux/dev/map/mcp.mjs"],
      "cwd": "/Users/genereux/dev/map"
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
      "command": "node",
      "args": ["/Users/genereux/dev/map/mcp.mjs"],
      "cwd": "/Users/genereux/dev/map"
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
      "command": "node",
      "args": ["/Users/genereux/dev/map/mcp.mjs"]
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
        "node",
        "/Users/genereux/dev/map/mcp.mjs"
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

1. **Assimilate Rules**: If you haven't already, request to read or fetch `http://192.168.1.18:3000/api/docs/bundle`. This bundle contains the `PROJECT_FILE_GUIDE_JSON.md` and `AI-COPILOT-GUIDE.md` which dictate the constraints of the map UI (e.g., never put status or markdown in titles, never leave `content` empty).
2. **Contextualize**: Before attempting to add or modify nodes, invoke the `list_projects` tool to find the target project ID, then invoke `get_project_context` to read the live state of the tree.
3. **Execute via Tools**: Do NOT output raw JSON blocks to the chat asking the user to import them. Instead, autonomously invoke `create_node`, `update_node`, or `bulk_create_nodes` using your tool calling capabilities.
4. **Verify**: The MCP tools return success or error states. If successful, confirm to the user: *"Done — check the map in the web app."* Do not dump the resulting data into the chat.

By following this loop, you achieve zero-friction, atomic updates to the user's mind map database.

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
