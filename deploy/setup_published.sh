#!/bin/bash

# MZ-Manager - Automatisches Setup-Skript für Linux (Debian/Ubuntu)
# Erstellt von Antigravity / Mads Düwel

set -e

# Farben für die Ausgabe
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}==============================================${NC}"
echo -e "${BLUE}   MZ-Manager System-Setup & Deployment      ${NC}"
echo -e "${BLUE}==============================================${NC}"

# 1. Abfragen von Informationen
echo -e "${YELLOW}Bitte gib die folgenden Informationen ein:${NC}"
read -p "Domainname (z.B. dein-manager.de): " DOMAIN
read -p "GitHub Repository URL: " GIT_REPO
read -p "MySQL Root Passwort (wird zur Installation benötigt): " DB_ROOT_PASS
read -p "Gewünschtes MySQL Passwort für 'mz_user': " DB_USER_PASS
read -p "Nutzt du einen externen Reverse Proxy (SSL wird extern verwaltet)? (y/n): " USE_PROXY

PROJECT_PATH=$(pwd)
echo -e "${YELLOW}Projektpfad erkannt: ${PROJECT_PATH}${NC}"

# 2. System-Updates
echo -e "${GREEN}📦 Aktualisiere System-Pakete...${NC}"
sudo apt update && sudo apt upgrade -y

# 3. Installation von Abhängigkeiten
echo -e "${GREEN}📦 Installiere Node.js, Nginx, MySQL und Tools...${NC}"
sudo apt update
sudo apt install -y ca-certificates curl gnupg
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_18.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list
sudo apt update
sudo apt install -y nodejs build-essential nginx mysql-server certbot python3-certbot-nginx git

# 4. MySQL absichern und Datenbank einrichten
echo -e "${GREEN}💾 Richte MySQL-Datenbank ein...${NC}"
sudo mysql -e "CREATE DATABASE IF NOT EXISTS mz_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER IF NOT EXISTS 'mz_user'@'localhost' IDENTIFIED BY '${DB_USER_PASS}';"
sudo mysql -e "GRANT ALL PRIVILEGES ON mz_manager.* TO 'mz_user'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"

# 5. Projekt klonen
echo -e "${GREEN}📥 Klone Repository nach ${PROJECT_PATH}...${NC}"
sudo mkdir -p /var/www
sudo chown $USER:$USER /var/www
if [ -d "$PROJECT_PATH" ]; then
    echo -e "${YELLOW}Ordner existiert bereits. Überspringe Klonen.${NC}"
else
    git clone "$GIT_REPO" "$PROJECT_PATH"
fi

cd "$PROJECT_PATH"

# 6. Backend Setup
echo -e "${GREEN}🔧 Richte Backend ein...${NC}"
cd backend
npm install --production

# .env erstellen
cat <<EOF > .env
DB_HOST=localhost
DB_USER=mz_user
DB_PASSWORD=${DB_USER_PASS}
DB_NAME=mz_manager
JWT_SECRET=$(openssl rand -base64 32)
PORT=5000
BASE_URL=https://${DOMAIN}
EOF

# Datenbank-Schema importieren
echo -e "${GREEN}💾 Importiere Datenbank-Schema...${NC}"
sudo mysql mz_manager < database/schema.sql

# 7. Frontend Setup und Build
echo -e "${GREEN}🎨 Baue Frontend...${NC}"
cd ../frontend
npm install
npm run build

# 8. PM2 Installation und Start
echo -e "${GREEN}🚀 Starte Backend-Prozess mit PM2...${NC}"
sudo npm install -g pm2
cd ../backend
pm2 start server.js --name mz-manager-api
pm2 save
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME

# 9. Nginx Konfiguration
echo -e "${GREEN}🌐 Konfiguriere Nginx...${NC}"
NGINX_CONF="/etc/nginx/sites-available/mz-manager"

if [ "$USE_PROXY" == "y" ] || [ "$USE_PROXY" == "Y" ]; then
    echo -e "${YELLOW}Verwende Proxy-Konfiguration (Nur Port 80, SSL wird extern verwaltet)...${NC}"
    sed -e "s/\${DOMAIN}/${DOMAIN}/g" -e "s|\${PROJECT_PATH}|${PROJECT_PATH}|g" "$PROJECT_PATH/deploy/nginx_proxy.conf" | sudo tee "$NGINX_CONF" > /dev/null
else
    echo -e "${YELLOW}Verwende Standard-Konfiguration (Port 80, bereit für SSL-Erhalt)...${NC}"
    sed -e "s/\${DOMAIN}/${DOMAIN}/g" -e "s|\${PROJECT_PATH}|${PROJECT_PATH}|g" "$PROJECT_PATH/deploy/nginx_published.conf" | sudo tee "$NGINX_CONF" > /dev/null
fi

sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

echo -e "${GREEN}🔍 Teste Nginx Konfiguration...${NC}"
if sudo nginx -t; then
    sudo systemctl restart nginx
else
    echo -e "${RED}❌ Nginx Konfigurations-Test fehlgeschlagen!${NC}"
    echo "Bitte prüfe die Dateien in /etc/nginx/sites-available/mz-manager"
    exit 1
fi

# 10. SSL mit Certbot (nur wenn kein Proxy genutzt wird)
if [ "$USE_PROXY" != "y" ] && [ "$USE_PROXY" != "Y" ]; then
    echo -e "${GREEN}🔒 Erstelle SSL-Zertifikat für ${DOMAIN}...${NC}"
    # Wir nutzen --nginx, Certbot wird die Config automatisch um SSL erweitern
    sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email
else
    echo -e "${YELLOW}Überspringe internen SSL-Erhalt (wird durch deinen externen Proxy erledigt).${NC}"
fi

echo -e "${BLUE}==============================================${NC}"
echo -e "${GREEN}✅ Setup erfolgreich abgeschlossen!${NC}"
echo -e "${BLUE}==============================================${NC}"
echo "Deine Seite sollte nun unter https://${DOMAIN} erreichbar sein."
echo "Der Standard-Admin (Username: admin / Password: admin123) sollte sofort geändert werden."
echo ""
echo "Um das System zu aktualisieren, nutze das Skript: deploy/update.sh"
