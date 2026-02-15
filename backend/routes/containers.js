const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authMiddleware, requireRole, requirePermission } = require('../middleware/auth');
const { generateQRId, generateQRCode } = require('../utils/qrcode');

// Get all containers
router.get('/', authMiddleware, async (req, res) => {
    try {
        const [containers] = await pool.query(
            `SELECT c.*, 
              pc.name as parent_name,
              (SELECT COUNT(*) FROM assets WHERE container_id = c.id) as asset_count
       FROM containers c
       LEFT JOIN containers pc ON c.parent_container_id = pc.id
       ORDER BY c.created_at DESC`
        );

        res.json(containers);
    } catch (error) {
        console.error('Get containers error:', error);
        res.status(500).json({ error: 'Serverfehler beim Abrufen der Container' });
    }
});

// Get single container with assets
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const [containers] = await pool.query(
            `SELECT c.*, pc.name as parent_name
       FROM containers c
       LEFT JOIN containers pc ON c.parent_container_id = pc.id
       WHERE c.id = ?`,
            [req.params.id]
        );

        if (containers.length === 0) {
            return res.status(404).json({ error: 'Container nicht gefunden' });
        }

        // Get assets in this container
        const [assets] = await pool.query(
            'SELECT * FROM assets WHERE container_id = ? ORDER BY inventory_number',
            [req.params.id]
        );

        // Get child containers
        const [childContainers] = await pool.query(
            'SELECT * FROM containers WHERE parent_container_id = ?',
            [req.params.id]
        );

        res.json({
            ...containers[0],
            assets,
            child_containers: childContainers
        });
    } catch (error) {
        console.error('Get container error:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});

// Create new container
router.post('/', authMiddleware, requirePermission('containers.manage'), async (req, res) => {
    try {
        const { name, type, description, location, parent_container_id, capacity, building, floor } = req.body;

        if (!name || !type) {
            return res.status(400).json({ error: 'Name und Typ sind erforderlich' });
        }

        // Generate QR code
        const qr_code = generateQRId('CONT');

        // Insert container
        const [result] = await pool.query(
            `INSERT INTO containers (name, type, description, location, building, floor, parent_container_id, qr_code, capacity) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, type, description, location, building, floor, parent_container_id, qr_code, capacity || 0]
        );

        res.status(201).json({
            message: 'Container erfolgreich erstellt',
            container: {
                id: result.insertId,
                name,
                qr_code
            }
        });
    } catch (error) {
        console.error('Create container error:', error);
        res.status(500).json({ error: 'Serverfehler beim Erstellen des Containers' });
    }
});

// Update container
router.put('/:id', authMiddleware, requirePermission('containers.manage'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, description, location, parent_container_id, capacity, building, floor } = req.body;

        await pool.query(
            `UPDATE containers 
       SET name = ?, type = ?, description = ?, location = ?, building = ?, floor = ?, parent_container_id = ?, capacity = ?
       WHERE id = ?`,
            [name, type, description, location, building, floor, parent_container_id, capacity, id]
        );

        res.json({ message: 'Container erfolgreich aktualisiert' });
    } catch (error) {
        console.error('Update container error:', error);
        res.status(500).json({ error: 'Serverfehler beim Aktualisieren des Containers' });
    }
});

// Delete container
router.delete('/:id', authMiddleware, requirePermission('containers.manage'), async (req, res) => {
    try {
        const { id } = req.params;

        // Check if container has assets
        const [assets] = await pool.query('SELECT COUNT(*) as count FROM assets WHERE container_id = ?', [id]);

        if (assets[0].count > 0) {
            return res.status(400).json({ error: 'Container kann nicht gelöscht werden, da er noch Assets enthält' });
        }

        const [result] = await pool.query('DELETE FROM containers WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Container nicht gefunden' });
        }

        res.json({ message: 'Container erfolgreich gelöscht' });
    } catch (error) {
        console.error('Delete container error:', error);
        res.status(500).json({ error: 'Serverfehler beim Löschen des Containers' });
    }
});

// Get QR code for container
router.get('/:id/qr', authMiddleware, async (req, res) => {
    try {
        const [containers] = await pool.query('SELECT qr_code FROM containers WHERE id = ?', [req.params.id]);

        if (containers.length === 0) {
            return res.status(404).json({ error: 'Container nicht gefunden' });
        }

        const baseUrl = process.env.BASE_URL || 'http://localhost:5173';
        const qrDataUrl = await generateQRCode(containers[0].qr_code, baseUrl);

        res.json({ qr_code: qrDataUrl });
    } catch (error) {
        console.error('Get QR code error:', error);
        res.status(500).json({ error: 'Serverfehler beim Generieren des QR-Codes' });
    }
});

module.exports = router;
