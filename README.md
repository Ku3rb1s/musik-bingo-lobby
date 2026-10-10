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
| `js/lang/*.js` | Sprachdateien: `en.js` (Englisch, Vorlage), `fr.js` (Französisch), `es.js` (Spanisch) |
| `js/i18n.js` | Sprachen: Auswahl, `tx()`, Übersetzen der Seite (Texte stehen im Code auf Deutsch) |
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

## Sprachen

Die App ist auf Deutsch geschrieben; jede weitere Sprache ist eine Datei in `js/lang/`. Jedes Gerät wählt seine Sprache selbst (Einstellungen bzw. 🌐-Knopf bei den Mitspielern), Voreinstellung ist die Sprache des Geräts.

Neue Sprache hinzufügen:

1. `js/lang/en.js` kopieren, z. B. nach `js/lang/fr.js`; oben `.en` → `.fr`, Name und Flagge ändern und die rechte Seite übersetzen (Platzhalter wie `{n}` stehen lassen).
2. In `index.html` vor `js/i18n.js` eine Zeile `<script src="js/lang/fr.js?v=…"></script>` ergänzen.
3. `node scripts/check-lang.js` zeigt, was noch fehlt oder wo Platzhalter nicht passen. Fehlende Texte erscheinen in der App auf Deutsch.

Neue Texte im Code immer mit `tx('Deutscher Text')` schreiben und in allen Sprachdateien ergänzen.
