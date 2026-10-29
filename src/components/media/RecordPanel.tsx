import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, FolderOpen, Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { newId, type MediaItem } from "@/lib/media";

type Mode = "audio" | "video";

function extensionFor(mime: string) {
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}

function formatDuration(sec: number) {
  return `${Math.floor(sec / 60)}:${Math.floor(sec % 60)
    .toString()
    .padStart(2, "0")}`;
}

export function RecordPanel({ onAdd }: { onAdd: (items: MediaItem[], playNow: boolean) => void }) {
  const [mode, setMode] = useState<Mode>("audio");
  const [title, setTitle] = useState("");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const stopMeterRef = useRef<() => void>(() => {});

  const cleanup = () => {
    stopMeterRef.current();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (previewRef.current) previewRef.current.srcObject = null;
  };

  useEffect(() => () => cleanup(), []);

  useEffect(() => {
    if (!recording) return;
    const started = Date.now();
    const t = setInterval(() => setElapsed((Date.now() - started) / 1000), 250);
    return () => clearInterval(t);
  }, [recording]);

  const startMeter = (stream: MediaStream) => {
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    let raf = 0;
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let peak = 0;
      for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
      setLevel(peak / 128);
      raf = requestAnimationFrame(tick);
    };
    tick();
    stopMeterRef.current = () => {
      cancelAnimationFrame(raf);
      ctx.close();
      setLevel(0);
    };
  };

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error("Aufnehmen wird von diesem Browser nicht unterstützt.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: mode === "video",
      });
      streamRef.current = stream;
      if (mode === "video" && previewRef.current) {
        previewRef.current.srcObject = stream;
        previewRef.current.play().catch(() => {});
      }
      startMeter(stream);

      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      recorder.onstop = () => {
        cleanup();
        const type = recorder.mimeType || (mode === "video" ? "video/webm" : "audio/webm");
        const blob = new Blob(chunks, { type });
        if (!blob.size) return;
        const stamp = new Date().toLocaleString("de-DE", {
          dateStyle: "short",
          timeStyle: "short",
        });
        const name =
          title.trim() || `${mode === "video" ? "Videoaufnahme" : "Sprachaufnahme"} ${stamp}`;
        onAdd(
          [
            {
              id: newId(),
              kind: mode,
              title: name,
              url: URL.createObjectURL(blob),
              source: "Eigene Aufnahme",
              local: true,
              fileName: `${name.replace(/[\\/:*?"<>|]+/g, "-")}.${extensionFor(type)}`,
            },
          ],
          false,
        );
        setTitle("");
        toast.success("Aufnahme zur Playlist hinzugefügt", {
          description: "Über das Download-Symbol kannst du sie speichern.",
        });
      };
      recorder.start(1000);
      recorderRef.current = recorder;
      setElapsed(0);
      setRecording(true);
    } catch (e) {
      cleanup();
      const err = e as DOMException;
      toast.error(
        err.name === "NotAllowedError"
          ? "Zugriff auf Mikrofon/Kamera wurde nicht erlaubt."
          : `Aufnahme nicht möglich: ${err.message}`,
      );
    }
  };

  const stop = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  };

  const openFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const list: MediaItem[] = [];
    for (const f of Array.from(files)) {
      const kind = f.type.startsWith("video")
        ? "video"
        : f.type.startsWith("audio")
          ? "audio"
          : null;
      if (!kind) continue;
      list.push({
        id: newId(),
        kind,
        title: f.name.replace(/\.[^.]+$/, ""),
        url: URL.createObjectURL(f),
        source: "Lokale Datei",
        local: true,
        fileName: f.name,
      });
    }
    if (!list.length) {
      toast.error("Keine Audio- oder Videodateien ausgewählt.");
      return;
    }
    onAdd(list, false);
    toast.success(`${list.length} Datei(en) zur Playlist hinzugefügt`);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="inline-flex rounded-full bg-muted p-1 text-sm">
          {(["audio", "video"] as const).map((m) => (
            <button
              key={m}
              type="button"
              disabled={recording}
              onClick={() => setMode(m)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 transition",
                mode === m ? "bg-background shadow font-semibold" : "text-muted-foreground",
              )}
            >
              {m === "audio" ? <Mic className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
              {m === "audio" ? "Ton" : "Video"}
            </button>
          ))}
        </div>

        {mode === "video" && (
          <video
            ref={previewRef}
            muted
            playsInline
            className={cn(
              "w-full max-w-md rounded-xl bg-ink aspect-video",
              !recording && "opacity-40",
            )}
          />
        )}

        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Name der Aufnahme (optional), z. B. „Opa erzählt vom Gardasee“"
          disabled={recording}
        />

        <div className="flex items-center gap-4">
          {recording ? (
            <Button variant="destructive" onClick={stop}>
              <Square className="h-4 w-4 fill-current" /> Stopp
            </Button>
          ) : (
            <Button onClick={start}>
              <span className="h-3 w-3 rounded-full bg-primary-foreground" /> Aufnahme starten
            </Button>
          )}
          {recording && (
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
              <span className="tabular-nums font-semibold">{formatDuration(elapsed)}</span>
              <div className="h-2 w-32 overflow-hidden rounded-full bg-muted" aria-hidden>
                <div
                  className="h-full bg-primary transition-[width] duration-75"
                  style={{ width: `${Math.min(100, level * 140)}%` }}
                />
              </div>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Aufnahmen bleiben auf deinem Gerät. Lade sie herunter, wenn du sie behalten möchtest –
          nach dem Neuladen der Seite sind sie aus der Playlist verschwunden.
        </p>
      </div>

      <div className="rounded-2xl border border-dashed border-border bg-card/60 p-5">
        <p className="font-semibold flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-primary" /> Eigene Dateien abspielen
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Musik, Hörbücher oder Urlaubsvideos von deinem Gerät.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => {
            openFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Button variant="outline" className="mt-3" onClick={() => fileRef.current?.click()}>
          Dateien auswählen
        </Button>
      </div>
    </div>
  );
}
