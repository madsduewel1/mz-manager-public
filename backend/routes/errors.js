const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { pool } = require('../config/database');
const { authMiddleware, requireRole, requirePermission } = require('../middleware/auth');

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'error-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Nur Bilder sind erlaubt (JPEG, PNG, GIF, WebP)'));
        }
    }
});

// Get all error reports (authenticated users only)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { status } = req.query;

        let query = `
      SELECT er.*, 
             a.inventory_number as asset_inventory,
             a.type as asset_type,
             c.name as container_name,
             u.username as assigned_to_name
      FROM error_reports er
      LEFT JOIN assets a ON er.asset_id = a.id
      LEFT JOIN containers c ON er.container_id = c.id
      LEFT JOIN users u ON er.assigned_to = u.id
      WHERE 1=1
    `;
        const params = [];

        if (status) {
            query += ' AND er.status = ?';
            params.push(status);
        }

        query += ' ORDER BY er.created_at DESC';

        const [reports] = await pool.query(query, params);
        res.json(reports);
    } catch (error) {
        console.error('Get error reports error:', error);
        res.status(500).json({ error: 'Serverfehler beim Abrufen der Fehlermeldungen' });
    }
});

// PUBLIC: Get asset/container info by QR code (NO AUTH REQUIRED)
router.get('/public/:qr_code', async (req, res) => {
    try {
        const { qr_code } = req.params;

        // Try to find asset
        const [assets] = await pool.query(
            `SELECT a.*, c.name as container_name
       FROM assets a
       LEFT JOIN containers c ON a.container_id = c.id
       WHERE a.qr_code = ?`,
            [qr_code]
        );

        if (assets.length > 0) {
            return res.json({
                type: 'asset',
                data: {
                    id: assets[0].id,
                    inventory_number: assets[0].inventory_number,
                    type: assets[0].type,
                    model: assets[0].model,
                    container_name: assets[0].container_name,
                    qr_code: assets[0].qr_code
                }
            });
        }

        // Try to find container
        const [containers] = await pool.query(
            'SELECT id, name, type, location, qr_code FROM containers WHERE qr_code = ?',
            [qr_code]
        );

        if (containers.length > 0) {
            // Get assets in container
            const [containerAssets] = await pool.query(
                'SELECT id, inventory_number, type, model, status FROM assets WHERE container_id = ?',
                [containers[0].id]
            );

            return res.json({
                type: 'container',
                data: {
                    ...containers[0],
                    assets: containerAssets
                }
            });
        }

        res.status(404).json({ error: 'QR-Code nicht gefunden' });
    } catch (error) {
        console.error('Get public info error:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});

// PUBLIC: Submit error report (NO AUTH REQUIRED)
router.post('/public', upload.single('photo'), async (req, res) => {
    try {
        const { qr_code, description, reporter_name, reporter_email, selected_asset_id } = req.body;

        if (!qr_code || !description) {
            return res.status(400).json({ error: 'QR-Code und Beschreibung sind erforderlich' });
        }

        let asset_id = selected_asset_id || null;
        let container_id = null;

        // Find what the QR code belongs to
        if (!asset_id) {
            const [assets] = await pool.query('SELECT id FROM assets WHERE qr_code = ?', [qr_code]);

            if (assets.length > 0) {
                asset_id = assets[0].id;
            } else {
                const [containers] = await pool.query('SELECT id FROM containers WHERE qr_code = ?', [qr_code]);

                if (containers.length > 0) {
                    container_id = containers[0].id;
                } else {
                    return res.status(404).json({ error: 'QR-Code nicht gefunden' });
                }
            }
        }

        const photo_path = req.file ? req.file.filename : null;

        // Insert error report
        const [result] = await pool.query(
            `INSERT INTO error_reports 
       (asset_id, container_id, description, photo_path, reporter_name, reporter_email, status, priority) 
       VALUES (?, ?, ?, ?, ?, ?, 'offen', 'mittel')`,
            [asset_id, container_id, description, photo_path, reporter_name, reporter_email]
        );

        // Update asset status to defekt if it's an asset
        if (asset_id) {
            await pool.query(
                'UPDATE assets SET status = ? WHERE id = ?',
                ['defekt', asset_id]
            );

            await pool.query(
                'INSERT INTO asset_history (asset_id, action, details) VALUES (?, ?, ?)',
                [asset_id, 'status_changed', 'Fehlermeldung eingegangen - auf defekt gesetzt']
            );
        }

        res.status(201).json({
            message: 'Fehlermeldung erfolgreich eingereicht',
            report_id: result.insertId
        });
    } catch (error) {
        console.error('Submit error report error:', error);
        res.status(500).json({ error: 'Serverfehler beim Einreichen der Fehlermeldung' });
    }
});

// Update error report status
router.put('/:id', authMiddleware, requirePermission('errors.manage'), async (req, res) => {
    try {
        const { id } = req.params;
        const { status, priority, assigned_to, resolution_notes } = req.body;

        await pool.query(
            `UPDATE error_reports 
       SET status = ?, priority = ?, assigned_to = ?, resolution_notes = ?
       WHERE id = ?`,
            [status, priority, assigned_to, resolution_notes, id]
        );

        res.json({ message: 'Fehlermeldung erfolgreich aktualisiert' });
    } catch (error) {
        console.error('Update error report error:', error);
        res.status(500).json({ error: 'Serverfehler beim Aktualisieren der Fehlermeldung' });
    }
});

module.exports = router;
