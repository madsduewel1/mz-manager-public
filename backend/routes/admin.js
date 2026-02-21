const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authMiddleware, requireRole, requirePermission } = require('../middleware/auth');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const { generateQRCodeBuffer } = require('../utils/qrcode');

// --- Device Models ---
router.get('/device-models', authMiddleware, async (req, res) => {
    try {
        const [models] = await pool.query('SELECT * FROM device_models ORDER BY manufacturer, model_name');
        res.json(models);
    } catch (error) {
        // If table doesn't exist yet, return empty array instead of error
        if (error.code === 'ER_NO_SUCH_TABLE') return res.json([]);
        console.error('Get models error:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});

router.post('/device-models', authMiddleware, requirePermission('models.manage'), async (req, res) => {
    try {
        const { type, manufacturer, model_name, description } = req.body;
        await pool.query(
            'INSERT INTO device_models (type, manufacturer, model_name, description) VALUES (?, ?, ?, ?)',
            [type, manufacturer, model_name, description]
        );
        res.status(201).json({ message: 'Modell erstellt' });
    } catch (error) {
        console.error('Create model error:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});

router.delete('/device-models/:id', authMiddleware, requirePermission('models.manage'), async (req, res) => {
    try {
        await pool.query('DELETE FROM device_models WHERE id = ?', [req.params.id]);
        res.json({ message: 'Modell gelöscht' });
    } catch (error) {
        console.error('Delete model error:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});

// --- Rooms (Refactored to use containers table) ---
router.get('/rooms', authMiddleware, async (req, res) => {
    try {
        const [rooms] = await pool.query("SELECT * FROM containers WHERE type = 'raum' ORDER BY name");
        res.json(rooms);
    } catch (error) {
        console.error('Get rooms error:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});

router.post('/rooms', authMiddleware, requirePermission('rooms.manage'), async (req, res) => {
    try {
        const { name, building, floor, capacity } = req.body;

        // Use container generation logic
        const { generateQRId } = require('../utils/qrcode');
        const qr_code = generateQRId('CONT');

        await pool.query(
            "INSERT INTO containers (name, type, building, floor, qr_code, capacity) VALUES (?, 'raum', ?, ?, ?, ?)",
            [name, building, floor, qr_code, capacity || 0]
        );
        res.status(201).json({ message: 'Raum als Container erstellt', qr_code });
    } catch (error) {
        console.error('Create room error:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});

router.delete('/rooms/:id', authMiddleware, requirePermission('rooms.manage'), async (req, res) => {
    try {
        // Check if room has assets or sub-containers
        const [assets] = await pool.query('SELECT COUNT(*) as count FROM assets WHERE container_id = ?', [req.params.id]);
        const [sub] = await pool.query('SELECT COUNT(*) as count FROM containers WHERE parent_container_id = ?', [req.params.id]);

        if (assets[0].count > 0 || sub[0].count > 0) {
            return res.status(400).json({ error: 'Raum kann nicht gelöscht werden, da er noch Geräte oder Container enthält' });
        }

        await pool.query('DELETE FROM containers WHERE id = ? AND type = "raum"', [req.params.id]);
        res.json({ message: 'Raum gelöscht' });
    } catch (error) {
        console.error('Delete room error:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});

// --- Roles (DB-backed CRUD) ---
router.get('/roles', authMiddleware, async (req, res) => {
    try {
        const [roles] = await pool.query('SELECT * FROM roles ORDER BY is_system DESC, name');
        const [permissions] = await pool.query('SELECT * FROM role_permissions');

        const rolesWithPermissions = roles.map(role => ({
            ...role,
            permissions: permissions
                .filter(p => p.role_id === role.id)
                .map(p => p.permission)
        }));

        res.json(rolesWithPermissions);
    } catch (error) {
        // If tables don't exist yet, return default static roles
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.json([
                { id: 1, name: 'Administrator', is_system: true, permissions: ['all'] },
                { id: 2, name: 'Mediencoach', is_system: true, permissions: ['assets.manage', 'containers.manage', 'errors.manage', 'lendings.manage'] },
                { id: 3, name: 'Lehrer', is_system: true, permissions: ['lendings.create', 'errors.create', 'assets.view'] },
                { id: 4, name: 'Schüler', is_system: true, permissions: ['errors.create'] }
            ]);
        }
        console.error('Get roles error:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});

router.post('/roles', authMiddleware, requirePermission('roles.manage'), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { name, permissions } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Rollenname ist erforderlich' });
        }

        await connection.beginTransaction();

        // Insert the role
        const [result] = await connection.query(
            'INSERT INTO roles (name, is_system) VALUES (?, FALSE)',
            [name.trim()]
        );

        const roleId = result.insertId;

        // Insert permissions
        if (Array.isArray(permissions) && permissions.length > 0) {
            const values = permissions.map(p => [roleId, p]);
            await connection.query('INSERT INTO role_permissions (role_id, permission) VALUES ?', [values]);
        }

        await connection.commit();
        res.status(201).json({ message: 'Rolle erfolgreich erstellt', id: roleId });
    } catch (error) {
        if (connection) await connection.rollback();
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Eine Rolle mit diesem Namen existiert bereits' });
        }
        console.error('Create role error:', error);
        res.status(500).json({ error: 'Serverfehler' });
    } finally {
        if (connection) connection.release();
    }
});

// Update role
router.put('/roles/:id', authMiddleware, requirePermission('roles.manage'), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params;
        const { name, permissions } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Rollenname ist erforderlich' });
        }

        await connection.beginTransaction();

        // Check if role exists
        const [roles] = await connection.query('SELECT * FROM roles WHERE id = ?', [id]);
        if (roles.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Rolle nicht gefunden' });
        }

        // Update role name (if not system role, or just allow it but is_system stays same)
        await connection.query(
            'UPDATE roles SET name = ? WHERE id = ?',
            [name.trim(), id]
        );

        // Update permissions: Delete old ones and insert new ones
        await connection.query('DELETE FROM role_permissions WHERE role_id = ?', [id]);

        if (Array.isArray(permissions) && permissions.length > 0) {
            const values = permissions.map(p => [id, p]);
            await connection.query('INSERT INTO role_permissions (role_id, permission) VALUES ?', [values]);
        }

        await connection.commit();
        res.json({ message: 'Rolle erfolgreich aktualisiert' });
    } catch (error) {
        if (connection) await connection.rollback();
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Eine Rolle mit diesem Namen existiert bereits' });
        }
        console.error('Update role error:', error);
        res.status(500).json({ error: 'Serverfehler' });
    } finally {
        if (connection) connection.release();
    }
});

router.delete('/roles/:id', authMiddleware, requirePermission('roles.manage'), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params;

        await connection.beginTransaction();

        // Check if it's a system role
        const [roles] = await connection.query('SELECT * FROM roles WHERE id = ?', [id]);
        if (roles.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Rolle nicht gefunden' });
        }

        if (roles[0].is_system) {
            await connection.rollback();
            return res.status(400).json({ error: 'System-Rollen können nicht gelöscht werden' });
        }

        // 1. Remove permissions
        await connection.query('DELETE FROM role_permissions WHERE role_id = ?', [id]);

        // 2. Remove user assignments (using role_id)
        await connection.query('DELETE FROM user_roles WHERE role_id = ?', [id]);

        // 3. Remove the role itself
        await connection.query('DELETE FROM roles WHERE id = ?', [id]);

        await connection.commit();
        res.json({ message: 'Rolle gelöscht' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Delete role error:', error);
        res.status(500).json({ error: 'Serverfehler' });
    } finally {
        if (connection) connection.release();
    }
});

// --- QR-Code PDF Export ---
router.get('/export/qr-pdf/:id', authMiddleware, requirePermission('assets.view'), async (req, res) => {
    try {
        const { id } = req.params;
        const { type } = req.query; // 'asset' or undefined (defaults to container batch)

        let items = [];
        let title = '';

        // Fetch Org Name & Logo from settings
        let orgName = 'MZ-MANAGER';
        let logoPath = null;
        try {
            const [settingsRows] = await pool.query('SELECT * FROM settings');
            settingsRows.forEach(row => {
                if (row.setting_key === 'org_name') orgName = row.setting_value;
                if (row.setting_key === 'logo_path') logoPath = row.setting_value;
            });
        } catch (sError) {
            console.warn('Settings table missing or error');
        }

        if (type === 'asset') {
            // SINGLE ASSET EXPORT
            const [assetRows] = await pool.query('SELECT * FROM assets WHERE id = ?', [id]);
            if (assetRows.length === 0) return res.status(404).json({ error: 'Asset nicht gefunden' });
            const asset = assetRows[0];
            items = [{ label: asset.inventory_number, sublabel: asset.model || asset.type, qr_code: asset.qr_code }];
            title = `Export: ${asset.inventory_number}`;
        } else {
            // CONTAINER BATCH EXPORT
            const [containerRows] = await pool.query('SELECT * FROM containers WHERE id = ?', [id]);
            if (containerRows.length === 0) return res.status(404).json({ error: 'Container nicht gefunden' });
            const container = containerRows[0];
            const typeLabel = container.type === 'raum' ? 'Raum' : 'Container';

            // Get assets in this container
            const [assets] = await pool.query('SELECT * FROM assets WHERE container_id = ? ORDER BY inventory_number', [id]);

            items = [
                { label: container.name, sublabel: typeLabel, qr_code: container.qr_code },
                ...assets.map(a => ({ label: a.inventory_number, sublabel: a.model || a.type, qr_code: a.qr_code }))
            ];
            title = `QR-Codes: ${typeLabel} ${container.name}`;
        }

        const baseUrl = process.env.BASE_URL || 'http://localhost:5173';

        // 3. Create PDF
        const doc = new PDFDocument({ margin: 30, size: 'A4' });
        const cleanTitle = title.replace(/[^\x00-\x7F]/g, "").replace(/\s+/g, '_');
        const filename = `${cleanTitle}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        doc.pipe(res);

        // Header (only on first page)
        doc.fontSize(16).font('Helvetica-Bold').text(title, { align: 'center' });
        doc.moveDown(0.5);

        // Grid settings (Reverting to 3 columns with balanced wide aspect ratio)
        // A4 width (595pt) - margins (2 * 30) = 535pt.
        const itemsPerPage = 18;
        const colWidth = 175;  // 3 columns
        const rowHeight = 105; // Balanced landscape (175/105 = 1.66 ratio)
        const qrSize = 65;    // Large and clear
        const logoSize = 25;
        const textStartX = 75; // Space for QR

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const relativeIndex = i % itemsPerPage;

            if (i > 0 && relativeIndex === 0) {
                doc.addPage();
            }

            const col = relativeIndex % 3;
            const row = Math.floor(relativeIndex / 3);

            const x = 35 + col * colWidth;
            const y = 80 + row * rowHeight;

            // Generate QR Code Buffer
            const qrBuffer = await generateQRCodeBuffer(item.qr_code, baseUrl);

            // Draw Label background/border
            doc.rect(x, y, colWidth - 8, rowHeight - 8).lineWidth(0.1).strokeColor('#cccccc').stroke();

            // Add QR to PDF
            doc.image(qrBuffer, x + 5, y + 8, { width: qrSize });

            // Right side info
            const infoX = x + textStartX;

            // Branding: MZ MANAGER (Larger)
            doc.fontSize(14).font('Helvetica-Bold').fillColor('#e11d48').text('MZ', infoX, y + 6);
            doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000').text('MANAGER', infoX, y + 20);

            // Optional Logo (shifted right if present)
            if (logoPath) {
                const fullLogoPath = path.join(__dirname, '..', 'uploads', logoPath);
                if (fs.existsSync(fullLogoPath)) {
                    doc.image(fullLogoPath, infoX + 65, y + 6, { width: logoSize + 5 });
                }
            }

            // Separator line
            doc.moveTo(infoX, y + 36).lineTo(x + colWidth - 15, y + 36).lineWidth(0.5).strokeColor('#e11d48').stroke();

            // Item Name
            doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000').text(item.label, infoX, y + 42, { width: colWidth - textStartX - 15 });

            // Item Type/Model
            doc.fontSize(7).font('Helvetica').fillColor('#444444').text(item.sublabel, infoX, y + 54, { width: colWidth - textStartX - 15 });

            // QR-ID (Bottom right)
            doc.fontSize(6).font('Helvetica').fillColor('#888888').text(item.qr_code, infoX, y + rowHeight - 22);
        }

        doc.end();
    } catch (error) {
        console.error('PDF Export error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Fehler beim Generieren des PDFs' });
        }
    }
});

// --- Activity Logs ---
router.get('/logs', authMiddleware, requirePermission('logs.view'), async (req, res) => {
    try {
        const [logs] = await pool.query(`
            SELECT l.*, u.username as user
            FROM activity_logs l
            LEFT JOIN users u ON l.user_id = u.id
            ORDER BY l.timestamp DESC
            LIMIT 100
        `);
        res.json(logs);
    } catch (error) {
        console.error('Get logs error:', error);
        res.status(500).json({ error: 'Serverfehler beim Laden der Logs' });
    }
});

module.exports = router;
