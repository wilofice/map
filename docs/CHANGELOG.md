# Changelog

All notable changes to the Modular Mind Map project will be documented in this file.

## [Unreleased] - September 2026

### Features
*   **Diagram Studio (`/diagrams`)**: 3rd pillar of MAP — a Mermaid editor with live SVG preview, pan/zoom canvas, auto-save (1.5 s debounce), SVG/PNG export, and 7 diagram types (flowchart, sequence, stateDiagram, classDiagram, erDiagram, gantt, mindmap) with starter templates. Code editor is hidden by default and toggled with `› Code` in the topbar.
*   **Diagrams database & API**: New `diagrams` table in SQLite (idempotent migration), Turso-synced, and 5 REST endpoints (`GET/POST /api/diagrams`, `GET/PUT/DELETE /api/diagrams/:id`).
*   **4 MCP diagram tools**: `list_diagrams`, `get_diagram`, `create_diagram`, `update_diagram` — AI agents can now read and generate Mermaid diagrams autonomously without touching the UI.
*   **Pipeline visual indicators**: Blocking nodes shown with orange border + glow (no dashes). In-progress nodes pulse with animated border. Status chip at bottom of canvas shows "N en cours · M bloquants".
*   **Pipeline list view**: Task list replaced card grid with a horizontal row layout (`TaskRow`) so titles are never truncated.
*   **Dot-grid canvas**: Pipeline and Mind Map canvases both use a pure dot-grid background (28 px grid, no connected lines or squares). `backgroundSize` bug fixed (`auto, 28px 28px` → `28px 28px`).
*   **Transparent pipeline nodes**: Node backgrounds removed (`background-opacity: 0`); status conveyed by border colour and glow only. Label has a semi-transparent backdrop for readability.
*   **Canvas navigation — arrow keys**: Arrow keys pan the Cytoscape pipeline canvas (60 px / step, 180 px with Shift).
*   **Node label tooltip**: Hovering a pipeline node shows the full untruncated label in a floating HTML tooltip.

### Bug Fixes
*   Removed unused `BG_VARIANT_MAP` from `MindMapFlow.tsx` (TypeScript `TS6133` error on build).

### Infrastructure
*   `mermaid` npm package added to the frontend (lazy-chunked by Vite — zero impact on initial load of other views).

## [Unreleased] - July 2026

### Features
*   **MCP Server Integration (`mcp.mjs`)**: Added a stdio-based Model Context Protocol server. This allows AI clients (like Claude Desktop and Cursor) to securely interface with the mind map database. Supports direct reading of project context, and tools for node CRUD, bulk addition, and logging AI progress notes without writing raw JSON in chats. (See `docs/MCP.md`).
*   **Node Splitting**: Added a new utility to the Detail Panel allowing users to split large nodes (≥ 4 children). This cleanly redistributes all existing children evenly between two newly inserted group nodes via a safe, atomic SQLite transaction that recursively patches layout depths.
*   **Sequential Animation Auto-Play**: The "Sequential" animation entrance mode now features an optional auto-advance toggle with a configurable delay slider (200ms - 3000ms), eliminating the need to manually press `N` continuously. Settings are persisted to `localStorage`.
*   **Mini Map**: Introduced a scalable Mini Map component overlay to the bottom corner of the viewport for easier navigation of large project trees.

### Bug Fixes
*   **Focus Mode Animations**: Fixed an issue where nodes failed to trigger branch entrance animations (both Cascade and Sequential) upon entering Focus Mode. The `staggerIndex` is now reliably assigned to newly visible subtree components.
*   **Focus Mode Subtree Collapse**: Fixed an issue where the layout engine erroneously bypassed the `expandedIds` filter during Focus Mode, causing collapsed descendant nodes to stubbornly re-render. Focus Mode now strictly honors user collapses within the focused tree.
*   **Focus Mode HMR Synchronization**: Patched a desync issue where Hot-Module Reloading in development (or external state mutations) caused the "Exit Focus Mode" interface to vanish.

### Infrastructure & Refactoring
*   Added `@modelcontextprotocol/sdk` and `zod` as foundational dependencies for the local MCP layer.
*   Upgraded `db-manager.js` to correctly propagate `depth_level` updates recursively to all sub-children when modifying parent-child topology (e.g., during node splitting).
