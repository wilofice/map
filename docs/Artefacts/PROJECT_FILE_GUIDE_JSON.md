# Project File Guide — JSON Format

This guide describes the JSON format used to import projects into the Mind Map application.

---

## ⚠️ Title Rules — Read This First

Node titles must be **plain text only**:
- No emoji, no markdown (`**bold**`, `## heading`), no status labels, no brackets
- Keep titles concise: 3-15 words
- The app renders status, priority, and progress visually — never encode them in titles

| Don't | Do |
|---|---|
| `"✅ Auth API (DONE)"` | `"Authentication API"` |
| `"🔴 [HIGH] Database"` | `"Database Setup"` |
| `"**Frontend** (60%)"` | `"Frontend Components"` |

---

## Import Endpoint

```bash
POST /api/db/import-json
Content-Type: application/json
Body: <project JSON>
```

Or via CLI:
```bash
node mindmap-cli.js import-json ./data/project.json --collection-id=<id>
```

---

## JSON Schema

```json
{
  "type": "project_plan",
  "version": "1.0",
  "name": "Project Name",
  "description": "Optional description",
  "collection_id": "default-collection",
  "nodes": [
    {
      "title": "Root Node Title",
      "status": "pending",
      "priority": "high",
      "content": "Notes or description text",
      "children": [
        {
          "title": "Child Node",
          "status": "pending",
          "priority": "medium",
          "children": []
        }
      ]
    }
  ]
}
```

### Top-level fields

| Field | Required | Description |
|---|---|---|
| `type` | No | Should be `"project_plan"` if present |
| `version` | No | Should be `"1.0"` if present |
| `name` | Yes | Project name shown in sidebar |
| `description` | No | Short description shown in sidebar |
| `collection_id` | No | Collection to place the project in (default: `"default-collection"`) |
| `nodes` | Yes | Array of root nodes (use exactly one root node) |

**Use exactly one root node.** All other nodes should be children of that root. Multiple roots are supported but produce less predictable layouts.

---

## Node Fields

| Field | Required | Values | Description |
|---|---|---|---|
| `title` | Yes | plain text string | Node label — plain text, no markdown |
| `status` | No | `pending` `in-progress` `completed` | Default: `pending` |
| `priority` | No | `low` `medium` `high` | Default: `medium` |
| `content` | No | string | Notes/description shown in Detail Panel |
| `children` | No | array of nodes | Nested child nodes, same structure |
| `startDate` | No | `YYYY-MM-DD` | Timeline start |
| `endDate` | No | `YYYY-MM-DD` | Timeline end |
| `daysSpent` | No | number | Actual time invested |
| `code` | No | `{ language, content }` | Code block shown in Detail Panel |
| `taskPromptForLlm` | No | string | AI prompt stored in Detail Panel |
| `cliCommand` | No | string | Terminal command stored in Detail Panel |

> **Note:** `id` is **not required** — the server auto-generates UUIDs on import. If you provide an `id`, it will be used; otherwise one is created.

---

## How Status and Priority Are Displayed

You set these as data fields. The app renders them:

| Field value | Visual rendering |
|---|---|
| `status: "pending"` | Slate/grey right border on node card |
| `status: "in-progress"` | Blue right border |
| `status: "completed"` | Green right border |
| `priority: "high"` | Red left border |
| `priority: "medium"` | Yellow left border |
| `priority: "low"` | Green left border |

Progress is calculated automatically from `status` values across all nodes and shown in the header bar, floating badge, and sidebar.

---

## Minimal Example

```json
{
  "name": "Authentication Sprint",
  "description": "Login and session management tasks",
  "nodes": [
    {
      "title": "Authentication Sprint",
      "status": "in-progress",
      "priority": "high",
      "children": [
        {
          "title": "JWT token generation",
          "status": "completed",
          "priority": "high",
          "content": "Using jose library, RS256 algorithm"
        },
        {
          "title": "Refresh token rotation",
          "status": "in-progress",
          "priority": "high"
        },
        {
          "title": "Session expiry handling",
          "status": "pending",
          "priority": "medium"
        },
        {
          "title": "Logout and token revocation",
          "status": "pending",
          "priority": "medium"
        }
      ]
    }
  ]
}
```

---

## Code Blocks

Attach a code snippet to any node. It appears in the Detail Panel under the `</>` section.

```json
{
  "title": "JWT generation",
  "code": {
    "language": "typescript",
    "content": "const token = await new SignJWT({ sub: userId })\n  .setProtectedHeader({ alg: 'RS256' })\n  .setExpirationTime('1h')\n  .sign(privateKey);"
  }
}
```

Supported languages: any identifier recognized by standard syntax highlighters (javascript, typescript, python, bash, sql, yaml, css, etc.).

---

## AI Prompt Field

Store a prompt for an AI agent directly on the node. Appears in the Detail Panel under `🤖 AI Prompt`. The agent can read it via `GET /api/db/nodes/:id`.

```json
{
  "title": "Session expiry handling",
  "taskPromptForLlm": "Implement session expiry middleware for Express. Check token expiry on each request. Return 401 with refresh hint when expired. Use Redis for token blacklisting."
}
```

---

## CLI Command Field

Store a terminal command on the node. Appears in the Detail Panel under `$ CLI Command`.

```json
{
  "title": "Run test suite",
  "cliCommand": "npm test -- --coverage --reporter=json > coverage.json"
}
```

---

## Modular Imports (Large Projects)

Split a large project across multiple JSON files using import directives:

**Root file (`project.json`):**
```json
{
  "name": "Large Project",
  "nodes": [
    {
      "title": "Large Project",
      "children": [
        { "type": "import", "src": "./modules/frontend.json" },
        { "type": "import", "src": "./modules/backend.json" },
        { "type": "import", "src": "./modules/devops.json" }
      ]
    }
  ]
}
```

**Module file (`modules/frontend.json`):**
```json
{
  "nodes": [
    { "title": "React component library", "priority": "high" },
    { "title": "State management setup", "priority": "medium" },
    { "title": "Routing and navigation", "priority": "medium" }
  ]
}
```

Rules:
- Circular imports are detected and skipped
- Paths are relative to the importer file
- Supported shapes for imported files: `{ "nodes": [...] }`, raw array, or single node object
- Works both via CLI import and via the `/api/db/import-json` REST endpoint

---

## Generating a Project Plan (for AI agents)

When asked to create a project plan for any software project, follow this structure:

1. **One root node** with the project name
2. **Domain children** (3-6 high-level areas, e.g., Frontend, Backend, Database, DevOps)
3. **Task nodes** under each domain (specific, actionable items)
4. Set `status: "pending"` on all nodes unless you know current state
5. Set `priority` based on blocking dependencies and business impact
6. Use `content` for context, constraints, and decisions — not for visual markers

The user will open the map in the browser and immediately see the hierarchy with visual status/priority indicators. No visual design work is needed from the agent.

---

## Complete Example with All Features

```json
{
  "type": "project_plan",
  "version": "1.0",
  "name": "API Gateway Implementation",
  "description": "Build and deploy the API gateway service",
  "collection_id": "default-collection",
  "nodes": [
    {
      "title": "API Gateway Implementation",
      "status": "in-progress",
      "priority": "high",
      "content": "Central routing layer for all microservices. Must be zero-downtime deployable.",
      "children": [
        {
          "title": "Routing and load balancing",
          "status": "completed",
          "priority": "high",
          "content": "Using http-proxy-middleware with round-robin lb",
          "children": [
            { "title": "Route table configuration", "status": "completed", "priority": "high" },
            { "title": "Health check endpoints", "status": "completed", "priority": "medium" }
          ]
        },
        {
          "title": "Authentication middleware",
          "status": "in-progress",
          "priority": "high",
          "content": "JWT validation + API key support",
          "taskPromptForLlm": "Implement Express middleware that validates both JWT bearer tokens and X-API-Key headers. Use RS256 for JWT. Cache public keys for 1 hour.",
          "children": [
            { "title": "JWT validation", "status": "in-progress", "priority": "high" },
            { "title": "API key management", "status": "pending", "priority": "high" },
            { "title": "Rate limiting per client", "status": "pending", "priority": "medium" }
          ]
        },
        {
          "title": "Observability",
          "status": "pending",
          "priority": "medium",
          "children": [
            { "title": "Request/response logging", "status": "pending", "priority": "medium" },
            { "title": "Prometheus metrics endpoint", "status": "pending", "priority": "medium" },
            { "title": "Distributed tracing", "status": "pending", "priority": "low" }
          ]
        },
        {
          "title": "Deployment",
          "status": "pending",
          "priority": "high",
          "cliCommand": "docker build -t api-gateway:latest .\ndocker push registry/api-gateway:latest\nkubectl rollout restart deployment/api-gateway",
          "children": [
            { "title": "Docker image and compose setup", "status": "pending", "priority": "high" },
            { "title": "Kubernetes manifests", "status": "pending", "priority": "high" },
            { "title": "CI/CD pipeline integration", "status": "pending", "priority": "medium" }
          ]
        }
      ]
    }
  ]
}
```
