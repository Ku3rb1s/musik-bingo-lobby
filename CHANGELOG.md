# Änderungen

Die Versionsnummer steht in `js/core.js` (`APP_VERSION`) und unten in den Einstellungen. In `index.html` muss bei jedem Update auch `?v=` an CSS/JS-Dateien erhöht werden.

## 4.12.9 – 11.10.2026
- Alle Songs gespielt → neu gemischt: Der Song, der gerade lief, kam manchmal sofort nochmal – jetzt nicht mehr
- Speicher des Browsers voll (sehr große Bibliotheken): einmaliger Hinweis statt stillem Scheitern (sonst wären nach dem Neuladen z. B. Songs weg)
- Karten früherer Bingos werden aus dem Speicher entfernt (sammelten sich über viele Spielabende an)

## 4.12.8 – 11.10.2026
- Neue Standard-Kategorie „Aus welchem Album?“ (standardmäßig aus) – Antwort ist das Album laut Spotify; Beispiel bei eigenen Kategorien jetzt „Aus welchem Film?“
- Kategorien: Beim Darüberfahren mit der Maus leuchtete der Papierkorb mit – die Zeile gehört jetzt zum Schalter
- Tipp „Erschienen in den 70ern“ (vorher „70er“)

## 4.12.7 – 11.10.2026
- Mitspieler-Liste: Markierungs-Zahlen stehen untereinander, auch wenn der Spielleiter mitspielt (leerer Platz statt fehlendem Knopf); „Entfernen“ zeigt eine Tür mit Pfeil nach draußen statt eines Papierkorbs

## 4.12.6 – 11.10.2026
- Handy: Countdown-Ring leuchtete in „Tipp“/„Überspringen“ hinein – mehr Abstand
- Handy: „Jahr korrigieren“ unter dem Cover kleiner
- Einstellungen: Untertitel „Wo die Musik einsetzt“ entfernt
- „Jahr ± 3“: „(richtig: 1987–1993)“ steht jetzt in einer eigenen Zeile unter der Jahreszahl (Spielleiter, Handys, Fernseher)

## 4.12.5 – 11.10.2026
- Countdown-Ring: Leuchten wieder weich (weichgezeichnete Kopie direkt in der Grafik) statt eines harten, breiten Streifens, der zudem am Rand abgeschnitten wurde – ohne das dunkle Quadrat von früher

## 4.12.4 – 11.10.2026
- Hinweise blieben manchmal für immer stehen: Lief die App beim Erscheinen im Hintergrund (z. B. kurz zu Spotify gewechselt), wurde der Hinweis erst nach dem Ausblenden eingeblendet
- Countdown-Ring (Spielleiter): dunkles Quadrat hinter dem Ring entfernt – der Leuchteffekt ist jetzt ein zweiter, weicher Ring statt eines Filters (auch sparsamer)
- Bingo prüfen: „Trotzdem bestätigen“ erschien auch ohne volle Linie – jetzt nur bei voller Linie mit Bedenken; bei „mehr markiert als gespielt“ kommt jetzt auch die Rückfrage statt des normalen Bestätigens
- Untertitel in Listen bis zu 2 Zeilen statt abgeschnitten (z. B. „Bingo beenden“, „Regeln & Karten“, andere Sprachen)
- Mitspieler-Liste: grüner Online-Punkt statt „·“; Papierkörbe dezent grau (rot erst beim Antippen)
- „Wer hat schon getippt“ (Handys, Meine Karte): während der Runde eine Zeile zum Wischen statt mehrerer Zeilen voller Chips – Fertige zuerst und grün, Wartende blass; nach der Auflösung stehen echte Tipps vorne
- Fernseher: bei der Auflösung stehen Spieler mit Tipp oben, ihr Tipp ist grün
- Einladen: „Fernseher-Ansicht öffnen“ auch hier (vorher nur unter Regeln & Karten)

## 4.12.3 – 11.10.2026
- Countdown auf Handys/Fernseher: Verband sich der Spielleiter mitten im Countdown neu, konnte der Countdown dort von vorn beginnen – ein Countdown wird jetzt am Wechsel der Runde in die Countdown-Phase erkannt, nicht an der (leicht schwankenden) Endzeit
- Fernseher mit „Bewegung reduzieren“ (Bedienungshilfen): Die Mitspieler-Liste stand doppelt da – läuft dann nicht durch und zeigt jeden Namen einmal
- Darstellungs-Prüfung aller Menüseiten in 4 Sprachen auf dem kleinsten Handy: ohne Befund

## 4.12.2 – 11.10.2026
- Akku/Flüssigkeit (ohne sichtbare Änderung):
  - Ist ein Menü oder Fenster offen, stehen Hintergrund und Platte dahinter still – vorher musste die Milchglas-Unschärfe des Menüs bei laufender Musik 60× pro Sekunde neu berechnet werden
  - „Songs übrig“ und Song-Auswahl rechnen per Nachschlagen statt Doppelschleife (bei 3000 Songs: von Hunderttausenden Vergleichen auf wenige Tausend)
  - Vorschaubilder in passender Größe (300 statt 640 px) für Playlist-Listen, Suche, Verlauf und das unscharfe Tipp-Cover
  - Verlauf wird erst beim Aufklappen aufgebaut; Mitspieler-Leiste nur bei Änderung neu
  - Countdown (Spielleiter, Handys, Fernseher): Zahl nur bei neuer Sekunde neu gesetzt
  - Nachgeladene Cover: Bibliothek gesammelt speichern statt jedes Mal die ganze Song-Liste

## 4.12.1 – 11.10.2026
- Playlist-Suche: „Suche fehlgeschlagen: Invalid limit“ behoben – Spotify erlaubt Entwickler-Apps nur wenige Treffer pro Anfrage. Jetzt 2 × 10 Treffer (notfalls 2 × 5).
- Hinweise wieder oben – auf allen Geräten – und nur nach oben wegwischbar wie beim iPhone (nach unten federn sie zurück)

## 4.12.0 – 11.10.2026
- Neu: Playlist suchen (Playlists → Hinzufügen, ganz oben) – findet alle öffentlichen Playlists auf Spotify, nicht nur die eigenen. Antippen lädt sie ins Spiel. Playlists von Spotify selbst stehen hinten und sind gekennzeichnet (lassen sich mit Entwickler-Apps meist nicht laden).
- Sprache in den Einstellungen (Handy): Die Auswahlliste öffnete sich nicht immer – am iPhone zoomte die Seite beim Antippen (zu kleine Schrift der unsichtbaren Liste), und ein gerade sichtbarer Hinweis lag oben über der Kopfzeile. Jetzt: 16-px-Liste, größere Tippfläche, und bei offenem Menü erscheinen Hinweise auf dem Handy unten.

## 4.11.3 – 11.10.2026
- Countdown auf Handys und Fernseher unabhängig von der Uhr des Geräts: Bisher rechnete jedes Gerät mit seiner eigenen Uhr – ging ein Handy z. B. 10 s falsch, zeigte es einen ganz anderen Countdown. Jetzt zählt der Moment, in dem der Start ankommt; nur wer mitten im Countdown dazukommt, rechnet über die Server-Zeit. Sendet der Spielleiter die Runde während des Countdowns nochmal (z. B. Jahr nachgeschlagen), startet nichts neu.
- Gemeinsamer Countdown-Ring für Handys und Fernseher (vorher doppelter Code)
- Aufgeräumt: ungenutzte Übersetzungen und CSS-Regeln entfernt; „Startposition“ im Vorschau-Hinweis heißt jetzt auch „Startpunkt im Song“
- scripts/check-lang.js meldet jetzt auch Übersetzungen, die nicht mehr benutzt werden

## 4.11.2 – 11.10.2026
- Sprung aus „Regeln & Karten“: Eine früher angesprungene Zeile (z. B. Countdown) leuchtete beim nächsten Öffnen der Einstellungen erneut auf – jetzt leuchtet nur die gerade gewählte
- „Song startet“ heißt jetzt „Startpunkt im Song“
- Startbildschirm: kurz „Los geht’s!“ (passt auf jedem Handy in eine Zeile)

## 4.11.1 – 11.10.2026
- Buzzer-Ton standardmäßig aus (einmalig auch bei allen, bei denen er seit 4.10.1 automatisch an war) – einschalten unter Einstellungen
- Bingo einrichten: Countdown (15/20/30/45/60 s, Standard 30 s) und „Song startet“ (am Anfang / ab 0:30 / zufällig, Standard am Anfang) direkt einstellbar – dieselben Einstellungen wie unter Einstellungen, dort jederzeit änderbar
- Regeln & Karten: Countdown und „Song startet“ antippen → springt in die Einstellungen zur passenden Zeile (leuchtet kurz auf)
- „Startposition“ heißt jetzt „Song startet“ (Am Anfang / Ab 0:30 / Zufällige Stelle), mit kurzer Erklärung
- Startbildschirm: „Alles bereit – los geht’s!“ statt „Bereit für das Spiel?“

## 4.11.0 – 11.10.2026
- „Bingo-Einstellungen“ heißt jetzt „Regeln & Karten“ und zeigt, was in diesem Bingo gilt: Karten (Größe, Joker, Felder), Lobby, Partien (z. B. 2 von 3), Markier-Regel, Buzzer, Countdown, Spielleiter. Die Regeln stehen fest, solange das Bingo läuft – zum Ändern Bingo beenden und neu einrichten. Neue Karten und Fernseher-Ansicht bleiben dort.
- Spielleiter: Aussteigen mitten im Bingo geht nicht mehr (Karte, Markierungen und Siege gingen verloren) – der Schalter ist weg, und beim eigenen Eintrag in der Mitspieler-Liste gibt es keinen Papierkorb mehr. Wer nicht mitspielt, kann aber jederzeit noch einsteigen („Mitspielen“ → direkt zur Kartenwahl), wie jeder andere auch.

## 4.10.2 – 11.10.2026
- Buzzer-Ton viel leiser und weicher (ca. −20 dB, etwa so laut wie die Countdown-Töne): gedämpfter Klang statt harter Rechteck-Töne, knapp eine halbe Sekunde
- Mitspieler-Leiste: Endete das Ziehen außerhalb der Leiste, wurde der nächste Klick auf einen Namen verschluckt

## 4.10.1 – 11.10.2026
- 🔔 Buzzer-Ton (Einstellungen, abschaltbar): Buzzert ein Mitspieler, kommt beim Spielleiter ein Quizshow-Buzzer statt eines Pieps; beim Einschalten zum Probehören
- Fernseher überarbeitet:
  - Passt immer auf den Bildschirm (Größen richten sich nach Breite und Höhe) – vorher wurde bei der Auflösung der Song unten abgeschnitten
  - Auflösung: Cover links, Lösung groß rechts, darunter Titel, Interpret und Jahr (lange Titel werden gekürzt)
  - Countdown als großer Ring wie auf den Handys, die letzten 5 Sekunden rot; wer gebuzzert hat, steht groß darunter
  - „💬 3 / 8 haben getippt“ während der Song läuft
  - Große Einblendungen: „🎉 BINGO! – Name ruft Bingo“, „🏆 Name gewinnt die Partie!“ (mit Konfetti), „Partie 2 von 3 – neue Partie“
  - Während des Spiels ist der QR-Code kleiner – mehr Platz für Mitspieler und Tipps

## 4.10.0 – 11.10.2026
- Neu: 🔔 Buzzer für Mitspieler (Bingo einrichten → Lobby, vor dem Erstellen der Karten einstellen). Solange der Song läuft, hat jedes Handy oben in der Runden-Box einen Buzzer-Knopf – wer die Antwort weiß, drückt ihn und startet den Countdown für alle. Es zählt der Erste. Der Spielleiter sieht „🔔 Name“ oben und einen Hinweis, Handys und Fernseher zeigen den Namen ebenfalls. Nach „Rückgängig“ kann erneut gebuzzert werden. Reagiert der Spielleiter nicht (App zu), wird der Knopf nach 6 s wieder frei.
- Countdown bei den Mitspielern gut sichtbar: großer Ring mit Sekunden rechts in der Runden-Box (am selben Platz wie der Buzzer – nichts Zusätzliches auf dem Bildschirm), die letzten 5 Sekunden rot, kurzes Vibrieren beim Start
- Datenbank-Regeln: Feld `bz` (Buzzer) für Mitspieler erlaubt

## 4.9.6 – 11.10.2026
- Bingo-Prüfung ohne Lobby: Nach „Neues Spiel“ zählte die Prüfung die neuen Runden unter Umständen nicht (alter Partie-Beginn blieb gespeichert) → „Noch kein Bingo möglich“, obwohl genug gespielt war. Neues Spiel beginnt jetzt wieder bei Runde 1.
- Neue Bingo-Karten: Die Prüfung zählt nur Runden ab dem Erstellen der Karten (vorher konnten ältere Runden ein Bingo „möglich“ machen); die Handys erfahren das sofort
- „Rückgängig“ nach dem Überspringen: Wurde die neue Runde in den 5 Sekunden schon aufgelöst, sprang „Rückgängig“ trotzdem zurück und brachte Verlauf und Markier-Regeln durcheinander – geht jetzt nur, solange die neue Runde noch läuft
- Mitspieler-Liste: Sortierung nach gültigen Markierungen (Markierungen einer alten Karte zählen nicht mehr mit)
- Playlist-Link laden: Der Knopf hieß danach immer „Laden“ (auch auf Englisch/Französisch/Spanisch)

## 4.9.5 – 11.10.2026
- Fernseher: Mitspieler wieder in einer Spalte; passen nicht alle auf den Bildschirm, läuft die Liste langsam endlos nach oben (weicher Rand oben/unten). Neue Tipps lassen die Liste nicht zurückspringen.

## 4.9.4 – 11.10.2026
- Mitspieler-Leiste: bei vielen Spielern zur Seite scrollbar – auf dem Handy wischen, am PC mit Mausrad oder Ziehen; ein weicher Rand zeigt, dass noch Namen kommen; sehr lange Namen werden gekürzt
- Bingo-Felder bleiben immer quadratisch: lange Kategorien werden nach 3 Zeilen (5 × 5: 2) mit … gekürzt, statt das Feld zu strecken; „Sänger/in“, „Band/Solo“ brechen sauber nach dem „/“ um
- Cover nach der Auflösung auf dem Handy deutlich größer (150–240 px statt ca. 96 px), auf dem iPad hochkant ebenfalls größer

## 4.9.3 – 11.10.2026
- Komplett-Prüfung der Darstellung (automatisch: Text, der aus seinem Kasten oder über den Rand ragt) – alle Ansichten, alle 4 Sprachen, Handy 320/375 px, iPad hoch/quer, PC, Fernseher 720p/1080p. Behoben:
  - 5 × 5-Karten ragten auf schmalen Handys über den Rand, wenn ein Feld einen langen Namen hat (Meine Karte, Bingo prüfen, Mitspieler)
  - Lobby-/Partien-/Größen-Auswahl: Beschreibungen liefen auf Französisch/Spanisch über den Rand – brechen jetzt um
  - Spielende-Bildschirm: Knöpfe ragten auf kleinen Handys über den Rand
  - Designs (Französisch/Spanisch) zu breit auf kleinen Handys
  - „Musik-Bingo“ in der Kopfzeile auf sehr kleinen Handys unter den Knöpfen; bei Mitspielern dort nur noch das Logo-Bild
  - Lange Knopftexte (z. B. „Finalement garder mon ancienne carte“) brechen um
  - Fernseher: bei vielen Mitspielern lief die Liste unten aus dem Bild – ab 9 Mitspielern zwei Spalten, QR-Code passt sich an, Seite immer bildschirmhoch
- Auflösung auf kleinen Bildschirmen: die Frage steht nicht mehr doppelt (oben in der Kategorie reicht)
- Gleicher Name beim Beitreten (zwei „Max“) → automatisch „Max 2“, damit Liste, Siege und Tipps eindeutig sind
- Ohne Songs fragt „Spiel starten“ nicht mehr nach Bingo, sondern öffnet direkt die Playlists bzw. die Anmeldung

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
