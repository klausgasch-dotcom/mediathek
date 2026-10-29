import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { Compass, Mic, Speech } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MediaPlayer } from "@/components/media/MediaPlayer";
import { DiscoverPanel } from "@/components/media/DiscoverPanel";
import { ReadAloudPanel } from "@/components/media/ReadAloudPanel";
import { RecordPanel } from "@/components/media/RecordPanel";
import { usePlaylist } from "@/hooks/usePlaylist";

export const Route = createFileRoute("/")({
  component: Mediathek,
  head: () => ({
    meta: [
      { title: "Mediathek — Hören, Sehen, Vorlesen" },
      {
        name: "description",
        content:
          "Freie Hörbücher, Musik und Videos aus dem Netz abspielen, Texte vorlesen lassen und eigene Aufnahmen machen.",
      },
    ],
  }),
});

function Mediathek() {
  const playlist = usePlaylist();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="max-w-2xl">
        <p className="font-display italic text-primary">hören, sehen, vorlesen</p>
        <h1 className="mt-1 text-5xl font-display font-black leading-[0.95]">
          Die <span className="scribble-underline">Mediathek</span>
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Freie Hörbücher, Musik und Filme aus dem Netz, vorgelesene Texte und eigene Aufnahmen –
          alles in einer Playlist.
        </p>
      </header>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_400px] items-start">
        <Tabs defaultValue="discover" className="min-w-0">
          <TabsList className="h-auto rounded-full p-1 mb-5 flex-wrap">
            <TabsTrigger value="discover" className="rounded-full px-4 py-1.5 gap-1.5">
              <Compass className="h-4 w-4" /> Entdecken
            </TabsTrigger>
            <TabsTrigger value="speak" className="rounded-full px-4 py-1.5 gap-1.5">
              <Speech className="h-4 w-4" /> Vorlesen
            </TabsTrigger>
            <TabsTrigger value="record" className="rounded-full px-4 py-1.5 gap-1.5">
              <Mic className="h-4 w-4" /> Aufnehmen
            </TabsTrigger>
          </TabsList>
          <TabsContent value="discover">
            <DiscoverPanel onAdd={playlist.add} />
          </TabsContent>
          <TabsContent value="speak">
            <ClientOnly fallback={<div className="h-64 rounded-2xl bg-muted animate-pulse" />}>
              <ReadAloudPanel onAdd={playlist.add} />
            </ClientOnly>
          </TabsContent>
          <TabsContent value="record">
            <RecordPanel onAdd={playlist.add} />
          </TabsContent>
        </Tabs>

        <aside className="lg:sticky lg:top-24">
          <MediaPlayer playlist={playlist} />
        </aside>
      </div>
    </div>
  );
}
