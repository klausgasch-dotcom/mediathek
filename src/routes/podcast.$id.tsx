import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  ExternalLink,
  Heart,
  ListPlus,
  Pause,
  Play,
  Podcast as PodcastIcon,
} from "lucide-react";
import { Artwork, EmptyState, Equalizer } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { usePlayer } from "@/player/PlayerProvider";
import { useFavorites } from "@/hooks/useFavorites";
import {
  episodeToItem,
  formatEpisodeDate,
  formatMinutes,
  loadPodcastFeed,
  type Podcast,
} from "@/lib/podcasts";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/podcast/$id")({
  validateSearch: (s: Record<string, unknown>) => ({
    feed: typeof s.feed === "string" ? s.feed : "",
  }),
  component: PodcastDetail,
  head: () => ({ meta: [{ title: "Podcast — Mediathek" }] }),
});

const PAGE = 30;

function PodcastDetail() {
  const { id } = Route.useParams();
  const { feed: feedUrl } = Route.useSearch();
  const player = usePlayer();
  const favorites = useFavorites<Podcast>("podcasts");
  const [shown, setShown] = useState(PAGE);

  const { data, isLoading, error } = useQuery({
    queryKey: ["podcast-feed", feedUrl],
    queryFn: () => loadPodcastFeed(feedUrl),
    enabled: !!feedUrl,
    staleTime: 15 * 60_000,
  });

  if (!feedUrl) {
    return (
      <div className="pt-10">
        <EmptyState icon={<PodcastIcon className="h-6 w-6" />} title="Kein Podcast ausgewählt">
          <Link to="/podcasts" className="text-primary underline">
            Zu den Podcasts
          </Link>
        </EmptyState>
      </div>
    );
  }

  const fav = favorites.isFavorite(id);
  const asPodcast = (): Podcast => ({
    id,
    title: data?.title ?? "Podcast",
    author: data?.author ?? "",
    artwork: data?.image,
    feedUrl,
  });

  return (
    <div className="pt-6">
      <Link
        to="/podcasts"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Podcasts
      </Link>

      {isLoading ? (
        <div className="mt-6 flex flex-col gap-6 sm:flex-row">
          <div className="aspect-square w-48 rounded-3xl bg-muted animate-pulse" />
          <div className="flex-1 space-y-3 pt-4">
            <div className="h-8 w-2/3 rounded bg-muted animate-pulse" />
            <div className="h-4 w-1/3 rounded bg-muted animate-pulse" />
            <div className="h-16 w-full rounded bg-muted animate-pulse" />
          </div>
        </div>
      ) : error || !data ? (
        <div className="mt-8">
          <EmptyState
            icon={<PodcastIcon className="h-6 w-6" />}
            title="Der Podcast-Feed konnte nicht geladen werden"
          >
            {(error as Error)?.message}
          </EmptyState>
        </div>
      ) : (
        <>
          <header className="aurora mt-6 flex flex-col gap-6 sm:flex-row sm:items-end">
            <Artwork
              src={data.image}
              seed={data.title}
              label={data.title}
              className="aspect-square w-44 shadow-2xl shadow-black/40 sm:w-56"
              rounded="rounded-3xl"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Podcast
              </p>
              <h1 className="mt-2 text-3xl font-display font-extrabold leading-tight sm:text-5xl">
                {data.title}
              </h1>
              {data.author && <p className="mt-2 text-muted-foreground">{data.author}</p>}
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {data.episodes[0] && (
                  <Button
                    size="lg"
                    className="rounded-full"
                    onClick={() => player.play(episodeToItem(data.episodes[0], data, feedUrl))}
                  >
                    <Play className="h-4 w-4 fill-current" /> Neueste Folge
                  </Button>
                )}
                <Button
                  size="lg"
                  variant="secondary"
                  className="rounded-full"
                  onClick={() => {
                    favorites.toggle(asPodcast());
                    toast.success(
                      fav ? "Aus der Bibliothek entfernt" : "In deiner Bibliothek gespeichert",
                    );
                  }}
                >
                  <Heart className={cn("h-4 w-4", fav && "fill-current text-primary")} />
                  {fav ? "Abonniert" : "Abonnieren"}
                </Button>
                {data.link && (
                  <a
                    href={data.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-white/10 hover:text-foreground"
                    aria-label="Website des Podcasts"
                    title="Website des Podcasts"
                  >
                    <ExternalLink className="h-5 w-5" />
                  </a>
                )}
              </div>
            </div>
          </header>

          {data.description && (
            <p className="mt-6 max-w-3xl text-muted-foreground line-clamp-4">{data.description}</p>
          )}

          <section className="mt-10">
            <h2 className="mb-3 text-2xl font-display font-bold">
              Folgen{" "}
              <span className="text-base font-normal text-muted-foreground">
                ({data.episodes.length})
              </span>
            </h2>
            <ul className="divide-y divide-white/5">
              {data.episodes.slice(0, shown).map((ep) => {
                const refId = `podcast:${feedUrl}#${ep.guid}`;
                const active = player.isCurrent(refId);
                return (
                  <li key={ep.guid} className="group flex items-start gap-4 py-4">
                    <button
                      type="button"
                      onClick={() =>
                        active ? player.toggle() : player.play(episodeToItem(ep, data, feedUrl))
                      }
                      className={cn(
                        "mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary hover:bg-primary hover:text-primary-foreground",
                      )}
                      aria-label={active && player.playing ? "Pause" : `„${ep.title}“ abspielen`}
                    >
                      {active && player.playing ? (
                        <Pause className="h-4 w-4 fill-current" />
                      ) : (
                        <Play className="ml-0.5 h-4 w-4 fill-current" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">
                        {[formatEpisodeDate(ep.date), formatMinutes(ep.duration)]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <p
                        className={cn(
                          "mt-0.5 font-semibold leading-snug",
                          active && "text-primary",
                        )}
                      >
                        {ep.title}
                        {active && (
                          <Equalizer paused={!player.playing} className="ml-2 text-primary" />
                        )}
                      </p>
                      {ep.description && (
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                          {ep.description}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        player.enqueue(episodeToItem(ep, data, feedUrl));
                        toast.success("Zur Warteschlange hinzugefügt");
                      }}
                      className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-100 transition hover:bg-white/10 hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100"
                      aria-label="Zur Warteschlange"
                      title="Zur Warteschlange"
                    >
                      <ListPlus className="h-5 w-5" />
                    </button>
                  </li>
                );
              })}
            </ul>
            {shown < data.episodes.length && (
              <div className="mt-4 text-center">
                <Button
                  variant="secondary"
                  className="rounded-full"
                  onClick={() => setShown((n) => n + PAGE)}
                >
                  Weitere Folgen laden
                </Button>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
