## Copilot Workflow Prompts — Solo Developer Kit

This kit gives you ready-to-paste prompts to run your whole software project with your Copilot AI while managing the plan and progress in the Mind Map UI using the `mindmap` CLI.

Use placeholders: <collectionId> <projectName> <projectId> <nodeId> <parentNodeId> <status> <path> <module>.

— Tip: Keep prompts short and focused. Have your AI return JSON nodes or files you can import, then use the CLI commands provided.

---

## Master 3‑Part Prompt Template (paste and fill)

1) Task definition
- You are my AI co‑pilot. Task: <short task statement, e.g., “Design and implement the <module> module for <projectName> (podcast app)”>.
- Goals: <key goals and constraints>.
- Deliverables: working code in my app repo (outside the mind map), plus a corresponding plan and status updates in the Mind Map.

2) Before implementation — generate the report for my dashboard
- Produce a concise plan as JSON nodes following our guide: id, title, priority, status=pending, comment, children[]. Return either a {"nodes": [...]} or a single-root {"nodes": [{...}]}. Include stable kebab‑case ids.
- If large, split into modular JSON files and reference them via import directives {"type":"import","src":"..."} relative to <path>.
- After returning the JSON, provide CLI commands I can run to import and view it in my dashboard:
  ```zsh
  # Create collection and project (if needed)
  node mindmap-cli.js create-collection "<collectionId>" --description="Project collection"
  node mindmap-cli.js create-project "<projectName>" --collection-id=<collectionId> --description="Planning <module>"

  # Import plan (single or modular root)
  node mindmap-cli.js import-json <path> --collection-id=<collectionId>

  # Inspect
  node mindmap-cli.js projects
  node mindmap-cli.js get-project <projectId> --show-nodes
  ```

3) After implementation — execute subtasks and update project_plan in the Mind Map
- Implement the plan’s subtasks in my app repo. For each subtask done or moved, update the node in the Mind Map using the CLI and report progress:
  ```zsh
  # Start work
  node mindmap-cli.js update-status <nodeId> in-progress
  node mindmap-cli.js add-progress <nodeId> "Started: context + branch name"

  # Complete a subtask
  node mindmap-cli.js update-status <nodeId> completed
  node mindmap-cli.js add-progress <nodeId> "Done: link to PR/commit, notes"

  # Add a new follow-up task
  node mindmap-cli.js create-node-json --file=./new-task.json --project-id=<projectId>

  # Review queue
  node mindmap-cli.js filter-tasks --project-id=<projectId> --status=pending --limit=20
  node mindmap-cli.js highest-priority-task <projectId>
  ```

---

## Ready‑to‑Use Prompts for a Podcast App

Below are 3‑part prompts you can paste directly. Each includes concrete CLI examples.

### 1) Backend API (users, shows, episodes)

1) Task definition
- Design and implement the Backend API for <projectName> (podcast app): auth (email/OAuth), creator profiles, shows, episodes, media URLs, and basic RBAC. Non‑goals: advanced analytics.

2) Before implementation — generate the report
- Return a single‑root JSON with children: Auth, Users, Shows, Episodes, RBAC, Rate limiting, Error handling. Each child has tasks with id, title, priority, status=pending.
- Include CLI to import and view:
  ```zsh
  node mindmap-cli.js create-collection "podcast-suite" --description="Podcast projects"
  node mindmap-cli.js create-project "<projectName>" --collection-id=podcast-suite --description="Backend API planning"
  node mindmap-cli.js import-json ./plans/backend_api.json --collection-id=podcast-suite
  node mindmap-cli.js get-project <projectId> --show-nodes
  ```

3) After implementation — execute subtasks and update
  ```zsh
  # Start Auth login flow
  node mindmap-cli.js update-status <authLoginNodeId> in-progress
  node mindmap-cli.js add-progress <authLoginNodeId> "Scaffolded endpoints; drafted request/response"

  # Complete Users creation
  node mindmap-cli.js update-status <usersCreateNodeId> completed
  node mindmap-cli.js add-progress <usersCreateNodeId> "Merged PR #42; added tests"

  # Add follow-up: refresh tokens
  echo '{"id":"auth-refresh-token","title":"Implement refresh tokens","priority":"high","status":"pending","children":[]}' > ./new-task.json
  node mindmap-cli.js create-node-json --file=./new-task.json --project-id=<projectId>
  ```

### 2) Audio ingestion and processing pipeline

1) Task definition
- Build an ingestion pipeline: upload audio, validate format/bitrate, store to S3/<storage>, enqueue processing, generate waveform preview.

2) Before implementation — generate the report
- Return modular JSON: `pipeline_root.json` imports `components/upload.json`, `components/processing.json`, `components/storage.json`.
- CLI:
  ```zsh
  node mindmap-cli.js import-json ./plans/pipeline_root.json --collection-id=podcast-suite
  node mindmap-cli.js get-project <projectId> --show-nodes
  ```

3) After implementation — update
  ```zsh
  node mindmap-cli.js update-status <uploadValidateNodeId> in-progress
  node mindmap-cli.js add-progress <uploadValidateNodeId> "Validated file types; max size 200MB"
  node mindmap-cli.js update-status <enqueueProcNodeId> completed
  node mindmap-cli.js add-progress <enqueueProcNodeId> "Queue job id=abc123"
  ```

### 3) Transcription + Search indexing

1) Task definition
- Integrate speech‑to‑text (provider TBD), store transcripts, index by episode for keyword search, expose search API.

2) Before implementation — generate the report
- Single root with: Provider selection (spike), Transcribe job, Storage, Indexing, Search API.
- CLI:
  ```zsh
  node mindmap-cli.js import-json ./plans/transcription.json --collection-id=podcast-suite
  node mindmap-cli.js filter-tasks --project-id=<projectId> --status=pending --limit=10
  ```

3) After implementation — update
  ```zsh
  node mindmap-cli.js update-status <transcribeJobNodeId> in-progress
  node mindmap-cli.js add-progress <transcribeJobNodeId> "Batch transcripts v1 complete"
  node mindmap-cli.js update-status <searchApiNodeId> completed
  ```

### 4) Web frontend (creator portal)

1) Task definition
- Build a React/Next.js creator portal: dashboard, episode manager, upload flow, simple analytics.

2) Before implementation — generate the report
- Return nodes for: Dashboard, Episodes screen, Upload UI, Auth pages, Design system.
- CLI:
  ```zsh
  node mindmap-cli.js import-json ./plans/creator_portal.json --collection-id=podcast-suite
  node mindmap-cli.js get-project <projectId> --show-nodes
  ```

3) After implementation — update
  ```zsh
  node mindmap-cli.js update-status <uploadUiNodeId> in-progress
  node mindmap-cli.js add-progress <uploadUiNodeId> "Dropzone + progress bar implemented"
  node mindmap-cli.js update-status <dashboardNodeId> completed
  ```

### 5) Mobile app (listener)

1) Task definition
- Build a mobile app (React Native/Flutter) with browse, search, playback, and subscriptions.

2) Before implementation — generate the report
- Nodes: Home feed, Player, Subscriptions, Search, Offline downloads.
- CLI:
  ```zsh
  node mindmap-cli.js import-json ./plans/mobile_app.json --collection-id=podcast-suite
  node mindmap-cli.js filter-tasks --project-id=<projectId> --priority=high --limit=10
  ```

3) After implementation — update
  ```zsh
  node mindmap-cli.js update-status <playerNodeId> in-progress
  node mindmap-cli.js add-progress <playerNodeId> "Native modules ok; background audio configured"
  node mindmap-cli.js update-status <offlineDownloadsNodeId> completed
  ```

### 6) Billing & subscriptions

1) Task definition
- Add paid tiers, subscription management, and entitlement checks.

2) Before implementation — generate the report
- Nodes: Plan models, Checkout, Webhooks, Entitlement middleware, Dunning.
- CLI:
  ```zsh
  node mindmap-cli.js import-json ./plans/billing.json --collection-id=podcast-suite
  node mindmap-cli.js get-project <projectId> --show-nodes
  ```

3) After implementation — update
  ```zsh
  node mindmap-cli.js update-status <webhooksNodeId> in-progress
  node mindmap-cli.js add-progress <webhooksNodeId> "Webhook retries + signature verification"
  node mindmap-cli.js update-status <entitlementNodeId> completed
  ```

### 7) DevOps CI/CD & deployments

1) Task definition
- Set up CI, staging/prod environments, automated deploys, database migrations, rollback.

2) Before implementation — generate the report
- Nodes: CI pipeline, Build, Secrets, Migrations, Deploy, Smoke tests, Rollback plan.
- CLI:
  ```zsh
  node mindmap-cli.js import-json ./plans/devops.json --collection-id=podcast-suite
  node mindmap-cli.js filter-tasks --project-id=<projectId> --status=pending --limit=20
  ```

3) After implementation — update
  ```zsh
  node mindmap-cli.js update-status <deployNodeId> in-progress
  node mindmap-cli.js add-progress <deployNodeId> "Blue/green ready; smoke tests passing"
  node mindmap-cli.js update-status <rollbackPlanNodeId> completed
  ```

### 8) Security & privacy

1) Task definition
- Hardening, dependency audit, PII handling, and access controls.

2) Before implementation — generate the report
- Nodes: Threat model, Dependency audit, PII data map, Access controls, Secrets rotation policy.
- CLI:
  ```zsh
  node mindmap-cli.js import-json ./plans/security.json --collection-id=podcast-suite
  node mindmap-cli.js highest-priority-task <projectId>
  ```

3) After implementation — update
  ```zsh
  node mindmap-cli.js update-status <threatModelNodeId> in-progress
  node mindmap-cli.js add-progress <threatModelNodeId> "STRIDE risks logged; mitigations planned"
  node mindmap-cli.js update-status <dependencyAuditNodeId> completed
  ```

---

## Extras: Handy one‑liners

```zsh
# Bootstrap (collection + project)
node mindmap-cli.js create-collection "<collectionId>" --description="Solo dev projects"
node mindmap-cli.js create-project "<projectName>" --collection-id=<collectionId> --description="Initial plan"

# Import plan and inspect
node mindmap-cli.js import-json <path> --collection-id=<collectionId>
node mindmap-cli.js get-project <projectId> --show-nodes

# Work loop
node mindmap-cli.js filter-tasks --project-id=<projectId> --status=pending --limit=10
node mindmap-cli.js update-status <nodeId> in-progress && node mindmap-cli.js add-progress <nodeId> "Started"
node mindmap-cli.js update-status <nodeId> completed && node mindmap-cli.js add-progress <nodeId> "Merged PR"
```
