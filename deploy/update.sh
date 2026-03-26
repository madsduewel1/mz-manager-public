#!/bin/bash

# MZ-Manager Update Script
# Dieses Script aktualisiert die Anwendung und führt notwendige Datenbank-Migrationen durch.

set -e

# --- Styles ---
BOLD='\033[1m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# --- Icons ---
CHECK="✅"
INFO="ℹ️"
WARN="⚠️"
ERROR="❌"
SYNC="🔄"
UP="📤"
DOWN="📥"
DB="🗄️"
BUILD="🏗️"

# --- Functions ---
print_banner() {
    echo -e "${MAGENTA}${BOLD}"
    echo "  __  __ ________        __  __          _   _          _____ ______ _____  "
    echo " |  \/  |___  /\ \      / / |  |        | \ | |   /\   / ____|  ____|  __ \ "
    echo " | \  / |  / /  \ \    / /  |  |  ____  |  \| |  /  \ | |  __| |__  | |__) |"
    echo " | |\/| | / /    \ \  / /   |  | |____| | . \` | / /\ \| | |_ |  __| |  _  / "
    echo " | |  | |/ /__    \ \/ /    |  |____    | |\  |/ ____ \ |__| | |____| | \ \ "
    echo " |_|  |_/_____|    \__/     |______|    |_| \_/_/    \_\_____|______|_|  \_\\"
    echo -e "${NC}"
    echo -e "${BOLD}         >>> SYSTEM UPDATE MODULE <<<${NC}\n"
}

print_step() {
    echo -e "${BOLD}${CYAN}--- $2 ---${NC}"
}

print_success() {
    echo -e "${GREEN}${CHECK} $1${NC}\n"
}

clear
print_banner

# Step 1: Git Pull
print_step 1 "Hole neueste Änderungen von GitHub"
git pull origin main
print_success "Code aktualisiert"

# Step 2: Database Migrations
print_step 2 "Führe Datenbank-Migrationen durch"
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
    console.log('  - Spalte initial_password...');
    const [cols] = await pool.query('SHOW COLUMNS FROM users LIKE \"initial_password\"');
    if (cols.length === 0) {
      await pool.query('ALTER TABLE users ADD COLUMN initial_password VARCHAR(255) AFTER theme');
    }
    
    await pool.query('ALTER TABLE users MODIFY COLUMN email VARCHAR(100) NULL');

    const [tables] = await pool.query('SHOW TABLES LIKE \"error_report_comments\"');
    if (tables.length === 0) {
      const fs = require('fs');
      const path = require('path');
      const migrationPath = path.join(__dirname, 'database', 'migration_error_system.sql');
      if (fs.existsSync(migrationPath)) {
        const sql = fs.readFileSync(migrationPath, 'utf8');
        const queries = sql.split(';').filter(q => q.trim() !== '');
        for (let q of queries) await pool.query(q);
      }
    }
    
    const [netTables] = await pool.query('SHOW TABLES LIKE \"network_vlans\"');
    if (netTables.length === 0) {
      const fs = require('fs');
      const migrationPath = path.join(__dirname, 'database', 'migration_network_module.sql');
      if (fs.existsSync(migrationPath)) {
        const sql = fs.readFileSync(migrationPath, 'utf8');
        const queries = sql.split(';').filter(q => q.trim() !== '');
        for (let q of queries) await pool.query(q);
      }
    }

    const [accTables] = await pool.query('SHOW TABLES LIKE \"accessories\"');
    if (accTables.length === 0) {
      const fs = require('fs');
      const migrationPath = path.join(__dirname, 'database', 'migration_accessories_module.sql');
      if (fs.existsSync(migrationPath)) {
        const sql = fs.readFileSync(migrationPath, 'utf8');
        const queries = sql.split(';').filter(q => q.trim() !== '');
        for (let q of queries) await pool.query(q);
      }
    }

    const [lendCols] = await pool.query('SHOW COLUMNS FROM lendings LIKE \"accessory_id\"');
    if (lendCols.length === 0) {
      await pool.query('ALTER TABLE lendings ADD COLUMN accessory_id INT NULL AFTER container_id');
      await pool.query('ALTER TABLE lendings ADD CONSTRAINT fk_lending_accessory FOREIGN KEY (accessory_id) REFERENCES accessories(id) ON DELETE CASCADE');
    }

    const [errCols] = await pool.query('SHOW COLUMNS FROM error_reports LIKE \"category\"');
    if (errCols.length === 0) {
      await pool.query('ALTER TABLE error_reports ADD COLUMN category VARCHAR(50) NULL AFTER resolution_notes');
    }

    await pool.query('INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (\"module_accessories_enabled\", \"true\")');
    console.log('  ✅ Alle Datenbank-Migrationen erfolgreich');
  } catch (e) {
    console.error('  ❌ Migration fehlgeschlagen:', e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();"
print_success "Datenbank ist auf dem neuesten Stand"

# Step 3: Backend dependencies
print_step 3 "Aktualisiere Backend-Abhängigkeiten"
npm install --production
print_success "Backend-Pakete aktualisiert"

# Step 4: Frontend build
print_step 4 "Baue Frontend neu (🏗️)"
cd ../frontend
npm install
npm run build
print_success "Frontend erfolgreich gebaut"

# Step 5: Restart PM2
print_step 5 "Starte Services neu (PM2)"
pm2 restart mz-manager-api || echo -e "${YELLOW}${WARN} PM2 Prozess nicht gefunden. Bitte manuell starten.${NC}"
print_success "Services neu gestartet"

echo -e "${GREEN}${BOLD}✨ UPDATE ERFOLGREICH ABGESCHLOSSEN! ✨${NC}\n"
