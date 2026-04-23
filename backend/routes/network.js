const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authMiddleware, requirePermission } = require('../middleware/auth');

// Middleware to check if Network Module is enabled
const checkModuleEnabled = async (req, res, next) => {
    try {
        const [rows] = await pool.query('SELECT setting_value FROM settings WHERE setting_key = ?', ['module_network_enabled']);
        if (rows.length === 0 || rows[0].setting_value !== 'true') {
            return res.status(403).json({ error: 'Modul Netzwerk ist deaktiviert' });
        }
        next();
    } catch (error) {
        console.error('Check module enabled error:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
};

// GET /api/network/devices - List all devices with network info
router.get('/devices', authMiddleware, checkModuleEnabled, requirePermission('network.view'), async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                a.id, a.inventory_number, a.type, a.model, a.manufacturer, a.status,
                a.ip_address, a.mac_address, a.dhcp_enabled, a.switch_name, a.port_number, a.network_role,
                v.vlan_id, v.name as vlan_name, v.subnet as vlan_subnet,
                c.name as container_name, c.location
            FROM assets a
            LEFT JOIN network_vlans v ON a.network_vlan_id = v.id
            LEFT JOIN containers c ON a.container_id = c.id
            ORDER BY v.vlan_id ASC, a.ip_address ASC
        `);
        res.json(rows);
    } catch (error) {
        console.error('Get network devices error:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});

// GET /api/network/vlans - List all VLANs
router.get('/vlans', authMiddleware, checkModuleEnabled, requirePermission('network.view'), async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM network_vlans ORDER BY vlan_id ASC');
        res.json(rows);
    } catch (error) {
        console.error('Get vlans error:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});

// POST /api/network/vlans - Create/Update VLAN
router.post('/vlans', authMiddleware, checkModuleEnabled, requirePermission('network.admin'), async (req, res) => {
    const { id, vlan_id, name, subnet, description } = req.body;

    if (!vlan_id || !name) {
        return res.status(400).json({ error: 'VLAN-ID und Name sind erforderlich' });
    }

    try {
        if (id) {
            // Update
            await pool.query(
                'UPDATE network_vlans SET vlan_id = ?, name = ?, subnet = ?, description = ? WHERE id = ?',
                [vlan_id, name, subnet, description, id]
            );
            res.json({ message: 'VLAN aktualisiert' });
        } else {
            // Create
            const [result] = await pool.query(
                'INSERT INTO network_vlans (vlan_id, name, subnet, description) VALUES (?, ?, ?, ?)',
                [vlan_id, name, subnet, description]
            );
            res.status(201).json({ message: 'VLAN erstellt', id: result.insertId });
        }
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'VLAN-ID existiert bereits' });
        }
        console.error('Save vlan error:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});

// DELETE /api/network/vlans/:id
router.delete('/vlans/:id', authMiddleware, checkModuleEnabled, requirePermission('network.admin'), async (req, res) => {
    try {
        await pool.query('DELETE FROM network_vlans WHERE id = ?', [req.params.id]);
        res.json({ message: 'VLAN gelöscht' });
    } catch (error) {
        console.error('Delete vlan error:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});

// POST /api/network/assign - Update device network info
router.post('/assign', authMiddleware, checkModuleEnabled, requirePermission('network.edit'), async (req, res) => {
    const {
        asset_id,
        network_vlan_id,
        ip_address,
        mac_address,
        dhcp_enabled,
        switch_name,
        port_number,
        network_role
    } = req.body;

    if (!asset_id) {
        return res.status(400).json({ error: 'Asset-ID ist erforderlich' });
    }

    try {
        // Validation: IP Conflict in same VLAN (if IP is provided and not DHCP)
        if (ip_address && !dhcp_enabled) {
            const [existing] = await pool.query(
                'SELECT id FROM assets WHERE ip_address = ? AND network_vlan_id = ? AND id != ?',
                [ip_address, network_vlan_id, asset_id]
            );
            if (existing.length > 0) {
                return res.status(400).json({ error: `IP-Adresse ${ip_address} wird bereits in diesem VLAN verwendet` });
            }
        }

        await pool.query(
            `UPDATE assets SET 
                network_vlan_id = ?, 
                ip_address = ?, 
                mac_address = ?, 
                dhcp_enabled = ?, 
                switch_name = ?, 
                port_number = ?, 
                network_role = ? 
            WHERE id = ?`,
            [network_vlan_id || null, ip_address || null, mac_address || null, dhcp_enabled ? 1 : 0, switch_name || null, port_number || null, network_role || 'Client', asset_id]
        );

        res.json({ message: 'Netzwerkkonfiguration aktualisiert' });
    } catch (error) {
        console.error('Assign network error:', error);
        res.status(500).json({ error: 'Serverfehler' });
    }
});

module.exports = router;
