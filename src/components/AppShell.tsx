import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Compass, Headphones, Home, Mic2, Podcast as PodcastIcon, Radio } from "lucide-react";
import { Artwork, Equalizer } from "@/components/kit";
import { MediaElement, PlayerBar, QueueSheet } from "@/player/PlayerUI";
import { usePlayer } from "@/player/PlayerProvider";
import { useFavorites } from "@/hooks/useFavorites";
import { reportStationClick, stationToItem, type FavoriteStation } from "@/lib/radio";
import type { Podcast } from "@/lib/podcasts";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Start", icon: Home, exact: true },
  { to: "/radio", label: "Radio", icon: Radio },
  { to: "/podcasts", label: "Podcasts", icon: PodcastIcon },
  { to: "/entdecken", label: "Entdecken", icon: Compass },
  { to: "/studio", label: "Studio", icon: Mic2 },
] as const;

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="bg-brand inline-flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-lg shadow-primary/20">
        <Headphones className="h-5 w-5" />
      </span>
      <span className="font-display text-xl font-extrabold tracking-tight">Mediathek</span>
    </Link>
  );
}

function Library() {
  const { play, isCurrent, playing } = usePlayer();
  const stations = useFavorites<FavoriteStation>("radio");
  const podcasts = useFavorites<Podcast>("podcasts");

  if (!stations.items.length && !podcasts.items.length) {
    return (
      <p className="px-3 text-sm text-muted-foreground">
        Markiere Sender und Podcasts mit dem Herz – sie erscheinen dann hier.
      </p>
    );
  }

  return (
    <ul className="space-y-0.5">
      {stations.items.map((s) => {
        const active = isCurrent(`radio:${s.stationuuid}`);
        return (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => {
                reportStationClick(s.stationuuid);
                play(stationToItem(s));
              }}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-white/5"
            >
              <Artwork
                src={s.favicon?.startsWith("https://") ? s.favicon : undefined}
                seed={s.name}
                label={s.name}
                contain
                className="h-9 w-9"
                rounded="rounded-lg"
              />
              <span className="min-w-0 flex-1">
                <span
                  className={cn("block truncate text-sm font-semibold", active && "text-primary")}
                >
                  {s.name}
                </span>
                <span className="block truncate text-xs text-muted-foreground">Radio</span>
              </span>
              {active && <Equalizer paused={!playing} className="text-primary" />}
            </button>
          </li>
        );
      })}
      {podcasts.items.map((p) => (
        <li key={p.id}>
          <Link
            to="/podcast/$id"
            params={{ id: p.id }}
            search={{ feed: p.feedUrl }}
            className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-white/5"
            activeProps={{ className: "bg-white/5" }}
          >
            <Artwork
              src={p.artwork}
              seed={p.title}
              label={p.title}
              className="h-9 w-9"
              rounded="rounded-lg"
            />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{p.title}</span>
              <span className="block truncate text-xs text-muted-foreground">Podcast</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [queueOpen, setQueueOpen] = useState(false);
  const { items } = usePlayer();
  const hasPlayer = items.length > 0;

  return (
    <div className="min-h-screen">
      {/* Seitenleiste (Computer) */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-30 hidden w-64 flex-col border-r border-white/5 bg-ink/60 lg:flex",
          hasPlayer ? "bottom-[88px]" : "bottom-0",
        )}
      >
        <div className="px-5 pb-4 pt-6">
          <Logo />
        </div>
        <nav className="space-y-0.5 px-3">
          {NAV.map(({ to, label, icon: Icon, ...rest }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: "exact" in rest }}
              className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
              activeProps={{ className: "bg-white/[0.07] !text-foreground" }}
            >
              <Icon className="h-5 w-5 transition group-hover:scale-110" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-6 flex min-h-0 flex-1 flex-col px-3">
          <p className="px-3 pb-2 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground/80">
            Deine Bibliothek
          </p>
          <div className="min-h-0 flex-1 overflow-y-auto pb-4">
            <Library />
          </div>
        </div>
      </aside>

      {/* Kopfzeile (Handy) */}
      <header className="glass sticky top-0 z-30 flex items-center justify-between border-b border-white/5 px-4 py-3 lg:hidden">
        <Logo />
      </header>

      <main
        className={cn(
          "lg:pl-64",
          hasPlayer
            ? "pb-[calc(150px+env(safe-area-inset-bottom))] lg:pb-28"
            : "pb-[calc(90px+env(safe-area-inset-bottom))] lg:pb-12",
        )}
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10">{children}</div>
      </main>

      {/* Tab-Leiste (Handy) */}
      <nav className="glass fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-white/5 pb-[env(safe-area-inset-bottom)] lg:hidden">
        {NAV.map(({ to, label, icon: Icon, ...rest }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: "exact" in rest }}
            className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-muted-foreground"
            activeProps={{ className: "!text-foreground [&_svg]:text-primary" }}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
      </nav>

      <MediaElement />
      <PlayerBar onOpenQueue={() => setQueueOpen(true)} />
      <QueueSheet open={queueOpen} onOpenChange={setQueueOpen} />
    </div>
  );
}
