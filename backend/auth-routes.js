const express = require('express');
const { requireAuth, requireAdmin } = require('./auth-middleware');

module.exports = function createAuthRoutes(auth) {
    const router = express.Router();

    // POST /api/auth/login
    router.post('/login', async (req, res) => {
        const { username, password } = req.body || {};
        if (!username || !password) {
            return res.status(400).json({ error: 'username and password required' });
        }
        try {
            const result = await auth.login(username, password);
            res.json(result);
        } catch (err) {
            res.status(401).json({ error: err.message });
        }
    });

    // GET /api/auth/me  — returns the authenticated user's profile
    router.get('/me', requireAuth, (req, res) => {
        const user = auth.getUser(req.user.sub);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    });

    // POST /api/auth/change-password
    router.post('/change-password', requireAuth, async (req, res) => {
        const { currentPassword, newPassword } = req.body || {};
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'currentPassword and newPassword required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }
        try {
            await auth.changePassword(req.user.sub, currentPassword, newPassword);
            res.json({ ok: true });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    });

    // ── Admin routes ──────────────────────────────────────────────────────────

    // GET /api/admin/users
    router.get('/admin/users', requireAuth, requireAdmin, (req, res) => {
        res.json(auth.listUsers());
    });

    // POST /api/admin/users  — create a user
    router.post('/admin/users', requireAuth, requireAdmin, async (req, res) => {
        const { username, password, displayName, role } = req.body || {};
        if (!username || !password) {
            return res.status(400).json({ error: 'username and password required' });
        }
        try {
            const user = await auth.createUser(username, password, displayName, role || 'user');
            res.status(201).json(user);
        } catch (err) {
            res.status(409).json({ error: err.message });
        }
    });

    // PATCH /api/admin/users/:id — update display_name or role
    router.patch('/admin/users/:id', requireAuth, requireAdmin, (req, res) => {
        const { displayName, role } = req.body || {};
        const user = auth.updateUser(req.params.id, { displayName, role });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    });

    // DELETE /api/admin/users/:id
    router.delete('/admin/users/:id', requireAuth, requireAdmin, (req, res) => {
        // Prevent self-deletion
        if (req.params.id === req.user.sub) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }
        auth.deleteUser(req.params.id);
        res.json({ ok: true });
    });

    return router;
};
