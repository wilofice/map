# Changelog

All notable changes to the Modular Mind Map project will be documented in this file.

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
