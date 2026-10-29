import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { FileText, Globe, Loader2, Play, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { fetchWikipediaText, newId, type MediaItem } from "@/lib/media";
import { markdownToSpeech, pickVoice, speechSupported, useVoices } from "@/lib/speech";

const LANG_NAMES: Record<string, string> = {
  de: "Deutsch",
  en: "Englisch",
  fr: "Französisch",
  es: "Spanisch",
  it: "Italienisch",
  nl: "Niederländisch",
  pt: "Portugiesisch",
  pl: "Polnisch",
  sv: "Schwedisch",
  da: "Dänisch",
  tr: "Türkisch",
};

export function ReadAloudPanel({
  onAdd,
}: {
  onAdd: (items: MediaItem[], playNow: boolean) => void;
}) {
  const voices = useVoices();
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [source, setSource] = useState<{ label: string; url?: string; license?: string }>({
    label: "Eigener Text",
  });
  const [voiceURI, setVoiceURI] = useState<string>("");
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [wikiTopic, setWikiTopic] = useState("");
  const [wikiFull, setWikiFull] = useState(false);
  const [wikiLoading, setWikiLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const sortedVoices = useMemo(
    () =>
      [...voices].sort((a, b) => {
        const ad = a.lang.toLowerCase().startsWith("de") ? 0 : 1;
        const bd = b.lang.toLowerCase().startsWith("de") ? 0 : 1;
        return ad - bd || a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name);
      }),
    [voices],
  );
  const selectedVoice = pickVoice(voices, { voiceURI: voiceURI || undefined, lang: "de" });

  const setContent = (t: string, newText: string, src: typeof source) => {
    setTitle(t);
    setText(newText);
    setSource(src);
  };

  const loadWiki = async () => {
    if (!wikiTopic.trim()) return;
    setWikiLoading(true);
    try {
      const lang = selectedVoice?.lang.slice(0, 2).toLowerCase() || "de";
      const article = await fetchWikipediaText(wikiTopic, lang, wikiFull);
      setContent(`Wikipedia: ${article.title}`, article.text, {
        label: "Wikipedia",
        url: article.url,
        license: "CC BY-SA 4.0",
      });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setWikiLoading(false);
    }
  };

  const loadFile = async (file?: File) => {
    if (!file) return;
    if (file.size > 2_000_000) {
      toast.error("Die Datei ist zu groß (max. 2 MB Text).");
      return;
    }
    const raw = await file.text();
    const body = /\.(md|markdown)$/i.test(file.name) ? markdownToSpeech(raw) : raw;
    setContent(file.name.replace(/\.[^.]+$/, ""), body, { label: "Textdatei" });
  };

  const submit = (playNow: boolean) => {
    const body = text.trim();
    if (!body) return;
    const item: MediaItem = {
      id: newId(),
      kind: "speech",
      title: title.trim() || body.slice(0, 60).replace(/\s+\S*$/, "") + "…",
      text: body,
      speech: {
        voiceURI: selectedVoice?.voiceURI,
        lang: selectedVoice?.lang ?? "de-DE",
        rate,
        pitch,
      },
      source: `${source.label} · Stimme: ${selectedVoice?.name ?? "Standard"}`,
      license: source.license,
      pageUrl: source.url,
    };
    onAdd([item], playNow);
    if (!playNow) toast.success("Text als Track zur Playlist hinzugefügt");
  };

  if (typeof window !== "undefined" && !speechSupported()) {
    return (
      <p className="rounded-2xl border border-border bg-card p-5 text-muted-foreground">
        Dein Browser unterstützt leider keine Sprachausgabe. Probiere es mit einem aktuellen Chrome,
        Edge, Safari oder Firefox.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {/* Text besorgen */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Globe className="h-4 w-4 text-primary" /> Wikipedia-Artikel
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              loadWiki();
            }}
            className="flex gap-1.5"
          >
            <Input
              value={wikiTopic}
              onChange={(e) => setWikiTopic(e.target.value)}
              placeholder="z. B. Lissabon"
            />
            <Button
              type="submit"
              size="sm"
              className="h-9"
              disabled={wikiLoading || !wikiTopic.trim()}
            >
              {wikiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Holen"}
            </Button>
          </form>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={wikiFull} onCheckedChange={setWikiFull} /> ganzer Artikel statt
            Einleitung
          </label>
        </div>

        <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <FileText className="h-4 w-4 text-primary" /> Textdatei
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md,.markdown,text/plain,text/markdown"
            className="hidden"
            onChange={(e) => {
              loadFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <Button
            variant="outline"
            size="sm"
            className="w-full h-9"
            onClick={() => fileRef.current?.click()}
          >
            .txt oder .md öffnen
          </Button>
        </div>
      </div>

      {/* Text & Stimme */}
      <div className="space-y-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titel (optional)"
        />
        <Textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (!e.target.value) setSource({ label: "Eigener Text" });
          }}
          placeholder="Schreib oder füge hier einen Text ein – eine Gute-Nacht-Geschichte, ein Tagebucheintrag, ein Gedicht …"
          className="min-h-[200px] text-base leading-relaxed"
        />
        <p className="text-xs text-muted-foreground text-right">
          {text.trim()
            ? `${text.trim().split(/\s+/).length} Wörter · ca. ${Math.max(1, Math.round(text.trim().split(/\s+/).length / (150 * rate)))} Min.`
            : ""}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 rounded-2xl border border-border bg-card p-4">
        <label className="space-y-1.5 text-sm">
          <span className="font-semibold">Stimme</span>
          <select
            value={selectedVoice?.voiceURI ?? ""}
            onChange={(e) => setVoiceURI(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            {sortedVoices.length === 0 && <option value="">Standardstimme</option>}
            {sortedVoices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({LANG_NAMES[v.lang.slice(0, 2).toLowerCase()] ?? v.lang})
              </option>
            ))}
          </select>
        </label>
        <div className="space-y-3 text-sm">
          <span className="font-semibold">Tempo: {rate.toFixed(1)}×</span>
          <Slider min={0.5} max={2} step={0.1} value={[rate]} onValueChange={([v]) => setRate(v)} />
        </div>
        <div className="space-y-3 text-sm">
          <span className="font-semibold">Tonhöhe: {pitch.toFixed(1)}</span>
          <Slider
            min={0.5}
            max={1.8}
            step={0.1}
            value={[pitch]}
            onValueChange={([v]) => setPitch(v)}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => submit(true)} disabled={!text.trim()}>
          <Play className="h-4 w-4" /> Jetzt vorlesen
        </Button>
        <Button variant="outline" onClick={() => submit(false)} disabled={!text.trim()}>
          <Plus className="h-4 w-4" /> Als Track zur Playlist
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Die Stimmen stammen von deinem Gerät bzw. Browser – deshalb klingt es auf Handy und Computer
        unterschiedlich. Es wird nichts an einen Server geschickt.
      </p>
    </div>
  );
}
