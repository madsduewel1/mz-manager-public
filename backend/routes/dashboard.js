const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

// Get dashboard statistics
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        // Count defective assets
        const [defectiveAssets] = await pool.query(
            'SELECT COUNT(*) as count FROM assets WHERE status = ?',
            ['defekt']
        );

        // Count assets in repair
        const [repairAssets] = await pool.query(
            'SELECT COUNT(*) as count FROM assets WHERE status = ?',
            ['in_reparatur']
        );

        // Count overdue lendings
        const [overdueLendings] = await pool.query(
            'SELECT COUNT(*) as count FROM lendings WHERE returned = FALSE AND planned_end_date < NOW()'
        );

        // Count active lendings
        const [activeLendings] = await pool.query(
            'SELECT COUNT(*) as count FROM lendings WHERE returned = FALSE'
        );

        // Count total containers
        const [totalContainers] = await pool.query(
            'SELECT COUNT(*) as count FROM containers'
        );

        // Count total assets
        const [totalAssets] = await pool.query(
            'SELECT COUNT(*) as count FROM assets'
        );

        // Count open error reports
        const [openErrors] = await pool.query(
            'SELECT COUNT(*) as count FROM error_reports WHERE status = ?',
            ['offen']
        );

        // Get assets by location/container
        const [assetsByLocation] = await pool.query(
            `SELECT c.name as location, COUNT(a.id) as count
       FROM containers c
       LEFT JOIN assets a ON c.id = a.container_id
       GROUP BY c.id, c.name
       ORDER BY count DESC
       LIMIT 10`
        );

        // Get recent error reports
        const [recentErrors] = await pool.query(
            `SELECT er.*, 
              a.inventory_number,
              a.type as asset_type
       FROM error_reports er
       LEFT JOIN assets a ON er.asset_id = a.id
       WHERE er.status = 'offen'
       ORDER BY er.created_at DESC
       LIMIT 5`
        );

        // Get upcoming returns
        const [upcomingReturns] = await pool.query(
            `SELECT l.*,
              a.inventory_number,
              c.name as container_name
       FROM lendings l
       LEFT JOIN assets a ON l.asset_id = a.id
       LEFT JOIN containers c ON l.container_id = c.id
       WHERE l.returned = FALSE AND l.planned_end_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY)
       ORDER BY l.planned_end_date ASC
       LIMIT 5`
        );

        res.json({
            statistics: {
                defective_assets: defectiveAssets[0].count,
                repair_assets: repairAssets[0].count,
                overdue_lendings: overdueLendings[0].count,
                active_lendings: activeLendings[0].count,
                total_containers: totalContainers[0].count,
                total_assets: totalAssets[0].count,
                open_error_reports: openErrors[0].count
            },
            assets_by_location: assetsByLocation,
            recent_errors: recentErrors,
            upcoming_returns: upcomingReturns
        });
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({ error: 'Serverfehler beim Abrufen der Dashboard-Daten' });
    }
});

module.exports = router;
