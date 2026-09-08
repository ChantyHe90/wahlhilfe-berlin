# Wahlkreis-Sitzsimulator (PoC)

Proof of Concept fuer die Berlin Abgeordnetenhauswahl am 20.09.2026. Reines
HTML/JS, kein Build, kein Framework, kein Backend.

Zeigt fuer alle 78 Berliner Wahlkreise das echte Wahlergebnis 2023 und
rechnet ein Szenario durch: "was waere, wenn eine Partei berlinweit 3
Prozentpunkte staerker abschneidet?" (vereinfachte Sainte-Laguë-
Sitzberechnung mit 5%-Huerde). Wichtig: das simuliert NICHT die Wirkung
einer einzelnen abgegebenen Stimme (die aendert das Berliner Ergebnis nicht
messbar), sondern eine hypothetische Verschiebung der ganzen Partei. Keine
Wahlempfehlung, nur eine transparente Modellrechnung.

Ein Erklärmodus (Button oben rechts) blendet Erklärboxen ein: was
Erststimme/Zweitstimme unterscheidet, wie Sainte-Laguë und die 5%-Huerde
funktionieren, und - nach jedem Durchrechnen - warum genau die
angezeigten Parteien Sitze gewinnen/verlieren (Sainte-Laguë-Quotient vs.
Schwelle).

Die Wahl 2026 ist die aktuellste bevorstehende Wahl - ein neueres amtliches
Ergebnis als 2023 gibt es dafuer naturgemaess noch nicht. Als Naeherung an
"jetzt" bietet die App einen Umschalter: 2023 (amtlich) oder Aktuell (der
Berlin-Wahltrend aus aktuellen Umfragen, landesweit per "Uniform Swing" auf
die 78 Wahlkreise projiziert - siehe Abschnitt "Aktueller Wahltrend" unten).

## Start

```
python3 -m http.server 8934
```

Dann im Browser: http://localhost:8934/index.html

(Direktes Oeffnen der `index.html` per Doppelklick/`file://` funktioniert
in manchen Browsern nicht zuverlaessig, wegen CORS-Restriktionen bei
lokal geladenen Skripten. Immer ueber einen lokalen Server aufrufen.)

## Dateien

- `index.html` — Seitenstruktur/UI
- `data.js` — Wahlergebnisse 2023 (amtlich, Landeswahlleiterin Berlin,
  wahlen-berlin.de) fuer alle 78 Wahlkreise + PLZ-zu-Bezirk-Zuordnung +
  aktueller Berlin-Wahltrend (dawum.de)
- `engine.js` — Sitzberechnung (Sainte-Laguë, 5%-Huerde, vereinfachte
  Ueberhang-/Ausgleichslogik) + zwei verschiedene Verschiebungen:
  Umfrage-Verschiebung (Fachbegriff "Uniform Swing", für den "Aktuell"-Modus)
  und Szenario-Verschiebung (fürs Durchrechnen, `applySwing`/`buildScenario`)
- `app.js` — UI-Logik (PLZ→Bezirk→Wahlkreis-Auswahl, 2023/Aktuell-Umschalter,
  Erklärmodus, Rendering, AfD-Callout)
- `style.css` — Styling

## Ablauf in der App

1. PLZ eingeben (beliebige Berliner PLZ).
2. Bezirk wird automatisch erkannt, Wahlkreis aus einer kurzen Liste wählen
   (PLZ-Gebiete in Berlin überschneiden sich mit Bezirks-/Wahlkreisgrenzen,
   darum keine automatische 1:1-Zuordnung).
3. Echtes Ergebnis 2023 für diesen Wahlkreis ansehen, optional auf "Aktuell"
   umschalten (aktueller Wahltrend, siehe unten).
4. Erst-/Zweitstimme testweise anders vergeben, Sitzverteilung simulieren.

## Aktueller Wahltrend

2023 bleibt die einzige echte Wahlkreis-Datenquelle - Umfragen gibt es nur
landesweit, nicht pro Wahlkreis. Im "Aktuell"-Modus wird deshalb pro
Wahlkreis ein "Uniform Swing" angewendet: die lokale Verteilung von 2023
bleibt erhalten (wer dort relativ stärker/schwächer ist als der
Landesdurchschnitt), aber landesweit auf die aktuellen Umfragewerte
verschoben. Konkret (`engine.js: buildCurrentBaseline`):

1. 2023-Landesanteil je Partei berechnen (Summe über alle 78 Wahlkreise).
2. Differenz zum aktuellen Umfrage-Landesanteil je Partei bilden.
3. Diese Differenz auf jeden Wahlkreis draufrechnen (gleiche Anzahl
   Stimmen pro Wahlkreis wie 2023, nur anders verteilt).

Umfragewert-Quelle: `CURRENT_POLL` in `data.js`, aktuell der dawum.de-
Wahltrend (Durchschnitt mehrerer Institute). Muss von Hand aktualisiert
werden, wenn neuere Umfragen vorliegen - kein Live-Abruf.

## Einschraenkungen

- Sitzberechnung vereinfacht: keine Grundmandatsklausel, echte
  Bezirkslisten-Mechanik nur angenähert (Szenario-Verschiebung wird
  gleichmäßig auf alle Wahlkreise angewendet statt auf echte Bezirkslisten)
- Szenario-Verschiebung ist fest auf 3 Prozentpunkte gesetzt, nicht
  einstellbar. Simuliert eine hypothetische berlinweite Verschiebung der
  gewählten Partei, nicht die Wirkung einer einzelnen abgegebenen Stimme
- BVV-Stimme (oranger Stimmzettel, 1 Stimme) nicht abgebildet — nur
  Abgeordnetenhaus (weißer Stimmzettel, Erst- + Zweitstimme)
- 2026 hat einen gemeinsamen Stimmzettel für Erst- und Zweitstimme
  (wie bei der Bundestagswahl); die App zeigt beide trotzdem als getrennte
  Stimmen, weil sie mechanisch unterschiedlich wirken (lokales Direktmandat
  vs. berlinweite Sitzverteilung)
