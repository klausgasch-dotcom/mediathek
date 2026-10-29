// Internetradio über die freie Community-Datenbank radio-browser.info (kein API-Schlüssel nötig).
import { newId, type MediaItem } from "@/lib/media";

export type Station = {
  stationuuid: string;
  name: string;
  url_resolved: string;
  homepage?: string;
  favicon?: string;
  tags?: string;
  country?: string;
  countrycode?: string;
  codec?: string;
  bitrate?: number;
  hls?: number;
  votes?: number;
  clickcount?: number;
};

export const RADIO_GENRES: { tag: string; label: string }[] = [
  { tag: "pop", label: "Pop" },
  { tag: "rock", label: "Rock" },
  { tag: "news", label: "Nachrichten" },
  { tag: "jazz", label: "Jazz" },
  { tag: "classical", label: "Klassik" },
  { tag: "electronic", label: "Elektronisch" },
  { tag: "80s", label: "80er" },
  { tag: "schlager", label: "Schlager" },
  { tag: "kids", label: "Kinder" },
  { tag: "chillout", label: "Chillout" },
  { tag: "hip hop", label: "Hip-Hop" },
  { tag: "talk", label: "Wort & Talk" },
];

export const RADIO_COUNTRIES = [
  { code: "DE", label: "Deutschland" },
  { code: "AT", label: "Österreich" },
  { code: "CH", label: "Schweiz" },
  { code: "", label: "Weltweit" },
];

// Mehrere Spiegelserver – fällt einer aus, wird der nächste probiert.
const SERVERS = [
  "https://de1.api.radio-browser.info",
  "https://de2.api.radio-browser.info",
  "https://fi1.api.radio-browser.info",
];

async function api<T>(path: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams({ hidebroken: "true", ...params });
  let lastError: unknown;
  for (const server of SERVERS) {
    try {
      const res = await fetch(`${server}${path}?${qs}`);
      if (res.ok) return (await res.json()) as T;
      lastError = new Error(`Radio-Verzeichnis antwortet mit ${res.status}`);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Radio-Verzeichnis nicht erreichbar");
}

/**
 * Nur Sender, die im Browser zuverlässig laufen: HTTPS (sonst blockiert der Browser den Stream
 * auf einer HTTPS-Seite) und kein HLS (spielt außer Safari kein Browser ohne Zusatzbibliothek).
 */
function playable(stations: Station[]) {
  const seen = new Set<string>();
  return stations.filter((s) => {
    if (!s.url_resolved?.startsWith("https://") || s.hls === 1) return false;
    const key = s.name.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function searchStations(opts: { name?: string; tag?: string; countrycode?: string }) {
  const params: Record<string, string> = {
    limit: "80",
    order: "clickcount",
    reverse: "true",
  };
  if (opts.name?.trim()) params.name = opts.name.trim();
  if (opts.tag) params.tag = opts.tag;
  if (opts.countrycode) params.countrycode = opts.countrycode;
  const stations = await api<Station[]>("/json/stations/search", params);
  return playable(stations).slice(0, 48);
}

/** Meldet dem Verzeichnis einen Aufruf – so funktionieren dort die Beliebtheits-Rankings. */
export function reportStationClick(uuid: string) {
  fetch(`${SERVERS[0]}/json/url/${encodeURIComponent(uuid)}`).catch(() => {});
}

export function stationTags(s: Station, max = 3) {
  return (s.tags ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, max);
}

export function stationToItem(s: Station): MediaItem {
  return {
    id: newId(),
    kind: "audio",
    live: true,
    title: s.name.trim(),
    url: s.url_resolved,
    source: "Internetradio",
    author: [s.country, stationTags(s, 2).join(", ")].filter(Boolean).join(" · ") || undefined,
    pageUrl: s.homepage || undefined,
    thumbnail: s.favicon?.startsWith("https://") ? s.favicon : undefined,
    refId: `radio:${s.stationuuid}`,
  };
}

export type FavoriteStation = Station & { id: string };

export function toFavoriteStation(s: Station): FavoriteStation {
  return { ...s, id: s.stationuuid };
}
