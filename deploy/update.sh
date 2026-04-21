#!/bin/bash

# ==============================================================================
# MZ-MANAGER UPDATE SCRIPT
# ==============================================================================
# Aktualisiert die MZ-Manager Installation sicher:
#   1. Pre-Update Check (Services, DB, Festplatte)
#   2. Git Pull (Code aktualisieren)
#   3. Datenbank-Migrationen (sicher & idempotent)
#   4. Backend Dependencies
#   5. Frontend Build
#   6. Berechtigungen setzen
#   7. Services neustarten
#   8. Post-Update Health Check
# ==============================================================================

set -e

# --- Styles & Farben ---
BOLD='\033[1m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
BLUE='\033[0;34m'
NC='\033[0m'

# --- Icons ---
CHECK="✅"
INFO="ℹ️"
WARN="⚠️"
ERROR="❌"
ROCKET="🚀"
DB="💾"
BUILD="🏗️"
SYNC="🔄"

# --- Pfade ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
ENV_FILE="$BACKEND_DIR/.env"
LOG_FILE="/var/log/mz-manager-update.log"

# --- Funktionen ---
print_banner() {
    echo -e "${PURPLE}${BOLD}"
    echo "  __  __ ________        __  __          _   _          _____ ______ _____  "
    echo " |  \/  |___  /\ \      / / |  |        | \ | |   /\   / ____|  ____|  __ \ "
    echo " | \  / |  / /  \ \    / /  |  |  ____  |  \| |  /  \ | |  __| |__  | |__) |"
    echo " | |\/| | / /    \ \  / /   |  | |____| | . \` | / /\ \| | |_ |  __| |  _  / "
    echo " | |  | |/ /__    \ \/ /    |  |____    | |\  |/ ____ \ |__| | |____| | \ \ "
    echo " |_|  |_/_____|    \__/     |______|    |_| \_/_/    \_\_____|______|_|  \_\\"
    echo -e "${NC}"
    echo -e "${BOLD}${PURPLE}              >>> MZ-MANAGER UPDATE SCRIPT <<<${NC}\n"
}

print_step() {
    echo -e "\n${BOLD}${CYAN}[STEP $1/$TOTAL_STEPS]${NC} ${BOLD}$2...${NC}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] STEP $1: $2" >> "$LOG_FILE"
}

print_success() {
    echo -e "${GREEN}${CHECK} $1${NC}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] OK: $1" >> "$LOG_FILE"
}

print_info() {
    echo -e "${BLUE}${INFO}  $1${NC}"
}

print_warn() {
    echo -e "${YELLOW}${WARN}  $1${NC}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARN: $1" >> "$LOG_FILE"
}

print_error() {
    echo -e "${RED}${ERROR} $1${NC}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >> "$LOG_FILE"
}

TOTAL_STEPS=8

# --- Root Check ---
if [[ $EUID -ne 0 ]]; then
    print_error "Dieses Script muss als root (sudo) ausgeführt werden!"
    exit 1
fi

clear
print_banner

echo "[$(date '+%Y-%m-%d %H:%M:%S')] === UPDATE GESTARTET ===" >> "$LOG_FILE"

# ==============================================================================
# STEP 1: Pre-Update Check
# ==============================================================================
print_step 1 "Pre-Update System-Check"

# .env Datei prüfen
if [[ ! -f "$ENV_FILE" ]]; then
    print_error ".env Datei nicht gefunden unter $ENV_FILE"
    print_error "Bitte zuerst 'setup.sh' ausführen!"
    exit 1
fi
print_info ".env Datei gefunden"

# .env laden
set -a
source "$ENV_FILE"
set +a

# Datenbankverbindung prüfen
if mysql -h "${DB_HOST:-127.0.0.1}" -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" "$DB_NAME" &>/dev/null; then
    print_success "Datenbankverbindung: OK"
else
    print_error "Keine Verbindung zur Datenbank! Update abgebrochen."
    exit 1
fi

# Freier Speicherplatz prüfen
FREE_MB=$(df -m "$ROOT_DIR" | awk 'NR==2 {print $4}')
if [[ $FREE_MB -lt 500 ]]; then
    print_warn "Wenig Speicherplatz: ${FREE_MB}MB frei (empfohlen: >500MB)"
else
    print_info "Freier Speicherplatz: ${FREE_MB}MB — OK"
fi

# PM2 Status prüfen
PM2_STATUS=$(pm2 jlist 2>/dev/null | python3 -c "import sys,json; procs=json.load(sys.stdin); p=[x for x in procs if x['name']=='mz-manager-api']; print(p[0]['pm2_env']['status'] if p else 'not found')" 2>/dev/null || echo "unknown")
print_info "PM2 Status vor Update: ${PM2_STATUS}"

# Aktuelle Version notieren
CURRENT_COMMIT=$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || echo "unbekannt")
print_info "Aktuelle Version: ${CURRENT_COMMIT}"
print_success "Pre-Update Check abgeschlossen"

# ==============================================================================
# STEP 2: Code aktualisieren (Git Pull)
# ==============================================================================
print_step 2 "Code von GitHub holen"

cd "$ROOT_DIR"

# Lokale Änderungen sichern (falls vorhanden)
if ! git -C "$ROOT_DIR" diff --quiet 2>/dev/null; then
    print_warn "Lokale Änderungen erkannt — werden gesichert (git stash)"
    git stash push -m "auto-stash vor Update $(date '+%Y%m%d-%H%M%S')"
fi

git fetch origin
REMOTE_COMMIT=$(git rev-parse --short origin/main)

if [[ "$CURRENT_COMMIT" == "$REMOTE_COMMIT" ]]; then
    print_warn "Bereits auf dem neuesten Stand (${CURRENT_COMMIT}). Update wird trotzdem fortgesetzt."
else
    print_info "Update: ${CURRENT_COMMIT} → ${REMOTE_COMMIT}"
fi

git pull origin main
NEW_COMMIT=$(git rev-parse --short HEAD)
print_success "Code aktualisiert auf Version: ${NEW_COMMIT}"

# ==============================================================================
# STEP 3: Datenbank-Migrationen
# ==============================================================================
print_step 3 "Datenbank-Migrationen prüfen & ausführen"

cd "$BACKEND_DIR"

node -e "
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '$ENV_FILE' });

(async () => {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 5,
    });

    const altered = [];
    const skipped = [];

    async function addColumnIfMissing(table, column, definition) {
        const [cols] = await pool.query('SHOW COLUMNS FROM ?? LIKE ?', [table, column]);
        if (cols.length === 0) {
            await pool.query('ALTER TABLE ?? ADD COLUMN ' + definition, [table]);
            altered.push(table + '.' + column);
        } else {
            skipped.push(table + '.' + column);
        }
    }

    async function createTableIfMissing(tableName, sqlFile) {
        const [tables] = await pool.query('SHOW TABLES LIKE ?', [tableName]);
        if (tables.length === 0) {
            const fs = require('fs');
            const path = require('path');
            const migPath = path.join('$BACKEND_DIR', 'database', sqlFile);
            if (fs.existsSync(migPath)) {
                const sql = fs.readFileSync(migPath, 'utf8');
                const queries = sql.split(';').map(q => q.trim()).filter(q => q.length > 0);
                for (const q of queries) await pool.query(q);
                altered.push('table:' + tableName);
            } else {
                console.log('  ⚠️  Migration-Datei nicht gefunden: ' + migPath);
            }
        } else {
            skipped.push('table:' + tableName);
        }
    }

    try {
        // Users Tabelle
        await addColumnIfMissing('users', 'initial_password', 'initial_password VARCHAR(255) AFTER theme');
        await addColumnIfMissing('users', 'has_seen_onboarding', 'has_seen_onboarding BOOLEAN DEFAULT FALSE AFTER requires_password_change');
        await pool.query('ALTER TABLE users MODIFY COLUMN email VARCHAR(100) NULL');

        // Fehler-System
        await createTableIfMissing('error_report_comments', 'migration_error_system.sql');
        await addColumnIfMissing('error_reports', 'category', 'category VARCHAR(50) NULL AFTER resolution_notes');
        await addColumnIfMissing('error_reports', 'archived_at', 'archived_at TIMESTAMP NULL AFTER category');

        // Netzwerk-Modul
        await createTableIfMissing('network_vlans', 'migration_network_module.sql');

        // Zubehör-Modul
        await createTableIfMissing('accessories', 'migration_accessories_module.sql');
        await addColumnIfMissing('lendings', 'accessory_id', 'accessory_id INT NULL AFTER container_id');

        // Settings sicherstellen
        await pool.query('INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (\"module_accessories_enabled\", \"true\")');
        await pool.query('INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (\"module_network_enabled\", \"true\")');

        if (altered.length > 0) {
            console.log('  ✅ Migriert: ' + altered.join(', '));
        } else {
            console.log('  ✅ Datenbank bereits aktuell — keine Änderungen nötig');
        }

    } catch (e) {
        console.error('  ❌ Migration fehlgeschlagen:', e.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
})();
"

print_success "Datenbank ist auf dem neuesten Stand"

# ==============================================================================
# STEP 4: Backend Dependencies aktualisieren
# ==============================================================================
print_step 4 "Backend-Abhängigkeiten aktualisieren"

cd "$BACKEND_DIR"
npm install --production --silent
print_success "Backend-Pakete aktualisiert"

# ==============================================================================
# STEP 5: Frontend bauen
# ==============================================================================
print_step 5 "Frontend neu bauen"

cd "$FRONTEND_DIR"
npm install --silent
npm run build
print_success "Frontend-Build abgeschlossen"

# ==============================================================================
# STEP 6: Berechtigungen setzen
# ==============================================================================
print_step 6 "Dateiberechtigungen für Nginx setzen"

chmod o+x /root 2>/dev/null || true
chmod -R o+rX "$ROOT_DIR"
print_success "Berechtigungen aktualisiert"

# ==============================================================================
# STEP 7: Services neustarten
# ==============================================================================
print_step 7 "Services neustarten"

# Backend neustarten
if pm2 list | grep -q "mz-manager-api"; then
    pm2 restart mz-manager-api
    print_info "PM2: mz-manager-api neugestartet"
else
    cd "$BACKEND_DIR"
    pm2 start server.js --name mz-manager-api
    pm2 save
    print_info "PM2: mz-manager-api neu gestartet (war nicht aktiv)"
fi

# Nginx neuladen
nginx -t && systemctl reload nginx
print_success "Services sind aktiv"

# ==============================================================================
# STEP 8: Post-Update Health Check
# ==============================================================================
print_step 8 "Post-Update Health Check"

# Kurz warten bis PM2 vollständig gestartet ist
sleep 3

# API Health prüfen
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/health 2>/dev/null || echo "000")

if [[ "$HTTP_STATUS" == "200" ]]; then
    print_success "API Health Check: HTTP $HTTP_STATUS — OK"
else
    print_warn "API Health Check: HTTP $HTTP_STATUS — API antwortet nicht wie erwartet"
    print_info "Prüfe mit: pm2 logs mz-manager-api --lines 20"
fi

# PM2 Status prüfen
PM2_POST_STATUS=$(pm2 jlist 2>/dev/null | python3 -c "import sys,json; procs=json.load(sys.stdin); p=[x for x in procs if x['name']=='mz-manager-api']; print(p[0]['pm2_env']['status'] if p else 'nicht gefunden')" 2>/dev/null || echo "unbekannt")

if [[ "$PM2_POST_STATUS" == "online" ]]; then
    print_success "PM2 Status: online ✔"
else
    print_warn "PM2 Status: ${PM2_POST_STATUS} — bitte prüfen!"
fi

# Nginx Status prüfen
if systemctl is-active --quiet nginx; then
    print_success "Nginx: aktiv ✔"
else
    print_warn "Nginx läuft nicht!"
fi

# ==============================================================================
# ABSCHLUSS
# ==============================================================================
echo ""
echo -e "${GREEN}${BOLD}============================================"
echo -e "${CHECK}  UPDATE ERFOLGREICH ABGESCHLOSSEN!"
echo -e "============================================${NC}"
echo ""
echo -e "${BOLD}Zusammenfassung:${NC}"
echo -e "  📦 Version  : ${CYAN}${CURRENT_COMMIT}${NC} → ${GREEN}${NEW_COMMIT}${NC}"
echo -e "  🌐 API      : HTTP ${HTTP_STATUS}"
echo -e "  ⚙️  PM2      : ${PM2_POST_STATUS}"
echo -e "  📄 Log-Datei: ${LOG_FILE}"
echo ""
echo -e "${PURPLE}${BOLD}MZ-Manager ist bereit!${NC}"
echo ""

echo "[$(date '+%Y-%m-%d %H:%M:%S')] === UPDATE ABGESCHLOSSEN: ${CURRENT_COMMIT} -> ${NEW_COMMIT} ===" >> "$LOG_FILE"
