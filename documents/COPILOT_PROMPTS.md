## Copilot Prompt Library — Mind Map Project

Use these ready-to-paste prompts with your AI assistant while working on this project. Replace placeholders like <path>, <id>, <collectionId>, <nodeId>, and <status> before sending.

— Tip: Keep prompts short and specific. Paste only what you need for the current task.

## Target app repo orientation (your project)

- Read my application repository (not this mind map tool) and summarize the architecture: entry points, services/modules, scripts, and configs. Map dependencies and responsibilities.
- List key runtime surfaces (APIs, CLIs, jobs, UI routes) and the main data stores used. Note auth/permissions and external integrations.
- From code and docs, extract a high-level backlog grouped by domains (UI, API, DevOps, Data). Return an importable nodes array with stable ids and priorities.
- Identify risky or unknown areas and add taskPromptForLlm suggestions for research or spikes.
- Propose a single-root project structure for planning (root with domain children), following our JSON guide.

## JSON project files and modular imports

- Given this JSON file at <path>, validate it against our JSON guide (PROJECT_FILE_GUIDE_JSON.md). List issues and the exact line/field to fix. Suggest minimal fixes.
- Expand JSON-native imports in <path> and print only the final normalized shape {"type":"project_plan","nodes":[...]}, showing titles and ids only (no comments/code).
- Detect and report circular imports across this set of files: <paths or folder>. Explain where the cycle starts and the safe file to break the cycle.
- Convert this node list into a single-root project JSON skeleton that follows our guide and best practices (id, title, status, priority, children).
- Infer missing ids in this JSON and propose stable ids (kebab-case) based on titles. Show a diff-style preview.
- Take this JSON node and add a code block (language and content) plus a taskPromptForLlm that asks for optimization hints.

## CLI quick examples (copy/paste)

- Create a collection and a project
  ```zsh
  node mindmap-cli.js create-collection "my-collection" --description="Team projects"
  node mindmap-cli.js create-project "web-platform" --collection-id=my-collection --description="Platform work"
  node mindmap-cli.js projects
  ```

- Import a modular JSON plan
  ```zsh
  node mindmap-cli.js import-json ./modular_root.json --collection-id=my-collection
  node mindmap-cli.js projects
  ```

- Get project context and nodes
  ```zsh
  node mindmap-cli.js get-project <projectId> --show-nodes
  ```

- List and filter tasks
  ```zsh
  node mindmap-cli.js list-tasks --priority=high --limit=10
  node mindmap-cli.js filter-tasks --project-id=<projectId> --status=pending --limit=20
  node mindmap-cli.js highest-priority-task <projectId>
  node mindmap-cli.js lowest-priority-task <projectId>
  ```

- Update status and add progress
  ```zsh
  node mindmap-cli.js update-status <nodeId> in-progress
  node mindmap-cli.js add-progress <nodeId> "Started implementation"
  node mindmap-cli.js update-status <nodeId> completed
  ```

- Create or update a node from JSON
  ```zsh
  # Create (file must contain the node JSON; you can also pass --project-id)
  node mindmap-cli.js create-node-json --file=./new-task.json --project-id=<projectId>

  # Update
  node mindmap-cli.js update-node-json <nodeId> --file=./node-update.json
  ```

## CLI helpers (mindmap-cli.js)

- Generate the exact CLI command(s) to import <path> into collection <collectionId> using JSON-native imports. Include follow-up commands to list collections and projects to verify.
  Example:
  ```zsh
  node mindmap-cli.js import-json <path> --collection-id=<collectionId>
  node mindmap-cli.js collections
  node mindmap-cli.js projects
  ```
- I ran this CLI command and got the following output. Extract the created project id, and then generate the command to show project details with nodes.
- Draft a one-liner to update node <nodeId> to status <status> and then show its progress history.
  Example:
  ```zsh
  node mindmap-cli.js update-status <nodeId> <status> && node mindmap-cli.js get-node <nodeId>
  ```
- Produce a short bash script to import a modular JSON, assign it to default-collection, list projects, and then fetch the highest-priority task in the new project.
  Example:
  ```zsh
  node mindmap-cli.js import-json ./modular_root.json --collection-id=default-collection
  node mindmap-cli.js projects
  node mindmap-cli.js highest-priority-task <projectId>
  ```
- From this project details JSON output, list the top 5 pending tasks by priority then title. Return as a compact table.
  Example:
  ```zsh
  node mindmap-cli.js filter-tasks --project-id=<projectId> --status=pending --limit=5 --format=json
  ```

## Appendix: API checks and debugging (for operators of the Mind Map service)

- Call /api/load-json/<file> mentally and tell me what the validated, normalized JSON should look like if imports expand correctly. Highlight mismatches versus the guide if any.
- I get the error “Invalid JSON format: Missing or invalid type: must be 'project_plan'”. List likely root causes and give step-by-step fixes (normalize shape, expand imports, validate), then a quick re-test plan.
- Show a minimal test plan to verify /api/db/import-json properly respects base_dir and relative imports; include at least 1 happy path and 1 circular import case.
- Given these logs from server.js, pinpoint where expansion/normalization likely failed and propose a targeted patch (smallest diff) to fix.
- Provide a one-paragraph explanation of how import provenance is tagged (dataImported, dataImportFrom, sourceFile) and how it should appear on imported nodes.

## UI and interactions

- Propose a UX tweak to make code blocks collapsible by default with a “Show code” toggle. Outline the smallest DOM/CSS changes.
- Create a checklist to verify that a newly imported project appears under the selected collection and renders a single-root layout correctly.
- Write a short spec for a “Open in CLI” button for a node with a cliCommand, including telemetry and failure states.
- Suggest keyboard shortcuts for common actions (toggle children, edit title, mark completed) and where to bind them in the MVC.
- Draft a CSS snippet to highlight high-priority nodes more prominently without overpowering the layout.

## Data modeling and validation

- Read the validator logic and list all required vs optional fields on nodes. Provide quick examples for valid/invalid cases.
- Extend the schema to allow a labels: string[] field. Show validation changes and one UI hint to surface labels.
- Provide a migration recipe to refactor from multiple roots to a single-root project while preserving sibling ordering.
- For large projects, propose a rule-of-thumb split strategy (by domain or team) and the import graph structure to keep merges predictable.

## Refactoring and reliability (service maintainers)

- Identify the smallest cohesive module to extract from server.js for JSON import expansion. Propose the new module API and update call sites.
- Add input validation and friendly error messages to /api/db/import-json, including actionable hints for users.
- Suggest lightweight unit tests for import expansion (happy path, nested imports, circular import, missing file). Keep tests independent from the DB.
- Show a short changelog for converting callback-style logic (if any) to async/await in server.js endpoints.
- Propose guards and timeouts for long import chains to avoid blocking the event loop.

## Performance and large files

- Recommend a streaming or chunked approach to process extremely large JSON files while preserving validation accuracy.
- Propose a caching strategy for expanded imports keyed by file mtime and path. Outline invalidation rules.
- Identify potential hotspots in the expansion recursion and suggest micro-optimizations (memoization, path normalization, early exits).

## Observability and ops

- Design a concise logging format for import expansion steps (START, RESOLVE, INLINE, WARN, DONE) with file paths and counts.
- Provide a small health check endpoint contract and a smoke test checklist for CI.
- Suggest minimal metrics to track: projects imported, nodes created, avg expansion time, validation failures.

## Documentation and examples

- Update PROJECT_FILE_GUIDE_JSON.md to add a “Quickstart: Modular JSON” section with a tiny root and two imports. Keep it under 40 lines.
- Draft a README section titled “Importing Modular JSON” with a three-step guide (Prepare, Import, Verify) and CLI/API examples.
- Create a small example set: modular_root.json, components/frontend.json, components/backend.json. Each should be under 30 lines and use stable ids.
- Provide a short troubleshooting matrix (symptom → probable cause → fix) for import-related problems.

## Helper prompts (fill-in-the-blanks)

- Review this JSON and return only a corrected version that passes validation, preserving content as much as possible:
  [paste JSON here]

- Expand imports in this JSON and return only titles in tree form (no additional commentary):
  [paste JSON here]

- Generate CLI commands to import this file into default-collection and then list projects to confirm:
  File: <path>

- Suggest ids for these titles (kebab-case, deterministic) and return a map of title → id:
  [paste titles here]

- Convert this legacy XML mindmap to the JSON shape used by our app. Return just the JSON:
  [paste XML here]

- From this project details response, extract the top 10 pending nodes (id, title, priority) and return JSON only:
  [paste response JSON here]

---

Keep this file handy. Add your own prompts over time as you notice repeatable workflows.

## End‑to‑End Software Project Prompt Kit (Copilot + mindmap CLI)

Use these prompts to run a full project lifecycle using the mind map UI for visibility and the CLI for automation. Replace placeholders like <collectionId>, <projectName>, <projectId>, <nodeId>, <status>, and <path>.

### Quickstart (bootstrapping)

- Create or select a collection named <collectionId>, then create a project named <projectName> in that collection. After creation, list projects and return the new project id.
- Import a modular JSON plan from <path> into collection <collectionId>, then verify the project exists and summarize the root node and top-level children titles.
- Produce a minimal “starter plan” JSON with one root and three children (Plan, Build, Ship), stable kebab-case ids, and import it into default-collection.
- Open the UI and tell me what I should see if the import succeeded: expected project listing and a single-root layout with 3 children.

### Product planning and backlog

- Draft a high-level roadmap for <projectName> with 4 quarters, each with 2–3 epics. Convert epics into node JSON (id, title, priority, children) and prepare an importable {"nodes": [...]} file.
- Convert this PRD into backlog nodes grouped by epic and priority. Keep items atomic and action-oriented. Output only the nodes array.
- Enrich each epic with a taskPromptForLlm that asks for risk analysis and unknowns; add placeholders for acceptance criteria in comments.
- Identify dependencies between tasks and annotate nodes with a comment field listing upstream ids.

### Sprint planning

- From the backlog, select items for Sprint <N> based on high priority and size. Create a “Sprint <N>” parent node and move selected tasks under it. Return JSON ready to import.
- Estimate capacity: count tasks by status and priority, then propose a realistic Sprint <N> scope. Update chosen nodes’ priority if needed and return diffs only.
- Generate a standup checklist as child nodes under Sprint <N> (Yesterday, Today, Blockers). Include a CLI snippet to list in-progress tasks.

### Implementation flow

- Fetch the top 10 pending tasks for project <projectId> ordered by priority then title. Return a compact table (id, title, priority).
- For task <nodeId>, set status to in-progress and add two progress notes: “Started implementation” and “Added tests”. Then show the node details.
- Create a new implementation task under parent <parentNodeId> with fields: id, title, priority, status=pending, and a cliCommand placeholder to run tests.
- After code is merged (outside this app), update <nodeId> to completed and add a progress message linking the PR.

### Testing and QA

- Generate a test plan for <feature> with unit, integration, and E2E sections. Create nodes for each test area under epic <epicNodeId> with status pending.
- From current tasks, list all nodes with code blocks and validate they have a language set; for missing ones, propose a code.language value.
- Create a “Quality Gates” node with children: Lint, Typecheck, Unit tests, Coverage, and add pass/fail toggles via status.

### DevOps and deployments

- Create a deployment checklist node with children: Build, Package, Secrets, Migrations, Deploy, Smoke Test, Rollback plan. Set default status=pending.
- Propose an environment matrix (dev, staging, prod) and create nodes with per-env differences documented in comment fields.
- Add a “Release <version>” node with children for release notes, change summary, and verification steps.

### Security and compliance

- Run a threat-modeling session for <feature> and create nodes for STRIDE categories with specific risks as children; set priority=high for critical items.
- Add a “Dependency Audit” node with a taskPromptForLlm that asks to scan lockfiles and list vulnerable packages.
- Create policy reminder nodes: data retention, PII handling, access control reviews, and set review cadence in comment fields.

### Documentation suite

- Create a Documentation root with children: README plan, API docs (OpenAPI), ADRs, Onboarding, and Runbooks. Seed each with a comment template.
- Generate an ADR node format and create one ADR for “Adopt JSON modular imports for project planning.”
- Produce a “Contributing” node with checklist items: Setup, Branching model, Commit conventions, PR checklist, Code owners.

### Observability and SRE

- Add an Observability root with children: Logging, Metrics, Traces, Dashboards, Alerts. Propose key metrics and thresholds in comments.
- Create a “Health Checks” node with child nodes per endpoint and expected responses.
- Add “Incident Response” nodes: Severity levels, Runbook links, Pager rotation, Postmortem template.

### Maintenance and lifecycle

- Create recurring maintenance tasks: dependency updates, database vacuum, security scans, and backup restores drills. Add a cadence in comments.
- Add a “Backlog Grooming” node that lists criteria for re-prioritizing and archiving old tasks.
- Propose a deprecation plan for legacy components as nodes with timelines.

### Reporting and dashboards

- Generate a weekly status report by summarizing: totals by status, new tasks created, tasks completed, and top risks. Return Markdown only.
- Build a “Project Dashboard” node with children: Burn-down, Work in Progress, Lead time, Cycle time. Add taskPromptForLlm asking to compute metrics from CLI output.
- Create a “Stakeholder Update” node with a script-like comment that fetches stats via CLI and formats an email.

### Automation recipes (Copilot driving the CLI)

- Treat me as a CLI runner for “mindmap”. Propose the exact sequence to: create collection <collectionId>, create project <projectName>, import <path>, then list projects and return the new id.
- Given this console output from “mindmap import-json”, extract project_id, then generate the command to get full project details with nodes.
- For each pending task in project <projectId>, update status to in-progress, add a progress note “Work started by AI”, and list the node to confirm.
- When I paste JSON for a new task, generate the command to create it via create-node-json and return the created node id.

### JSON modular authoring

- Generate a modular plan with one root (Architecture) and three imports (frontend.json, backend.json, devops.json). Return all 4 JSON files under 25 lines each with stable ids.
- Expand imports for <path> and return only titles and ids as a tree. If a cycle is detected, identify the files in the cycle and suggest a safe break.
- Convert a flat list of tasks into grouped nodes by domain (UI, API, DevOps) with priority defaults and ids.

### UI-driven reviews

- After importing, tell me what to verify visually in the UI: presence in collection <collectionId>, single-root layout, correct child count, and priority styling.
- Propose a visual encoding tweak for priorities (low/medium/high) that’s subtle but distinct. Provide minimal CSS hints.

### Hotfix flow

- Create a “Hotfix <id>” node with children: Triage, Repro, Fix, Test, Deploy, Postmortem. Mark all as pending; add a taskPromptForLlm asking for risk and blast radius.
- After the fix lands (outside), update statuses to completed and add a progress message linking commit <sha>.

### Handy one‑liners (fill‑in)

- Bootstrap a project named <projectName> in collection <collectionId> and print its id. Then fetch its details in JSON.
- Import <path> into collection <collectionId>, then list the top 5 high-priority tasks (id, title). Return as JSON only.
- Update node <nodeId> to status <status> and add a progress entry <message>. Then show the node details.
- Create a child under <parentNodeId> titled <title> with priority <p>. Return the created node id.

---
