#!/bin/bash

# MZ-Manager - Update-Skript
# Zieht den neuesten Code von GitHub und aktualisiert die Anwendung

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}==============================================${NC}"
echo -e "${BLUE}       MZ-Manager Update Service             ${NC}"
echo -e "${BLUE}==============================================${NC}"

PROJECT_PATH="/var/www/mz-manager"

echo -e "${GREEN}📦 Aktualisiere System-Pakete (apt)...${NC}"
sudo apt update && sudo apt upgrade -y

cd "$PROJECT_PATH"

echo -e "${GREEN}📥 Ziehe neuesten Code von GitHub...${NC}"
git pull origin main

# Backend Update
echo -e "${GREEN}🔧 Aktualisiere Backend...${NC}"
cd backend
# Berechtigungen fixen
sudo chown -R $USER:$USER .
npm install --production

# PRIVATER FIX: Datenbank-Schema aktualisieren
echo -e "${GREEN}💾 Aktualisiere Datenbank-Schema...${NC}"
# Wir nutzen die Zugangsdaten aus der .env
export $(grep -v '^#' .env | xargs)

# 1. Bestehende Rollen 'Mediencoach', 'Lehrer', 'Schüler' löschbar machen
sudo mysql -u$DB_USER -p$DB_PASSWORD $DB_NAME -e "UPDATE roles SET is_system = FALSE WHERE name IN ('Mediencoach', 'Lehrer', 'Schüler');"

# 2. Fehlende Spalten in 'users' sicher ergänzen (falls sie fehlen)
# (MariaDB 10.1 unterstützt "IF NOT EXISTS" für ADD COLUMN evtl. nicht, 
#  deshalb Fehler ignorieren, falls die Spalte schon da ist)
mysql -u$DB_USER -p$DB_PASSWORD $DB_NAME -e "ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE;" 2>/dev/null || true
mysql -u$DB_USER -p$DB_PASSWORD $DB_NAME -e "ALTER TABLE users ADD COLUMN requires_password_change BOOLEAN DEFAULT FALSE;" 2>/dev/null || true
mysql -u$DB_USER -p$DB_PASSWORD $DB_NAME -e "ALTER TABLE users ADD COLUMN has_seen_onboarding BOOLEAN DEFAULT FALSE;" 2>/dev/null || true
mysql -u$DB_USER -p$DB_PASSWORD $DB_NAME -e "ALTER TABLE users ADD COLUMN theme ENUM('light', 'dark') DEFAULT 'light';" 2>/dev/null || true

# 3. ENUM für Ausleihentypen in der bestehenden Datenbank erweitern
sudo mysql -u$DB_USER -p$DB_PASSWORD $DB_NAME -e "ALTER TABLE lendings MODIFY COLUMN borrower_type ENUM('Lehrer', 'klasse', 'projektgruppe', 'Schüler', 'extern', 'sonstiges') NOT NULL;" 2>/dev/null || true

# 4. Schema-Struktur sicherstellen (CREATE TABLE IF NOT EXISTS)
sudo mysql -u$DB_USER -p$DB_PASSWORD $DB_NAME < database/schema.sql

# Frontend Update und Build
echo -e "${GREEN}🎨 Baue Frontend neu...${NC}"
cd ../frontend
# Berechtigungen fixen
sudo chown -R $USER:$USER .
npm install
# Vite ausführbar machen
chmod +x node_modules/.bin/vite || true
npm run build

# Restart Backend Service
echo -e "${GREEN}🚀 Starte Backend-Dienst neu...${NC}"
pm2 restart mz-manager-api || pm2 start server.js --name mz-manager-api
pm2 save

echo -e "${BLUE}==============================================${NC}"
echo -e "${GREEN}✅ Update erfolgreich abgeschlossen!${NC}"
echo -e "${BLUE}==============================================${NC}"
