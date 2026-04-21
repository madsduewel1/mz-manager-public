#!/bin/bash

# ==============================================================================
# MZ-MANAGER INSTALLATION SCRIPT
# ==============================================================================
# Dieses Script installiert die komplette MZ-Manager Umgebung auf Ubuntu/Debian.
# Unterstützt: Public IP (Direct), Cloudflare Tunnel, Nginx Proxy Manager.
# ==============================================================================

set -e

# --- Styles & Farben ---
BOLD='\033[1m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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
GLOBE="🌐"

# --- Pfade ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

# --- Funktionen ---
print_banner() {
    clear
    echo -e "${CYAN}${BOLD}"
    echo "  __  __ ________        __  __          _   _          _____ ______ _____  "
    echo " |  \/  |___  /\ \      / / |  |        | \ | |   /\   / ____|  ____|  __ \ "
    echo " | \  / |  / /  \ \    / /  |  |  ____  |  \| |  /  \ | |  __| |__  | |__) |"
    echo " | |\/| | / /    \ \  / /   |  | |____| | . \` | / /\ \| | |_ |  __| |  _  / "
    echo " | |  | |/ /__    \ \/ /    |  |____    | |\  |/ ____ \ |__| | |____| | \ \ "
    echo " |_|  |_/_____|    \__/     |______|    |_| \_/_/    \_\_____|______|_|  \_\\"
    echo -e "${NC}"
    echo -e "${BOLD}${PURPLE}             >>> MZ-MANAGER INSTALLATION SCRIPT <<< ${NC}\n"
}

print_step() {
    echo -e "\n${BOLD}${CYAN}[STEP]${NC} ${BOLD}$1...${NC}"
}

print_success() {
    echo -e "${GREEN}${CHECK} $1${NC}"
}

print_error() {
    echo -e "${RED}${ERROR} $1${NC}"
}

print_info() {
    echo -e "${BLUE}${INFO} $1${NC}"
}

print_warn() {
    echo -e "${YELLOW}${WARN} $1${NC}"
}

# --- Initialer Check ---
if [[ $EUID -ne 0 ]]; then
   print_error "Dieses Script muss als root (sudo) ausgeführt werden!"
   exit 1
fi

# --- Variablen initialisieren ---
ORG_NAME="MZ-MANAGER"
SYS_URL="localhost"
DB_HOST="127.0.0.1"
DB_USER="mz_user"
DB_PASS=""
DB_NAME="mz_manager"
DEPLOY_MODE="" # 1=Public, 2=CF, 3=NPM
INSTALL_SSL="n"

# --- Start ---
print_banner

# 1. System-Updates & Pakete
print_step "Systempakete vorbereiten"
apt update

print_info "Basis-Pakete werden installiert..."
apt install -y curl git wget build-essential sudo software-properties-common unzip gnupg2 ca-certificates lsb-release

print_info "System-Upgrade wird durchgeführt..."
apt upgrade -y

# Node.js Source hinzufügen (v18)
if ! command -v node &> /dev/null; then
    print_info "Node.js Repository wird hinzugefügt..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    apt install -y nodejs
fi
print_success "Node.js $(node -v) ist bereit"

# MySQL Server
if ! command -v mysql &> /dev/null; then
    print_info "MySQL-Server wird installiert..."
    apt install -y mysql-server
fi
print_success "MySQL-Server ist bereit"

# Nginx
if ! command -v nginx &> /dev/null; then
    print_info "Nginx wird installiert..."
    apt install -y nginx
fi
print_success "Nginx ist bereit"

# PM2
if ! command -v pm2 &> /dev/null; then
    print_info "PM2 wird installiert..."
    npm install -g pm2
fi
print_success "PM2 ist bereit"

# 2. Interaktive Konfiguration
print_step "Interaktive Einrichtung"

echo -e "${YELLOW}Bitte gib die Details für deine Installation an:${NC}"

# Org Name
read -p "🏢 Name der Organisation [MZ-MANAGER]: " input_org
ORG_NAME=${input_org:-$ORG_NAME}

# System URL
read -p "🌐 System-URL (z.B. mz.deine-domain.de): " input_url
SYS_URL=${input_url:-$SYS_URL}

# Database
echo -e "\n${DB} ${BOLD}Datenbank-Konfiguration:${NC}"
read -p "   Host [127.0.0.1]: " input_db_host
DB_HOST=${input_db_host:-$DB_HOST}
read -p "   Benutzer [mz_user]: " input_db_user
DB_USER=${input_db_user:-$DB_USER}
read -s -p "   Passwort: " input_db_pass
echo ""
DB_PASS=$input_db_pass
read -p "   Datenbank-Name [mz_manager]: " input_db_name
DB_NAME=${input_db_name:-$DB_NAME}

# Deployment Mode
echo -e "\n${GLOBE} ${BOLD}Bereitstellungs-Modus:${NC}"
echo "  1) Public IP (Direkt via Nginx auf Port 80/443)"
echo "  2) Cloudflare Tunnel (Ohne direkten Port-Zugriff)"
echo "  3) Nginx Proxy Manager (Hinter einem Upstream Proxy)"
read -p "Wähle eine Option (1-3): " input_mode
DEPLOY_MODE=$input_mode

if [[ "$DEPLOY_MODE" == "1" ]]; then
    read -p "Soll SSL automatisch via Certbot eingerichtet werden? (y/n) [n]: " input_ssl
    INSTALL_SSL=${input_ssl:-"n"}
fi

# 3. Datenbank vorbereiten
print_step "Datenbank einrichten"
if [[ "$DB_HOST" == "localhost" ]]; then
    print_info "Lokale Datenbank wird konfiguriert..."
    mysql -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    mysql -e "CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';"
    mysql -e "GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';"
    mysql -e "FLUSH PRIVILEGES;"
else
    print_warn "Remote-Datenbank erkannt. Stelle sicher, dass die Datenbank existiert!"
fi

# Import Schema
print_info "Schema wird importiert..."
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$BACKEND_DIR/database/schema.sql"

# Settings anpassen
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "INSERT INTO settings (setting_key, setting_value) VALUES ('org_name', '$ORG_NAME') ON DUPLICATE KEY UPDATE setting_value = '$ORG_NAME';"
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "INSERT INTO settings (setting_key, setting_value) VALUES ('base_url', 'http://$SYS_URL') ON DUPLICATE KEY UPDATE setting_value = 'http://$SYS_URL';"

print_success "Datenbank ist bereit"

# 4. Backend vorbereiten
print_step "Backend einrichten"
cd "$BACKEND_DIR"
print_info "Abhängigkeiten werden installiert..."
npm install --production

# .env generieren
print_info ".env Datei wird erstellt..."
cat > .env << EOF
DB_HOST="$DB_HOST"
DB_USER="$DB_USER"
DB_PASSWORD="$DB_PASS"
DB_NAME="$DB_NAME"
JWT_SECRET="$(openssl rand -base64 32)"
PORT=5000
BASE_URL="http://$SYS_URL"
EOF

print_success "Backend ist konfiguriert"

# 5. Frontend vorbereiten
print_step "Frontend bauen"
cd "$FRONTEND_DIR"
print_info "Abhängigkeiten werden installiert..."
npm install
print_info "Produktions-Build wird erstellt..."
npm run build
print_success "Frontend-Build abgeschlossen"

# Dateiberechtigungen für Nginx setzen
# Nginx läuft als www-data und darf standardmäßig nicht in /root
print_info "Dateiberechtigungen für Nginx werden gesetzt..."
chmod o+x /root 2>/dev/null || true
chmod -R o+rX "$ROOT_DIR"
print_success "Berechtigungen gesetzt"

# 6. Dienste konfigurieren
print_step "Services & Webserver konfigurieren"

# PM2
cd "$BACKEND_DIR"
pm2 stop mz-manager-api &> /dev/null || true
pm2 start server.js --name mz-manager-api
pm2 save
pm2 startup | grep "sudo" | bash -

# Nginx Config generieren
NGINX_CONF="/etc/nginx/sites-available/mz-manager"
PROJECT_PATH="$ROOT_DIR"

print_info "Nginx-Konfiguration wird erstellt (Modus: $DEPLOY_MODE)..."

case $DEPLOY_MODE in
    1) # Public IP
        cat > $NGINX_CONF << EOF
server {
    listen 80;
    server_name $SYS_URL;

    root $PROJECT_PATH/frontend/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_cache_bypass \$http_upgrade;
    }

    location /uploads {
        alias $PROJECT_PATH/backend/uploads;
    }
}
EOF
        ;;
    2|3) # CF Tunnel or NPM (Internal Proxy)
        cat > $NGINX_CONF << EOF
server {
    listen 80 default_server;
    server_name _;

    root $PROJECT_PATH/frontend/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    location /uploads {
        alias $PROJECT_PATH/backend/uploads;
    }
}
EOF
        ;;
esac

ln -sf $NGINX_CONF /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# SSL via Certbot
if [[ "$INSTALL_SSL" == "y" ]]; then
    print_info "SSL-Zertifikate werden via Certbot beantragt..."
    apt install -y certbot python3-certbot-nginx
    certbot --nginx -d "$SYS_URL" --non-interactive --agree-tos -m "admin@$SYS_URL"
fi

# CLI Tool verlinken
chmod +x "$BACKEND_DIR/bin/mz-manager"
ln -sf "$BACKEND_DIR/bin/mz-manager" /usr/local/bin/mz-manager

print_success "Services sind aktiv"

# --- Abschluss ---
print_banner
echo -e "${GREEN}${BOLD}============================================"
echo -e "${CHECK}  INSTALLATION ERFOLGREICH ABGESCHLOSSEN!"
echo -e "============================================${NC}\n"

echo -e "${BOLD}Zusammenfassung:${NC}"
echo -e "  🏢 Organisation : ${CYAN}$ORG_NAME${NC}"
echo -e "  🌐 URL          : ${CYAN}http://$SYS_URL${NC}"
echo -e "  💾 Datenbank    : ${CYAN}$DB_NAME${NC} ($DB_USER@$DB_HOST)"
echo -e "  ⚙️  Modus        : ${CYAN}$DEPLOY_MODE${NC}"

echo -e "\n${BOLD}Nächste Schritte:${NC}"
if [[ "$DEPLOY_MODE" == "2" ]]; then
    echo -e "  - ${YELLOW}Cloudflare Tunnel:${NC} Verbinde deinen Tunnel mit ${BOLD}http://localhost:80${NC}"
elif [[ "$DEPLOY_MODE" == "3" ]]; then
    echo -e "  - ${YELLOW}Nginx Proxy Manager:${NC} Erstelle einen Proxy Host für ${BOLD}$SYS_URL${NC} auf die IP dieses Servers (Port 80)"
fi

echo -e "  - ${BLUE}Admin-Login:${NC} http://$SYS_URL/login (${BOLD}admin / admin123${NC})"
echo -e "  - ${BLUE}CLI Tool   :${NC} Tippe '${BOLD}mz-manager help${NC}' für Verwaltungsbefehle"
echo ""
echo -e "${PURPLE}${BOLD}Viel Erfolg mit dem MZ-Manager!${NC}"
echo ""
