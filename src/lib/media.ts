// Suche nach frei lizenzierten Medien im Web (Internet Archive & Wikimedia Commons)
// sowie gemeinsame Typen für Player und Playlist.

export type MediaKind = "audio" | "video" | "speech";

export type SpeechSettings = {
  voiceURI?: string;
  lang?: string;
  rate: number;
  pitch: number;
};

export type MediaItem = {
  id: string;
  kind: MediaKind;
  title: string;
  /** Abspiel-URL (audio/video) */
  url?: string;
  /** Vorzulesender Text (speech) */
  text?: string;
  speech?: SpeechSettings;
  source: string;
  author?: string;
  license?: string;
  pageUrl?: string;
  thumbnail?: string;
  /** Blob-URLs (eigene Aufnahmen, lokale Dateien) überleben kein Neuladen. */
  local?: boolean;
  /** Dateiname zum Herunterladen eigener Aufnahmen */
  fileName?: string;
  /** Livestream (Radio): keine Dauer, kein Spulen */
  live?: boolean;
  /** Herkunfts-ID (z. B. "radio:<uuid>"), um doppelte Einträge zu erkennen */
  refId?: string;
  /** Veröffentlichungsdatum (Podcast-Folgen) */
  date?: string;
  description?: string;
};

export type SearchResult = {
  id: string;
  title: string;
  kind: "audio" | "video";
  source: string;
  author?: string;
  license?: string;
  pageUrl?: string;
  thumbnail?: string;
  description?: string;
  /** Direkt abspielbar (Commons) – sonst müssen die Dateien erst geladen werden (Archive). */
  url?: string;
  archiveId?: string;
};

export type SearchSource =
  | "librivox"
  | "archive-audio"
  | "archive-video"
  | "commons-audio"
  | "commons-video";

export const SEARCH_SOURCES: { value: SearchSource; label: string; hint: string }[] = [
  {
    value: "librivox",
    label: "Hörbücher (LibriVox)",
    hint: "Gemeinfreie Hörbücher, von Freiwilligen eingelesen",
  },
  {
    value: "archive-audio",
    label: "Musik & Audio (Internet Archive)",
    hint: "Netlabels, Konzerte, Hörspiele",
  },
  { value: "archive-video", label: "Filme (Internet Archive)", hint: "Gemeinfreie Filme & Dokus" },
  {
    value: "commons-audio",
    label: "Klänge (Wikimedia Commons)",
    hint: "Freie Aufnahmen, Musik, Tierstimmen",
  },
  { value: "commons-video", label: "Videos (Wikimedia Commons)", hint: "Freie Videoclips" },
];

export function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function stripHtml(html?: string) {
  if (!html) return undefined;
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text || undefined;
}

function first(v: unknown): string | undefined {
  if (Array.isArray(v)) return v.length ? String(v[0]) : undefined;
  return v == null ? undefined : String(v);
}

function licenseLabel(url?: string) {
  if (!url) return undefined;
  const cc = url.match(/creativecommons\.org\/(licenses|publicdomain)\/([^/]+)\/?([^/]*)/i);
  if (cc) {
    if (cc[1] === "publicdomain") return cc[2] === "zero" ? "CC0" : "Gemeinfrei";
    return `CC ${cc[2].toUpperCase()}${cc[3] ? ` ${cc[3]}` : ""}`;
  }
  return url;
}

// ---------------------------------------------------------------- Internet Archive

async function searchArchive(term: string, source: SearchSource): Promise<SearchResult[]> {
  const scope =
    source === "librivox"
      ? "collection:librivoxaudio"
      : source === "archive-video"
        ? "mediatype:movies AND (collection:prelinger OR collection:feature_films OR licenseurl:*creativecommons*)"
        : "mediatype:audio AND (collection:netlabels OR collection:etree OR collection:opensource_audio OR collection:oldtimeradio OR licenseurl:*creativecommons*)";
  const q = `(${term}) AND ${scope}`;
  const params = new URLSearchParams({
    q,
    rows: "24",
    page: "1",
    output: "json",
    "sort[]": "downloads desc",
  });
  for (const f of ["identifier", "title", "creator", "licenseurl", "description", "mediatype"])
    params.append("fl[]", f);

  const res = await fetch(`https://archive.org/advancedsearch.php?${params}`);
  if (!res.ok) throw new Error(`Internet Archive antwortet mit ${res.status}`);
  const json = await res.json();
  const docs: Record<string, unknown>[] = json?.response?.docs ?? [];
  return docs.map((d) => {
    const id = String(d.identifier);
    return {
      id: `ia:${id}`,
      archiveId: id,
      title: first(d.title) ?? id,
      kind: d.mediatype === "movies" ? "video" : "audio",
      source: source === "librivox" ? "LibriVox" : "Internet Archive",
      author: first(d.creator),
      license:
        licenseLabel(first(d.licenseurl)) ?? (source === "librivox" ? "Gemeinfrei" : undefined),
      pageUrl: `https://archive.org/details/${id}`,
      thumbnail: `https://archive.org/services/img/${id}`,
      description: stripHtml(first(d.description))?.slice(0, 220),
    };
  });
}

type ArchiveFile = {
  name: string;
  format?: string;
  title?: string;
  track?: string;
  length?: string;
  source?: string;
};

const AUDIO_FORMATS = ["VBR MP3", "MP3", "128Kbps MP3", "64Kbps MP3", "Ogg Vorbis", "Flac"];
const VIDEO_FORMATS = ["h.264", "MPEG4", "512Kb MPEG4", "h.264 IA", "Ogg Video", "WebM"];

/** Lädt die abspielbaren Dateien eines Archive-Eintrags (z. B. alle Kapitel eines Hörbuchs). */
export async function loadArchiveTracks(result: SearchResult): Promise<MediaItem[]> {
  const id = result.archiveId!;
  const res = await fetch(`https://archive.org/metadata/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`Internet Archive antwortet mit ${res.status}`);
  const json = await res.json();
  const files: ArchiveFile[] = json?.files ?? [];
  const formats = result.kind === "video" ? VIDEO_FORMATS : AUDIO_FORMATS;

  // Pro Format sammeln und das erste Format nehmen, das überhaupt Dateien hat –
  // sonst landet jedes Kapitel in mehreren Qualitäten in der Playlist.
  let chosen: ArchiveFile[] = [];
  for (const fmt of formats) {
    chosen = files.filter((f) => f.format === fmt);
    if (chosen.length) break;
  }
  chosen.sort(
    (a, b) => (Number(a.track) || 0) - (Number(b.track) || 0) || a.name.localeCompare(b.name),
  );

  return chosen.map((f) => ({
    id: newId(),
    kind: result.kind,
    title:
      chosen.length > 1
        ? `${result.title} – ${f.title || f.name.replace(/\.[^.]+$/, "")}`
        : result.title,
    url: `https://archive.org/download/${encodeURIComponent(id)}/${f.name.split("/").map(encodeURIComponent).join("/")}`,
    source: result.source,
    author: result.author,
    license: result.license,
    pageUrl: result.pageUrl,
    thumbnail: result.thumbnail,
  }));
}

// ---------------------------------------------------------------- Wikimedia Commons

async function searchCommons(term: string, kind: "audio" | "video"): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    generator: "search",
    gsrnamespace: "6",
    gsrsearch: `${term} filetype:${kind}`,
    gsrlimit: "24",
    prop: "imageinfo",
    iiprop: "url|mime|extmetadata",
    iiurlwidth: "320",
  });
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`);
  if (!res.ok) throw new Error(`Wikimedia Commons antwortet mit ${res.status}`);
  const json = await res.json();
  const pages: Record<string, unknown>[] = Object.values(json?.query?.pages ?? {});
  pages.sort((a, b) => Number(a.index ?? 0) - Number(b.index ?? 0));

  return pages.flatMap((p) => {
    const info = (p.imageinfo as Record<string, unknown>[] | undefined)?.[0];
    if (!info) return [];
    const meta = (info.extmetadata ?? {}) as Record<string, { value?: string }>;
    const title = String(p.title)
      .replace(/^File:/, "")
      .replace(/\.[^.]+$/, "");
    return [
      {
        id: `commons:${p.pageid}`,
        title: stripHtml(meta.ObjectName?.value) ?? title,
        kind,
        source: "Wikimedia Commons",
        author: stripHtml(meta.Artist?.value),
        license: stripHtml(meta.LicenseShortName?.value),
        pageUrl: String(info.descriptionurl ?? ""),
        thumbnail: kind === "video" ? (info.thumburl as string | undefined) : undefined,
        description: stripHtml(meta.ImageDescription?.value)?.slice(0, 220),
        url: String(info.url),
      } satisfies SearchResult,
    ];
  });
}

export async function searchMedia(term: string, source: SearchSource): Promise<SearchResult[]> {
  const t = term.trim();
  if (!t) return [];
  if (source === "commons-audio") return searchCommons(t, "audio");
  if (source === "commons-video") return searchCommons(t, "video");
  return searchArchive(t, source);
}

export function resultToItem(r: SearchResult): MediaItem {
  return {
    id: newId(),
    kind: r.kind,
    title: r.title,
    url: r.url,
    source: r.source,
    author: r.author,
    license: r.license,
    pageUrl: r.pageUrl,
    thumbnail: r.thumbnail,
  };
}

// ---------------------------------------------------------------- Wikipedia (Texte zum Vorlesen)

export async function fetchWikipediaText(topic: string, lang = "de", full = false) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    prop: "extracts",
    explaintext: "1",
    redirects: "1",
    titles: topic.trim(),
  });
  if (!full) params.set("exintro", "1");
  const res = await fetch(`https://${lang}.wikipedia.org/w/api.php?${params}`);
  if (!res.ok) throw new Error(`Wikipedia antwortet mit ${res.status}`);
  const json = await res.json();
  const page = Object.values(json?.query?.pages ?? {})[0] as
    | { title?: string; extract?: string; missing?: string }
    | undefined;
  if (!page || "missing" in page || !page.extract)
    throw new Error(`Kein Wikipedia-Artikel zu „${topic}“ gefunden.`);
  // Überschriften wie "== Geschichte ==" in Sätze umwandeln, damit sie natürlich klingen.
  const text = page.extract.replace(/^=+\s*(.+?)\s*=+$/gm, "$1.").replace(/\n{2,}/g, "\n\n");
  return {
    title: page.title ?? topic,
    text,
    url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent((page.title ?? topic).replace(/ /g, "_"))}`,
  };
}
