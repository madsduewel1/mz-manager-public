const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authMiddleware, requireRole, requirePermission } = require('../middleware/auth');
const PDFDocument = require('pdfkit');
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
router.get('/export/qr-pdf/:containerId', authMiddleware, requirePermission('assets.view'), async (req, res) => {
    try {
        const { containerId } = req.params;
        const baseUrl = process.env.BASE_URL || 'http://localhost:5173';

        // 1. Get container info
        const [containers] = await pool.query('SELECT * FROM containers WHERE id = ?', [containerId]);
        if (containers.length === 0) return res.status(404).json({ error: 'Container nicht gefunden' });
        const container = containers[0];

        // 2. Get assets in this container
        const [assets] = await pool.query('SELECT * FROM assets WHERE container_id = ? ORDER BY inventory_number', [containerId]);

        // 3. Create PDF
        const doc = new PDFDocument({ margin: 50 });
        const filename = `QR_Codes_${container.name.replace(/[^\x00-\x7F]/g, "").replace(/\s+/g, '_')}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        doc.pipe(res);

        // Header
        doc.fontSize(20).text(`QR-Codes: ${container.name}`, { align: 'center' });
        doc.moveDown();

        // Items list
        const items = [
            { label: `Container: ${container.name}`, qr_code: container.qr_code },
            ...assets.map(a => ({ label: `${a.inventory_number} - ${a.model || a.type}`, qr_code: a.qr_code }))
        ];

        // Grid settings (3x5 labels per page usually works well for labels)
        const itemsPerPage = 8; // 2x4 grid for readability
        const qrSize = 140;
        const spacingX = 260;
        const spacingY = 180;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const relativeIndex = i % itemsPerPage;

            if (i > 0 && relativeIndex === 0) {
                doc.addPage();
            }

            const col = relativeIndex % 2;
            const row = Math.floor(relativeIndex / 2);

            const x = 60 + col * spacingX;
            const y = 80 + row * spacingY;

            // Generate QR Code Buffer
            const qrBuffer = await generateQRCodeBuffer(item.qr_code, baseUrl);

            // Add to PDF
            doc.image(qrBuffer, x, y, { width: qrSize });
            doc.fontSize(9).font('Helvetica-Bold').text(item.label, x, y + qrSize + 5, { width: qrSize, align: 'center' });
            doc.fontSize(7).font('Helvetica').text(item.qr_code, x, y + qrSize + 18, { width: qrSize, align: 'center' });

            // Subtle border for cutting
            doc.rect(x - 5, y - 5, qrSize + 10, qrSize + 35).lineWidth(0.2).strokeColor('#cccccc').stroke();
        }

        doc.end();
    } catch (error) {
        console.error('PDF Export error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Fehler beim Generieren des PDFs' });
        }
    }
});

module.exports = router;
