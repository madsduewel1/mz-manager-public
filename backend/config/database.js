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
        }

        // Add missing boolean flags
        const [repCol] = await connection.query('SHOW COLUMNS FROM assets LIKE "is_reportable"');
        if (repCol.length === 0) {
            console.log('🔄 Adding boolean flags to assets table...');
            await connection.query('ALTER TABLE assets ADD COLUMN is_reportable BOOLEAN DEFAULT TRUE AFTER notes');
            await connection.query('ALTER TABLE assets ADD COLUMN is_lendable BOOLEAN DEFAULT TRUE AFTER is_reportable');
            await connection.query('ALTER TABLE assets ADD COLUMN is_network_integrated BOOLEAN DEFAULT FALSE AFTER is_lendable');
        }

        // Expand Type Enum (sicherstellen dass alle Typen erlaubt sind)
        console.log('🔄 Updating asset types enum...');
        await connection.query(`ALTER TABLE assets MODIFY COLUMN type ENUM(
            'laptop', 'ipad', 'tablet', 'pc', 'apple_tv', 'beamer', 'monitor', 
            'dokumentenkamera', 'drucker', 'lautsprecher', 'mikrofon', 'kamera', 
            'ladegeraet', 'adapter', 'maus', 'tastatur', 'sonstiges'
        ) NOT NULL`);
        
        console.log('🔄 Creating help_entries table if not exists...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS help_entries (
                id INT AUTO_INCREMENT PRIMARY KEY,
                module VARCHAR(100) NOT NULL,
                permission_required VARCHAR(100) NOT NULL,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                order_index INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_module (module),
                INDEX idx_permission (permission_required)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Insert some default help entries
        console.log('🔄 Seeding default help entries...');
        await connection.query(`
            INSERT IGNORE INTO help_entries (id, module, permission_required, title, content, order_index) VALUES
            (1, 'dashboard', 'all', 'Willkommen im Dashboard', '<p>Hier siehst du alle wichtigen Statistiken auf einen Blick. Klicke auf die Kacheln für mehr Details.</p>', 1),
            (2, 'assets', 'assets.view', 'Geräte verwalten', '<p>Hier kannst du neue Geräte anlegen, bearbeiten und deren Status ändern. Achte darauf, dass jedes Gerät einen eindeutigen Namen hat.</p>', 1),
            (3, 'containers', 'containers.view', 'Container nutzen', '<p>Container dienen dazu, mehrere Geräte zu gruppieren (z.B. iPad-Koffer). Du kannst auch Räume als Container anlegen.</p>', 1),
            (4, 'lendings', 'lendings.view', 'Ausleihen', '<p>Hier kannst du sehen, wer welches Gerät aktuell ausgeliehen hat. Vergiss nicht, die geplante Rückgabezeit im Auge zu behalten.</p>', 1),
            (5, 'admin', 'admin.view', 'Verwaltung', '<p>Als Administrator hast du Zugriff auf Benutzer-, Rollen- und Systemeinstellungen. Handle hier mit Vorsicht!</p>', 1);
        `);

        console.log('✅ Database migration successful');
        connection.release();
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
    }
}

module.exports = { pool, testConnection, runMigrations };
