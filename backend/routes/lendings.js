const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authMiddleware, requireRole, requirePermission } = require('../middleware/auth');
const { logActivity } = require('../utils/logger');

// Get all lendings
router.get('/', authMiddleware, async (req, res) => {
    try {
        const [lendings] = await pool.query(
            `SELECT l.*, 
              a.inventory_number as asset_inventory,
              a.type as asset_type,
              c.name as container_name,
              u.username as lent_by,
              DATEDIFF(l.planned_end_date, NOW()) as days_remaining
       FROM lendings l
       LEFT JOIN assets a ON l.asset_id = a.id
       LEFT JOIN containers c ON l.container_id = c.id
       LEFT JOIN users u ON l.user_id = u.id
       ORDER BY l.created_at DESC`
        );

        res.json(lendings);
    } catch (error) {
        console.error('Get lendings error:', error);
        res.status(500).json({ error: 'Serverfehler beim Abrufen der Ausleihen' });
    }
});

// Get active lendings
router.get('/active', authMiddleware, async (req, res) => {
    try {
        const [lendings] = await pool.query(
            `SELECT l.*, 
              a.inventory_number as asset_inventory,
              a.type as asset_type,
              c.name as container_name,
              u.username as lent_by,
              DATEDIFF(l.planned_end_date, NOW()) as days_remaining
       FROM lendings l
       LEFT JOIN assets a ON l.asset_id = a.id
       LEFT JOIN containers c ON l.container_id = c.id
       LEFT JOIN users u ON l.user_id = u.id
       WHERE l.returned = FALSE
       ORDER BY l.planned_end_date ASC`
        );

        res.json(lendings);
    } catch (error) {
        console.error('Get active lendings error:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});

// Create new lending
router.post('/', authMiddleware, requirePermission('lendings.create'), async (req, res) => {
    try {
        const {
            asset_id,
            container_id,
            borrower_name,
            borrower_type,
            start_date,
            planned_end_date,
            notes
        } = req.body;

        if (!borrower_name || !borrower_type || !start_date || !planned_end_date) {
            return res.status(400).json({ error: 'Ausleiher, Typ, Start- und Enddatum sind erforderlich' });
        }

        if (!asset_id && !container_id) {
            return res.status(400).json({ error: 'Entweder Asset oder Container muss ausgewählt werden' });
        }

        // Check if asset/container is available (not defective or already lent)
        if (asset_id) {
            const [assets] = await pool.query(
                'SELECT status FROM assets WHERE id = ?',
                [asset_id]
            );

            if (assets.length === 0) {
                return res.status(404).json({ error: 'Asset nicht gefunden' });
            }

            if (assets[0].status === 'defekt') {
                return res.status(400).json({ error: 'Defekte Geräte können nicht ausgeliehen werden' });
            }

            // Check for active lending
            const [activeLendings] = await pool.query(
                'SELECT id FROM lendings WHERE asset_id = ? AND returned = FALSE',
                [asset_id]
            );

            if (activeLendings.length > 0) {
                return res.status(400).json({ error: 'Dieses Gerät ist bereits ausgeliehen' });
            }
        }

        if (container_id) {
            // Check for active lending
            const [activeLendings] = await pool.query(
                'SELECT id FROM lendings WHERE container_id = ? AND returned = FALSE',
                [container_id]
            );

            if (activeLendings.length > 0) {
                return res.status(400).json({ error: 'Dieser Container ist bereits ausgeliehen' });
            }
        }

        // Sanitize IDs (convert empty strings to null)
        const sanitizedAssetId = asset_id || null;
        const sanitizedContainerId = container_id || null;

        // Insert lending
        const [result] = await pool.query(
            `INSERT INTO lendings 
       (asset_id, container_id, user_id, borrower_name, borrower_type, start_date, planned_end_date, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [sanitizedAssetId, sanitizedContainerId, req.user.id, borrower_name, borrower_type, start_date, planned_end_date, notes]
        );

        // Add to asset history if asset
        if (sanitizedAssetId) {
            await pool.query(
                'INSERT INTO asset_history (asset_id, action, details, created_by) VALUES (?, ?, ?, ?)',
                [sanitizedAssetId, 'lent', `Ausgeliehen an ${borrower_name}`, req.user.id]
            );
        }

        res.status(201).json({
            message: 'Ausleihe erfolgreich erstellt',
            lending_id: result.insertId
        });
    } catch (error) {
        console.error('Create lending error:', error);
        res.status(500).json({ error: 'Serverfehler beim Erstellen der Ausleihe' });
    }
});

// Return lending
router.put('/:id/return', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        // Get lending info
        const [lendings] = await pool.query('SELECT * FROM lendings WHERE id = ?', [id]);

        if (lendings.length === 0) {
            return res.status(404).json({ error: 'Ausleihe nicht gefunden' });
        }

        if (lendings[0].returned) {
            return res.status(400).json({ error: 'Ausleihe wurde bereits zurückgegeben' });
        }

        // Mark as returned
        await pool.query(
            'UPDATE lendings SET returned = TRUE, actual_end_date = NOW() WHERE id = ?',
            [id]
        );

        // Add to asset history
        if (lendings[0].asset_id) {
            await pool.query(
                'INSERT INTO asset_history (asset_id, action, details, created_by) VALUES (?, ?, ?, ?)',
                [lendings[0].asset_id, 'returned', 'Zurückgegeben', req.user.id]
            );
        }

        res.json({ message: 'Ausleihe erfolgreich zurückgegeben' });
    } catch (error) {
        console.error('Return lending error:', error);
        res.status(500).json({ error: 'Serverfehler bei Rückgabe' });
    }
});

// Delete lending
router.delete('/:id', authMiddleware, requirePermission('lendings.delete'), async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM lendings WHERE id = ?', [id]);
        res.json({ message: 'Ausleihe erfolgreich gelöscht' });
    } catch (error) {
        console.error('Delete lending error:', error);
        res.status(500).json({ error: 'Serverfehler beim Löschen' });
    }
});

module.exports = router;
