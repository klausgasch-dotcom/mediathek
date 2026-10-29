# Mediathek

Ein Mediaplayer im Browser, der freie Medien aus dem Netz abspielt, Texte vorliest und eigene Aufnahmen macht. Alles landet in einer gemeinsamen Playlist.

## Funktionen

- **Radio:** Tausende Internetradio-Sender aus der freien Datenbank [radio-browser.info](https://www.radio-browser.info), filterbar nach Land und Genre. Angezeigt werden nur Sender, die verschlüsselt (HTTPS) senden und im Browser laufen.
- **Podcasts:** Aktuelle Charts und Suche über das Apple-Podcast-Verzeichnis. Die Folgen kommen direkt aus dem RSS-Feed des Podcasts. Podcasts lassen sich abonnieren (Herz), Folgen in die Warteschlange stellen.
- **Entdecken:** Gemeinfreie Hörbücher von LibriVox, Musik und Filme aus dem Internet Archive, Klänge und Videos von Wikimedia Commons – jeweils mit Lizenz und Quelle.
- **Studio – Vorlesen:** Eigener Text, Wikipedia-Artikel oder `.txt`/`.md`-Dateien werden mit der Sprachausgabe des Browsers vorgelesen. Stimme, Tempo und Tonhöhe sind einstellbar.
- **Studio – Aufnehmen:** Ton- oder Videoaufnahmen über Mikrofon bzw. Kamera, außerdem eigene Dateien vom Gerät abspielen.
- **Player:** Läuft beim Seitenwechsel weiter. Vollansicht „Läuft gerade“, Warteschlange, ±15/30-Sekunden-Sprünge, Geschwindigkeit, Schlaf-Timer, Medientasten und Sperrbildschirm-Steuerung. Lange Folgen und Hörbücher merken sich die Position; nach dem Neuladen steht der letzte Titel wieder bereit.
- **Bibliothek:** Lieblingssender und abonnierte Podcasts erscheinen in der Seitenleiste und auf der Startseite.

Alles wird im Browser gespeichert (Warteschlange, Favoriten, Hörpositionen); es gibt kein Konto und keine Datenbank. API-Schlüssel werden nicht gebraucht. Nur Podcast-Suche und -Feeds laufen über den eigenen Server der App, weil die meisten Feeds keinen direkten Abruf aus dem Browser erlauben.

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

## Veröffentlichen

- **Vercel:** Repository bei Vercel importieren – fertig. Beim Build auf Vercel (`VERCEL=1`) erzeugt Nitro automatisch die passende Ausgabe (`.vercel/output`).
- **Eigener Server / Docker:** `npm run build` erzeugt einen Node-Server unter `.output/server/index.mjs`, den das Dockerfile startet.

## Bekannte Grenzen

- Vorgelesener Text lässt sich nicht als Audiodatei speichern. Die Sprachausgabe der Browser erlaubt das nicht.
- Welche Stimmen es gibt und wie sie klingen, hängt von Gerät und Browser ab.
- Manche Commons-Dateien liegen im Ogg-Format vor, das ältere Safari-Versionen nicht abspielen.
- Radiosender ohne HTTPS-Stream sowie HLS-Streams (`.m3u8`) werden ausgeblendet, weil Browser sie auf einer HTTPS-Seite bzw. ohne Zusatzbibliothek nicht abspielen.
- Podcast-Folgen, die nur per `http://` ausgeliefert werden, ruft die App über `https://` ab. Hoster ohne HTTPS-Unterstützung funktionieren deshalb nicht.
