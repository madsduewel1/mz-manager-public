const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authMiddleware, requirePermission } = require('../middleware/auth');

// Middleware to check if Accessories Module is enabled
const checkModuleEnabled = async (req, res, next) => {
    try {
        const [rows] = await pool.query('SELECT setting_value FROM settings WHERE setting_key = ?', ['module_accessories_enabled']);
        if (rows.length === 0 || rows[0].setting_value !== 'true') {
            return res.status(403).json({ error: 'Modul Zubehör ist deaktiviert' });
        }
        next();
    } catch (error) {
        console.error('Check module enabled error:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
};

// GET /api/accessories - List all accessories
router.get('/', authMiddleware, checkModuleEnabled, requirePermission('accessories.manage'), async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                a.*,
                dev.inventory_number as assigned_device_inventory,
                dev.model as assigned_device_model,
                dev.type as assigned_device_type
            FROM accessories a
            LEFT JOIN assets dev ON a.assigned_device_id = dev.id
            ORDER BY a.name ASC
        `);
        res.json(rows);
    } catch (error) {
        console.error('Get accessories error:', error);
        res.status(500).json({ error: 'Serverfehler beim Abrufen des Zubehörs' });
    }
});

// GET /api/accessories/categories - Get distinct categories
router.get('/categories', authMiddleware, checkModuleEnabled, requirePermission('accessories.manage'), async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT DISTINCT category FROM accessories WHERE category IS NOT NULL AND category != "" ORDER BY category ASC');
        res.json(rows.map(row => row.category));
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});

// POST /api/accessories - Create a new accessory
router.post('/', authMiddleware, checkModuleEnabled, requirePermission('accessories.manage'), async (req, res) => {
    console.log('POST /api/accessories - req.body:', req.body);
    const { name, category, inventory_number, serial_number, quantity, status, location, assigned_device_id, notes, qr_code } = req.body;

    if (!name || !category) {
        return res.status(400).json({ error: 'Name und Kategorie sind erforderlich' });
    }

    if (quantity !== undefined && quantity < 0) {
        return res.status(400).json({ error: 'Menge darf nicht negativ sein' });
    }

    try {
        // Generate QR code if not provided
        const finalQrCode = qr_code || `ACC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const [result] = await pool.query(`
            INSERT INTO accessories 
            (name, category, inventory_number, serial_number, quantity, status, location, assigned_device_id, notes, qr_code) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            name,
            category,
            inventory_number || null,
            serial_number || null,
            quantity !== undefined ? quantity : 1,
            status || 'ok',
            location || null,
            assigned_device_id || null,
            notes || null,
            finalQrCode
        ]);

        const [newAsset] = await pool.query('SELECT * FROM accessories WHERE id = ?', [result.insertId]);
        res.status(201).json(newAsset[0]);
    } catch (error) {
        console.error('Create accessory error:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Inventarnummer oder QR-Code existiert bereits.' });
        }
        res.status(500).json({ error: 'Serverfehler beim Erstellen.' });
    }
});

// PUT /api/accessories/:id - Update an accessory
router.put('/:id', authMiddleware, checkModuleEnabled, requirePermission('accessories.manage'), async (req, res) => {
    const { id } = req.params;
    console.log(`PUT /api/accessories/${id} - req.body:`, req.body);
    const { name, category, inventory_number, serial_number, quantity, status, location, assigned_device_id, notes } = req.body;

    if (!name || !category) {
        return res.status(400).json({ error: 'Name und Kategorie sind erforderlich' });
    }

    if (quantity !== undefined && quantity < 0) {
        return res.status(400).json({ error: 'Menge darf nicht negativ sein' });
    }

    try {
        await pool.query(`
            UPDATE accessories 
            SET name = ?, category = ?, inventory_number = ?, serial_number = ?, quantity = ?, 
                status = ?, location = ?, assigned_device_id = ?, notes = ?
            WHERE id = ?
        `, [
            name,
            category,
            inventory_number || null,
            serial_number || null,
            quantity !== undefined ? quantity : 1,
            status || 'ok',
            location || null,
            assigned_device_id || null,
            notes || null,
            id
        ]);

        res.json({ message: 'Zubehör erfolgreich aktualisiert.' });
    } catch (error) {
        console.error('Update accessory error:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Diese Inventarnummer existiert bereits.' });
        }
        res.status(500).json({ error: 'Serverfehler beim Aktualisieren.' });
    }
});

// DELETE /api/accessories/:id - Delete an accessory
router.delete('/:id', authMiddleware, checkModuleEnabled, requirePermission('accessories.manage'), async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await pool.query('DELETE FROM accessories WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Zubehör nicht gefunden' });
        }

        res.json({ message: 'Zubehör erfolgreich gelöscht.' });
    } catch (error) {
        console.error('Delete accessory error:', error);
        res.status(500).json({ error: 'Serverfehler beim Löschen.' });
    }
});

module.exports = router;
