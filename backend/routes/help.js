const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authMiddleware, requirePermission } = require('../middleware/auth');

// Helper to check if a user has a specific permission
const hasPermission = (user, requiredPerm) => {
    const userRole = (user.role || '').toLowerCase();
    if (userRole === 'administrator' || userRole === 'admin') return true;
    if ((user.permissions || []).includes('all')) return true;
    return (user.permissions || []).includes(requiredPerm);
};

// GET all help modules accessible to the current user
router.get('/', authMiddleware, async (req, res) => {
    try {
        const [entries] = await pool.query('SELECT * FROM help_entries ORDER BY module, order_index ASC');
        
        // Group entries by module and filter out those the user doesn't have permission for
        const modules = {};

        for (const entry of entries) {
            // Check permission
            if (hasPermission(req.user, entry.permission_required)) {
                if (!modules[entry.module]) {
                    modules[entry.module] = {
                        module: entry.module,
                        permission_required: entry.permission_required,
                        entries: []
                    };
                }
                modules[entry.module].entries.push({
                    id: entry.id,
                    title: entry.title,
                    content: entry.content,
                    order_index: entry.order_index
                });
            }
        }

        res.json(Object.values(modules));
    } catch (error) {
        console.error('Error fetching help modules:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen der Hilfe-Inhalte' });
    }
});

// GET help for a specific module
router.get('/:module', authMiddleware, async (req, res) => {
    const moduleName = req.params.module;
    try {
        const [entries] = await pool.query('SELECT * FROM help_entries WHERE module = ? ORDER BY order_index ASC', [moduleName]);
        
        if (entries.length === 0) {
            return res.status(404).json({ error: 'Hilfe-Modul nicht gefunden' });
        }

        // The first entry dictates the required permission for the module
        const permissionRequired = entries[0].permission_required;

        // Check permission strictly server-side
        if (!hasPermission(req.user, permissionRequired)) {
            return res.status(403).json({ error: 'Zugriff verweigert. Fehlende Berechtigung für dieses Hilfe-Modul.' });
        }

        const formattedEntries = entries.map(e => ({
            id: e.id,
            title: e.title,
            content: e.content,
            order_index: e.order_index
        }));

        res.json({
            module: moduleName,
            permission_required: permissionRequired,
            entries: formattedEntries
        });

    } catch (error) {
        console.error('Error fetching help module:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen der Hilfe-Inhalte' });
    }
});

// Admin-only routes for managing help entries
router.post('/', authMiddleware, requirePermission('admin_manage'), async (req, res) => {
    const { module, permission_required, title, content, order_index } = req.body;
    
    if (!module || !permission_required || !title || !content) {
        return res.status(400).json({ error: 'Bitte alle Pflichtfelder ausfüllen' });
    }

    try {
        const [result] = await pool.query(
            'INSERT INTO help_entries (module, permission_required, title, content, order_index) VALUES (?, ?, ?, ?, ?)',
            [module, permission_required, title, content, order_index || 0]
        );
        res.status(201).json({ id: result.insertId, message: 'Hilfe-Eintrag erfolgreich erstellt' });
    } catch (error) {
        console.error('Error creating help entry:', error);
        res.status(500).json({ error: 'Fehler beim Erstellen des Hilfe-Eintrags' });
    }
});

router.put('/:id', authMiddleware, requirePermission('admin_manage'), async (req, res) => {
    const id = req.params.id;
    const { module, permission_required, title, content, order_index } = req.body;

    try {
        await pool.query(
            'UPDATE help_entries SET module = ?, permission_required = ?, title = ?, content = ?, order_index = ? WHERE id = ?',
            [module, permission_required, title, content, order_index || 0, id]
        );
        res.json({ message: 'Hilfe-Eintrag erfolgreich aktualisiert' });
    } catch (error) {
        console.error('Error updating help entry:', error);
        res.status(500).json({ error: 'Fehler beim Aktualisieren des Hilfe-Eintrags' });
    }
});

router.delete('/:id', authMiddleware, requirePermission('admin_manage'), async (req, res) => {
    const id = req.params.id;
    try {
        await pool.query('DELETE FROM help_entries WHERE id = ?', [id]);
        res.json({ message: 'Hilfe-Eintrag erfolgreich gelöscht' });
    } catch (error) {
        console.error('Error deleting help entry:', error);
        res.status(500).json({ error: 'Fehler beim Löschen des Hilfe-Eintrags' });
    }
});

module.exports = router;
