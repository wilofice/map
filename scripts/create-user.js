#!/usr/bin/env node
/**
 * CLI script to create a user directly in the database.
 * Writes to Turso (cloud) when TURSO_DATABASE_URL is set, otherwise local SQLite.
 *
 * Usage: node scripts/create-user.js <username> <password> [displayName] [role]
 * Roles: user (default) | admin
 *
 * Example:
 *   node scripts/create-user.js genereux mySecretPass "Genereux A." admin
 */
require('dotenv').config();

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const [,, username, password, displayName, role] = process.argv;

if (!username || !password) {
    console.error('Usage: node scripts/create-user.js <username> <password> [displayName] [role]');
    process.exit(1);
}

async function main() {
    const TURSO_URL   = process.env.TURSO_DATABASE_URL;
    const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

    const id           = uuidv4();
    const passwordHash = await bcrypt.hash(password, 12);
    const name         = displayName || username;
    const userRole     = role || 'user';

    if (TURSO_URL && TURSO_TOKEN) {
        // Write directly to Turso (production path)
        const { createClient } = require('@libsql/client');
        const client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

        await client.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                display_name TEXT,
                role TEXT NOT NULL DEFAULT 'user',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME
            )
        `);

        const existing = await client.execute({
            sql: 'SELECT id FROM users WHERE username = ?',
            args: [username],
        });
        if (existing.rows.length > 0) {
            console.error(`❌ Username '${username}' already taken`);
            process.exit(1);
        }

        await client.execute({
            sql: 'INSERT INTO users (id, username, password_hash, display_name, role) VALUES (?, ?, ?, ?, ?)',
            args: [id, username, passwordHash, name, userRole],
        });

        console.log(`✅ User created in Turso (${TURSO_URL}):`);
    } else {
        // Fallback: local SQLite
        const DatabaseManager = require('../backend/db-manager');
        const AuthManager = require('../backend/auth-manager');
        const rawDb = new DatabaseManager();
        const auth = new AuthManager(rawDb.db);
        const user = await auth.createUser(username, password, name, userRole);
        console.log(`✅ User created in local SQLite:`);
        console.log(`   id:           ${user.id}`);
        console.log(`   username:     ${user.username}`);
        console.log(`   display_name: ${user.display_name}`);
        console.log(`   role:         ${user.role}`);
        return;
    }

    console.log(`   id:           ${id}`);
    console.log(`   username:     ${username}`);
    console.log(`   display_name: ${name}`);
    console.log(`   role:         ${userRole}`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
