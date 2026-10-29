import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  Download,
  ExternalLink,
  Maximize,
  Music,
  Pause,
  Play,
  Repeat,
  SkipBack,
  SkipForward,
  Speech,
  Trash2,
  Video,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { speak, speechSupported, useVoices, type SpeechController } from "@/lib/speech";
import type { MediaItem } from "@/lib/media";
import type { Playlist } from "@/hooks/usePlaylist";

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  return h ? `${h}:${m.toString().padStart(2, "0")}:${s}` : `${m}:${s}`;
}

function KindIcon({ kind, className }: { kind: MediaItem["kind"]; className?: string }) {
  if (kind === "video") return <Video className={className} />;
  if (kind === "speech") return <Speech className={className} />;
  return <Music className={className} />;
}

export function MediaPlayer({ playlist }: { playlist: Playlist }) {
  const { items, current, setCurrent, remove, move, clear } = playlist;
  const item = current >= 0 ? items[current] : undefined;
  const voices = useVoices();

  const mediaRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);

  // Fortschritt beim Vorlesen: aktueller Abschnitt
  const chunkRef = useRef(0);
  const [speechPos, setSpeechPos] = useState({ index: 0, total: 0, text: "" });
  const [speechRestart, setSpeechRestart] = useState(0);

  const next = useCallback(() => {
    if (current < items.length - 1) setCurrent(current + 1);
    else if (repeat && items.length) setCurrent(0);
    else setPlaying(false);
  }, [current, items.length, repeat, setCurrent]);

  const prev = useCallback(() => {
    const el = mediaRef.current;
    if (item?.kind !== "speech" && el && el.currentTime > 3) {
      el.currentTime = 0;
      return;
    }
    if (item?.kind === "speech" && chunkRef.current > 0) {
      chunkRef.current = 0;
      setSpeechRestart((n) => n + 1);
      return;
    }
    if (current > 0) setCurrent(current - 1);
  }, [current, item?.kind, setCurrent]);

  // Neuer Titel: Fortschritt zurücksetzen und automatisch abspielen.
  const itemId = item?.id;
  useEffect(() => {
    chunkRef.current = 0;
    setSpeechPos({ index: 0, total: 0, text: "" });
    setTime(0);
    setDuration(0);
    if (itemId) setPlaying(true);
  }, [itemId]);

  // Audio/Video steuern
  useEffect(() => {
    const el = mediaRef.current;
    if (!el || !item || item.kind === "speech") {
      el?.pause();
      return;
    }
    if (playing) {
      el.play().catch((err: DOMException) => {
        if (err.name === "AbortError") return;
        setPlaying(false);
        if (err.name === "NotAllowedError") return; // Autoplay blockiert – Nutzer drückt einfach Play.
        toast.error(`„${item.title}“ kann nicht abgespielt werden`, {
          description: "Das Format wird von diesem Browser evtl. nicht unterstützt.",
        });
      });
    } else {
      el.pause();
    }
  }, [playing, item]);

  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;
    el.volume = volume;
    el.muted = muted;
    el.playbackRate = rate;
  }, [volume, muted, rate, itemId]);

  // Vorlesen: "Pause" bricht ab und merkt sich den Abschnitt – zuverlässiger als speechSynthesis.pause().
  useEffect(() => {
    if (!item || item.kind !== "speech" || !playing || !item.text) return;
    if (!speechSupported()) {
      toast.error("Dein Browser unterstützt keine Sprachausgabe.");
      setPlaying(false);
      return;
    }
    let ctrl: SpeechController | undefined = speak(item.text, {
      settings: item.speech ?? { rate: 1, pitch: 1, lang: "de" },
      voices,
      startAt: chunkRef.current,
      onChunk: (index, total, chunks) => {
        chunkRef.current = index;
        setSpeechPos({ index, total, text: chunks[index] });
      },
      onEnd: () => {
        ctrl = undefined;
        chunkRef.current = 0;
        next();
      },
      onError: (msg) => {
        toast.error(msg);
        setPlaying(false);
      },
    });
    return () => ctrl?.cancel();
    // voices.length: neu starten, sobald die Stimmen geladen sind
  }, [item, playing, voices.length, speechRestart]); // eslint-disable-line react-hooks/exhaustive-deps

  // Medientasten / Sperrbildschirm
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    ms.metadata = item
      ? new MediaMetadata({
          title: item.title,
          artist: item.author ?? item.source,
          artwork: item.thumbnail ? [{ src: item.thumbnail }] : [],
        })
      : null;
    ms.setActionHandler("play", () => setPlaying(true));
    ms.setActionHandler("pause", () => setPlaying(false));
    ms.setActionHandler("nexttrack", next);
    ms.setActionHandler("previoustrack", prev);
  }, [item, next, prev]);

  const togglePlay = () => {
    if (!item) {
      if (items.length) setCurrent(0);
      return;
    }
    setPlaying((p) => !p);
  };

  const seek = (value: number) => {
    if (!item) return;
    if (item.kind === "speech") {
      chunkRef.current = value;
      setSpeechPos((p) => ({ ...p, index: value }));
      setSpeechRestart((n) => n + 1);
    } else if (mediaRef.current) {
      mediaRef.current.currentTime = value;
      setTime(value);
    }
  };

  const isSpeech = item?.kind === "speech";
  const isVideo = item?.kind === "video";

  return (
    <div className="rounded-3xl border border-border bg-card shadow-lg overflow-hidden">
      {/* Bühne */}
      <div className={cn("relative bg-ink text-cream", isVideo ? "aspect-video" : "")}>
        <video
          ref={mediaRef}
          src={item && !isSpeech ? item.url : undefined}
          className={cn("w-full h-full bg-black", isVideo ? "block" : "hidden")}
          playsInline
          preload="metadata"
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onDurationChange={(e) => setDuration(e.currentTarget.duration)}
          onEnded={next}
          onClick={togglePlay}
        />
        {!isVideo && (
          <div className="flex items-center gap-4 p-5 min-h-[140px]">
            <div className="h-24 w-24 shrink-0 rounded-2xl bg-primary/90 overflow-hidden flex items-center justify-center shadow-md">
              {item?.thumbnail ? (
                <img
                  src={item.thumbnail}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              ) : (
                <KindIcon
                  kind={item?.kind ?? "audio"}
                  className={cn("h-10 w-10", playing && "animate-pulse")}
                />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider opacity-60">
                {item ? (isSpeech ? "Wird vorgelesen" : item.source) : "Mediathek"}
              </p>
              <p className="font-display text-xl font-semibold leading-tight line-clamp-2">
                {item?.title ?? "Noch nichts ausgewählt"}
              </p>
              {item?.author && <p className="text-sm opacity-75 truncate">{item.author}</p>}
              {isSpeech && speechPos.text && (
                <p className="mt-2 text-sm italic opacity-90 line-clamp-3">„{speechPos.text}“</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Steuerung */}
      <div className="p-4 space-y-3">
        {isVideo && (
          <div className="min-w-0">
            <p className="font-display text-lg font-semibold leading-tight truncate">
              {item.title}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {[item.author, item.source].filter(Boolean).join(" · ")}
            </p>
          </div>
        )}

        <div className="flex items-center gap-3 text-xs tabular-nums text-muted-foreground">
          <span className="w-12 text-right">
            {isSpeech ? `${speechPos.total ? speechPos.index + 1 : 0}` : formatTime(time)}
          </span>
          <Slider
            aria-label="Position"
            min={0}
            max={isSpeech ? Math.max(speechPos.total - 1, 0) : duration || 0}
            step={isSpeech ? 1 : 0.5}
            value={[isSpeech ? speechPos.index : time]}
            onValueChange={([v]) => seek(v)}
            disabled={!item || (isSpeech ? speechPos.total < 2 : !duration)}
          />
          <span className="w-12">{isSpeech ? `${speechPos.total}` : formatTime(duration)}</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <IconButton label="Zurück" onClick={prev} disabled={!item}>
              <SkipBack className="h-5 w-5" />
            </IconButton>
            <button
              type="button"
              onClick={togglePlay}
              disabled={!items.length}
              aria-label={playing ? "Pause" : "Abspielen"}
              className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:scale-105 transition disabled:opacity-40"
            >
              {playing && item ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6 ml-0.5" />
              )}
            </button>
            <IconButton label="Weiter" onClick={next} disabled={!item}>
              <SkipForward className="h-5 w-5" />
            </IconButton>
            <IconButton
              label="Playlist wiederholen"
              onClick={() => setRepeat((r) => !r)}
              active={repeat}
            >
              <Repeat className="h-4 w-4" />
            </IconButton>
            {isVideo && (
              <IconButton label="Vollbild" onClick={() => mediaRef.current?.requestFullscreen?.()}>
                <Maximize className="h-4 w-4" />
              </IconButton>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isSpeech && (
              <select
                aria-label="Geschwindigkeit"
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              >
                {[0.75, 1, 1.25, 1.5, 2].map((r) => (
                  <option key={r} value={r}>
                    {r}×
                  </option>
                ))}
              </select>
            )}
            <IconButton label={muted ? "Ton an" : "Stumm"} onClick={() => setMuted((m) => !m)}>
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </IconButton>
            <Slider
              aria-label="Lautstärke"
              className="w-24"
              min={0}
              max={1}
              step={0.05}
              value={[muted ? 0 : volume]}
              onValueChange={([v]) => {
                setVolume(v);
                setMuted(v === 0);
              }}
            />
          </div>
        </div>
        {item?.license && (
          <p className="text-xs text-muted-foreground">
            Lizenz: {item.license}
            {item.pageUrl && (
              <>
                {" · "}
                <a
                  href={item.pageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-primary"
                >
                  Quelle
                </a>
              </>
            )}
          </p>
        )}
      </div>

      {/* Playlist */}
      <div className="border-t border-border">
        <div className="flex items-center justify-between px-4 py-2">
          <h3 className="font-display font-semibold">Playlist ({items.length})</h3>
          {items.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setPlaying(false);
                clear();
              }}
              className="text-xs text-muted-foreground hover:text-destructive inline-flex items-center gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" /> Leeren
            </button>
          )}
        </div>
        {items.length === 0 ? (
          <p className="px-4 pb-5 text-sm text-muted-foreground">
            Noch leer. Suche freie Medien, lass dir etwas vorlesen oder nimm selbst etwas auf.
          </p>
        ) : (
          <ol className="max-h-[420px] overflow-y-auto pb-2">
            {items.map((it, i) => (
              <li
                key={it.id}
                className={cn(
                  "group flex items-center gap-2 px-4 py-2 text-sm",
                  i === current ? "bg-secondary/40" : "hover:bg-muted/60",
                )}
              >
                <button
                  type="button"
                  onClick={() => (i === current ? togglePlay() : setCurrent(i))}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    {i === current && playing ? (
                      <Pause className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <KindIcon kind={it.kind} className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "block truncate",
                        i === current && "font-semibold text-primary",
                      )}
                    >
                      {it.title}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[it.source, it.license].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </button>
                <div className="flex shrink-0 items-center opacity-60 group-hover:opacity-100">
                  {it.local && it.url && (
                    <a
                      href={it.url}
                      download={it.fileName ?? it.title}
                      className="p-1.5 rounded hover:text-primary"
                      aria-label="Herunterladen"
                      title="Herunterladen"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {it.pageUrl && (
                    <a
                      href={it.pageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded hover:text-primary"
                      aria-label="Quelle öffnen"
                      title="Quelle öffnen"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  <IconButton
                    small
                    label="Nach oben"
                    onClick={() => move(it.id, -1)}
                    disabled={i === 0}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </IconButton>
                  <IconButton
                    small
                    label="Nach unten"
                    onClick={() => move(it.id, 1)}
                    disabled={i === items.length - 1}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </IconButton>
                  <IconButton small label="Entfernen" onClick={() => remove(it.id)}>
                    <X className="h-3.5 w-3.5" />
                  </IconButton>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  active,
  small,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  small?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "rounded-full flex items-center justify-center transition hover:bg-muted hover:text-primary disabled:opacity-30 disabled:pointer-events-none",
        small ? "h-7 w-7" : "h-9 w-9",
        active && "text-primary bg-secondary/50",
      )}
    >
      {children}
    </button>
  );
}
