const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authMiddleware, requireRole, requirePermission } = require('../middleware/auth');
const { logActivity } = require('../utils/logger');
const { generateQRId, generateQRCode } = require('../utils/qrcode');

// Get all assets
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { status, type, container_id } = req.query;

        let query = `
      SELECT a.*, c.name as container_name 
      FROM assets a 
      LEFT JOIN containers c ON a.container_id = c.id
      WHERE 1=1
    `;
        const params = [];

        if (status) {
            query += ' AND a.status = ?';
            params.push(status);
        }

        if (type) {
            query += ' AND a.type = ?';
            params.push(type);
        }

        if (container_id) {
            query += ' AND a.container_id = ?';
            params.push(container_id);
        }

        query += ' ORDER BY a.created_at DESC';

        const [assets] = await pool.query(query, params);
        res.json(assets);
    } catch (error) {
        console.error('Get assets error:', error);
        res.status(500).json({ error: 'Serverfehler beim Abrufen der Assets' });
    }
});

// Lookup asset by QR code (for scanner navigation) - must be before /:id route
router.get('/lookup/qr/:qrCode', authMiddleware, async (req, res) => {
    try {
        const { qrCode } = req.params;

        const [assets] = await pool.query(
            'SELECT id, inventory_number, type, model FROM assets WHERE qr_code = ?',
            [qrCode]
        );

        if (assets.length === 0) {
            return res.status(404).json({ error: 'Gerät nicht gefunden' });
        }

        res.json(assets[0]);
    } catch (error) {
        console.error('Lookup asset by QR error:', error);
        res.status(500).json({ error: 'Serverfehler beim Suchen des Geräts' });
    }
});

// Get single asset
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const [assets] = await pool.query(
            `SELECT a.*, c.name as container_name 
       FROM assets a 
       LEFT JOIN containers c ON a.container_id = c.id
       WHERE a.id = ?`,
            [req.params.id]
        );

        if (assets.length === 0) {
            return res.status(404).json({ error: 'Asset nicht gefunden' });
        }

        res.json(assets[0]);
    } catch (error) {
        console.error('Get asset error:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});

// Create new asset
router.post('/', authMiddleware, requirePermission('assets.manage'), async (req, res) => {
    try {
        const {
            inventory_number,
            serial_number,
            type,
            model,
            manufacturer,
            status,
            container_id,
            purchase_date,
            warranty_until,
            notes
        } = req.body;

        if (!inventory_number || !type) {
            return res.status(400).json({ error: 'Inventarnummer und Typ sind erforderlich' });
        }

        // Check if inventory number already exists
        const [existing] = await pool.query(
            'SELECT id FROM assets WHERE inventory_number = ?',
            [inventory_number]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Inventarnummer bereits vergeben' });
        }

        // Generate QR code
        const qr_code = generateQRId('ASSET');

        // Insert asset
        const [result] = await pool.query(
            `INSERT INTO assets 
       (inventory_number, serial_number, type, model, manufacturer, status, container_id, qr_code, purchase_date, warranty_until, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [inventory_number, serial_number, type, model, manufacturer, status || 'ok', container_id, qr_code, purchase_date, warranty_until, notes]
        );

        // Add to history
        await pool.query(
            'INSERT INTO asset_history (asset_id, action, details, created_by) VALUES (?, ?, ?, ?)',
            [result.insertId, 'created', 'Asset erstellt', req.user.id]
        );

        res.status(201).json({
            message: 'Asset erfolgreich erstellt',
            asset: {
                id: result.insertId,
                inventory_number,
                qr_code
            }
        });
    } catch (error) {
        console.error('Create asset error:', error);
        res.status(500).json({ error: 'Serverfehler beim Erstellen des Assets' });
    }
});

// Update asset
router.put('/:id', authMiddleware, requirePermission('assets.manage'), async (req, res) => {
    try {
        const { id } = req.params;
        const {
            inventory_number,
            serial_number,
            type,
            model,
            manufacturer,
            status,
            container_id,
            purchase_date,
            warranty_until,
            notes
        } = req.body;

        // Get old values for history
        const [oldAsset] = await pool.query('SELECT * FROM assets WHERE id = ?', [id]);

        if (oldAsset.length === 0) {
            return res.status(404).json({ error: 'Asset nicht gefunden' });
        }

        // Update asset
        await pool.query(
            `UPDATE assets 
       SET inventory_number = ?, serial_number = ?, type = ?, model = ?, manufacturer = ?, 
           status = ?, container_id = ?, purchase_date = ?, warranty_until = ?, notes = ?
       WHERE id = ?`,
            [inventory_number, serial_number, type, model, manufacturer, status, container_id, purchase_date, warranty_until, notes, id]
        );

        // Add to history if status changed
        if (oldAsset[0].status !== status) {
            await pool.query(
                'INSERT INTO asset_history (asset_id, action, details, old_value, new_value, created_by) VALUES (?, ?, ?, ?, ?, ?)',
                [id, 'status_changed', 'Status geändert', oldAsset[0].status, status, req.user.id]
            );
        }

        res.json({ message: 'Asset erfolgreich aktualisiert' });
    } catch (error) {
        console.error('Update asset error:', error);
        res.status(500).json({ error: 'Serverfehler beim Aktualisieren des Assets' });
    }
});

// Delete asset
router.delete('/:id', authMiddleware, requirePermission('assets.manage'), async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.query('DELETE FROM assets WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Asset nicht gefunden' });
        }

        res.json({ message: 'Asset erfolgreich gelöscht' });
    } catch (error) {
        console.error('Delete asset error:', error);
        res.status(500).json({ error: 'Serverfehler beim Löschen des Assets' });
    }
});

// Get asset history
router.get('/:id/history', authMiddleware, async (req, res) => {
    try {
        const [history] = await pool.query(
            `SELECT h.*, u.username 
       FROM asset_history h
       LEFT JOIN users u ON h.created_by = u.id
       WHERE h.asset_id = ?
       ORDER BY h.created_at DESC`,
            [req.params.id]
        );

        res.json(history);
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});

// Get QR code for asset
router.get('/:id/qr', authMiddleware, async (req, res) => {
    try {
        const [assets] = await pool.query('SELECT qr_code FROM assets WHERE id = ?', [req.params.id]);

        if (assets.length === 0) {
            return res.status(404).json({ error: 'Asset nicht gefunden' });
        }

        const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
        const qrDataUrl = await generateQRCode(assets[0].qr_code, baseUrl);

        res.json({ qr_code: qrDataUrl });
    } catch (error) {
        console.error('Get QR code error:', error);
        res.status(500).json({ error: 'Serverfehler beim Generieren des QR-Codes' });
    }
});

module.exports = router;
