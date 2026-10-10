# Firebase für die Bingo-Lobbys einrichten

1. Auf https://console.firebase.google.com ein Projekt anlegen (oder das vorhandene öffnen).
2. **Build → Authentication → Sign-in method → Anonym** aktivieren.
3. **Build → Realtime Database → Datenbank erstellen** (Standort z. B. `europe-west1`, im gesperrten Modus starten).
4. Unter **Realtime Database → Regeln** den Inhalt von `database.rules.json` einfügen und veröffentlichen.
5. **Projekteinstellungen → Allgemein → Meine Apps → Web-App hinzufügen** und die angezeigten Werte
   (`apiKey`, `authDomain`, `databaseURL`, `projectId`, `appId`) in `index.html` bei `FIREBASE_CONFIG` eintragen.
6. Unter **Authentication → Einstellungen → Autorisierte Domains** `ku3rb1s.github.io` hinzufügen.

Ohne Eintrag in `FIREBASE_CONFIG` funktionieren die Bingo-Karten wie bisher über den Link im QR-Code (ohne Lobby).
