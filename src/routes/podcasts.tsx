import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Podcast as PodcastIcon, Search, X } from "lucide-react";
import { Chip, EmptyState, PageHeader, SkeletonGrid } from "@/components/kit";
import { PodcastCard } from "@/components/cards";
import { useFavorites } from "@/hooks/useFavorites";
import { PODCAST_CATEGORIES, searchPodcasts, topPodcasts, type Podcast } from "@/lib/podcasts";

type PodcastSearch = { q?: string };

export const Route = createFileRoute("/podcasts")({
  validateSearch: (s: Record<string, unknown>): PodcastSearch => ({
    q: typeof s.q === "string" && s.q ? s.q : undefined,
  }),
  component: PodcastsPage,
  head: () => ({
    meta: [
      { title: "Podcasts — Mediathek" },
      { name: "description", content: "Podcasts suchen, abonnieren und hören." },
    ],
  }),
});

function PodcastsPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate({ from: "/podcasts" });
  const [input, setInput] = useState(q ?? "");
  const favorites = useFavorites<Podcast>("podcasts");

  useEffect(() => setInput(q ?? ""), [q]);
  const setQuery = (value?: string) =>
    navigate({ search: { q: value || undefined }, replace: true });

  const results = useQuery({
    queryKey: ["podcasts", "search", q],
    queryFn: () => searchPodcasts({ data: { term: q! } }),
    enabled: !!q,
    staleTime: 10 * 60_000,
  });
  const charts = useQuery({
    queryKey: ["podcasts", "top"],
    queryFn: () => topPodcasts(),
    enabled: !q,
    staleTime: 60 * 60_000,
  });
  const active = q ? results : charts;
  const list = active.data ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Zum Zuhören"
        title={
          <>
            Pod<span className="text-brand">casts</span>
          </>
        }
      >
        Millionen Sendungen – Wissen, Geschichten, Nachrichten. Herz drücken, und der Podcast landet
        in deiner Bibliothek. Lange Folgen merken sich, wo du aufgehört hast.
      </PageHeader>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(input.trim());
        }}
        className="relative max-w-xl"
      >
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Podcast oder Thema suchen"
          className="h-12 w-full rounded-full border border-input bg-secondary/60 pl-12 pr-12 text-base outline-none transition placeholder:text-muted-foreground focus:border-primary focus:bg-secondary"
          aria-label="Podcasts suchen"
        />
        {input && (
          <button
            type="button"
            onClick={() => {
              setInput("");
              setQuery();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
            aria-label="Suche leeren"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </form>

      <div className="scroll-row -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <Chip active={!q} onClick={() => setQuery()}>
          Charts
        </Chip>
        {PODCAST_CATEGORIES.map((c) => (
          <Chip key={c} active={q === c} onClick={() => setQuery(c)}>
            {c}
          </Chip>
        ))}
      </div>

      {!q && favorites.items.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-2xl font-display font-bold">Deine Podcasts</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
            {favorites.items.map((p) => (
              <PodcastCard key={p.id} podcast={p} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="mb-4 text-2xl font-display font-bold">
          {q ? `Ergebnisse für „${q}“` : "Aktuelle Podcast-Charts"}
        </h2>
        {active.isLoading ? (
          <SkeletonGrid count={10} className="lg:grid-cols-5" />
        ) : active.error ? (
          <EmptyState
            icon={<PodcastIcon className="h-6 w-6" />}
            title="Podcasts konnten nicht geladen werden"
          >
            {(active.error as Error).message}
          </EmptyState>
        ) : list.length === 0 ? (
          <EmptyState icon={<PodcastIcon className="h-6 w-6" />} title="Nichts gefunden">
            Probier einen anderen Suchbegriff.
          </EmptyState>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
            {list.map((p) => (
              <PodcastCard key={p.id} podcast={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
