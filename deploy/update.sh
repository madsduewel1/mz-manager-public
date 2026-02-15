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
echo -e "${GREEN}🔧 Aktualisiere Backend-Abhängigkeiten...${NC}"
cd backend
npm install --production

# Frontend Update und Build
echo -e "${GREEN}🎨 Baue Frontend neu...${NC}"
cd ../frontend
npm install
npm run build

# Restart Backend Service
echo -e "${GREEN}🚀 Starte Backend-Dienst neu...${NC}"
pm2 restart mz-manager-api

echo -e "${BLUE}==============================================${NC}"
echo -e "${GREEN}✅ Update erfolgreich abgeschlossen!${NC}"
echo -e "${BLUE}==============================================${NC}"
