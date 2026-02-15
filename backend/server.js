const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { testConnection } = require('./config/database');
const { authMiddleware } = require('./middleware/auth');
const multer = require('multer');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const assetRoutes = require('./routes/assets');
const containerRoutes = require('./routes/containers');
const lendingRoutes = require('./routes/lendings');
const errorRoutes = require('./routes/errors');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'MZ-Manager API is running' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/containers', containerRoutes);
app.use('/api/lendings', lendingRoutes);
app.use('/api/errors', errorRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Logs route for frontend
app.get('/api/logs', authMiddleware, async (req, res) => {
    try {
        const [logs] = await require('./config/database').pool.query(`
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

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint nicht gefunden' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);

    if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: `Upload-Fehler: ${err.message}` });
    }

    res.status(500).json({
        error: 'Interner Serverfehler',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
async function startServer() {
    // Test database connection
    const dbConnected = await testConnection();

    if (!dbConnected) {
        console.error('⚠️  Server startet OHNE Datenbankverbindung');
        console.error('⚠️  Bitte überprüfen Sie die Datenbankkonfiguration in der .env Datei');
    }

    app.listen(PORT, () => {
        console.log(`\n${'='.repeat(50)}`);
        console.log(`🚀 MZ-Manager Backend Server gestartet`);
        console.log(`📍 Port: ${PORT}`);
        console.log(`🌐 URL: http://localhost:${PORT}`);
        console.log(`${'='.repeat(50)}\n`);
    });
}

startServer();
