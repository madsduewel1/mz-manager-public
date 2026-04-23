const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authMiddleware, requireRole, requirePermission } = require('../middleware/auth');
const { generateQRId, generateQRCode } = require('../utils/qrcode');
const { logActivity } = require('../utils/logger');

// Get all containers
router.get('/', authMiddleware, requirePermission('containers.view'), async (req, res) => {
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
router.get('/:id', authMiddleware, requirePermission('containers.view'), async (req, res) => {
    try {
        const { id } = req.params;
        const isNumeric = /^\d+$/.test(id);

        let query = `
            SELECT c.*, pc.name as parent_name
            FROM containers c
            LEFT JOIN containers pc ON c.parent_container_id = pc.id
            WHERE `;
        
        if (isNumeric) {
            query += 'c.id = ?';
        } else {
            query += 'c.name = ?';
        }

        const [containers] = await pool.query(query, [id]);

        if (containers.length === 0) {
            return res.status(404).json({ error: 'Container nicht gefunden' });
        }

        const container = containers[0];

        // Get assets in this container
        const [assets] = await pool.query(
            'SELECT * FROM assets WHERE container_id = ? ORDER BY inventory_number',
            [container.id]
        );

        // Get child containers
        const [childContainers] = await pool.query(
            'SELECT * FROM containers WHERE parent_container_id = ?',
            [container.id]
        );

        res.json({
            ...container,
            assets,
            child_containers: childContainers
        });
    } catch (error) {
        console.error('Get container error:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});

// Create new container
router.post('/', authMiddleware, requirePermission('containers.create'), async (req, res) => {
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

        await logActivity(req.user.id, 'CONTAINER_CREATE', `Container ${name} angelegt`);

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
router.put('/:id', authMiddleware, requirePermission('containers.edit'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, description, location, parent_container_id, capacity, building, floor } = req.body;

        await pool.query(
            `UPDATE containers 
       SET name = ?, type = ?, description = ?, location = ?, building = ?, floor = ?, parent_container_id = ?, capacity = ?
       WHERE id = ?`,
            [name, type, description, location, building, floor, parent_container_id, capacity, id]
        );

        await logActivity(req.user.id, 'CONTAINER_UPDATE', `Container ${name} bearbeitet`);
        res.json({ message: 'Container erfolgreich aktualisiert' });
    } catch (error) {
        console.error('Update container error:', error);
        res.status(500).json({ error: 'Serverfehler beim Aktualisieren des Containers' });
    }
});

// Delete container
router.delete('/:id', authMiddleware, requirePermission('containers.delete'), async (req, res) => {
    try {
        const { id } = req.params;

        // Check if container has assets
        const [assets] = await pool.query('SELECT COUNT(*) as count FROM assets WHERE container_id = ?', [id]);

        if (assets[0].count > 0) {
            return res.status(400).json({ error: 'Container kann nicht gelöscht werden, da er noch Assets enthält' });
        }

        // Fetch container name for log before deleting
        const [container] = await pool.query('SELECT name FROM containers WHERE id = ?', [id]);
        const contName = container.length > 0 ? container[0].name : id;

        const [result] = await pool.query('DELETE FROM containers WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Container nicht gefunden' });
        }

        await logActivity(req.user.id, 'CONTAINER_DELETE', `Container ${contName} gelöscht`);
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

// Batch create containers
router.post('/batch', authMiddleware, requirePermission('containers.create'), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { containers } = req.body;

        if (!Array.isArray(containers) || containers.length === 0) {
            return res.status(400).json({ error: 'Keine Container zum Importieren gefunden' });
        }

        await connection.beginTransaction();

        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        const containerCache = {};

        for (const containerData of containers) {
            try {
                const {
                    name,
                    type,
                    description,
                    parent_container_name,
                    building,
                    floor,
                    room_number,
                    capacity
                } = containerData;

                if (!name || !type) {
                    throw new Error('Name und Typ sind erforderlich');
                }

                // Check if name already exists
                const [existing] = await connection.query(
                    'SELECT id FROM containers WHERE name = ?',
                    [name]
                );

                if (existing.length > 0) {
                    throw new Error(`Container mit Name "${name}" existiert bereits`);
                }

                // Lookup parent_container_id if name is provided
                let parent_container_id = null;
                if (parent_container_name) {
                    if (containerCache[parent_container_name]) {
                        parent_container_id = containerCache[parent_container_name];
                    } else {
                        const [parents] = await connection.query(
                            'SELECT id FROM containers WHERE name = ?',
                            [parent_container_name]
                        );
                        if (parents.length > 0) {
                            parent_container_id = parents[0].id;
                            containerCache[parent_container_name] = parent_container_id;
                        } else {
                            // Instead of failing, we could just leave it null or report a warning
                            // For batch import, it's often better to just warn or skip the link
                        }
                    }
                }

                const qr_code = generateQRId('CONT');

                await connection.query(
                    `INSERT INTO containers 
                     (name, type, description, parent_container_id, building, floor, room_number, capacity, qr_code) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [name, type, description || null, parent_container_id, building || null, floor || null, room_number || null, capacity || 0, qr_code]
                );

                results.success++;
            } catch (err) {
                results.failed++;
                results.errors.push({
                    item: containerData.name || 'Unbekannt',
                    error: err.message
                });
            }
        }

        await connection.commit();
        await logActivity(req.user.id, 'CONTAINER_IMPORT', `${results.success} Container importiert`);
        res.json(results);
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Batch create containers error:', error);
        res.status(500).json({ error: 'Serverfehler beim Batch-Import' });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;
