import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { Mic, Speech } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/kit";
import { ReadAloudPanel } from "@/components/media/ReadAloudPanel";
import { RecordPanel } from "@/components/media/RecordPanel";
import { usePlayer } from "@/player/PlayerProvider";

type StudioSearch = { tab?: "vorlesen" | "aufnehmen" };

export const Route = createFileRoute("/studio")({
  validateSearch: (s: Record<string, unknown>): StudioSearch => ({
    tab: s.tab === "aufnehmen" ? "aufnehmen" : undefined,
  }),
  component: Studio,
  head: () => ({
    meta: [
      { title: "Studio — Mediathek" },
      { name: "description", content: "Texte vorlesen lassen und eigene Aufnahmen machen." },
    ],
  }),
});

function Studio() {
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { play, enqueue } = usePlayer();
  const onAdd = (items: Parameters<typeof play>[0], playNow: boolean) =>
    playNow ? play(items) : enqueue(items);

  return (
    <div>
      <PageHeader
        eyebrow="Selbst machen"
        title={
          <>
            Dein <span className="text-brand">Studio</span>
          </>
        }
      >
        Lass dir Texte vorlesen oder nimm selbst etwas auf – eine Gute-Nacht-Geschichte, eine
        Sprachnachricht für Oma, ein kleines Hörspiel.
      </PageHeader>
      <Tabs
        value={tab ?? "vorlesen"}
        onValueChange={(v) =>
          navigate({ search: { tab: v === "aufnehmen" ? "aufnehmen" : undefined }, replace: true })
        }
      >
        <TabsList className="mb-6 h-auto rounded-full bg-secondary p-1">
          <TabsTrigger
            value="vorlesen"
            className="gap-1.5 rounded-full px-5 py-2 data-[state=active]:bg-foreground data-[state=active]:text-background"
          >
            <Speech className="h-4 w-4" /> Vorlesen
          </TabsTrigger>
          <TabsTrigger
            value="aufnehmen"
            className="gap-1.5 rounded-full px-5 py-2 data-[state=active]:bg-foreground data-[state=active]:text-background"
          >
            <Mic className="h-4 w-4" /> Aufnehmen
          </TabsTrigger>
        </TabsList>
        <TabsContent value="vorlesen">
          <ClientOnly fallback={<div className="h-64 rounded-3xl bg-muted animate-pulse" />}>
            <ReadAloudPanel onAdd={onAdd} />
          </ClientOnly>
        </TabsContent>
        <TabsContent value="aufnehmen">
          <RecordPanel onAdd={onAdd} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
