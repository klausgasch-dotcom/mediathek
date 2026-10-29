import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, Loader2, Music, Play, Plus, Search, Video } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  SEARCH_SOURCES,
  loadArchiveTracks,
  resultToItem,
  searchMedia,
  type MediaItem,
  type SearchResult,
  type SearchSource,
} from "@/lib/media";

const SUGGESTIONS: Record<SearchSource, string[]> = {
  librivox: ["Grimm", "Märchen", "Jules Verne", "Kafka", "Andersen"],
  "archive-audio": ["Jazz", "Klassik", "Lagerfeuer", "Ambient", "Folk"],
  "archive-video": ["Travel", "Ocean", "Cartoon", "Railway", "Nature"],
  "commons-audio": ["Vogelstimmen", "Meeresrauschen", "Glocken", "Wal", "Regen"],
  "commons-video": ["Wasserfall", "Vulkan", "Zug", "Delfin", "Polarlicht"],
};

export function DiscoverPanel({
  onAdd,
}: {
  onAdd: (items: MediaItem[], playNow: boolean) => void;
}) {
  const [source, setSource] = useState<SearchSource>("librivox");
  const [input, setInput] = useState("");
  const [term, setTerm] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const {
    data = [],
    isFetching,
    error,
  } = useQuery({
    queryKey: ["media-search", source, term],
    queryFn: () => searchMedia(term, source),
    enabled: !!term,
    staleTime: 5 * 60_000,
  });

  const runSearch = (t: string) => {
    setInput(t);
    setTerm(t.trim());
  };

  const add = async (r: SearchResult, playNow: boolean) => {
    if (r.url) {
      onAdd([resultToItem(r)], playNow);
      if (!playNow) toast.success(`„${r.title}“ zur Playlist hinzugefügt`);
      return;
    }
    setBusy(r.id);
    try {
      const tracks = await loadArchiveTracks(r);
      if (!tracks.length) {
        toast.error("Keine abspielbaren Dateien gefunden.");
        return;
      }
      onAdd(tracks, playNow);
      toast.success(
        tracks.length > 1
          ? `${tracks.length} Titel/Kapitel hinzugefügt`
          : `„${r.title}“ zur Playlist hinzugefügt`,
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const sourceInfo = SEARCH_SOURCES.find((s) => s.value === source)!;

  return (
    <div className="space-y-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(input);
        }}
        className="flex flex-col sm:flex-row gap-2"
      >
        <select
          aria-label="Quelle"
          value={source}
          onChange={(e) => setSource(e.target.value as SearchSource)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm sm:w-64"
        >
          {SEARCH_SOURCES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <div className="flex flex-1 gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Wonach suchst du?"
            className="h-10"
          />
          <Button type="submit" className="h-10" disabled={!input.trim()}>
            <Search className="h-4 w-4" /> Suchen
          </Button>
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">{sourceInfo.hint} – z. B.</span>
        {SUGGESTIONS[source].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => runSearch(s)}
            className="rounded-full border border-border bg-card px-3 py-1 hover:border-primary hover:text-primary transition"
          >
            {s}
          </button>
        ))}
      </div>

      {isFetching && (
        <p className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Suche läuft…
        </p>
      )}
      {error && (
        <p className="text-destructive">Die Suche ist fehlgeschlagen: {(error as Error).message}</p>
      )}
      {!isFetching && term && !error && data.length === 0 && (
        <p className="text-muted-foreground">
          Nichts gefunden. Versuch es mit einem anderen Begriff oder einer anderen Quelle.
        </p>
      )}

      <ul className="grid sm:grid-cols-2 gap-3">
        {data.map((r) => (
          <li
            key={r.id}
            className="flex gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm"
          >
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
              {r.thumbnail ? (
                <img
                  src={r.thumbnail}
                  alt=""
                  loading="lazy"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                  className="h-full w-full object-cover"
                />
              ) : r.kind === "video" ? (
                <Video className="h-7 w-7" />
              ) : (
                <Music className="h-7 w-7" />
              )}
            </div>
            <div className="min-w-0 flex-1 flex flex-col">
              <p className="font-semibold leading-tight line-clamp-2" title={r.title}>
                {r.title}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {[r.author, r.license].filter(Boolean).join(" · ") || r.source}
              </p>
              <div className="mt-auto pt-2 flex items-center gap-1">
                <Button size="sm" onClick={() => add(r, true)} disabled={busy === r.id}>
                  {busy === r.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  Abspielen
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => add(r, false)}
                  disabled={busy === r.id}
                  title="Zur Playlist"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
                {r.pageUrl && (
                  <a
                    href={r.pageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-auto p-1.5 text-muted-foreground hover:text-primary"
                    title="Quelle & Lizenz ansehen"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
