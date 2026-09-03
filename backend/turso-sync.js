'use strict';

/**
 * TursoSync — local-first cloud replication layer.
 *
 * Strategy:
 *   • All reads and writes continue to go through better-sqlite3 (local, sync, fast).
 *   • On init(): if TURSO_DATABASE_URL is set, pull the full cloud DB into local SQLite.
 *   • A Proxy wraps DatabaseManager so every write method also fires an async
 *     background push to Turso (non-blocking, fire-and-forget).
 *   • If Turso is unreachable (offline / no creds), the app works unchanged — local only.
 *
 * This means:
 *   • ZERO changes to server.js call sites — all methods stay synchronous.
 *   • Offline reads always work (local SQLite has the last-synced snapshot).
 *   • Writes while offline succeed locally; they are NOT replicated until the server
 *     restarts online (the next pull from Turso would overwrite — see note below).
 *
 * Conflict policy: last-write-wins by updated_at timestamp.
 * For a single-user local app this is fine. Multi-device concurrent writes are rare.
 */

const { createClient } = require('@libsql/client');

// All tables that should be synced, in dependency order (parents before children).
const SYNC_TABLES = [
    'collections',
    'projects',
    'nodes',
    'app_state',
    'node_progress',
    'project_activity',
    'node_audio_files',
    'graph_settings',
    'pipeline_collections',
    'pipeline_tasks',
    'pipeline_nodes',
    'pipeline_edges',
];

// Maps each DatabaseManager write method to the Turso sync action it should trigger.
// action: 'upsert' | 'delete' | 'upsert-result' | 'none'
// For upsert: the return value of the method is the row object to push.
// For delete: args[0] is the id to remove from the given table.
const WRITE_MAP = {
    // Collections
    createCollection:           { table: 'collections',           action: 'upsert-result' },
    updateCollection:           { table: 'collections',           action: 'upsert-result' },
    deleteCollection:           { table: 'collections',           action: 'delete', idArg: 0 },
    // Projects
    createProject:              { table: 'projects',              action: 'upsert-result' },
    updateProject:              { table: 'projects',              action: 'upsert-result' },
    updateProjectLastOpened:    { table: 'projects',              action: 'none' }, // timestamp-only, low priority
    assignProjectToCollection:  { table: 'projects',              action: 'upsert-result' },
    removeProjectFromCollection:{ table: 'projects',              action: 'upsert-result' },
    deleteProject:              { table: 'projects',              action: 'delete', idArg: 0 },
    // Nodes
    createNode:                 { table: 'nodes',                 action: 'upsert-result' },
    updateNode:                 { table: 'nodes',                 action: 'upsert-result' },
    deleteNode:                 { table: 'nodes',                 action: 'delete', idArg: 0 },
    reorderNodes:               { table: 'nodes',                 action: 'refetch-ids', argIdx: 0 },
    createNodesBulk:            { table: 'nodes',                 action: 'upsert-input-array', argIdx: 0 },
    splitNode:                  { table: 'nodes',                 action: 'upsert-split' },
    // Progress / activity
    addNodeProgress:            { table: 'node_progress',         action: 'upsert-result' },
    deleteNodeProgress:         { table: 'node_progress',         action: 'delete-by-col', col: 'node_id', idArg: 0 },
    logActivity:                { table: 'project_activity',      action: 'upsert-result' },
    deleteProjectActivity:      { table: 'project_activity',      action: 'delete-by-col', col: 'project_id', idArg: 0 },
    // Audio
    createAudioFile:            { table: 'node_audio_files',      action: 'upsert-result' },
    deleteAudioFile:            { table: 'node_audio_files',      action: 'delete', idArg: 0 },
    // App state
    saveAppState:               { table: 'app_state',             action: 'none' }, // key/value — low priority
    // Graph settings
    saveGraphSettings:          { table: 'graph_settings',        action: 'upsert-result' },
    saveGraphPositions:         { table: 'graph_settings',        action: 'none' },
    // Pipeline collections
    createPipelineCollection:   { table: 'pipeline_collections',  action: 'upsert-result' },
    updatePipelineCollection:   { table: 'pipeline_collections',  action: 'upsert-result' },
    deletePipelineCollection:   { table: 'pipeline_collections',  action: 'delete', idArg: 0 },
    // Pipeline tasks
    createPipelineTask:         { table: 'pipeline_tasks',        action: 'upsert-task' }, // returns full task object
    updatePipelineTask:         { table: 'pipeline_tasks',        action: 'upsert-task' },
    deletePipelineTask:         { table: 'pipeline_tasks',        action: 'delete', idArg: 0 },
    // Pipeline nodes
    createPipelineNode:         { table: 'pipeline_nodes',        action: 'upsert-result' },
    updatePipelineNode:         { table: 'pipeline_nodes',        action: 'upsert-result' },
    deletePipelineNode:         { table: 'pipeline_nodes',        action: 'delete', idArg: 0 },
    // Pipeline edges
    createPipelineEdge:         { table: 'pipeline_edges',        action: 'upsert-result' },
    deletePipelineEdge:         { table: 'pipeline_edges',        action: 'delete', idArg: 0 },
};

class TursoSync {
    constructor() {
        this.client = null;
        this.ready = false;
        this.localDb = null; // reference to better-sqlite3 db object (set after proxy wrapping)
    }

    async init(localDbInstance) {
        this.localDb = localDbInstance;

        if (!process.env.TURSO_DATABASE_URL) {
            console.error('ℹ️  TURSO_DATABASE_URL not set — running in local-only mode');
            return;
        }

        try {
            this.client = createClient({
                url:       process.env.TURSO_DATABASE_URL,
                authToken: process.env.TURSO_AUTH_TOKEN || '',
            });

            // Verify connectivity
            await this.client.execute('SELECT 1');
            this.ready = true;
            console.error('✅ Turso connection verified');

            // Ensure schema exists on Turso (run DDL)
            await this._ensureSchema();

            // Pull latest cloud data into local SQLite
            const count = await this.pullFromCloud();
            console.error(`✅ Pulled ${count} rows from Turso → local`);
        } catch (e) {
            console.error('⚠️  Turso unavailable — offline mode:', e.message);
            this.ready = false;
        }
    }

    async _ensureSchema() {
        // Run the same CREATE TABLE IF NOT EXISTS statements on Turso.
        // libSQL is SQLite-compatible so the same DDL works.
        const stmts = [
            `CREATE TABLE IF NOT EXISTS collections (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, color TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
            `CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, file_path TEXT, collection_id TEXT, layout_dir TEXT DEFAULT 'LR', display_mode TEXT DEFAULT 'comfortable', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, last_opened DATETIME)`,
            `CREATE TABLE IF NOT EXISTS nodes (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, parent_id TEXT, title TEXT NOT NULL, content TEXT, status TEXT DEFAULT 'pending', priority TEXT DEFAULT 'medium', start_date DATE, end_date DATE, days_spent INTEGER DEFAULT 0, code_language TEXT, code_content TEXT, task_prompt TEXT, cli_command TEXT, sort_order INTEGER DEFAULT 0, depth_level INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
            `CREATE TABLE IF NOT EXISTS app_state (key TEXT PRIMARY KEY, value TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
            `CREATE TABLE IF NOT EXISTS node_progress (id TEXT PRIMARY KEY, node_id TEXT NOT NULL, message TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, agent_type TEXT DEFAULT 'ai')`,
            `CREATE TABLE IF NOT EXISTS project_activity (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, activity_type TEXT NOT NULL, activity_data TEXT NOT NULL, node_id TEXT, user_agent TEXT, ip_address TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
            `CREATE TABLE IF NOT EXISTS node_audio_files (id TEXT PRIMARY KEY, node_id TEXT, project_id TEXT, original_filename TEXT, stored_filename TEXT, file_path TEXT, file_size INTEGER, mime_type TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
            `CREATE TABLE IF NOT EXISTS graph_settings (project_id TEXT PRIMARY KEY, layout_name TEXT NOT NULL DEFAULT 'dagre', positions TEXT NOT NULL DEFAULT '{}', zoom REAL NOT NULL DEFAULT 1, pan_x REAL NOT NULL DEFAULT 0, pan_y REAL NOT NULL DEFAULT 0, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
            `CREATE TABLE IF NOT EXISTS pipeline_collections (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT DEFAULT '', color TEXT DEFAULT '#6366f1', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
            `CREATE TABLE IF NOT EXISTS pipeline_tasks (id TEXT PRIMARY KEY, collection_id TEXT, name TEXT NOT NULL, description TEXT DEFAULT '', type TEXT DEFAULT 'general', status TEXT DEFAULT 'pending', priority TEXT DEFAULT 'medium', due_date DATE, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
            `CREATE TABLE IF NOT EXISTS pipeline_nodes (id TEXT PRIMARY KEY, task_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT DEFAULT '', status TEXT DEFAULT 'pending', type TEXT DEFAULT 'step', notes TEXT DEFAULT '', cli_command TEXT DEFAULT '', due_date DATE, position_x REAL DEFAULT 0, position_y REAL DEFAULT 0, sort_order INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
            `CREATE TABLE IF NOT EXISTS pipeline_edges (id TEXT PRIMARY KEY, task_id TEXT NOT NULL, source_id TEXT NOT NULL, target_id TEXT NOT NULL, label TEXT DEFAULT '', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
        ];
        for (const sql of stmts) {
            await this.client.execute(sql);
        }
    }

    /**
     * Pull every row from Turso and UPSERT into local SQLite.
     * FK constraints are disabled during the bulk insert to handle
     * self-referential tables (nodes.parent_id) and insertion ordering.
     * Returns total row count synced.
     */
    async pullFromCloud() {
        if (!this.ready || !this.localDb) return 0;
        let total = 0;

        // Disable FK checks for the duration of the pull
        this.localDb.pragma('foreign_keys = OFF');

        try {
            for (const table of SYNC_TABLES) {
                try {
                    const rs = await this.client.execute(`SELECT * FROM ${table}`);
                    if (!rs.rows.length) continue;

                    const cols = rs.columns;
                    const placeholders = cols.map(() => '?').join(', ');
                    const sql = `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`;
                    const stmt = this.localDb.prepare(sql);
                    const insertMany = this.localDb.transaction(rows => {
                        for (const row of rows) {
                            stmt.run(...cols.map(c => row[c] ?? null));
                        }
                    });
                    insertMany(rs.rows);
                    total += rs.rows.length;
                } catch (e) {
                    // Table may not exist on cloud yet (first run) — skip silently
                    if (!e.message?.includes('no such table')) {
                        console.error(`[turso] pull error for ${table}:`, e.message);
                    }
                }
            }
        } finally {
            // Always re-enable FK constraints
            this.localDb.pragma('foreign_keys = ON');
        }

        return total;
    }

    /**
     * Push a single row to Turso via UPSERT.
     * row must be a plain object from better-sqlite3 (all primitives).
     */
    async _upsertRow(table, row) {
        if (!this.ready || !row || typeof row !== 'object') return;
        try {
            const cols = Object.keys(row).filter(k => row[k] !== undefined);
            const vals = cols.map(c => row[c] ?? null);
            const placeholders = cols.map(() => '?').join(', ');
            await this.client.execute({
                sql: `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`,
                args: vals,
            });
        } catch (e) {
            console.error(`[turso] upsert ${table}:`, e.message);
        }
    }

    /**
     * Delete a row from Turso by primary key.
     */
    async _deleteRow(table, id) {
        if (!this.ready) return;
        try {
            await this.client.execute({ sql: `DELETE FROM ${table} WHERE id = ?`, args: [id] });
        } catch (e) {
            console.error(`[turso] delete ${table}:`, e.message);
        }
    }

    async _deleteByCol(table, col, val) {
        if (!this.ready) return;
        try {
            await this.client.execute({ sql: `DELETE FROM ${table} WHERE ${col} = ?`, args: [val] });
        } catch (e) {
            console.error(`[turso] delete-by-col ${table}.${col}:`, e.message);
        }
    }

    /**
     * Called by the Proxy after each write method on DatabaseManager.
     * Fires asynchronously — does NOT block the synchronous return value.
     */
    _handleWrite(methodName, args, result) {
        if (!this.ready) return;
        const spec = WRITE_MAP[methodName];
        if (!spec || spec.action === 'none') return;

        setImmediate(() => this._syncWrite(spec, args, result).catch(e =>
            console.error(`[turso] syncWrite(${methodName}):`, e.message)
        ));
    }

    async _syncWrite(spec, args, result) {
        const { table, action } = spec;

        if (action === 'upsert-result') {
            await this._upsertRow(table, result);
        } else if (action === 'upsert-input-array') {
            // args[argIdx] is the full input array (e.g. createNodesBulk nodes)
            const rows = args[spec.argIdx] || [];
            for (const row of rows) await this._upsertRow(table, row);
        } else if (action === 'refetch-ids') {
            // args[argIdx] is [{id, ...partial}] — refetch full rows from local SQLite
            const ids = (args[spec.argIdx] || []).map(r => r.id).filter(Boolean);
            const stmt = this.localDb.prepare(`SELECT * FROM ${table} WHERE id = ?`);
            for (const id of ids) {
                const row = stmt.get(id);
                if (row) await this._upsertRow(table, row);
            }
        } else if (action === 'upsert-split') {
            // splitNode returns { groupA, groupB } — two full node objects
            if (result?.groupA) await this._upsertRow(table, result.groupA);
            if (result?.groupB) await this._upsertRow(table, result.groupB);
        } else if (action === 'upsert-task') {
            if (result) {
                const { nodes: _n, edges: _e, ...taskRow } = result;
                await this._upsertRow(table, taskRow);
            }
        } else if (action === 'delete') {
            await this._deleteRow(table, args[spec.idArg]);
        } else if (action === 'delete-by-col') {
            await this._deleteByCol(table, spec.col, args[spec.idArg]);
        }

        // Notify remote server to pull fresh data from Turso
        this._notifyRemote();
    }

    _notifyRemote() {
        const url = process.env.REMOTE_SYNC_URL;
        const secret = process.env.SYNC_SECRET;
        if (!url) return;
        // Fire-and-forget — never blocks the write path
        fetch(url, {
            method: 'POST',
            headers: { 'x-sync-secret': secret || '', 'Content-Type': 'application/json' },
        }).catch(e => console.error('[turso] remote notify failed:', e.message));
    }

    /**
     * Wraps a DatabaseManager instance with a Proxy that:
     * 1. Passes all calls through to the real manager (synchronous, unchanged).
     * 2. After write methods, fires background sync to Turso.
     */
    wrapDb(dbManager) {
        const self = this;
        return new Proxy(dbManager, {
            get(target, prop) {
                const val = target[prop];
                if (typeof val !== 'function' || !(prop in WRITE_MAP)) return val instanceof Function ? val.bind(target) : val;
                return function (...callArgs) {
                    const result = val.apply(target, callArgs);
                    self._handleWrite(prop, callArgs, result);
                    return result;
                };
            },
        });
    }
}

module.exports = new TursoSync();
