# MZ-Manager – Medienzentrum Management System

Ein webbasiertes Open-Source-System zur zentralen Verwaltung von IT-Ressourcen in schulischen Medienzentren.

## 🎯 Features

- **Asset-Management**: Verwaltung aller Geräte (Laptops, iPads, Beamer, etc.)
- **Container-System**: Hierarchische Organisation (Wagen, Räume, Koffer)
- **Ausleihsystem**: Geräteverwaltung mit Rückgabe-Erinnerungen
- **QR-Code-Fehlermeldesystem**: ⭐ Fehlermeldungen OHNE Login direkt per QR-Scan
- **Rollen & Berechtigungen**: Admin, Mediencoach, Lehrkraft, Schüler
- **Dashboard**: Übersicht über defekte Geräte, Ausleihen, Standorte

## 📋 Systemanforderungen

### Development
- Node.js >= 18
- MySQL >= 8.0
- npm oder pnpm

### Production (Ubuntu Server)
- Ubuntu 20.04 oder höher
- Node.js >= 18
- MySQL >= 8.0
- Nginx (empfohlen) oder Apache
- PM2 (Process Manager)

## 🚀 Installation & Setup

### 1. Repository klonen

```bash
cd /pfad/zu/deinem/projekt
git clone <repository-url> mz-manager
cd mz-manager
```

### 2. Backend Setup

```bash
cd backend

# Dependencies installieren
npm install

# Umgebungsvariablen einrichten
cp .env.example .env
# .env bearbeiten und MySQL-Zugangsdaten eintragen

# Datenbank erstellen
mysql -u root -p < database/schema.sql
```

#### .env Konfiguration

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=dein_passwort
DB_NAME=mz_manager
JWT_SECRET=erzeuge-ein-sicheres-secret
PORT=5000
BASE_URL=http://your-domain.de
```

**Wichtig**: Standard-Admin-Login nach Einrichtung:
- Username: `admin`
- Password: `admin123` (⚠️ BITTE SOFORT ÄNDERN!)

### 3. Frontend Setup

```bash
cd ../frontend

# Dependencies installieren
npm install

# Development Server starten
npm run dev
```

### 4. Development Server starten

Terminal 1 (Backend):
```bash
cd backend
npm run dev
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

Die Anwendung ist dann verfügbar unter:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000

## 📦 Production Deployment

### Automatisches Setup (Ubuntu Server)

```bash
cd deploy
chmod +x setup.sh
sudo ./setup.sh
```

Das Script installiert:
- Node.js
- MySQL
- Nginx
- PM2
- Richtet die Datenbank ein
- Konfiguriert Nginx als Reverse Proxy

### Manuelles Deployment

#### 1. Backend bauen

```bash
cd backend
npm install --production
```

#### 2. Frontend bauen

```bash
cd frontend
npm run build
```

Die Build-Dateien befinden sich in `frontend/dist/`

#### 3. Mit PM2 starten

```bash
# Backend starten
cd backend
pm2 start server.js --name mz-manager-api

# PM2 beim Systemstart automatisch starten
pm2 startup
pm2 save
```

#### 4. Nginx konfigurieren

Kopiere `deploy/nginx.conf` nach `/etc/nginx/sites-available/mz-manager`

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/mz-manager
sudo ln -s /etc/nginx/sites-available/mz-manager /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🔧 Nutzung

### QR-Code-System

1. **Asset erstellen**: Im Dashboard unter "Assets" → "Neues Asset"
2. **QR-Code generieren**: Asset öffnen → QR-Code wird automatisch angezeigt
3. **QR-Code drucken**: QR-Code herunterladen und auf Asset-Etikett drucken
4. **Fehler melden**: QR-Code scannen → Automatisch zur Fehlermeldeseite (OHNE Login!)

### Rollen & Berechtigungen

- **Admin**: Vollzugriff, Benutzerverwaltung
- **Mediencoach**: Assets verwalten, Fehler bearbeiten
- **Lehrkraft**: Ausleihen, Fehler melden
- **Schüler**: Fehler melden (ohne Login via QR)

## 🛠️ API Dokumentation

### Authentifizierung

Alle authentifizierten Endpoints benötigen einen Bearer Token:

```
Authorization: Bearer <jwt-token>
```

### Wichtige Endpoints

- `POST /api/auth/login` - Benutzer-Login
- `GET /api/assets` - Alle Assets
- `GET /api/containers` - Alle Container
- `GET /api/errors/public/:qr_code` - Asset-Info für QR-Scan (öffentlich)
- `POST /api/errors/public` - Fehler melden (öffentlich)
- `GET /api/dashboard/stats` - Dashboard-Statistiken

## 🐛 Troubleshooting

### MySQL Connection Failed

Überprüfe `.env` Datei und MySQL-Credentials.

### Port bereits belegt

Ändere `PORT` in `.env` (Backend) oder `vite.config.js` (Frontend).

### QR-Codes werden nicht angezeigt

Überprüfe `BASE_URL` in `.env` - muss die öffentliche Domain sein.

## 📄 Lizenz

MIT License - Open Source

## 🙋 Support

Bei Fragen oder Problemen:
- GitHub Issues erstellen
e-mail an: kontakt@mz-manager.de

---

**Entwickelt für schulische Medienzentren** 🏫✨
