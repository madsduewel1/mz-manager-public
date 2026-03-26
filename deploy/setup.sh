#!/bin/bash

# MZ-Manager Ubuntu Server Installation Script
# This script sets up the complete MZ-Manager environment on Ubuntu

set -e

# --- Styles ---
BOLD='\033[1m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# --- Icons ---
CHECK="✅"
INFO="ℹ️"
WARN="⚠️"
ERROR="❌"
ROCKET="🚀"
PACKAGE="📦"
DB="💾"
LOCK="🔒"
GEAR="⚙️"
BUILD="🎨"

# --- Functions ---
print_banner() {
    echo -e "${CYAN}${BOLD}"
    echo "  __  __ ________        __  __          _   _          _____ ______ _____  "
    echo " |  \/  |___  /\ \      / / |  |        | \ | |   /\   / ____|  ____|  __ \ "
    echo " | \  / |  / /  \ \    / /  |  |  ____  |  \| |  /  \ | |  __| |__  | |__) |"
    echo " | |\/| | / /    \ \  / /   |  | |____| | . \` | / /\ \| | |_ |  __| |  _  / "
    echo " | |  | |/ /__    \ \/ /    |  |____    | |\  |/ ____ \ |__| | |____| | \ \ "
    echo " |_|  |_/_____|    \__/     |______|    |_| \_/_/    \_\_____|______|_|  \_\\"
    echo -e "${NC}"
}

print_step() {
    echo -e "\n${BOLD}${CYAN}[$1/$2]${NC} ${BOLD}$3...${NC}"
}

print_success() {
    echo -e "${GREEN}${CHECK} $1${NC}"
}

print_error() {
    echo -e "${RED}${ERROR} $1${NC}"
}

# --- Initial Parameters ---
ORG_NAME="MZ-Manager"
BASE_URL=""
TOTAL_STEPS=12

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

clear
print_banner

# Parse arguments
while [ $# -gt 0 ]; do
  case $1 in
    --org)
      ORG_NAME="$2"
      shift # past argument
      shift # past value
      ;;
    --url)
      BASE_URL="$2"
      shift # past argument
      shift # past value
      ;;
    *)
      shift # past argument
      ;;
  esac
done

echo -e "${BOLD}Konfiguration:${NC}"
echo -e "  ${CYAN}Organisation:${NC} $ORG_NAME"
[ -n "$BASE_URL" ] && echo -e "  ${CYAN}System-URL:${NC}   $BASE_URL"
echo -e "--------------------------------------------\n"

# Step 1: Update system
print_step 1 $TOTAL_STEPS "Systempakete aktualisieren"
sudo apt update && sudo apt upgrade -y
print_success "System ist auf dem neuesten Stand"

# Step 2: Install Node.js
print_step 2 $TOTAL_STEPS "Node.js (v18+) installieren"
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
print_success "Node.js $(node -v) installiert"

# Step 3: Install MySQL
print_step 3 $TOTAL_STEPS "MySQL Server installieren"
sudo apt install -y mysql-server
print_success "MySQL installiert"

# Step 4: Secure MySQL installation
print_step 4 $TOTAL_STEPS "MySQL absichern"
echo -e "${YELLOW}${INFO} Bitte folge den Anweisungen auf dem Bildschirm.${NC}"
sudo mysql_secure_installation

# Step 5: Install Nginx
print_step 5 $TOTAL_STEPS "Nginx Webserver installieren"
sudo apt install -y nginx
print_success "Nginx installiert"

# Step 6: Install PM2
print_step 6 $TOTAL_STEPS "PM2 Prozess-Manager installieren"
sudo npm install -g pm2
print_success "PM2 installiert"

# Step 7: Create database
print_step 7 $TOTAL_STEPS "Datenbank erstellen und einrichten"
sudo mysql -e "CREATE DATABASE IF NOT EXISTS mz_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER IF NOT EXISTS 'mz_user'@'localhost' IDENTIFIED BY 'change_this_password';"
sudo mysql -e "GRANT ALL PRIVILEGES ON mz_manager.* TO 'mz_user'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"
print_success "Datenbank 'mz_manager' bereit"

# Step 8: Import Schema
print_step 8 $TOTAL_STEPS "Datenbank-Schema importieren"
sudo mysql mz_manager < "$ROOT_DIR/backend/database/schema.sql"
sudo mysql mz_manager -e "INSERT INTO settings (setting_key, setting_value) VALUES ('org_name', '$ORG_NAME') ON DUPLICATE KEY UPDATE setting_value = '$ORG_NAME';"
if [ -n "$BASE_URL" ]; then
    sudo mysql mz_manager -e "INSERT INTO settings (setting_key, setting_value) VALUES ('base_url', '$BASE_URL') ON DUPLICATE KEY UPDATE setting_value = '$BASE_URL';"
fi
print_success "Schema erfolgreich importiert"

# Step 9: Backend setup
print_step 9 $TOTAL_STEPS "Backend vorbereiten"
cd "$ROOT_DIR/backend" || exit 1
npm install --production
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${YELLOW}${WARN} Bitte editiere backend/.env mit deinen Zugangsdaten!${NC}"
fi
print_success "Backend bereit"

# Step 10: Frontend build
print_step 10 $TOTAL_STEPS "Frontend bauen (das kann einen Moment dauern)"
cd "$ROOT_DIR/frontend" || exit 1
npm install
npm run build
print_success "Frontend-Build abgeschlossen"

# Step 11: Start PM2
print_step 11 $TOTAL_STEPS "Anwendung mit PM2 starten"
cd "$ROOT_DIR/backend" || exit 1
pm2 start server.js --name mz-manager-api
pm2 save
pm2 startup
print_success "Backend-Prozess läuft"

# Step 12: Configure Nginx
print_step 12 $TOTAL_STEPS "Nginx Webserver konfigurieren"
sudo cp "$SCRIPT_DIR/nginx.conf" /etc/nginx/sites-available/mz-manager
sudo ln -sf /etc/nginx/sites-available/mz-manager /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# CLI Tool
sudo chmod +x "$ROOT_DIR/backend/bin/mz-manager"
sudo ln -sf "$ROOT_DIR/backend/bin/mz-manager" /usr/local/bin/mz-manager
print_success "Webserver und CLI konfiguriert"

# Finish
echo -e "\n${GREEN}${BOLD}============================================"
echo -e "${CHECK}  INSTALLATION ERFOLGREICH ABGESCHLOSSEN!"
echo -e "============================================${NC}\n"

echo -e "${BOLD}Nächste Schritte:${NC}"
echo -e "  1. ${CYAN}backend/.env${NC} mit korrekten MySQL-Daten füllen"
echo -e "  2. MySQL-Passwort ändern: ${BOLD}SET PASSWORD FOR 'mz_user'@'localhost' = '...';${NC}"
echo -e "  3. Admin-Passwort nach Login ändern (${BOLD}admin/admin123${NC})"
echo ""
echo -e "  ${BLUE}API Status:${NC}   pm2 status"
echo -e "  ${BLUE}Frontend :${NC}   http://deine-domain.de"
echo ""
