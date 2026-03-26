# MZ-Manager Update-Anleitung (Linux Server)

Um die neuesten Änderungen (Branding, Zubehör-Modul, CSV-Import, etc.) auf deinen Server zu spielen, führe bitte die folgenden Befehle in deinem Terminal aus:

### 1. Repository klonen (falls noch nicht geschehen)
Falls du das Projekt zum ersten Mal auf den Server lädst:
```bash
git clone https://github.com/madsduewel1/mz-manager-public.git
cd mz-manager-public
```

### 2. In das Hauptverzeichnis navigieren
Falls das Projekt schon auf dem Server ist, wechsle einfach in den Ordner:
```bash
cd /pfad/zu/deinem/mz-manager
```

### 2. Das Update-Script ausführen
Das Script erledigt alles automatisch: es lädt den Code von GitHub, installiert neue Abhängigkeiten, aktualisiert die Datenbank sicher und baut das Frontend neu.
```bash
bash deploy/update.sh
```

---

### Was das Script im Hintergrund macht:
- **Git Pull**: Holt die neuesten Dateien von GitHub.
- **Datenbank-Check**: Fügt neue Spalten (`category`, `accessory_id`) hinzu, ohne bestehende Daten zu löschen.
- **Backend**: Installiert neue Pakete (falls nötig).
- **Frontend**: Baut die Web-Oberfläche mit den neuen Branding-Einstellungen und Logos neu.
- **PM2 Restart**: Startet die API neu, damit die Änderungen aktiv werden.

### Falls Probleme auftreten:
Solltest du eine Fehlermeldung sehen, kannst du mir diese einfach hier kopieren. In der Regel reicht aber dieser eine Befehl aus! 🚀
