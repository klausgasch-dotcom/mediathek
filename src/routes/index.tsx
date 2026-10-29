import { useEffect, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Compass,
  Mic,
  Pause,
  Play,
  Podcast as PodcastIcon,
  Radio,
  Speech,
} from "lucide-react";
import { Artwork, Equalizer, SectionHeader } from "@/components/kit";
import { PodcastCard, StationCard } from "@/components/cards";
import { usePlayer } from "@/player/PlayerProvider";
import { useFavorites } from "@/hooks/useFavorites";
import { searchStations, type FavoriteStation } from "@/lib/radio";
import { topPodcasts } from "@/lib/podcasts";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Mediathek — Radio, Podcasts, Hörbücher & Vorlesen" },
      {
        name: "description",
        content:
          "Internetradio, Podcasts, freie Hörbücher und Filme abspielen, Texte vorlesen lassen und eigene Aufnahmen machen.",
      },
    ],
  }),
});

function greeting(hour: number) {
  if (hour < 5) return "Gute Nacht";
  if (hour < 11) return "Guten Morgen";
  if (hour < 17) return "Guten Tag";
  if (hour < 22) return "Guten Abend";
  return "Gute Nacht";
}

const TILES: {
  to: "/radio" | "/podcasts" | "/entdecken" | "/studio";
  search?: { tab: "aufnehmen" };
  title: string;
  text: string;
  icon: ReactNode;
  hue: number;
}[] = [
  { to: "/radio", title: "Radio", text: "Live aus aller Welt", icon: <Radio />, hue: 18 },
  { to: "/podcasts", title: "Podcasts", text: "Charts & Abos", icon: <PodcastIcon />, hue: 300 },
  { to: "/entdecken", title: "Hörbücher", text: "Frei von LibriVox", icon: <BookOpen />, hue: 200 },
  { to: "/studio", title: "Vorlesen", text: "Text rein, Stimme raus", icon: <Speech />, hue: 150 },
  {
    to: "/studio",
    search: { tab: "aufnehmen" },
    title: "Aufnehmen",
    text: "Mikrofon & Kamera",
    icon: <Mic />,
    hue: 50,
  },
  { to: "/entdecken", title: "Archiv", text: "Filme, Musik, Klänge", icon: <Compass />, hue: 250 },
];

function Row({ children }: { children: ReactNode }) {
  return (
    <div className="scroll-row -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
      {children}
    </div>
  );
}

function RowSkeleton() {
  return (
    <Row>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="w-40 shrink-0 space-y-2 sm:w-44">
          <div className="aspect-square rounded-2xl bg-muted animate-pulse" />
          <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
        </div>
      ))}
    </Row>
  );
}

function ContinueCard() {
  const { item, playing, toggle } = usePlayer();
  if (!item) return null;
  return (
    <button
      type="button"
      onClick={toggle}
      className="group mt-8 flex w-full max-w-xl items-center gap-4 overflow-hidden rounded-2xl bg-white/[0.06] p-3 pr-5 text-left ring-1 ring-white/5 transition hover:bg-white/[0.09]"
    >
      <Artwork
        src={item.thumbnail}
        seed={item.author ?? item.title}
        label={item.live ? item.title : undefined}
        contain={item.live}
        className="h-16 w-16"
        rounded="rounded-xl"
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          {playing ? "Läuft gerade" : "Weiterhören"}
        </p>
        <p className="truncate font-semibold">{item.title}</p>
        <p className="truncate text-sm text-muted-foreground">{item.author ?? item.source}</p>
      </div>
      {playing && <Equalizer className="text-primary" />}
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition group-hover:scale-105">
        {playing ? (
          <Pause className="h-5 w-5 fill-current" />
        ) : (
          <Play className="ml-0.5 h-5 w-5 fill-current" />
        )}
      </span>
    </button>
  );
}

function Home() {
  // Uhrzeit erst im Browser bestimmen – der Server kennt die Zeitzone des Nutzers nicht.
  const [hello, setHello] = useState("Hallo");
  useEffect(() => setHello(greeting(new Date().getHours())), []);
  const favStations = useFavorites<FavoriteStation>("radio");

  const stations = useQuery({
    queryKey: ["radio", undefined, undefined, "DE"],
    queryFn: () => searchStations({ countrycode: "DE" }),
    staleTime: 10 * 60_000,
  });
  const podcasts = useQuery({
    queryKey: ["podcasts", "top"],
    queryFn: () => topPodcasts(),
    staleTime: 60 * 60_000,
  });

  return (
    <div>
      <section className="aurora pb-4 pt-8 sm:pt-14">
        <p className="text-sm font-semibold text-muted-foreground">{hello} 👋</p>
        <h1 className="mt-2 max-w-3xl text-4xl font-display font-extrabold leading-[1.02] sm:text-6xl">
          Was möchtest du <span className="text-brand">hören</span>?
        </h1>
        <p className="mt-4 max-w-xl text-muted-foreground sm:text-lg">
          Radio, Podcasts und freie Hörbücher – oder lass dir einfach etwas vorlesen.
        </p>
        <ContinueCard />
      </section>

      <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {TILES.map((t) => (
          <Link
            key={t.title}
            to={t.to}
            search={t.search}
            className="group relative overflow-hidden rounded-2xl p-4 ring-1 ring-white/5 transition hover:-translate-y-0.5 hover:ring-white/15"
            style={{
              backgroundImage: `linear-gradient(145deg, oklch(0.42 0.13 ${t.hue}), oklch(0.24 0.06 ${t.hue + 30}))`,
            }}
          >
            <span className="mb-6 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white [&_svg]:h-5 [&_svg]:w-5">
              {t.icon}
            </span>
            <p className="font-display text-lg font-bold text-white">{t.title}</p>
            <p className="text-xs text-white/75">{t.text}</p>
          </Link>
        ))}
      </section>

      {favStations.items.length > 0 && (
        <section className="mt-12">
          <SectionHeader title="Deine Sender" to="/radio" />
          <Row>
            {favStations.items.map((s) => (
              <div key={s.id} className="w-36 shrink-0 sm:w-44">
                <StationCard station={s} />
              </div>
            ))}
          </Row>
        </section>
      )}

      <section className="mt-12">
        <SectionHeader title="Beliebte Sender" to="/radio" />
        {stations.isLoading ? (
          <RowSkeleton />
        ) : stations.error ? (
          <p className="text-sm text-muted-foreground">
            Das Radio-Verzeichnis ist gerade nicht erreichbar.
          </p>
        ) : (
          <Row>
            {(stations.data ?? []).slice(0, 16).map((s) => (
              <div key={s.stationuuid} className="w-36 shrink-0 sm:w-44">
                <StationCard station={s} />
              </div>
            ))}
          </Row>
        )}
      </section>

      <section className="mt-12">
        <SectionHeader title="Podcast-Charts" to="/podcasts" />
        {podcasts.isLoading ? (
          <RowSkeleton />
        ) : podcasts.error ? (
          <p className="text-sm text-muted-foreground">
            Die Podcast-Charts sind gerade nicht erreichbar.
          </p>
        ) : (
          <Row>
            {(podcasts.data ?? []).slice(0, 16).map((p) => (
              <div key={p.id} className={cn("w-36 shrink-0 sm:w-44")}>
                <PodcastCard podcast={p} />
              </div>
            ))}
          </Row>
        )}
      </section>
    </div>
  );
}
