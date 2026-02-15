const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { logActivity } = require('../utils/logger');

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Benutzername und Passwort erforderlich' });
        }

        const [users] = await pool.query(`
            SELECT u.*, GROUP_CONCAT(r.name) as roles_list
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
            WHERE u.username = ? OR u.email = ?
            GROUP BY u.id
        `, [username, username]);

        if (users.length === 0) {
            return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
        }

        const user = users[0];
        const roles = user.roles_list ? user.roles_list.split(',') : [];

        if (!user.is_active) {
            return res.status(403).json({ error: 'Dieses Konto wurde deaktiviert. Bitte kontaktieren Sie einen Administrator.' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
        }

        // Load permissions for the user's roles + direct user permissions
        let permissions = [];
        try {
            // 1. Role Permissions
            if (roles.length > 0) {
                const [permRows] = await pool.query(`
                    SELECT DISTINCT rp.permission
                    FROM role_permissions rp
                    JOIN roles r ON rp.role_id = r.id
                    WHERE r.name IN (?)
                `, [roles]);
                permissions = [...permissions, ...permRows.map(p => p.permission)];
            }

            // 2. User Direct Permissions
            const [userPermRows] = await pool.query(`
                SELECT permission FROM user_permissions WHERE user_id = ?
            `, [user.id]);
            permissions = [...permissions, ...userPermRows.map(p => p.permission)];

            // Unique
            permissions = [...new Set(permissions)];
        } catch (e) {
            // If tables don't exist yet, skip
            console.log('Permissions load error (tables missing?):', e.message);
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: roles[0] || 'Lehrer', roles, permissions },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        await logActivity(user.id, 'LOGIN', `Benutzer ${user.username} hat sich angemeldet`);

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: roles[0] || 'Lehrer',
                roles,
                permissions,
                first_name: user.first_name,
                last_name: user.last_name,
                requires_password_change: !!user.requires_password_change,
                is_active: !!user.is_active
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});

// Register new user (admin only)
router.post('/register', authMiddleware, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        if (req.user.role !== 'Administrator') {
            return res.status(403).json({ error: 'Nur Administratoren können Benutzer erstellen' });
        }

        await connection.beginTransaction();
        const { username, email, password, roles, first_name, last_name } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Benutzername, E-Mail und Passwort erforderlich' });
        }

        const [existing] = await connection.query(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Benutzername oder E-Mail bereits vergeben' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        // Create user
        const [result] = await connection.execute(
            'INSERT INTO users (username, email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?, ?)',
            [username, email, hashedPassword, first_name || null, last_name || null]
        );
        const userId = result.insertId;

        // Assign roles (find IDs first)
        if (roles && roles.length > 0) {
            // Get role IDs
            const [roleRows] = await connection.query('SELECT id, name FROM roles WHERE name IN (?)', [roles]);

            if (roleRows.length !== roles.length) {
                await connection.rollback();
                return res.status(400).json({ error: 'Eine oder mehrere angegebene Rollen sind ungültig.' });
            }

            for (const roleRow of roleRows) {
                await connection.execute(
                    'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
                    [userId, roleRow.id]
                );
            }
        }

        await connection.commit();
        res.status(201).json({ message: 'Benutzer erfolgreich erstellt' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Register error:', error);
        res.status(500).json({ error: 'Serverfehler' });
    } finally {
        if (connection) connection.release();
    }
});

// Get current user info
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const [users] = await pool.query(`
            SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.created_at,
                   u.requires_password_change, u.is_active,
                   GROUP_CONCAT(ur.role_name) as roles_list
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            WHERE u.id = ?
            GROUP BY u.id
        `, [req.user.id]);

        if (users.length === 0) return res.status(404).json({ error: 'Nicht gefunden' });

        const user = users[0];
        const roles = user.roles_list ? user.roles_list.split(',') : [];

        res.json({
            ...user,
            role: roles[0] || 'Lehrer',
            roles,
            requires_password_change: !!user.requires_password_change,
            is_active: !!user.is_active
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});

// Change password (internal onboarding)
router.post('/change-password', authMiddleware, async (req, res) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: 'Das Passwort muss mindestens 6 Zeichen lang sein' });
        }

        const password_hash = await bcrypt.hash(newPassword, 10);
        await pool.query(
            'UPDATE users SET password_hash = ?, requires_password_change = 0 WHERE id = ?',
            [password_hash, req.user.id]
        );

        await logActivity(req.user.id, 'PWD_CHANGE', 'Passwort erfolgreich geändert');

        res.json({ message: 'Passwort erfolgreich geändert' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});

module.exports = router;
