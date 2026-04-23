# MZ-Manager Quick Start Guide

## 🚀 Schnellstart (Development)

### Voraussetzungen
- Node.js 18+ installiert
- MySQL 8+ installiert und gestartet

### 1. Datenbank einrichten

```bash
# MySQL öffnen
mysql -u root -p

# In MySQL:
CREATE DATABASE mz_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;

# Schema importieren
mysql -u root -p mz_manager < backend/database/schema.sql
```

### 2. Backend starten

```bash
cd backend

# Dependencies installieren
npm install

# .env Datei erstellen
cp .env.example .env

# .env bearbeiten (z.B. mit notepad)
notepad .env

# Server starten
npm run dev
```

Die `.env` sollte mindestens enthalten:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=dein_mysql_passwort
DB_NAME=mz_manager
JWT_SECRET=ein-langes-geheimes-passwort
PORT=5000
BASE_URL=http://localhost:5173
```

### 3. Frontend starten

Neues Terminal:
```bash
cd frontend

# Dependencies installieren
npm install

# Entwicklungsserver starten
npm run dev
```

### 4. Anwendung öffnen

Browser öffnen: **http://localhost:5173**

**Login:**
- Username: `admin`
- Password: `admin123`

## 📱 QR-Code testen (ohne Datenbank)

1. Im Dashboard einloggen
2. Assets → Neues Asset erstellen
3. Asset öffnen → QR-Code wird angezeigt
4. QR-Code mit Handy scannen oder URL kopieren
5. Fehlermeldeformular erscheint (OHNE Login!)

## 🆘 Häufige Probleme

### "Cannot connect to database"
- MySQL läuft? `mysql -u root -p`
- Passwort in `.env` korrekt?
- Datenbank erstellt? `SHOW DATABASES;`

### "Port 5000 already in use"
Andere Anwendung nutzt Port 5000:
- In `.env` anderen PORT setzen (z.B. 5001)
- Backend neu starten

### "Port 5173 already in use"
- Vite-Server läuft bereits
- Terminal schließen und neu starten

## 📝 Nächste Schritte

1. **Admin-Passwort ändern** (wichtig!)
2. **Neue Benutzer anlegen** (als Admin)
3. **Container erstellen** (iPad-Wagen, Räume, etc.)
4. **Assets anlegen und QR-Codes drucken**
5. **Erste Test-Ausleihe durchführen**

## 🎓 Als Schulprojekt nutzen

Das System eignet sich perfekt für:
- Informatik-AG
- Mediencoaches-Team
- Projektwoche
- Abschlussprojekt

Schüler lernen:
- Fullstack-Entwicklung
- REST APIs
- Datenbank-Design
- QR-Code-Technologie
- Deployment auf Linux-Servern
