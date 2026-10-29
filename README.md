# Mediathek

Ein Mediaplayer im Browser, der freie Medien aus dem Netz abspielt, Texte vorliest und eigene Aufnahmen macht. Alles landet in einer gemeinsamen Playlist.

## Funktionen

- **Entdecken:** Suche in LibriVox-Hörbüchern, im Internet Archive (Musik, Audio, gemeinfreie Filme) und auf Wikimedia Commons (Klänge, Videos). Lizenz und Quelle werden bei jedem Eintrag angezeigt.
- **Vorlesen:** Eigener Text, Wikipedia-Artikel oder `.txt`/`.md`-Dateien werden mit der Sprachausgabe des Browsers vorgelesen. Stimme, Tempo und Tonhöhe sind einstellbar.
- **Aufnehmen:** Ton- oder Videoaufnahmen über Mikrofon bzw. Kamera, außerdem Abspielen eigener Dateien vom Gerät.
- **Player:** Playlist mit Sortieren, Wiederholen, Lautstärke, Geschwindigkeit, Vollbild und Medientasten. Die Playlist bleibt im Browser gespeichert. Eigene Aufnahmen und lokale Dateien bleiben nur bis zum Neuladen erhalten.

Es gibt kein Backend und es werden keine API-Schlüssel gebraucht. Alle Dienste werden direkt aus dem Browser abgefragt.

## Entwicklung

```bash
npm install
npm run dev      # Entwicklungsserver
npm run build    # Produktions-Build
npm run lint
```

## Mit Docker betreiben

```bash
docker build -t mediathek .
docker run -p 3000:3000 mediathek
```

## Bekannte Grenzen

- Vorgelesener Text lässt sich nicht als Audiodatei speichern. Die Sprachausgabe der Browser erlaubt das nicht.
- Welche Stimmen es gibt und wie sie klingen, hängt von Gerät und Browser ab.
- Manche Commons-Dateien liegen im Ogg-Format vor, das ältere Safari-Versionen nicht abspielen.
