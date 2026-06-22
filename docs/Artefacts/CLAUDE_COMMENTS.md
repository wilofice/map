# Design Philosophy — Mind Map as AI Memory Layer

This application is built around one core idea: **the mind map is the persistent memory shared between the human and any AI agent working on a project.**

## The Three-Phase Loop

```
1. PLAN   → AI agent generates a project structure as JSON → imported into the map
2. WORK   → AI agent reads tasks, executes, updates status + notes via REST API
3. REVIEW → Human views live progress in the UI; AI reads context for next session
```

This loop is **bidirectional and persistent**. The map survives across sessions, terminals, and AI providers.

## What the Human Does

- Opens the browser UI to see the full project state at a glance
- Uses the canvas to reorganize and expand the map visually
- Opens the Detail Panel to read notes, run CLI commands, review code snippets
- Uses "✨ Generate Children" to have an AI expand any node on demand
- Cycles node status with a single click (cascades to all children)

## What the AI Agent Does

- Reads task queues via REST or CLI
- Updates `status` and `content` (notes) as it works
- Creates new nodes for discovered sub-tasks
- Uses `taskPromptForLlm` field to pass instructions to itself or another agent
- Imports entire project plans as JSON when starting a new project

## Key Principle: Separation of Concerns

| Responsibility | Owner |
|---|---|
| Visual rendering (colors, borders, animations) | The application |
| Data structure (hierarchy, status, priority) | The AI agent + human |
| Persistence (SQLite) | The server |
| Navigation (pan, zoom, expand/collapse) | The human via UI |
| Status propagation to children | The application (on status click) |

The AI agent should never try to encode visual information into node titles or comments. The application handles all rendering.

## Collections as Namespaces

Collections group related projects. Typical structure:

```
Collections
├── Default          → scratch / one-off projects
├── Work             → client/employer projects
├── Personal         → personal dev / learning
└── <project-name>  → dedicated collection per large initiative
```

Projects inherit their collection's context. An AI agent can list collections to understand what domain a project belongs to.
