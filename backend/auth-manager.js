const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const SALT_ROUNDS = 12;

class AuthManager {
    constructor(db) {
        this.db = db;
        this._ensureTable();
        this._prepareStatements();
    }

    _ensureTable() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                display_name TEXT,
                role TEXT NOT NULL DEFAULT 'user',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME
            );
            CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        `);
    }

    _prepareStatements() {
        this.stmts = {
            findByUsername: this.db.prepare(`SELECT * FROM users WHERE username = ?`),
            findById: this.db.prepare(`SELECT id, username, display_name, role, created_at, last_login FROM users WHERE id = ?`),
            insert: this.db.prepare(`
                INSERT INTO users (id, username, password_hash, display_name, role)
                VALUES (?, ?, ?, ?, ?)
            `),
            updateLastLogin: this.db.prepare(`UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?`),
            listUsers: this.db.prepare(`SELECT id, username, display_name, role, created_at, last_login FROM users ORDER BY created_at DESC`),
            deleteUser: this.db.prepare(`DELETE FROM users WHERE id = ?`),
            updateUser: this.db.prepare(`
                UPDATE users SET display_name = COALESCE(?, display_name), role = COALESCE(?, role), updated_at = CURRENT_TIMESTAMP WHERE id = ?
            `),
            countUsers: this.db.prepare(`SELECT COUNT(*) as count FROM users`),
        };
    }

    async createUser(username, password, displayName = null, role = 'user') {
        const existing = this.stmts.findByUsername.get(username);
        if (existing) throw new Error('Username already taken');

        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        const id = uuidv4();
        this.stmts.insert.run(id, username, passwordHash, displayName || username, role);
        return this.stmts.findById.get(id);
    }

    async login(username, password) {
        const user = this.stmts.findByUsername.get(username);
        if (!user) throw new Error('Invalid credentials');

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) throw new Error('Invalid credentials');

        this.stmts.updateLastLogin.run(user.id);

        const token = jwt.sign(
            { sub: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        return {
            token,
            user: { id: user.id, username: user.username, displayName: user.display_name, role: user.role }
        };
    }

    verifyToken(token) {
        return jwt.verify(token, JWT_SECRET);
    }

    getUser(id) {
        return this.stmts.findById.get(id);
    }

    listUsers() {
        return this.stmts.listUsers.all();
    }

    deleteUser(id) {
        return this.stmts.deleteUser.run(id);
    }

    updateUser(id, { displayName, role } = {}) {
        this.stmts.updateUser.run(displayName || null, role || null, id);
        return this.stmts.findById.get(id);
    }

    userCount() {
        return this.stmts.countUsers.get().count;
    }
}

module.exports = AuthManager;
