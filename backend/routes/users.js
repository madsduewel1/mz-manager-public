const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { pool } = require('../config/database');
const { authMiddleware, requireRole, requirePermission } = require('../middleware/auth');
const { logActivity } = require('../utils/logger');

// Get all users (Admin only)
router.get('/', authMiddleware, requirePermission('users.manage'), async (req, res) => {
    try {
        const [users] = await pool.query(`
            SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.created_at,
                   u.is_active, u.theme,
                   GROUP_CONCAT(DISTINCT r.name) as roles_list,
                   GROUP_CONCAT(DISTINCT up.permission) as permissions_list
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
            LEFT JOIN user_permissions up ON u.id = up.user_id
            GROUP BY u.id
            ORDER BY u.username ASC
        `);

        const formattedUsers = users.map(u => ({
            ...u,
            roles: u.roles_list ? u.roles_list.split(',') : [],
            permissions: u.permissions_list ? u.permissions_list.split(',') : []
        }));

        res.json(formattedUsers);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Serverfehler beim Laden der Benutzer' });
    }
});

// Update user
router.put('/:id', authMiddleware, requirePermission('users.manage'), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;
        const { username, email, roles, first_name, last_name, password, requires_password_change } = req.body;

        let query = 'UPDATE users SET username = ?, email = ?, first_name = ?, last_name = ?';
        let params = [username, email, first_name, last_name];

        if (password) {
            const password_hash = await bcrypt.hash(password, 10);
            query += ', password_hash = ?, requires_password_change = ?';
            params.push(password_hash, requires_password_change ? 1 : 0);
        }

        query += ' WHERE id = ?';
        params.push(id);

        await connection.query(query, params);

        if (Array.isArray(roles)) {
            await connection.query('DELETE FROM user_roles WHERE user_id = ?', [id]);
            if (roles.length > 0) {
                // Get role IDs
                const [roleRows] = await connection.query('SELECT id, name FROM roles WHERE name IN (?)', [roles]);

                for (const roleRow of roleRows) {
                    await connection.query(
                        'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
                        [id, roleRow.id]
                    );
                }
            }
        }

        await connection.commit();
        await logActivity(req.user.id, 'USER_UPDATE', `Benutzer ${username} (ID: ${id}) aktualisiert`);
        res.json({ message: 'Benutzer erfolgreich aktualisiert' });
    } catch (error) {
        await connection.rollback();
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Serverfehler' });
    } finally {
        connection.release();
    }
});

// Reset password
router.post('/:id/reset-password', authMiddleware, requirePermission('users.manage'), async (req, res) => {
    try {
        const { id } = req.params;
        const { new_password, password, requires_password_change } = req.body;
        const finalPassword = new_password || password;

        if (!finalPassword || finalPassword.length < 6) {
            return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen lang sein' });
        }

        const password_hash = await bcrypt.hash(finalPassword, 10);

        await pool.query(
            'UPDATE users SET password_hash = ?, requires_password_change = ? WHERE id = ?',
            [password_hash, requires_password_change ? 1 : 0, id]
        );

        await logActivity(req.user.id, 'PWD_RESET', `Passwort für Benutzer ID ${id} zurückgesetzt`);

        res.json({ message: 'Passwort erfolgreich zurückgesetzt' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Serverfehler beim Zurücksetzen des Passworts' });
    }
});

// Delete user
router.delete('/:id', authMiddleware, requirePermission('users.manage'), async (req, res) => {
    try {
        const { id } = req.params;

        // Check if this is the last admin
        const [admins] = await pool.query(`
            SELECT COUNT(*) as count 
            FROM user_roles ur 
            JOIN roles r ON ur.role_id = r.id 
            WHERE r.name = 'Administrator'
        `);

        const [userToDeleteIsAdmin] = await pool.query(`
            SELECT COUNT(*) as count 
            FROM user_roles ur 
            JOIN roles r ON ur.role_id = r.id 
            WHERE ur.user_id = ? AND r.name = 'Administrator'
        `, [id]);

        if (userToDeleteIsAdmin[0].count > 0 && admins[0].count <= 1) {
            return res.status(400).json({ error: 'Der letzte Administrator kann nicht gelöscht werden' });
        }

        const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Benutzer nicht gefunden' });
        }

        await logActivity(req.user.id, 'USER_DELETE', `Benutzer ID ${id} gelöscht`);

        res.json({ message: 'Benutzer erfolgreich gelöscht' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Serverfehler beim Löschen des Benutzers' });
    }
});

// Toggle user active status (admin only)
router.post('/:id/toggle-active', authMiddleware, requirePermission('users.manage'), async (req, res) => {
    try {
        const { id } = req.params;

        // Check if this is the last active admin
        const [activeAdmins] = await pool.query(`
            SELECT COUNT(*) as count 
            FROM users u
            JOIN user_roles ur ON u.id = ur.user_id 
            JOIN roles r ON ur.role_id = r.id 
            WHERE r.name = 'Administrator' AND u.is_active = 1
        `);

        const [userToToggleIsAdmin] = await pool.query(`
            SELECT COUNT(*) as count 
            FROM user_roles ur 
            JOIN roles r ON ur.role_id = r.id 
            WHERE ur.user_id = ? AND r.name = 'Administrator'
        `, [id]);

        const [targetUser] = await pool.query('SELECT is_active FROM users WHERE id = ?', [id]);
        if (targetUser.length === 0) return res.status(404).json({ error: 'Benutzer nicht gefunden' });

        // If trying to deactivate an admin, ensure they aren't the last active one
        if (targetUser[0].is_active && userToToggleIsAdmin[0].count > 0 && activeAdmins[0].count <= 1) {
            return res.status(400).json({ error: 'Der letzte aktive Administrator kann nicht deaktiviert werden' });
        }

        const newStatus = targetUser[0].is_active ? 0 : 1;
        await pool.query('UPDATE users SET is_active = ? WHERE id = ?', [newStatus, id]);

        await logActivity(req.user.id, 'USER_TOGGLE', `Benutzer ID ${id} ${newStatus ? 'aktiviert' : 'deaktiviert'}`);

        res.json({
            message: `Benutzer erfolgreich ${newStatus ? 'aktiviert' : 'deaktiviert'}`,
            is_active: !!newStatus
        });
    } catch (error) {
        console.error('Toggle active error:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});

// Add permission to user
router.post('/:id/permissions', authMiddleware, requirePermission('users.manage'), async (req, res) => {
    try {
        const { id } = req.params;
        const { permission } = req.body;

        if (!permission) return res.status(400).json({ error: 'Berechtigung erforderlich' });

        await pool.query(
            'INSERT IGNORE INTO user_permissions (user_id, permission) VALUES (?, ?)',
            [id, permission]
        );

        res.json({ message: 'Berechtigung hinzugefügt' });
    } catch (error) {
        console.error('Add permission error:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});

// Remove permission from user
router.delete('/:id/permissions/:permission', authMiddleware, requirePermission('users.manage'), async (req, res) => {
    try {
        const { id, permission } = req.params;

        await pool.query(
            'DELETE FROM user_permissions WHERE user_id = ? AND permission = ?',
            [id, permission]
        );

        res.json({ message: 'Berechtigung entfernt' });
    } catch (error) {
        console.error('Remove permission error:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});

module.exports = router;
