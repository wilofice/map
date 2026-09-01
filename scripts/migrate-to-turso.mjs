#!/usr/bin/env node
/**
 * migrate-to-turso.mjs
 *
 * One-time migration: copies ALL data from the local SQLite database to Turso.
 *
 * Usage:
 *   TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... node scripts/migrate-to-turso.mjs
 *
 * Or with a .env file:
 *   node -r dotenv/config scripts/migrate-to-turso.mjs
 *
 * Prerequisites:
 *   1. Create a Turso account:  https://turso.tech  (free)
 *   2. Install Turso CLI:       brew install tursodatabase/tap/turso
 *   3. Login:                   turso auth login
 *   4. Create database:         turso db create map
 *   5. Get URL:                 turso db show map --url
 *   6. Create token:            turso db tokens create map
 *   7. Add to .env:
 *        TURSO_DATABASE_URL=libsql://map-<your-org>.turso.io
 *        TURSO_AUTH_TOKEN=<token>
 *   8. Run this script:         node scripts/migrate-to-turso.mjs
 */

import { createClient } from '@libsql/client';
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// Load .env if present
try {
    const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env');
    const env = readFileSync(envPath, 'utf8');
    for (const line of env.split('\n')) {
        const m = line.match(/^([^#=]+)=(.*)$/);
        if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
} catch { /* no .env — rely on environment */ }

const TURSO_URL   = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || '';
const DB_PATH     = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'mind_maps.db');

if (!TURSO_URL) {
    console.error('❌ TURSO_DATABASE_URL is not set.');
    console.error('   Set it in .env or as an environment variable.');
    process.exit(1);
}

// Tables in dependency order (parents before children for FK constraints)
const TABLES = [
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

const DDL = [
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

async function migrate() {
    console.log('🔗 Connecting to Turso:', TURSO_URL);
    const turso = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

    // Verify connection
    await turso.execute('SELECT 1');
    console.log('✅ Turso connected\n');

    // Create schema on Turso
    console.log('📐 Creating schema on Turso...');
    for (const sql of DDL) {
        await turso.execute(sql);
    }
    console.log('✅ Schema ready\n');

    // Open local SQLite
    const local = new Database(DB_PATH, { readonly: true });
    console.log(`📂 Local database: ${DB_PATH}\n`);

    let grandTotal = 0;

    for (const table of TABLES) {
        // Check if table exists locally
        const exists = local.prepare(
            `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
        ).get(table);

        if (!exists) {
            console.log(`  ⏭  ${table} — not in local DB, skipping`);
            continue;
        }

        // Read all rows from local
        const rows = local.prepare(`SELECT * FROM ${table}`).all();
        if (!rows.length) {
            console.log(`  ○  ${table} — 0 rows`);
            continue;
        }

        // Determine columns from first row
        const cols = Object.keys(rows[0]);
        const placeholders = cols.map(() => '?').join(', ');
        const insertSql = `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`;

        // Batch insert in chunks of 100 (Turso has per-batch limits)
        const CHUNK = 100;
        let pushed = 0;

        for (let i = 0; i < rows.length; i += CHUNK) {
            const chunk = rows.slice(i, i + CHUNK);
            const statements = chunk.map(row => ({
                sql: insertSql,
                args: cols.map(c => row[c] ?? null),
            }));
            await turso.batch(statements, 'write');
            pushed += chunk.length;
        }

        console.log(`  ✅ ${table} — ${pushed} rows migrated`);
        grandTotal += pushed;
    }

    local.close();

    console.log(`\n🎉 Migration complete — ${grandTotal} rows pushed to Turso`);
    console.log('\nNext steps:');
    console.log('  1. Add TURSO_DATABASE_URL and TURSO_AUTH_TOKEN to your .env file');
    console.log('  2. Restart the server — it will pull from Turso on startup');
    console.log('  3. (Optional) Deploy to Railway/Render for public cloud access\n');

    turso.close();
}

migrate().catch(e => {
    console.error('\n❌ Migration failed:', e.message);
    process.exit(1);
});
