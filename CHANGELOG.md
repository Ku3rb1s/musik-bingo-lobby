# Änderungen

Die Versionsnummer steht in `js/core.js` (`APP_VERSION`) und unten in den Einstellungen. In `index.html` muss bei jedem Update auch `?v=` an CSS/JS-Dateien erhöht werden.

## 4.9.2 – 11.10.2026
- Akku: Hintergrund bewegt sich nur noch 5× statt 60× pro Sekunde (sieht gleich aus, die Milchglas-Flächen müssen viel seltener neu berechnet werden); das Pulsieren der leuchtenden Kartenfelder läuft ohne Neuzeichnen über den Grafikchip

## 4.9.1 – 11.10.2026
- Sprache wechseln beim Spielleiter ohne Neuladen: laufende Runde, Musik und Countdown laufen weiter, alle Texte wechseln sofort (Mitspieler laden weiterhin neu – ihr Stand kommt vom Server zurück)
- Rückfragen: lange Knopftexte brechen um statt über den Rand zu laufen; linker Knopf (Abbrechen bzw. zweite Wahl) weiß, Hauptaktion grün bzw. rot

## 4.9.0 – 11.10.2026
- „Spiel starten“ ohne eingerichtetes Bingo fragt jetzt: „Ohne Bingo starten“ oder „Bingo einrichten“ (öffnet direkt die Einrichtung)
- „Meine Karte“ (Spielleiter spielt mit): oben Partie-Stand mit Siegen und wer schon getippt hat – nach der Auflösung die Tipps selbst, wie bei den Mitspielern
- „Markierungen löschen“ nur noch als runder Papierkorb, beim Spielleiter und bei den Mitspielern
- Hinweise lassen sich wegwischen (in jede Richtung, auch mit der Maus); ihr Knopf (z. B. „Rückgängig“) bleibt antippbar

## 4.8.0 – 11.10.2026
- Neue Sprachen: Französisch 🇫🇷 und Spanisch 🇪🇸 (je alle 500 Texte). Geräte mit französischer bzw. spanischer Systemsprache starten automatisch darin

## 4.7.1 – 11.10.2026
- Sprache in den Einstellungen jetzt als Globus-Knopf „🌐 DE“ links oben in der Kopfzeile (statt eigener Zeile); auf Unterseiten steht dort wie gewohnt „‹ Zurück“

## 4.7.0 – 10.10.2026
- Sprachauswahl besser eingebunden: in den Einstellungen als Zeile „🌐 Sprache“ ganz oben (Auswahlliste), bei Mitspielern als Knopf „🌐 DE“ oben, der die Sprachliste öffnet
- Weitere Sprachen lassen sich einfach hinzufügen: jede Sprache ist eine Datei in js/lang/ (Vorlage en.js) und erscheint automatisch in beiden Auswahllisten; scripts/check-lang.js zeigt fehlende Texte und falsche Platzhalter. Anleitung im README
- Lösungen gehen sprachneutral an Handys und Fernseher (Land als Code, feste Antworten auf Deutsch) – jedes Gerät zeigt sie in seiner Sprache, auch Ländernamen
- Behoben: „und“ zwischen Namen („Anna und Ben“) wurde auf Englisch nicht übersetzt

## 4.6.0 – 10.10.2026
- Sprachauswahl Deutsch / English: in den Einstellungen („Sprache · Language“), bei Mitspielern oben der Umschalter „DE | EN“. Voreinstellung ist die Sprache des Geräts. Jedes Gerät hat seine eigene Sprache – Spielleiter, Mitspieler und Fernseher können unterschiedlich eingestellt sein; Standard-Kategorien, Kartenfelder und feste Antworten (z. B. „Band“, Jahrzehnt) erscheinen jeweils übersetzt. Eigene Kategorien bleiben, wie sie eingegeben wurden; Ländernamen kommen in der Sprache des Spielleiters
- Neue Datei js/i18n.js (Wörterbuch mit ~500 Texten)

## 4.5.2 – 10.10.2026
- Leiste unter der Spielfläche: Antippen der freien Fläche macht nichts mehr – nur die Namen öffnen die Karte des Spielers

## 4.5.1 – 10.10.2026
- Leiste unter der Spielfläche: Namen antippen öffnet direkt die Karte dieses Spielers (mit seinen Markierungen); die freie Fläche daneben öffnet wie bisher das Bingo-Menü

## 4.5.0 – 10.10.2026
- Markieren (Lobby) erst nach der Auflösung – vorher wackelt das Feld mit „Erst nach der Auflösung markieren“, und es leuchtet noch nichts
- Vergessen zu markieren? Läuft schon der nächste Song, kann man für die zuletzt aufgelöste Runde noch ein Feld nachtragen – bis die neue Runde aufgelöst wird. Die Felder leuchten dann, ein Hinweis unter der Karte sagt es dazu. Gilt auch für den Spielleiter, wenn er mitspielt; nicht über eine neue Partie hinweg
- Nach „Nächste Partie starten“ lässt sich die noch angezeigte letzte Runde der alten Partie nicht mehr markieren („Neue Partie – markieren geht ab der nächsten Runde“) – vorher zählte so ein Feld fälschlich in der neuen Partie

## 4.4.0 – 10.10.2026
- Zwei neue Kategorien mit Antwort von MusicBrainz, von Haus aus ausgeschaltet:
  - „Band oder Solo?“ 👥 – Antwort Band, Solo, Orchester oder Chor (mit „· mit Gast“, wenn Spotify weitere Interpreten nennt)
  - „Sänger oder Sängerin?“ 🎙️ – bei Bands, Orchestern und Chören „🤔 … – ihr entscheidet selbst“
- Land, Band/Solo und Sänger/Sängerin kommen aus einer gemeinsamen Künstler-Suche (einmal je Künstler, danach gespeichert)

## 4.3.0 – 10.10.2026
- Neue Kategorie „Aus welchem Land kommt der Künstler?“ 🌍 – die Antwort schlägt die App automatisch bei MusicBrainz nach (erst die Aufnahme, dann den Künstler, damit gleichnamige Bands nicht verwechselt werden). Von Haus aus ausgeschaltet; einschalten unter Einstellungen → Kategorien oder beim Bingo-Einrichten. Auch als Auflösung für eigene Kategorien wählbar („Herkunftsland (automatisch)“)
- Eigene Fragen ohne Daten (z. B. „Aus welchem Film?“): Die Auflösung zeigt jetzt ehrlich „🤔 Ihr entscheidet selbst“ und darunter den Song – statt so zu tun, als wäre „Interpret – Titel“ die Antwort. Die Option heißt jetzt „Keine – ihr entscheidet selbst“

## 4.2.1 – 10.10.2026
- Komplett-Test aller Funktionen (Spielleiter, zwei Mitspieler, Fernseher, mit/ohne Lobby). Behoben:
  - „Nochmal spielen“ und „Neues Spiel“ übernehmen die Partienzahl des laufenden Spiels (vorher konnte daraus „endlos“ werden)
  - Spielende: eine noch offene Kartenwahl der Mitspieler wird geschlossen
  - Statistik „Meiste Tipps“ nennt bei Gleichstand alle

## 4.2.0 – 10.10.2026
- Neu: ★ Joker in der Mitte (Bingo einrichten, bei 3 × 3 und 5 × 5) – das mittlere Feld ist schon frei, Bingo geht schneller. Funktioniert mit und ohne Lobby
- Behoben: Wurde während eines laufenden Bingos eine Kategorie hinzugefügt oder eingeschaltet, konnte eine Runde eine Kategorie ziehen, die auf keiner Karte steht – niemand konnte markieren. Jetzt werden nur Kategorien gezogen, die auf den Karten stehen; ein Hinweis unter Einstellungen → Kategorien erklärt das
- Behoben: Lobby am Vortag vorbereitet und App offen gelassen → das nächtliche Aufräumen konnte sie löschen. Beim Zurückkehren in die App wird sie jetzt mit demselben Code neu angelegt (und sonst als aktiv markiert)

## 4.1.1 – 10.10.2026
- Eigene Kategorien bekommen ein passendes Symbol zur Frage (z. B. „Aus welchem Album?“ → 💿, „Aus welchem Film?“ → 🎬, „Aus welchem Land?“ → 🌍), sonst passend zur Art der Auflösung; nur wenn nichts passt, ein freies Symbol
- Auflösung: die Chips „Jahr … · Original“, „1970er“ und „± 3: …“ sind weg – das Jahr steht schon neben dem Interpreten

## 4.1.0 – 10.10.2026
- Bingo einrichten: Kategorien direkt dort an- und ausschalten (antippen) und eigene Kategorien hinzufügen – ohne Umweg über die Einstellungen
- Tipp: Wer einen abgegebenen Tipp nochmal ändert, gilt wieder als „nicht abgegeben“ – der ✓ verschwindet auch bei den anderen und beim Spielleiter, bis man erneut „Fertig“ drückt bzw. das Feld verlässt

## 4.0.5 – 10.10.2026
- „Bingo beenden“ steht jetzt ganz unten in der Bingo-Übersicht (statt versteckt in den Bingo-Einstellungen)
- Lobby-Code-Feld und Profilbild in den Logo-Farben (Orange → Pink) statt Grün → Pink

## 4.0.4 – 10.10.2026
- Neue Partie (Mitspieler): statt Vorschau-Karte plus eigener Karte (zwei Bingo-Felder untereinander) erst nur „Karte Nr. … behalten“ oder „Neue Karte aussuchen“; beim Aussuchen ersetzt die Vorschau die eigene Karte – es ist immer nur eine Karte zu sehen

## 4.0.3 – 10.10.2026
- Behoben: Findet die App das Originaljahr (MusicBrainz) erst nach der Auflösung, bekamen Handys und Fernseher noch das falsche Jahr als Lösung – jetzt wird es nachgereicht (ebenso ein nachgeladenes Cover für den Fernseher)
- Countdown läuft jetzt auch auf den Handys der Mitspieler mit („Runde 3 · noch 12 s“)
- Leertaste & Co. starten keine neue Runde mehr hinter dem Spielende-Bildschirm
- Spielleiter-Karte: wird ein Bingo wieder abgewählt, verschwindet auch die Bestätigung (wie bei den Mitspielern)
- Texte klarer:
  - „Neues Spiel (Siege zurücksetzen)“ heißt jetzt „Nochmal spielen (Siege auf 0)“ – die Rückfrage behauptete fälschlich neue Karten
  - „Neues Spiel“ sagt dazu, dass mit Lobby auch Siege und Partien zurückgesetzt werden
  - Erklärung der Partien: Karten bleiben, Markierungen werden gelöscht, Karte behalten oder neu wählen
  - „Bingo beenden“ sagt, dass die Mitspieler zur Code-Eingabe zurückkommen
  - Mitspieler: „Lobby verlassen“ statt „Zurück zur Lobby-Auswahl“
- Leere „Karte Nr.“ oben wird beim Beitreten nicht mehr angezeigt

## 4.0.2 – 10.10.2026
- Alte Lobbys werden jetzt täglich automatisch gelöscht (GitHub Action „Alte Lobbys aufräumen“, 24 h ohne Aktivität) – über ein eigenes Firebase-Konto, das nur die Datenbank verwalten darf
- Fehlerbehebungen nach Durchsicht:
  - Mitspieler-Ansicht: mögliche Absturzstelle beseitigt, wenn Firebase Daten sofort aus dem Zwischenspeicher liefert
  - Fernseher zeigt nach „Bingo beenden“ zuverlässig „Das Bingo wurde beendet“
  - Spielende-Bildschirm des Spielleiters aktualisiert sich, wenn nachträglich ein weiterer Sieger bestätigt wird (Unentschieden)
  - „Zurück zur Lobby-Auswahl“ entfernt den Mitspieler aus der Lobby (statt als 💤 stehen zu bleiben)
  - Hinweise bleiben vorne, wenn sich danach ein Menü, eine Rückfrage oder der Tipp im Vollbild öffnet
  - „Bingo beenden“ löscht die Lobby auch nach einem Verbindungsfehler beim Start

## 4.0.1 – 10.10.2026
- Hinweise (z. B. „In dieser Runde zählt nur …“) erscheinen jetzt über geöffneten Menüs statt dahinter – und ihre Knöpfe (z. B. „Prüfen“) lassen sich auch bei offenem Menü antippen
- Fernseher-Ansicht: Text zum Beitreten steht unter dem QR-Code statt über den weißen Rand hinaus

## 4.0.0 – 10.10.2026
- Markieren nach Regeln (Lobby): pro Runde genau ein Feld, und nur eines der aktuellen Kategorie; falsches Feld wackelt mit Hinweis, eigenes Feld lässt sich durch nochmal Antippen korrigieren
- Fernseher-Ansicht (…/?tv=CODE) für einen großen Bildschirm: Runde, Countdown, Auflösung mit Cover, Tipps, Siege, QR-Code zum Beitreten, Spielende – nur anzeigen, nichts steuern. Dezenter Link unten in den Bingo-Einstellungen
- Statistik auf dem Spielende-Bildschirm: gespielte Songs, schnellstes Bingo, meiste Tipps
- Verwaiste Lobbys (24 h ohne Aktivität) werden gelöscht; beim Öffnen einer neuen Lobby werden eigene alte Lobbys aufgeräumt
- Code in Dateien aufgeteilt (css/app.css, js/core.js, spotify.js, game.js, lobby.js, bingo.js, views.js, ui.js) – Logik unverändert

## 3.3.1 – 10.10.2026
- Tipp-Status klarer: leer = nichts, getippt = „noch nicht abgegeben“ (orange), abgegeben = „✓ abgegeben“ (grün)
- Bingo-Meldung bei mehreren Rufen: „Lena, Max und Tom“ statt „Lena und Max und Tom“

## 3.3.0 – 10.10.2026
- Spielfläche: keine Tipp-Zählung mehr neben „Tipp/Überspringen“; die Leiste unten zeigt nur noch Namen, 🏆 Siege und ✓ für „fertig getippt“ (keine Feldanzahl)
- Tipp gilt erst als abgegeben, wenn man „Fertig“ auf der Tastatur drückt oder das Feld verlässt (Anzeige „mit ‚Fertig‘ abgeben“ → „✓ abgegeben“)
- Neue Partie: jeder (auch der Spielleiter) kann seine Karte behalten oder eine neue wählen; die Karten bleiben gleich, nur die Markierungen werden gelöscht
- „Nächste Partie starten“ schließt das Menü
- Jahr wird immer klein neben dem Interpreten angezeigt – beim Spielleiter und auf den Handys der Mitspieler
- Immer genau 2 Tipps pro Runde
- Bingo-Karten: kräftigere Farben, die Felder der aktuellen Kategorie leuchten, die anderen treten zurück
- Spielende-Bildschirm mit Sieger und Siegen bei allen; der Song wird sanft ausgeblendet
- Mitspieler sehen, wenn jemand Bingo ruft oder gewinnt
- Nach „Bingo beenden“ (oder per Knopf nach Spielende) kommen die Mitspieler zurück zur Eingabe von Lobby-Code und Name
- Mehrere gleichzeitige Bingo-Rufe werden gemeinsam geprüft und können alle bestätigt werden
- „BINGO!“- und „Spielende!“-Schriftzug in den Logo-Farben

## 3.2.2 – 10.10.2026
Fehlerbehebungen nach kompletter Code-Durchsicht:
- Übersprungene Runden: Tipps werden jetzt über eine eindeutige Runden-ID zugeordnet – ein Tipp aus einer übersprungenen Runde gilt nicht mehr für die nächste, das Tipp-Feld wird geleert; bei „Rückgängig“ kommt der Tipp zurück
- Rundennummer zählt auch nach 300 Runden korrekt weiter (wichtig für die Partie-Prüfung)
- Platte antippen ohne laufende Runde (z. B. nach dem Neuladen) spielt weiter, statt Verlauf, Siege und Markierungen zu löschen
- Mehrere Gewinner in der letzten Partie bekommen alle ihren Sieg
- Bestätigen eines inzwischen entfernten Spielers gibt einen Hinweis statt eines Sync-Fehlers
- Pause/Play: schlägt der Befehl fehl, zeigt die Platte nicht mehr den falschen Zustand
- Mitspieler: „Bingo bestätigt“-Meldung kommt nach dem Neuladen nicht erneut; gespeicherter Tipp steht nach dem Neuladen wieder im Feld
- Live-Updates der Mitspieler bauen beim Spielleiter nicht mehr die ganze Knopfleiste neu auf (keine verschluckten Klicks)
- „Alle Songs entfernen“ nimmt die Runde auch bei den Mitspielern weg
- Kleinigkeiten: zwei Rückfragen gleichzeitig, Browser-Player nach dem Abmelden

## 3.2.1 – 10.10.2026
- „Bingo prüfen“: Hat die App Bedenken (z. B. nicht genug passende Runden gespielt), gibt es den Knopf „Trotzdem bestätigen“ – mit Rückfrage, ob man wirklich bestätigen möchte

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
