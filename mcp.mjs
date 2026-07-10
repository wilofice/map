import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { randomUUID } from "crypto";
import DatabaseManager from "./backend/db-manager.js";

// ─── Database ─────────────────────────────────────────────────────────────────
// The DB path is relative to the project root (where you run: node mcp.mjs)
const db = new DatabaseManager('./mind_maps.db');

// ─── Server ───────────────────────────────────────────────────────────────────
const server = new McpServer({
  name: "modular-mind-map",
  version: "1.0.0",
  description: "Direct read/write access to the Mind Map project database. Use these tools to read existing plans and build or update mind map trees on behalf of the user.",
});

// ─── Prompt ───────────────────────────────────────────────────────────────────
server.prompt(
  "mindmap-assistant",
  "System prompt that instructs the AI how to interact with this MCP server",
  {},
  () => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: [
          "You are a planning assistant with direct access to the user's Mind Map database.",
          "",
          "## Core Rules",
          "1. Never output raw JSON trees in chat. The user verifies your work by looking at the map in the web app.",
          "2. Before creating or modifying anything, call `list_projects` then `get_project_context` to understand the current state.",
          "3. Every node MUST have a non-empty `content` field — use it to explain the intent, acceptance criteria, or any relevant context for that node.",
          "4. Clarify any ambiguity with the user BEFORE writing to the database.",
          "5. When creating a plan, use `bulk_create_nodes` in a single call — avoid one-at-a-time creates for large batches.",
          "6. After any write operation confirm to the user: 'Done — check the map in the web app.'",
          "",
          "## Node Fields",
          "- `title` (required): Short label shown on the node card.",
          "- `content` (required): Longer explanation, context, or acceptance criteria. NEVER leave empty.",
          "- `status`: pending | in-progress | completed",
          "- `priority`: low | medium | high",
          "- `cli_command`: Shell command the AI or user should run for this task.",
          "- `task_prompt`: A sub-prompt the AI should use when expanding this node further.",
          "",
          "## Tree Structure",
          "- Nodes reference their parent via `parent_id` (null for the root).",
          "- Use `depth_level` to indicate depth (0 = root, 1 = first children, etc.).",
          "- Use `sort_order` (0-indexed integers) to control sibling order within a parent.",
        ].join("\n")
      }
    }]
  })
);

// ─── Resources ────────────────────────────────────────────────────────────────
server.resource(
  "all-projects",
  "mindmap://projects",
  { description: "List of all mind map projects in the database" },
  async (uri) => ({
    contents: [{
      uri: uri.href,
      mimeType: "application/json",
      text: JSON.stringify(db.getAllProjects(), null, 2)
    }]
  })
);

// ─── Tools ────────────────────────────────────────────────────────────────────

// ── Read tools ────────────────────────────────────────────────────────────────

server.tool(
  "list_projects",
  "List all mind map projects (id, name, description, node counts). Call this first to discover available projects.",
  {},
  async () => {
    const projects = db.getAllProjects();
    return { content: [{ type: "text", text: JSON.stringify(projects, null, 2) }] };
  }
);

server.tool(
  "get_project_context",
  "Get the full project tree with every node AND its progress history and overall stats (pending/in-progress/completed counts). Use this to understand the current state of a project before making changes.",
  { project_id: z.string().describe("The project ID (from list_projects)") },
  async ({ project_id }) => {
    const ctx = db.getProjectWithContext(project_id);
    if (!ctx) return { content: [{ type: "text", text: `Project '${project_id}' not found.` }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(ctx, null, 2) }] };
  }
);

server.tool(
  "get_node",
  "Get a single node by ID, including its progress history.",
  { node_id: z.string() },
  async ({ node_id }) => {
    const node = db.getNodeWithProgress(node_id);
    if (!node) return { content: [{ type: "text", text: `Node '${node_id}' not found.` }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(node, null, 2) }] };
  }
);

server.tool(
  "search_nodes",
  "Search nodes by title or content keyword across all projects.",
  { query: z.string().describe("Keyword to search for in node titles and content") },
  async ({ query }) => {
    const results = db.searchNodes(query);
    return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
  }
);

// ── Write tools ───────────────────────────────────────────────────────────────

server.tool(
  "create_project",
  "Create a new mind map project.",
  {
    name: z.string().describe("Project name"),
    description: z.string().optional().describe("Short description of the project"),
  },
  async ({ name, description = "" }) => {
    try {
      const id = randomUUID();
      const project = db.createProject(id, name, description, "", "default-collection");
      return { content: [{ type: "text", text: `Created project '${name}' with id: ${id}` }] };
    } catch (e) {
      return { content: [{ type: "text", text: String(e) }], isError: true };
    }
  }
);

server.tool(
  "create_node",
  "Add a single node to a project. For creating multiple nodes at once, use bulk_create_nodes instead.",
  {
    project_id: z.string(),
    parent_id: z.string().nullable().optional().describe("Parent node ID. Pass null for root-level nodes."),
    title: z.string().describe("Short label for the node (shown on the card)"),
    content: z.string().describe("Explanation, context, or acceptance criteria. Must not be empty."),
    status: z.enum(["pending", "in-progress", "completed"]).optional().default("pending"),
    priority: z.enum(["low", "medium", "high"]).optional().default("medium"),
    cli_command: z.string().optional().describe("Shell command for this task"),
    task_prompt: z.string().optional().describe("Sub-prompt for AI expansion of this node"),
    sort_order: z.number().int().optional().default(0),
    depth_level: z.number().int().optional().default(0),
  },
  async (params) => {
    try {
      const node = db.createNode({ id: randomUUID(), ...params });
      return { content: [{ type: "text", text: `Created node '${node.title}' (${node.id})` }] };
    } catch (e) {
      return { content: [{ type: "text", text: String(e) }], isError: true };
    }
  }
);

server.tool(
  "bulk_create_nodes",
  "Create multiple nodes in a single atomic transaction. Use this when building an entire plan at once. Nodes are inserted in the order provided — set parent_id references to other nodes in the same batch using their IDs.",
  {
    project_id: z.string(),
    nodes: z.array(z.object({
      id: z.string().describe("Pre-generated UUID for this node (so siblings/children can reference it)"),
      parent_id: z.string().nullable().optional(),
      title: z.string(),
      content: z.string().describe("Must not be empty"),
      status: z.enum(["pending", "in-progress", "completed"]).optional().default("pending"),
      priority: z.enum(["low", "medium", "high"]).optional().default("medium"),
      cli_command: z.string().optional(),
      task_prompt: z.string().optional(),
      sort_order: z.number().int().optional().default(0),
      depth_level: z.number().int().optional().default(0),
    })).describe("Array of nodes to insert. All must belong to the same project_id."),
  },
  async ({ project_id, nodes }) => {
    try {
      const withProject = nodes.map(n => ({ ...n, project_id }));
      const result = db.createNodesBulk(withProject);
      return { content: [{ type: "text", text: `Created ${result.count} nodes successfully.` }] };
    } catch (e) {
      return { content: [{ type: "text", text: String(e) }], isError: true };
    }
  }
);

server.tool(
  "update_node",
  "Update one or more fields on an existing node.",
  {
    node_id: z.string(),
    title: z.string().optional(),
    content: z.string().optional().describe("Must not be set to empty string"),
    status: z.enum(["pending", "in-progress", "completed"]).optional(),
    priority: z.enum(["low", "medium", "high"]).optional(),
    cli_command: z.string().optional(),
    task_prompt: z.string().optional(),
    start_date: z.string().optional().describe("ISO date string YYYY-MM-DD"),
    end_date: z.string().optional().describe("ISO date string YYYY-MM-DD"),
    days_spent: z.number().int().optional(),
  },
  async ({ node_id, ...updates }) => {
    try {
      const node = db.updateNode(node_id, updates);
      return { content: [{ type: "text", text: `Updated node '${node.title}' (${node.id})` }] };
    } catch (e) {
      return { content: [{ type: "text", text: String(e) }], isError: true };
    }
  }
);

server.tool(
  "delete_node",
  "Delete a node by ID. WARNING: also deletes all descendant nodes due to cascade. Confirm with the user before calling this.",
  { node_id: z.string() },
  async ({ node_id }) => {
    try {
      const node = db.getNode(node_id);
      if (!node) return { content: [{ type: "text", text: `Node '${node_id}' not found.` }], isError: true };
      db.deleteNode(node_id);
      return { content: [{ type: "text", text: `Deleted node '${node.title}' and its descendants.` }] };
    } catch (e) {
      return { content: [{ type: "text", text: String(e) }], isError: true };
    }
  }
);

server.tool(
  "add_progress_note",
  "Add a progress note to a node — useful to log AI work, decisions, or status updates without overwriting the node's content.",
  {
    node_id: z.string(),
    message: z.string().describe("The progress message to log"),
  },
  async ({ node_id, message }) => {
    try {
      const entry = db.addNodeProgress(node_id, message, "ai");
      return { content: [{ type: "text", text: `Added progress note to node ${node_id}.` }] };
    } catch (e) {
      return { content: [{ type: "text", text: String(e) }], isError: true };
    }
  }
);

server.tool(
  "get_stats",
  "Get database-level stats: total projects, total nodes, and database file size.",
  {},
  async () => {
    const stats = db.getStats();
    return { content: [{ type: "text", text: JSON.stringify(stats, null, 2) }] };
  }
);

// ─── Run ──────────────────────────────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("🧠 Mind Map MCP Server running on stdio");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
