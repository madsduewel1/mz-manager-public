#!/bin/bash

# MZ-Manager Ubuntu Server Installation Script
# This script sets up the complete MZ-Manager environment on Ubuntu

set -e

echo "============================================"
echo "MZ-Manager Installation Script"
echo "============================================"

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MySQL
echo "📦 Installing MySQL..."
sudo apt install -y mysql-server

# Secure MySQL installation
echo "🔒 Securing MySQL installation..."
sudo mysql_secure_installation

# Install Nginx
echo "📦 Installing Nginx..."
sudo apt install -y nginx

# Install PM2
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Create database
echo "💾 Creating database..."
sudo mysql -e "CREATE DATABASE IF NOT EXISTS mz_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER IF NOT EXISTS 'mz_user'@'localhost' IDENTIFIED BY 'change_this_password';"
sudo mysql -e "GRANT ALL PRIVILEGES ON mz_manager.* TO 'mz_user'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"

echo "📥 Importing database schema..."
sudo mysql mz_manager < ../backend/database/schema.sql

# Backend setup
echo "🔧 Setting up backend..."
cd ../backend
npm install --production

# Create .env if not exists
if [ ! -f .env ]; then
    cp .env.example .env
    echo "⚠️  Please edit backend/.env with your configuration!"
fi

# Frontend build
echo "🎨 Building frontend..."
cd ../frontend
npm install
npm run build

# Start backend with PM2
echo "🚀 Starting backend with PM2..."
cd ../backend
pm2 start server.js --name mz-manager-api
pm2 save
pm2 startup

# Configure Nginx
echo "🌐 Configuring Nginx..."
sudo cp ../deploy/nginx.conf /etc/nginx/sites-available/mz-manager
sudo ln -sf /etc/nginx/sites-available/mz-manager /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

echo ""
echo "============================================"
echo "✅ Installation erfolgreich!"
echo "============================================"
echo ""
echo "Nächste Schritte:"
echo "1. Bearbeite backend/.env mit korrekten Credentials"
echo "2. Ändere MySQL-Passwort: SET PASSWORD FOR 'mz_user'@'localhost' = 'neues_passwort';"
echo "3. Ändere Admin-Passwort nach erstem Login (admin/admin123)"
echo ""
echo "Backend API: http://localhost:5000"
echo "Frontend: http://your-domain.de"
echo ""
echo "PM2 Status: pm2 status"
echo "Logs anzeigen: pm2 logs mz-manager-api"
echo ""
