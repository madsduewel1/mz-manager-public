const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mz_manager',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Test connection
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ MySQL Database connected successfully');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
}

// Auto-migration for schema updates
async function runMigrations() {
    try {
        const connection = await pool.getConnection();
        
        // Check if assets table has 'name' column
        const [columns] = await connection.query('SHOW COLUMNS FROM assets LIKE "name"');
        if (columns.length === 0) {
            console.log('🔄 Adding missing "name" column to assets table...');
            await connection.query('ALTER TABLE assets ADD COLUMN name VARCHAR(255) AFTER id');
            console.log('✅ Column "name" added successfully');
        }
        
        connection.release();
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
    }
}

module.exports = { pool, testConnection, runMigrations };
