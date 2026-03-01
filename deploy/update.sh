#!/bin/bash

# MZ-Manager Update Script
# Dieses Script aktualisiert die Anwendung und führt notwendige Datenbank-Migrationen durch.

set -e

echo "🚀 Starte MZ-Manager Update..."

# 1. Repository aktualisieren
echo "📥 Hole neueste Änderungen von GitHub..."
git pull origin main

# 2. Datenbank-Migration
echo "🗄️ Führe Datenbank-Migrationen durch..."
# Hinweis: Wir nutzen node, um die Migration sicher auszuführen, falls .env vorhanden ist
cd backend
node -e "
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../backend/.env' });
(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  try {
    console.log('  - Prüfe Spalte initial_password...');
    const [cols] = await pool.query('SHOW COLUMNS FROM users LIKE \"initial_password\"');
    if (cols.length === 0) {
      await pool.query('ALTER TABLE users ADD COLUMN initial_password VARCHAR(255) AFTER theme');
      console.log('  ✅ Spalte initial_password hinzugefügt');
    }
    
    console.log('  - Setze E-Mail auf NULLABLE...');
    await pool.query('ALTER TABLE users MODIFY COLUMN email VARCHAR(100) NULL');
    console.log('  ✅ E-Mail Spalte angepasst');
    
  } catch (e) {
    console.error('  ❌ Migration fehlgeschlagen:', e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();"

# 3. Backend Abhängigkeiten
echo "📦 Aktualisiere Backend-Abhängigkeiten..."
npm install --production

# 4. Frontend Build
echo "🏗️ Baue Frontend neu..."
cd ../frontend
npm install
npm run build

# 5. Services Neustart
echo "🔄 Starte Services neu (PM2)..."
pm2 restart mz-manager-api || echo "⚠️ PM2 Prozess 'mz-manager-api' nicht gefunden. Bitte manuell starten."

echo "✨ Update erfolgreich abgeschlossen!"
