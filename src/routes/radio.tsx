import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Radio as RadioIcon, Search, X } from "lucide-react";
import { Chip, EmptyState, PageHeader, SkeletonGrid } from "@/components/kit";
import { StationCard } from "@/components/cards";
import { useFavorites } from "@/hooks/useFavorites";
import { RADIO_COUNTRIES, RADIO_GENRES, searchStations, type FavoriteStation } from "@/lib/radio";

type RadioSearch = { q?: string; genre?: string; land?: string };

export const Route = createFileRoute("/radio")({
  validateSearch: (s: Record<string, unknown>): RadioSearch => ({
    q: typeof s.q === "string" && s.q ? s.q : undefined,
    genre: typeof s.genre === "string" && s.genre ? s.genre : undefined,
    land: typeof s.land === "string" ? s.land : undefined,
  }),
  component: RadioPage,
  head: () => ({
    meta: [
      { title: "Radio — Mediathek" },
      { name: "description", content: "Tausende Internetradio-Sender live hören." },
    ],
  }),
});

function RadioPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/radio" });
  const country = search.land ?? "DE";
  const [input, setInput] = useState(search.q ?? "");
  const favorites = useFavorites<FavoriteStation>("radio");

  useEffect(() => setInput(search.q ?? ""), [search.q]);

  const update = (patch: Partial<RadioSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });

  const {
    data = [],
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: ["radio", search.q, search.genre, country],
    queryFn: () => searchStations({ name: search.q, tag: search.genre, countrycode: country }),
    staleTime: 10 * 60_000,
  });

  const showFavorites = favorites.items.length > 0 && !search.q && !search.genre;

  return (
    <div>
      <PageHeader
        eyebrow="Live"
        title={
          <>
            Internet<span className="text-brand">radio</span>
          </>
        }
      >
        Tausende Sender aus aller Welt – vom Lokalradio bis zum Jazz-Kanal. Tippe auf einen Sender,
        und er läuft.
      </PageHeader>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          update({ q: input.trim() || undefined });
        }}
        className="relative max-w-xl"
      >
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Sender suchen, z. B. „Deutschlandfunk“ oder „FM4“"
          className="h-12 w-full rounded-full border border-input bg-secondary/60 pl-12 pr-12 text-base outline-none transition placeholder:text-muted-foreground focus:border-primary focus:bg-secondary"
          aria-label="Sender suchen"
        />
        {input && (
          <button
            type="button"
            onClick={() => {
              setInput("");
              update({ q: undefined });
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
            aria-label="Suche leeren"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </form>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {RADIO_COUNTRIES.map((c) => (
          <Chip key={c.code} active={country === c.code} onClick={() => update({ land: c.code })}>
            {c.label}
          </Chip>
        ))}
      </div>
      <div className="scroll-row -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <Chip active={!search.genre} onClick={() => update({ genre: undefined })}>
          Alle Genres
        </Chip>
        {RADIO_GENRES.map((g) => (
          <Chip
            key={g.tag}
            active={search.genre === g.tag}
            onClick={() => update({ genre: search.genre === g.tag ? undefined : g.tag })}
          >
            {g.label}
          </Chip>
        ))}
      </div>

      {showFavorites && (
        <section className="mt-10">
          <h2 className="mb-4 text-2xl font-display font-bold">Deine Sender</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
            {favorites.items.map((s) => (
              <StationCard key={s.id} station={s} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="mb-4 text-2xl font-display font-bold">
          {search.q
            ? `Ergebnisse für „${search.q}“`
            : search.genre
              ? (RADIO_GENRES.find((g) => g.tag === search.genre)?.label ?? search.genre)
              : "Beliebte Sender"}
          {isFetching && !isLoading && (
            <span className="ml-3 align-middle text-sm font-normal text-muted-foreground">
              lädt…
            </span>
          )}
        </h2>
        {isLoading ? (
          <SkeletonGrid count={10} className="lg:grid-cols-5" />
        ) : error ? (
          <EmptyState
            icon={<RadioIcon className="h-6 w-6" />}
            title="Das Radio-Verzeichnis ist gerade nicht erreichbar"
          >
            {(error as Error).message}. Versuch es gleich nochmal.
          </EmptyState>
        ) : data.length === 0 ? (
          <EmptyState icon={<RadioIcon className="h-6 w-6" />} title="Keine Sender gefunden">
            Probier einen anderen Namen, ein anderes Genre oder „Weltweit“.
          </EmptyState>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
            {data.map((s) => (
              <StationCard key={s.stationuuid} station={s} />
            ))}
          </div>
        )}
      </section>
      <p className="mt-10 text-xs text-muted-foreground">
        Senderverzeichnis:{" "}
        <a
          href="https://www.radio-browser.info"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-foreground"
        >
          radio-browser.info
        </a>{" "}
        (Community-Datenbank). Es werden nur Sender angezeigt, die verschlüsselt (HTTPS) senden und
        im Browser abspielbar sind.
      </p>
    </div>
  );
}
