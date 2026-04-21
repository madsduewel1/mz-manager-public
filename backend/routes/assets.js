const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authMiddleware, requireRole, requirePermission } = require('../middleware/auth');
const { logActivity } = require('../utils/logger');
const { generateQRId, generateQRCode } = require('../utils/qrcode');

// Get all assets
router.get('/', authMiddleware, requirePermission('assets.view'), async (req, res) => {
    try {
        const { status, type, container_id } = req.query;

        let query = `
      SELECT a.*, c.name as container_name, pc.name as parent_container_name 
      FROM assets a 
      LEFT JOIN containers c ON a.container_id = c.id
      LEFT JOIN containers pc ON c.parent_container_id = pc.id
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

// Lookup entity by QR code (for scanner navigation)
router.get('/lookup/qr/:qrCode', authMiddleware, async (req, res) => {
    try {
        const { qrCode } = req.params;

        // 1. Check assets
        const [assets] = await pool.query(
            'SELECT id, inventory_number, type, model FROM assets WHERE qr_code = ?',
            [qrCode]
        );

        if (assets.length > 0) {
            return res.json({ ...assets[0], entityType: 'asset' });
        }

        // 2. Check containers (including rooms)
        const [containers] = await pool.query(
            'SELECT id, name, type FROM containers WHERE qr_code = ?',
            [qrCode]
        );

        if (containers.length > 0) {
            return res.json({
                id: containers[0].id,
                name: containers[0].name,
                type: containers[0].type,
                entityType: 'container'
            });
        }

        res.status(404).json({ error: 'Nichts unter diesem QR-Code gefunden' });
    } catch (error) {
        console.error('Lookup QR error:', error);
        res.status(500).json({ error: 'Serverfehler beim Suchen des QR-Codes' });
    }
});

// Get single asset
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const isNumeric = /^\d+$/.test(id);

        let query = `
            SELECT a.*, c.name as container_name 
            FROM assets a 
            LEFT JOIN containers c ON a.container_id = c.id
            WHERE `;
        
        if (isNumeric) {
            query += 'a.id = ?';
        } else {
            query += 'a.inventory_number = ?';
        }

        const [assets] = await pool.query(query, [id]);

        if (assets.length === 0) {
            return res.status(404).json({ error: 'Asset nicht gefunden' });
        }

        const asset = assets[0];

        // Fetch assigned accessories
        const [accessories] = await pool.query(
            'SELECT * FROM accessories WHERE assigned_device_id = ? ORDER BY name ASC',
            [asset.id]
        );

        res.json({
            ...asset,
            accessories: accessories
        });
    } catch (error) {
        console.error('Get asset error:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});

// Create new asset
router.post('/', authMiddleware, requirePermission('assets.create'), async (req, res) => {
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
            notes,
            is_reportable,
            is_lendable,
            is_network_integrated,
            mac_address
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

        // Parse container_id to null if it's an empty string
        const parsedContainerId = container_id === '' ? null : container_id;

        // Insert asset
        const [result] = await pool.query(
            `INSERT INTO assets 
       (inventory_number, serial_number, type, model, manufacturer, status, container_id, qr_code, purchase_date, warranty_until, notes, is_reportable, is_lendable, is_network_integrated, mac_address) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                inventory_number, 
                serial_number || null, 
                type, 
                model || null, 
                manufacturer || null, 
                status || 'ok', 
                parsedContainerId, 
                qr_code, 
                purchase_date || null, 
                warranty_until || null, 
                notes || null,
                is_reportable !== undefined ? is_reportable : true,
                is_lendable !== undefined ? is_lendable : true,
                is_network_integrated !== undefined ? is_network_integrated : false,
                mac_address || null
            ]
        );

        // Add to history
        await pool.query(
            'INSERT INTO asset_history (asset_id, action, details, created_by) VALUES (?, ?, ?, ?)',
            [result.insertId, 'created', 'Asset erstellt', req.user.id]
        );

        await logActivity(req.user.id, 'ASSET_CREATE', `Gerät ${inventory_number} angelegt`);

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
router.put('/:id', authMiddleware, requirePermission('assets.edit'), async (req, res) => {
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
            notes,
            is_reportable,
            is_lendable,
            is_network_integrated,
            mac_address
        } = req.body;

        // Get old values for history
        const [oldAsset] = await pool.query('SELECT * FROM assets WHERE id = ?', [id]);

        if (oldAsset.length === 0) {
            return res.status(404).json({ error: 'Asset nicht gefunden' });
        }

        // Parse container_id to null if it's an empty string
        const parsedContainerId = container_id === '' ? null : container_id;

        // Update asset
        await pool.query(
            `UPDATE assets 
       SET inventory_number = ?, serial_number = ?, type = ?, model = ?, manufacturer = ?, 
           status = ?, container_id = ?, purchase_date = ?, warranty_until = ?, notes = ?,
           is_reportable = ?, is_lendable = ?, is_network_integrated = ?, mac_address = ?
       WHERE id = ?`,
            [
                inventory_number, 
                serial_number || null, 
                type, 
                model || null, 
                manufacturer || null, 
                status, 
                parsedContainerId, 
                purchase_date || null, 
                warranty_until || null, 
                notes || null,
                is_reportable !== undefined ? is_reportable : true,
                is_lendable !== undefined ? is_lendable : true,
                is_network_integrated !== undefined ? is_network_integrated : false,
                mac_address || null,
                id
            ]
        );

        // Add to history if status changed
        if (oldAsset[0].status !== status) {
            await pool.query(
                'INSERT INTO asset_history (asset_id, action, details, old_value, new_value, created_by) VALUES (?, ?, ?, ?, ?, ?)',
                [id, 'status_changed', 'Status geändert', oldAsset[0].status, status, req.user.id]
            );
        }

        await logActivity(req.user.id, 'ASSET_UPDATE', `Gerät ${inventory_number} bearbeitet`);
        res.json({ message: 'Asset erfolgreich aktualisiert' });
    } catch (error) {
        console.error('Update asset error:', error);
        res.status(500).json({ error: 'Serverfehler beim Aktualisieren des Assets' });
    }
});

// Delete asset
router.delete('/:id', authMiddleware, requirePermission('assets.delete'), async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch inventory_number for log before deleting
        const [asset] = await pool.query('SELECT inventory_number FROM assets WHERE id = ?', [id]);
        const invNumber = asset.length > 0 ? asset[0].inventory_number : id;

        const [result] = await pool.query('DELETE FROM assets WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Asset nicht gefunden' });
        }

        await logActivity(req.user.id, 'ASSET_DELETE', `Gerät ${invNumber} gelöscht`);
        res.json({ message: 'Asset erfolgreich gelöscht' });
    } catch (error) {
        console.error('Delete asset error:', error);
        res.status(500).json({ error: 'Serverfehler beim Löschen des Assets' });
    }
});

// Get asset history
router.get('/:id/history', authMiddleware, requirePermission('assets.history'), async (req, res) => {
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

// Batch create assets
router.post('/batch', authMiddleware, requirePermission('assets.create'), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { assets } = req.body;

        if (!Array.isArray(assets) || assets.length === 0) {
            return res.status(400).json({ error: 'Keine Assets zum Importieren gefunden' });
        }

        await connection.beginTransaction();

        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        // Cache for container names to IDs to avoid redundant queries
        const containerCache = {};

        for (const assetData of assets) {
            try {
                const {
                    inventory_number,
                    serial_number,
                    type,
                    model,
                    manufacturer,
                    status,
                    container_name,
                    purchase_date,
                    warranty_until,
                    notes
                } = assetData;

                if (!inventory_number || !type) {
                    throw new Error('Inventarnummer und Typ sind erforderlich');
                }

                // Check if inventory number already exists
                const [existing] = await connection.query(
                    'SELECT id FROM assets WHERE inventory_number = ?',
                    [inventory_number]
                );

                if (existing.length > 0) {
                    throw new Error(`Inventarnummer ${inventory_number} bereits vergeben`);
                }

                // Lookup container_id if name is provided
                let container_id = null;
                if (container_name) {
                    if (containerCache[container_name]) {
                        container_id = containerCache[container_name];
                    } else {
                        const [containers] = await connection.query(
                            'SELECT id FROM containers WHERE name = ?',
                            [container_name]
                        );
                        if (containers.length > 0) {
                            container_id = containers[0].id;
                            containerCache[container_name] = container_id;
                        }
                    }
                }

                const qr_code = generateQRId('ASSET');

                const [result] = await connection.query(
                    `INSERT INTO assets 
                     (inventory_number, serial_number, type, model, manufacturer, status, container_id, qr_code, purchase_date, warranty_until, notes) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [inventory_number, serial_number || null, type, model || null, manufacturer || null, status || 'ok', container_id, qr_code, purchase_date || null, warranty_until || null, notes || null]
                );

                await connection.query(
                    'INSERT INTO asset_history (asset_id, action, details, created_by) VALUES (?, ?, ?, ?)',
                    [result.insertId, 'created', 'Asset via Import erstellt', req.user.id]
                );

                results.success++;
            } catch (err) {
                results.failed++;
                results.errors.push({
                    item: assetData.inventory_number || 'Unbekannt',
                    error: err.message
                });
            }
        }

        await connection.commit();
        await logActivity(req.user.id, 'ASSET_IMPORT', `${results.success} Geräte importiert`);
        res.json(results);
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Batch create assets error:', error);
        res.status(500).json({ error: 'Serverfehler beim Batch-Import' });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;
