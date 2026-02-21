const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/database');
const { authMiddleware, requirePermission } = require('../middleware/auth');

// Configure multer for logo upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, 'org-logo' + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) return cb(null, true);
        cb(new Error('Nur Bilder sind erlaubt'));
    }
});

// Get all settings
router.get('/', authMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM settings');
        const settings = rows.reduce((acc, row) => {
            acc[row.setting_key] = row.setting_value;
            return acc;
        }, { org_name: 'MZ-MANAGER', logo_path: null });
        res.json(settings);
    } catch (error) {
        if (error.code === 'ER_NO_SUCH_TABLE') return res.json({ org_name: 'MZ-MANAGER', logo_path: null });
        console.error('Get settings error:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});

// Update settings
router.post('/', authMiddleware, requirePermission('all'), async (req, res) => {
    try {
        const { org_name } = req.body;

        if (org_name !== undefined) {
            await pool.query(
                'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
                ['org_name', org_name, org_name]
            );
        }

        res.json({ message: 'Einstellungen aktualisiert' });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});

// Upload Logo
router.post('/logo', authMiddleware, requirePermission('all'), upload.single('logo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Keine Datei hochgeladen' });

        const logoPath = req.file.filename;
        await pool.query(
            'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
            ['logo_path', logoPath, logoPath]
        );

        res.json({ message: 'Logo hochgeladen', logo_path: logoPath });
    } catch (error) {
        console.error('Logo upload error:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});

module.exports = router;
