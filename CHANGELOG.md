# Änderungen

Die Versionsnummer steht in `index.html` (`APP_VERSION`) und unten in den Einstellungen.

## 3.2.0 – 10.10.2026
- Bingo-Menü neu aufgeteilt: Übersicht (Lobby-Code, Partie-Stand, Mitspieler) mit Unterseiten „Mitspieler einladen“, „Bingo prüfen“, „Meine Karte“ und „Bingo-Einstellungen“; ohne laufendes Bingo führt „Bingo einrichten“ zur Einrichtung, danach direkt zur Einladung
- Tipp löschen: ✕ direkt im Eingabefeld (nur sichtbar, wenn etwas drinsteht)
- „Markierungen löschen“ als richtiger Knopf über der Karte (auch beim Spielleiter)
- Spielleiter wird in der Lobby nie mehr als offline (💤) angezeigt

## 3.1.0 – 10.10.2026
- Spielleiter erscheint in der Lobby, wenn er mitspielt („⭐ Name“): Markierungen, Bingo, Tipps und Siege laufen wie bei allen anderen
- „Meine Karte“ des Spielleiters im neuen Stil: eigene Kartenwahl, kompaktes Tipp-Feld, live synchronisiert
- Kartenwahl: eine Karte groß, „Diese Karte nehmen“ oder „Andere Karte zeigen“ (statt 5 kleiner Karten)
- Tipp-Feld neu: „Groß zeigen“-Knopf direkt neben der Eingabe, Anzeige „✓ abgegeben“

## 3.0.0 – 10.10.2026
- Mehrere Partien pro Lobby: nach einem bestätigten Bingo startet der Spielleiter die nächste Partie (neue Karten für alle), die Siege werden gezählt. Einstellbar: 1, 3, 5, 10 Partien oder endlos; am Ende Siegerehrung
- Kartenwahl beim Beitreten: jeder Mitspieler sucht sich eine von 5 Karten aus (oder lässt sich andere zeigen)
- Tipps live: Tipps werden beim Schreiben automatisch abgegeben. Während der Runde sieht jeder, wer schon getippt hat – nach dem Auflösen sehen alle (auch der Spielleiter) die Tipps, Handys zeigen ist nicht mehr nötig
- „Ich spiele selbst mit“ ist jetzt ein Schalter (Spielleiter-Karte optional)
- Alles auf einen Bildschirm: Platte passt sich der Höhe an, Auflösung auf breiten Bildschirmen zweispaltig, kompakter auf niedrigen Bildschirmen; Mitspieler-Ansicht am Handy kompakter
- iPad: Menü-Knöpfe oben ohne Milchglas, damit die Schrift nicht mehr verschwommen wirkt

## 2.3.1 – 10.10.2026
- Fehler behoben: Das letzte Feld, das zum Bingo führt, wurde in der Lobby nicht gespeichert (nur die Bingo-Meldung kam)
- „Bingo prüfen“: Chip „Nummer“ ersetzt durch „⭐ Spielleiter“ (prüft die eigene Karte des Spielleiters); ohne gewählten Chip wird die eingetippte Kartennummer geprüft, gewählten Chip erneut antippen = abwählen

## 2.3.0 – 10.10.2026
- Schalter „Mit Lobby / Ohne Lobby“ beim Erstellen der Bingo-Karten (ohne Lobby: Karte steckt im QR-Code, kein Internet-Sync)
- Beitreten ohne QR-Code: Seite …/musik-bingo-lobby/join öffnen, Lobby-Code und Namen eingeben
- Leiste auf dem Hauptbildschirm zeigt nur noch die Mitspieler (Lobby-Code steht im Bingo-Menü)

## 2.2.1 – 10.10.2026
- Lautstärke-Regler und Tastatur-Hinweise auf iPhone und iPad ausgeblendet (auch iPad mit Tastatur), nur noch am PC/Laptop

## 2.2.0 – 10.10.2026
- „Link teilen“ heißt jetzt „Link kopieren“ und kopiert den Lobby-Link direkt in die Zwischenablage
- Symbole getauscht: Genaues Jahr 🎯, Jahr ± 3 📅
- Kartennummern sind in einer Lobby jetzt eindeutig (keine zwei Spieler mit derselben Karte)
- Versionsnummer unten in den Einstellungen

## 2.1.0 – 10.10.2026
- Wiedergabe robuster: schnelles Weiterklicken, Browser-Player nach Standby, Spotify-App/Box-Zustand, Geräte- und Moduswechsel
- iPad: größere Platte im Hochformat, größere Touch-Knöpfe, Lautstärke sichtbar, Querformat erlaubt

## 2.0.0 – 10.10.2026
- Bingo-Lobbys mit Firebase: Beitreten per QR-Code mit Namen, Live-Sync von Markierungen, Bingo-Rufen und aktueller Runde
- Bingo-Prüfung anhand der echten Markierungen, Bestätigung aufs Handy
- Punktesystem entfernt

## 1.x
- Ursprüngliches Musik-Bingo (Repo `Ku3rb1s/musik-bingo`)
