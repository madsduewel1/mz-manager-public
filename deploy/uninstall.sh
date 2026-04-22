#!/bin/bash

# MZ-Manager - Deinstallations-Skript
# Entfernt alle Komponenten des Systems vom Server

set -e

# --- Styles ---
BOLD='\033[1m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# --- Icons ---
WARN="⚠️"
STOP="🛑"
DB="💾"
TRASH="🗑️"
CHECK="✅"

echo -e "${RED}${BOLD}==============================================${NC}"
echo -e "${RED}${BOLD}       MZ-MANAGER DEINSTALLATION             ${NC}"
echo -e "${RED}${BOLD}==============================================${NC}"
echo -e "${YELLOW}${WARN} WARNUNG: Dies wird alle Daten und Konfigurationen löschen!${NC}"
echo -en "${BOLD}Bist du sicher, dass du ALLES löschen möchtest? (y/n): ${NC}"
read CONFIRM

if [[ $CONFIRM != "y" && $CONFIRM != "Y" ]]; then
    echo "Abgebrochen."
    exit 0
fi

PROJECT_PATH=$(pwd)

# 1. Dienste stoppen und löschen
echo -e "\n${BLUE}${STOP} Stoppe Systemd- und PM2-Prozesse...${NC}"
if command -v pm2 &> /dev/null; then
    pm2 delete mz-manager-api 2>/dev/null || true
    pm2 save --force 2>/dev/null || true
fi
sudo systemctl stop mz-manager 2>/dev/null || true
sudo systemctl disable mz-manager 2>/dev/null || true
sudo rm -f /etc/systemd/system/mz-manager.service
sudo systemctl daemon-reload

# 2. Nginx Konfiguration entfernen
echo -e "${BLUE}🌐 Entferne Nginx-Konfiguration...${NC}"
sudo rm -f /etc/nginx/sites-enabled/mz-manager
sudo rm -f /etc/nginx/sites-available/mz-manager
sudo systemctl restart nginx

# 3. Datenbank löschen
echo -e "${BLUE}${DB} Lösche MySQL-Datenbank und Nutzer...${NC}"
echo -en "${BOLD}MySQL Root Passwort zum Löschen der DB: ${NC}"
read -s DB_ROOT_PASS
echo ""
export MYSQL_PWD=$DB_ROOT_PASS
sudo mysql -u root -e "DROP DATABASE IF EXISTS mz_manager;"
sudo mysql -u root -e "DROP USER IF EXISTS 'mz_user'@'localhost';"
unset MYSQL_PWD

# 4. Projektdateien löschen
echo -e "\n${YELLOW}${WARN} Sollen auch alle Projektdateien in ${PROJECT_PATH} gelöscht werden?${NC}"
echo -en "${BOLD}(y/n): ${NC}"
read DELETE_FILES

if [[ $DELETE_FILES == "y" || $DELETE_FILES == "Y" ]]; then
    echo -e "${RED}${TRASH} Lösche Projektdateien...${NC}"
    cd ..
    sudo rm -rf "$PROJECT_PATH"
    echo -e "${GREEN}${CHECK} Alle Dateien wurden entfernt.${NC}"
else
    echo -e "${BLUE}Dateien wurden behalten.${NC}"
fi

echo -e "\n${GREEN}${CHECK}${BOLD} Deinstallation abgeschlossen!${NC}\n"
