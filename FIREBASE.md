# Firebase (Bingo-Lobbys)

Projekt: **musik-bingo-ku3rb1s** – https://console.firebase.google.com/project/musik-bingo-ku3rb1s/overview

- **Realtime Database** (europe-west1): `https://musik-bingo-ku3rb1s-default-rtdb.europe-west1.firebasedatabase.app`
- **Authentication:** Anbieter „Anonym“ ist aktiviert, `ku3rb1s.github.io` ist als autorisierte Domain eingetragen.
- **Regeln:** `database.rules.json` – einspielen mit `npx firebase-tools deploy --only database`.
- Die Zugangsdaten stehen in `index.html` unter `FIREBASE_CONFIG`. Sie sind kein Geheimnis, geschützt wird die Datenbank durch die Regeln.

Ohne Eintrag in `FIREBASE_CONFIG` funktionieren die Bingo-Karten wie früher über den Link im QR-Code (ohne Lobby).
