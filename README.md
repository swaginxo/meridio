# Meridio

Web-App zum Lernen von Ländern, Hauptstädten und Flaggen. Läuft komplett im Browser, ohne Server und ohne Konto. Der Spielstand liegt im `localStorage` des Geräts und lässt sich im Profil als Datei sichern und wieder laden.

## Starten

```bash
npm install
npm run dev
```

`npm run build` erzeugt die fertige App in `dist/` (inklusive Service Worker, damit sie offline läuft und sich auf den Homescreen legen lässt). `dist/` kann bei jedem statischen Hoster liegen.

## Aufbau

- `scripts/build-data.mjs` baut `src/data/world.js` aus `world-atlas` (Kartenflächen) und `world-countries` (Stammdaten). Deutsche Namen, Hauptstädte, Kontinent-Ausschnitte und die Einteilung in Staat, abhängig, umstritten stehen dort. Nach Änderungen: `npm run data`.
- `src/lib/srs.ts` ist die Lernlogik: vier Stufen (grau, gelb, hellgrün, dunkelgrün), die mit der Zeit verblassen. Schwache und verblasste Orte werden häufiger gezogen.
- `src/lib/streak.ts` rechnet Streak und Streak Freezes, `src/lib/store.ts` hält Profile und speichert.
- `src/components/WorldMap.tsx` ist die zoombare SVG-Karte, `src/screens/` enthält Start, Quiz, Streak und Profil.
- `src/index.css` enthält alle Themes als CSS-Variablen auf `data-theme`, `src/lib/themes.ts` die Liste für die Auswahl im Profil.
- `scripts/build-relief.mjs` rechnet die Gebirgsschattierung von Natural Earth (gemeinfrei) in die Kartenprojektion um: `public/relief.webp` als Übersicht und `public/relief/` als Kacheln in voller Auflösung, die beim Hineinzoomen nachgeladen werden. Die Themes Politisch, Atlas und Alte Seekarte blenden sie ein.
- `src/components/GlobeMap.tsx` ist die 3D-Weltkarte (Canvas, orthografische Projektion), `MapView.tsx` wählt je nach Einstellung zwischen Globus und flacher Karte.

## Regeln

- Punkte: 10 beim ersten, 6 beim zweiten, 3 beim dritten Versuch. Pro Runde 20 Bonus, fehlerfrei weitere 30.
- Ein Tag zählt für den Streak, sobald eine Runde abgeschlossen ist.
- Ein Streak Freeze kostet 150 Punkte, höchstens 2 auf Vorrat, Einsatz automatisch.
