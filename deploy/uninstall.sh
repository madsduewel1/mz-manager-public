#!/bin/bash

# MZ-Manager - Deinstallations-Skript
# Entfernt alle Komponenten des Systems vom Server

set -e

RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${RED}==============================================${NC}"
echo -e "${RED}       MZ-Manager Deinstallation             ${NC}"
echo -e "${RED}==============================================${NC}"
echo -e "${YELLOW}WARNUNG: Dies wird alle Daten und Konfigurationen löschen!${NC}"
read -p "Bist du sicher, dass du ALLES löschen möchtest? (y/n): " CONFIRM

if [[ $CONFIRM != "y" && $CONFIRM != "Y" ]]; then
    echo "Abgebrochen."
    exit 0
fi

PROJECT_PATH=$(pwd)

# 1. PM2 stoppen und löschen
echo -e "${BLUE}🛑 Stoppe PM2-Prozesse...${NC}"
pm2 delete mz-manager-api 2>/dev/null || true
pm2 save --force

# 2. Nginx Konfiguration entfernen
echo -e "${BLUE}🌐 Entferne Nginx-Konfiguration...${NC}"
sudo rm -f /etc/nginx/sites-enabled/mz-manager
sudo rm -f /etc/nginx/sites-available/mz-manager
sudo systemctl restart nginx

# 3. Datenbank löschen
echo -e "${BLUE}💾 Lösche MySQL-Datenbank und Nutzer...${NC}"
read -p "MySQL Root Passwort zum Löschen der DB: " DB_ROOT_PASS
sudo mysql -u root -p${DB_ROOT_PASS} -e "DROP DATABASE IF EXISTS mz_manager;"
sudo mysql -u root -p${DB_ROOT_PASS} -e "DROP USER IF EXISTS 'mz_user'@'localhost';"

# 4. Projektdateien löschen (optional, da Skript darin liegt)
echo -e "${YELLOW}Sollen auch alle Projektdateien in ${PROJECT_PATH} gelöscht werden?${NC}"
read -p "(y/n): " DELETE_FILES

if [[ $DELETE_FILES == "y" || $DELETE_FILES == "Y" ]]; then
    echo -e "${RED}🗑️ Lösche Projektdateien...${NC}"
    cd ..
    # Wir löschen den Ordner vorsichtig
    sudo rm -rf "$PROJECT_PATH"
    echo -e "${GREEN}✅ Alle Dateien wurden entfernt.${NC}"
else
    echo -e "${BLUE}Dateien wurden behalten.${NC}"
fi

echo -e "${GREEN}✅ Deinstallation abgeschlossen!${NC}"
