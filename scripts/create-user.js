#!/usr/bin/env node
/**
 * CLI script to create a user directly in the database.
 * Usage: node scripts/create-user.js <username> <password> [displayName] [role]
 * Roles: user (default) | admin
 *
 * Example:
 *   node scripts/create-user.js genereux mySecretPass "Genereux A." admin
 */
require('dotenv').config();

const DatabaseManager = require('../backend/db-manager');
const AuthManager = require('../backend/auth-manager');

const [,, username, password, displayName, role] = process.argv;

if (!username || !password) {
    console.error('Usage: node scripts/create-user.js <username> <password> [displayName] [role]');
    process.exit(1);
}

async function main() {
    const rawDb = new DatabaseManager();
    const auth = new AuthManager(rawDb.db);

    try {
        const user = await auth.createUser(username, password, displayName || username, role || 'user');
        console.log(`✅ User created:`);
        console.log(`   id:           ${user.id}`);
        console.log(`   username:     ${user.username}`);
        console.log(`   display_name: ${user.display_name}`);
        console.log(`   role:         ${user.role}`);
    } catch (err) {
        console.error(`❌ ${err.message}`);
        process.exit(1);
    }
}

main();
