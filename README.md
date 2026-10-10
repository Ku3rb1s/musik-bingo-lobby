# Musik-Bingo (Lobby)

Musik-Quiz mit deinen Spotify-Playlists – mit Bingo-Karten fürs Handy, Lobbys und Live-Sync über Firebase.

**Online:** https://ku3rb1s.github.io/musik-bingo-lobby/

- Spielleiter: Spotify verbinden, Playlist laden, unter **Bingo → Bingo-Karten** Karten erstellen. Dabei öffnet sich eine Lobby.
- Mitspieler: QR-Code scannen (oder https://ku3rb1s.github.io/musik-bingo-lobby/join öffnen und den Lobby-Code eingeben), Namen eingeben, Karte bekommen – ohne Konto, ohne App.
- Markierungen, „Bingo!“-Rufe, Tipps und die aktuelle Runde werden live synchronisiert.
- Mehrere Partien mit Siegzählung (1, 3, 5, 10 oder endlos), Kartenwahl aus 5 Karten beim Beitreten.
- Lokal starten: `start.bat` (öffnet http://127.0.0.1:8888/).

Einrichtung von Firebase: siehe [FIREBASE.md](FIREBASE.md). Ohne Firebase laufen die Karten wie früher über den Link im QR-Code.

## Aufbau

| Datei | Inhalt |
|---|---|
| `index.html` | Seitenaufbau (Markup) |
| `css/app.css` | Aussehen |
| `js/core.js` | Hilfsfunktionen, Konstanten, Spielzustand, Menüs |
| `js/spotify.js` | Spotify-Anmeldung, Playlists/CSV, Wiedergabe |
| `js/game.js` | Runden, Countdown, Auflösung, Originaljahr, Tipps |
| `js/lobby.js` | Lobby (Firebase), Partien & Siege |
| `js/bingo.js` | Karten, Einladen, Prüfen, Spielende |
| `js/views.js` | Mitspieler-Ansicht, Fernseher-Ansicht (`?tv=CODE`), Karte des Spielleiters |
| `js/ui.js` | Anzeige, Klicks, Einstellungen, Start |

Die Skripte werden in dieser Reihenfolge geladen. Bei jedem Update `APP_VERSION` in `js/core.js` und `?v=` in `index.html` erhöhen.

## Alte Lobbys aufräumen

Die GitHub Action `.github/workflows/cleanup-lobbies.yml` löscht täglich (03:17 UTC) Lobbys ohne Aktivität seit 24 Stunden.
Sie nutzt das Firebase-Konto `lobby-cleanup` (nur Rolle „Realtime Database Admin“), dessen Schlüssel im Repo-Secret
`FIREBASE_CLEANUP_KEY` liegt. Per Hand starten: Actions → „Alte Lobbys aufräumen“ → Run workflow.
Hinweis: GitHub pausiert zeitgesteuerte Jobs in öffentlichen Repos nach 60 Tagen ohne Änderungen – dann dort wieder einschalten.
