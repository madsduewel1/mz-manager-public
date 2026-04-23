# Update-Anleitung für den Produktionsserver

Diese Anleitung beschreibt die Schritte, um die neuesten Änderungen (Benutzerverwaltung, Admin-Schutz, PDF-Export Fixes) auf dem Live-Server einzuspielen.

## 1. Neueste Version von GitHub holen

Melde dich per SSH auf deinem Server an und navigiere in das Projektverzeichnis:

```bash
cd /pfad/zu/mz-manager
git pull origin main
```

## 2. Datenbank-Migration (WICHTIG)

Da wir neue Spalten hinzugefügt und Dateitypen geändert haben, müssen diese Änderungen in der Produktions-Datenbank nachgezogen werden.

Führe folgende Befehle in der MySQL-Konsole auf dem Server aus:

```sql
USE mz_manager;

-- Spalte für Initialpasswort hinzufügen, falls noch nicht vorhanden
ALTER TABLE users ADD COLUMN IF NOT EXISTS initial_password VARCHAR(255) AFTER theme;

-- E-Mail-Spalte auf NULLABLE setzen, um Duplikate bei leeren E-Mails zu vermeiden
ALTER TABLE users MODIFY COLUMN email VARCHAR(100) NULL;
```

## 3. Abhängigkeiten aktualisieren & Frontend bauen

### Backend
```bash
cd backend
npm install --production
```

### Frontend (Build-Prozess)
```bash
cd ../frontend
npm install
npm run build
```

## 4. Services neu starten

Starte die PM2 Prozesse neu, damit die Änderungen aktiv werden:

```bash
pm2 restart all
# ODER spezifisch:
pm2 restart mz-manager-api
```

---
**Hinweis**: Falls du nginx nutzt, sind dort in der Regel keine Änderungen nötig, es sei denn, du hast die Domain oder Ports geändert.
