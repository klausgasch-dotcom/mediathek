import { Link } from "@tanstack/react-router";
import { Heart, Pause, Play } from "lucide-react";
import { Artwork, Equalizer } from "@/components/kit";
import { usePlayer } from "@/player/PlayerProvider";
import { useFavorites } from "@/hooks/useFavorites";
import {
  reportStationClick,
  stationTags,
  stationToItem,
  toFavoriteStation,
  type FavoriteStation,
  type Station,
} from "@/lib/radio";
import type { Podcast } from "@/lib/podcasts";
import { cn } from "@/lib/utils";

function HeartButton({
  active,
  onClick,
  className,
}: {
  active: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      aria-pressed={active}
      aria-label={active ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}
      title={active ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/45 backdrop-blur transition hover:scale-110",
        active ? "text-primary" : "text-white/90",
        className,
      )}
    >
      <Heart className={cn("h-4 w-4", active && "fill-current")} />
    </button>
  );
}

export function StationCard({ station }: { station: Station }) {
  const { play, toggle, isCurrent, playing, buffering } = usePlayer();
  const favorites = useFavorites<FavoriteStation>("radio");
  const refId = `radio:${station.stationuuid}`;
  const active = isCurrent(refId);
  const fav = favorites.isFavorite(station.stationuuid);

  const start = () => {
    if (active) return toggle();
    reportStationClick(station.stationuuid);
    play(stationToItem(station));
  };

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={start}
        className={cn(
          "relative block w-full rounded-2xl text-left outline-none transition focus-visible:ring-2 focus-visible:ring-ring",
          active && "ring-2 ring-primary",
        )}
        aria-label={`${station.name} ${active && playing ? "pausieren" : "abspielen"}`}
      >
        <Artwork
          src={station.favicon?.startsWith("https://") ? station.favicon : undefined}
          seed={station.name}
          label={station.name}
          contain
          className="aspect-square w-full shadow-lg transition duration-300 group-hover:shadow-primary/10"
        />
        <span
          className={cn(
            "absolute bottom-2.5 right-2.5 inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition duration-200",
            active
              ? "opacity-100"
              : "opacity-100 sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100",
          )}
        >
          {active && playing && !buffering ? (
            <Pause className="h-5 w-5 fill-current" />
          ) : (
            <Play className="ml-0.5 h-5 w-5 fill-current" />
          )}
        </span>
      </button>
      <HeartButton
        active={fav}
        onClick={() => favorites.toggle(toFavoriteStation(station))}
        className={cn(
          "absolute right-2.5 top-2.5",
          !fav && "sm:opacity-0 sm:group-hover:opacity-100",
        )}
      />
      <div className="mt-2.5 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p
            className={cn("truncate font-semibold", active && "text-primary")}
            title={station.name}
          >
            {station.name.trim()}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {[...stationTags(station, 2), station.countrycode].filter(Boolean).join(" · ") ||
              "Radio"}
          </p>
        </div>
        {active && <Equalizer paused={!playing} className="mt-1 text-primary" />}
      </div>
    </div>
  );
}

export function PodcastCard({ podcast }: { podcast: Podcast }) {
  const favorites = useFavorites<Podcast>("podcasts");
  const fav = favorites.isFavorite(podcast.id);
  return (
    <Link
      to="/podcast/$id"
      params={{ id: podcast.id }}
      search={{ feed: podcast.feedUrl }}
      className="group relative block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative">
        <Artwork
          src={podcast.artwork}
          seed={podcast.title}
          label={podcast.title}
          className="aspect-square w-full shadow-lg transition duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl group-hover:shadow-primary/10"
        />
        <HeartButton
          active={fav}
          onClick={() => favorites.toggle(podcast)}
          className={cn(
            "absolute right-2.5 top-2.5",
            !fav && "sm:opacity-0 sm:group-hover:opacity-100",
          )}
        />
      </div>
      <p className="mt-2.5 line-clamp-2 font-semibold leading-snug">{podcast.title}</p>
      <p className="truncate text-xs text-muted-foreground">{podcast.author}</p>
    </Link>
  );
}

export { HeartButton };
