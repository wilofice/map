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
  version: "1.1.0",
  description: "Direct read/write access to the Mind Map AND Pipeline databases. Mind Map tools manage hierarchical project trees. Pipeline tools manage directed task graphs with dependency edges.",
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
          "## Pipeline Tools",
          "Use `list_pipeline_tasks` → `get_pipeline_task` to discover the current state.",
          "Use `update_pipeline_node` to mark steps in-progress or done as you work.",
          "Use `create_pipeline_node` + `create_pipeline_edge` to add new steps and connect them.",
          "Always write a `notes` value when marking a node done — record what was produced.",
          "For `review` type nodes: stop and ask the user for approval before marking done.",
          "",
          "## Mind Map Node Fields",
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

// ─── Pipeline Tools ───────────────────────────────────────────────────────────

server.tool(
  "list_pipeline_collections",
  "List all pipeline collections (id, name, color, description).",
  {},
  async () => {
    const cols = db.getAllPipelineCollections();
    return { content: [{ type: "text", text: JSON.stringify(cols, null, 2) }] };
  }
);

server.tool(
  "list_pipeline_tasks",
  "List all pipeline tasks with node counts and done counts. Optionally filter by collection.",
  {
    collection_id: z.string().optional().describe("Filter to a specific collection ID"),
  },
  async ({ collection_id }) => {
    const tasks = db.getAllPipelineTasks(collection_id || null);
    return { content: [{ type: "text", text: JSON.stringify(tasks, null, 2) }] };
  }
);

server.tool(
  "get_pipeline_task",
  "Get a full pipeline task: its metadata, all nodes, and all dependency edges. Call this before updating any nodes.",
  {
    task_id: z.string().describe("Task ID (from list_pipeline_tasks)"),
  },
  async ({ task_id }) => {
    const task = db.getPipelineTask(task_id);
    if (!task) return { content: [{ type: "text", text: `Task '${task_id}' not found.` }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(task, null, 2) }] };
  }
);

server.tool(
  "create_pipeline_task",
  "Create a new pipeline task.",
  {
    name: z.string().describe("Task name"),
    description: z.string().optional(),
    type: z.enum(["general", "code", "video", "design", "research", "review"]).optional().default("general"),
    priority: z.enum(["low", "medium", "high"]).optional().default("medium"),
    collection_id: z.string().optional().describe("Assign to a collection"),
    due_date: z.string().optional().describe("ISO date YYYY-MM-DD"),
  },
  async ({ name, description, type, priority, collection_id, due_date }) => {
    try {
      const id = randomUUID();
      const task = db.createPipelineTask(id, name, description, type, priority, collection_id, due_date);
      return { content: [{ type: "text", text: `Created pipeline task '${name}' with id: ${id}` }] };
    } catch (e) {
      return { content: [{ type: "text", text: String(e) }], isError: true };
    }
  }
);

server.tool(
  "create_pipeline_node",
  "Add a new node (step) to a pipeline task.",
  {
    task_id: z.string(),
    title: z.string().describe("Short imperative label, e.g. 'Record voiceover'"),
    description: z.string().optional(),
    type: z.enum(["step", "decision", "milestone", "review"]).optional().default("step"),
    status: z.enum(["pending", "in-progress", "done"]).optional().default("pending"),
    notes: z.string().optional(),
    cli_command: z.string().optional(),
    position_x: z.number().optional().default(0),
    position_y: z.number().optional().default(0),
    sort_order: z.number().int().optional().default(0),
  },
  async ({ task_id, title, description, type, status, notes, cli_command, position_x, position_y, sort_order }) => {
    try {
      const id = randomUUID();
      const node = db.createPipelineNode(id, task_id, title, description, type, sort_order, position_x, position_y);
      if (status !== "pending" || notes || cli_command) {
        db.updatePipelineNode(id, { status, notes, cli_command });
      }
      return { content: [{ type: "text", text: `Created node '${title}' (${id}) in task ${task_id}` }] };
    } catch (e) {
      return { content: [{ type: "text", text: String(e) }], isError: true };
    }
  }
);

server.tool(
  "update_pipeline_node",
  "Update a pipeline node — status, notes, type, title, or any other field. Use this to mark work in-progress or done.",
  {
    node_id: z.string(),
    status: z.enum(["pending", "in-progress", "done"]).optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    notes: z.string().optional().describe("Write a completion note when marking done"),
    type: z.enum(["step", "decision", "milestone", "review"]).optional(),
    cli_command: z.string().optional(),
    due_date: z.string().optional().describe("ISO date YYYY-MM-DD"),
  },
  async ({ node_id, ...patch }) => {
    try {
      const node = db.updatePipelineNode(node_id, patch);
      if (!node) return { content: [{ type: "text", text: `Node '${node_id}' not found.` }], isError: true };
      return { content: [{ type: "text", text: `Updated node '${node.title}' → status: ${node.status}` }] };
    } catch (e) {
      return { content: [{ type: "text", text: String(e) }], isError: true };
    }
  }
);

server.tool(
  "delete_pipeline_node",
  "Delete a pipeline node and all its edges. Confirm with the user before calling.",
  { node_id: z.string() },
  async ({ node_id }) => {
    try {
      db.deletePipelineNode(node_id);
      return { content: [{ type: "text", text: `Deleted node ${node_id} and its edges.` }] };
    } catch (e) {
      return { content: [{ type: "text", text: String(e) }], isError: true };
    }
  }
);

server.tool(
  "create_pipeline_edge",
  "Create a dependency edge between two pipeline nodes. Source must finish before target can start.",
  {
    task_id: z.string(),
    source_id: z.string().describe("The prerequisite node ID"),
    target_id: z.string().describe("The dependent node ID"),
    label: z.string().optional().default(""),
  },
  async ({ task_id, source_id, target_id, label }) => {
    try {
      const id = randomUUID();
      db.createPipelineEdge(id, task_id, source_id, target_id, label);
      return { content: [{ type: "text", text: `Created edge ${source_id} → ${target_id}` }] };
    } catch (e) {
      return { content: [{ type: "text", text: String(e) }], isError: true };
    }
  }
);

server.tool(
  "delete_pipeline_edge",
  "Remove a dependency edge between two pipeline nodes.",
  { edge_id: z.string() },
  async ({ edge_id }) => {
    try {
      db.deletePipelineEdge(edge_id);
      return { content: [{ type: "text", text: `Deleted edge ${edge_id}` }] };
    } catch (e) {
      return { content: [{ type: "text", text: String(e) }], isError: true };
    }
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
