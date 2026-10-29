// Podcasts: Verzeichnis-Suche über die Apple-Podcast-API, Folgen aus dem RSS-Feed des Podcasts.
// Beides läuft über Server-Funktionen, weil die meisten Feeds keinen Abruf aus dem Browser (CORS) erlauben.
import { createServerFn } from "@tanstack/react-start";
import { newId, type MediaItem } from "@/lib/media";

export type Podcast = {
  id: string;
  title: string;
  author: string;
  artwork?: string;
  feedUrl: string;
  genre?: string;
  episodeCount?: number;
};

export type Episode = {
  guid: string;
  title: string;
  url: string;
  type: string;
  date?: string;
  duration?: number;
  description?: string;
  image?: string;
};

export type PodcastFeed = {
  title: string;
  author?: string;
  description?: string;
  image?: string;
  link?: string;
  episodes: Episode[];
};

export const PODCAST_CATEGORIES = [
  "Wissen",
  "Geschichte",
  "Nachrichten",
  "Comedy",
  "Kinder",
  "Hörspiel",
  "Reisen",
  "Sport",
  "Technik",
  "Gesundheit",
];

type ItunesResult = {
  collectionId: number;
  collectionName: string;
  artistName: string;
  artworkUrl600?: string;
  artworkUrl100?: string;
  feedUrl?: string;
  primaryGenreName?: string;
  trackCount?: number;
};

function toPodcast(r: ItunesResult): Podcast | null {
  if (!r.feedUrl) return null;
  return {
    id: String(r.collectionId),
    title: r.collectionName,
    author: r.artistName,
    artwork: r.artworkUrl600 ?? r.artworkUrl100,
    feedUrl: r.feedUrl,
    genre: r.primaryGenreName,
    episodeCount: r.trackCount,
  };
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Podcast-Verzeichnis antwortet mit ${res.status}`);
  return (await res.json()) as T;
}

export const searchPodcasts = createServerFn({ method: "GET" })
  .validator((data: { term: string }) => ({ term: String(data.term ?? "").slice(0, 100) }))
  .handler(async ({ data }) => {
    if (!data.term.trim()) return [] as Podcast[];
    const qs = new URLSearchParams({
      media: "podcast",
      term: data.term,
      country: "DE",
      lang: "de_de",
      limit: "30",
    });
    const json = await getJson<{ results: ItunesResult[] }>(
      `https://itunes.apple.com/search?${qs}`,
    );
    return json.results.map(toPodcast).filter((p): p is Podcast => !!p);
  });

/** Aktuelle Podcast-Charts (Deutschland) inkl. Feed-Adressen. */
export const topPodcasts = createServerFn({ method: "GET" }).handler(async () => {
  const chart = await getJson<{ feed: { results: { id: string }[] } }>(
    "https://rss.applemarketingtools.com/api/v2/de/podcasts/top/24/podcasts.json",
  );
  const ids = chart.feed.results.map((r) => r.id).join(",");
  if (!ids) return [] as Podcast[];
  const json = await getJson<{ results: ItunesResult[] }>(
    `https://itunes.apple.com/lookup?id=${ids}&country=DE`,
  );
  // Reihenfolge der Charts beibehalten
  const byId = new Map(json.results.map((r) => [String(r.collectionId), r]));
  return chart.feed.results
    .map((r) => byId.get(r.id))
    .map((r) => (r ? toPodcast(r) : null))
    .filter((p): p is Podcast => !!p);
});

// ---------------------------------------------------------------- Feed laden (Server)

const MAX_FEED_BYTES = 10 * 1024 * 1024;

/** Keine Abrufe ins lokale/private Netz – der Server soll kein offener Proxy ins Intranet sein. */
function assertPublicUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Ungültige Feed-Adresse");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Nur http(s)-Feeds");
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const isIp = /^[\d.]+$/.test(host) || host.includes(":");
  if (
    isIp ||
    host === "localhost" ||
    !host.includes(".") ||
    /\.(local|localhost|internal|lan|home|intranet)$/.test(host)
  ) {
    throw new Error("Diese Feed-Adresse ist nicht erlaubt");
  }
  return url;
}

export const fetchFeedXml = createServerFn({ method: "GET" })
  .validator((data: { url: string }) => ({ url: String(data.url ?? "") }))
  .handler(async ({ data }) => {
    let url = assertPublicUrl(data.url);
    // Weiterleitungen selbst verfolgen, damit auch jedes Ziel geprüft wird.
    for (let hop = 0; hop < 5; hop++) {
      const res = await fetch(url, {
        redirect: "manual",
        headers: {
          accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.5",
          "user-agent": "Mediathek/1.0 (+podcast player)",
        },
      });
      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
        url = assertPublicUrl(new URL(res.headers.get("location")!, url).toString());
        continue;
      }
      if (!res.ok) throw new Error(`Feed antwortet mit ${res.status}`);
      const length = Number(res.headers.get("content-length") ?? 0);
      if (length > MAX_FEED_BYTES) throw new Error("Feed ist zu groß");
      const text = await res.text();
      if (text.length > MAX_FEED_BYTES) throw new Error("Feed ist zu groß");
      if (!/<(rss|feed|rdf:RDF)[\s>]/i.test(text.slice(0, 5000))) {
        throw new Error("Unter dieser Adresse liegt kein Podcast-Feed");
      }
      return text;
    }
    throw new Error("Zu viele Weiterleitungen");
  });

// ---------------------------------------------------------------- Feed auswerten (Browser)

function parseDuration(raw?: string | null) {
  if (!raw) return undefined;
  const parts = raw.trim().split(":").map(Number);
  if (parts.some((n) => Number.isNaN(n))) return undefined;
  return parts.reduce((acc, n) => acc * 60 + n, 0) || undefined;
}

function htmlToText(html?: string | null) {
  if (!html) return undefined;
  const doc = new DOMParser().parseFromString(html, "text/html");
  const text = doc.body.textContent?.replace(/\s+/g, " ").trim();
  return text || undefined;
}

/** Podcast-Audio über http würde auf einer https-Seite blockiert – fast alle Hoster können auch https. */
function secure(url: string) {
  return url.replace(/^http:\/\//i, "https://");
}

function child(el: Element, name: string) {
  // getElementsByTagName findet auch Namespace-Präfixe wie "itunes:image".
  return el.getElementsByTagName(name)[0] ?? null;
}

export function parseFeed(xml: string): PodcastFeed {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("Der Feed konnte nicht gelesen werden");
  const channel = doc.querySelector("channel");
  if (!channel) throw new Error("Der Feed enthält keinen Podcast");

  const channelImage =
    child(channel, "itunes:image")?.getAttribute("href") ??
    channel.querySelector(":scope > image > url")?.textContent ??
    undefined;

  const episodes: Episode[] = [];
  for (const item of Array.from(channel.getElementsByTagName("item")).slice(0, 300)) {
    const enclosure = child(item, "enclosure");
    const url = enclosure?.getAttribute("url");
    if (!url) continue;
    const type = enclosure?.getAttribute("type") ?? "audio/mpeg";
    episodes.push({
      guid: child(item, "guid")?.textContent?.trim() || url,
      title: child(item, "title")?.textContent?.trim() || "Ohne Titel",
      url: secure(url),
      type,
      date: child(item, "pubDate")?.textContent ?? undefined,
      duration: parseDuration(child(item, "itunes:duration")?.textContent),
      description: htmlToText(
        child(item, "itunes:summary")?.textContent ?? child(item, "description")?.textContent,
      )?.slice(0, 400),
      image: child(item, "itunes:image")?.getAttribute("href") ?? undefined,
    });
  }

  return {
    title: child(channel, "title")?.textContent?.trim() ?? "Podcast",
    author: child(channel, "itunes:author")?.textContent?.trim() || undefined,
    description: htmlToText(
      child(channel, "itunes:summary")?.textContent ?? child(channel, "description")?.textContent,
    ),
    image: channelImage ? secure(channelImage) : undefined,
    link: child(channel, "link")?.textContent?.trim() || undefined,
    episodes,
  };
}

export async function loadPodcastFeed(feedUrl: string) {
  const xml = await fetchFeedXml({ data: { url: feedUrl } });
  return parseFeed(xml);
}

export function episodeToItem(ep: Episode, feed: PodcastFeed, feedUrl: string): MediaItem {
  return {
    id: newId(),
    kind: ep.type.startsWith("video") ? "video" : "audio",
    title: ep.title,
    url: ep.url,
    source: "Podcast",
    author: feed.title,
    thumbnail: ep.image ? secure(ep.image) : feed.image,
    pageUrl: feed.link,
    date: ep.date,
    description: ep.description,
    refId: `podcast:${feedUrl}#${ep.guid}`,
  };
}

export function formatEpisodeDate(date?: string) {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" });
}

export function formatMinutes(sec?: number) {
  if (!sec) return "";
  const m = Math.round(sec / 60);
  return m >= 60 ? `${Math.floor(m / 60)} Std. ${m % 60} Min.` : `${m} Min.`;
}
