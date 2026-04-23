const { pool } = require('../config/database');

/**
 * Logs an activity to the database.
 * @param {number|null} user_id - The ID of the user performing the action.
 * @param {string} action - Short description of the action (e.g., 'USER_LOGIN').
 * @param {string} details - Detailed description of the action.
 */
async function logActivity(user_id, action, details) {
    try {
        await pool.query(
            'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
            [user_id, action, details]
        );
    } catch (error) {
        console.error('Failed to log activity:', error);
    }
}

module.exports = { logActivity };
