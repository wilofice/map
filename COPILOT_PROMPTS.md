## Copilot Prompt Library — Mind Map Project

Use these ready-to-paste prompts with your AI assistant while working on this project. Replace placeholders like <path>, <id>, <collectionId>, <nodeId>, and <status> before sending.

— Tip: Keep prompts short and specific. Paste only what you need for the current task.

## Repo orientation

- Read the repo and list the key entry points, servers, scripts, and config files. Summarize what each does and how they connect.
- Locate all REST endpoints (server.js and any route files). Produce a concise table: method, path, brief purpose, and main handler function.
- Identify where the database is initialized and accessed (SQLite). Summarize tables, relations, and key CRUD functions.
- Show all places that read or write JSON project files, and describe how shape validation works.
- Find references to XML vs JSON handling and explain where conversion and validation happen.

## JSON project files and modular imports

- Given this JSON file at <path>, validate it against our JSON guide (PROJECT_FILE_GUIDE_JSON.md). List issues and the exact line/field to fix. Suggest minimal fixes.
- Expand JSON-native imports in <path> and print only the final normalized shape {"type":"project_plan","nodes":[...]}, showing titles and ids only (no comments/code).
- Detect and report circular imports across this set of files: <paths or folder>. Explain where the cycle starts and the safe file to break the cycle.
- Convert this node list into a single-root project JSON skeleton that follows our guide and best practices (id, title, status, priority, children).
- Infer missing ids in this JSON and propose stable ids (kebab-case) based on titles. Show a diff-style preview.
- Take this JSON node and add a code block (language and content) plus a taskPromptForLlm that asks for optimization hints.

## CLI helpers (mindmap-cli.js)

- Generate the exact CLI command(s) to import <path> into collection <collectionId> using JSON-native imports. Include follow-up commands to list collections and projects to verify.
- I ran this CLI command and got the following output. Extract the created project id, and then generate the command to show project details with nodes.
- Draft a one-liner to update node <nodeId> to status <status> and then show its progress history.
- Produce a short bash script to import a modular JSON, assign it to default-collection, list projects, and then fetch the highest-priority task in the new project.
- From this project details JSON output, list the top 5 pending tasks by priority then title. Return as a compact table.

## API checks and debugging

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

## Refactoring and reliability

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
