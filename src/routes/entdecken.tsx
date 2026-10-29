import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/kit";
import { DiscoverPanel } from "@/components/media/DiscoverPanel";
import { usePlayer } from "@/player/PlayerProvider";

export const Route = createFileRoute("/entdecken")({
  component: Entdecken,
  head: () => ({
    meta: [
      { title: "Entdecken — Mediathek" },
      {
        name: "description",
        content:
          "Freie Hörbücher, Musik, Klänge und Filme aus Internet Archive, LibriVox und Wikimedia Commons.",
      },
    ],
  }),
});

function Entdecken() {
  const { play, enqueue } = usePlayer();
  return (
    <div>
      <PageHeader
        eyebrow="Frei & offen"
        title={
          <>
            Hörbücher & <span className="text-brand">Archiv</span>
          </>
        }
      >
        Gemeinfreie Hörbücher von LibriVox, Musik und Filme aus dem Internet Archive, Klänge und
        Videos von Wikimedia Commons – alles mit Lizenzangabe.
      </PageHeader>
      <DiscoverPanel onAdd={(items, playNow) => (playNow ? play(items) : enqueue(items))} />
    </div>
  );
}
