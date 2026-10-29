import { forwardRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import {
  ChevronDown,
  Download,
  ExternalLink,
  ListMusic,
  Loader2,
  Maximize,
  Moon,
  Music,
  Pause,
  Play,
  Radio,
  Repeat,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  Speech,
  Trash2,
  Video,
  Volume1,
  Volume2,
  VolumeX,
  X,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Artwork, Equalizer } from "@/components/kit";
import { cn } from "@/lib/utils";
import type { MediaItem } from "@/lib/media";
import { formatTime, usePlayer, usePlayerProgress } from "@/player/PlayerProvider";

// ---------------------------------------------------------------- Hilfsbausteine

export function KindIcon({ item, className }: { item?: MediaItem; className?: string }) {
  if (item?.live) return <Radio className={className} />;
  if (item?.kind === "video") return <Video className={className} />;
  if (item?.kind === "speech") return <Speech className={className} />;
  return <Music className={className} />;
}

function ItemArtwork({
  item,
  className,
  rounded,
}: {
  item?: MediaItem;
  className?: string;
  rounded?: string;
}) {
  return (
    <Artwork
      src={item?.thumbnail}
      seed={item?.author ?? item?.title ?? "leer"}
      label={item?.live ? item.title : undefined}
      contain={item?.live}
      icon={item?.live ? undefined : <KindIcon item={item} className="h-2/5 w-2/5" />}
      className={className}
      rounded={rounded}
    />
  );
}

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  label: string;
  active?: boolean;
  size?: "sm" | "md" | "lg";
  children: ReactNode;
};

// forwardRef + Props durchreichen, damit der Knopf auch als Radix-Trigger (Dropdown) funktioniert.
const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, active, size = "md", className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full transition text-foreground/80 hover:text-foreground hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none",
        size === "sm" && "h-8 w-8",
        size === "md" && "h-10 w-10",
        size === "lg" && "h-12 w-12",
        active && "text-primary hover:text-primary",
        className,
      )}
    >
      {children}
      {active && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary" />}
    </button>
  );
});

function PlayButton({ size = "md", className }: { size?: "sm" | "md" | "xl"; className?: string }) {
  const { item, items, playing, buffering, toggle } = usePlayer();
  const busy = playing && buffering && item?.kind !== "speech";
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!items.length}
      aria-label={playing && item ? "Pause" : "Abspielen"}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-foreground text-background shadow-lg transition hover:scale-105 active:scale-95 disabled:opacity-40",
        size === "sm" && "h-10 w-10",
        size === "md" && "h-11 w-11",
        size === "xl" && "h-[72px] w-[72px]",
        className,
      )}
    >
      {busy ? (
        <Loader2 className={cn("animate-spin", size === "xl" ? "h-8 w-8" : "h-5 w-5")} />
      ) : playing && item ? (
        <Pause className={cn("fill-current", size === "xl" ? "h-8 w-8" : "h-5 w-5")} />
      ) : (
        <Play className={cn("fill-current ml-0.5", size === "xl" ? "h-8 w-8" : "h-5 w-5")} />
      )}
    </button>
  );
}

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-destructive">
      <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" /> Live
    </span>
  );
}

function Progress({ large }: { large?: boolean }) {
  const { item, speech, seek } = usePlayer();
  const { time, duration } = usePlayerProgress();
  if (item?.live) {
    return (
      <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
        <LiveBadge />
        <span className="tabular-nums">{formatTime(time)}</span>
      </div>
    );
  }
  const isSpeech = item?.kind === "speech";
  const max = isSpeech ? Math.max(speech.total - 1, 0) : duration || 0;
  const value = isSpeech ? speech.index : time;
  return (
    <div
      className={cn(
        "flex w-full items-center gap-3 tabular-nums text-muted-foreground",
        large ? "text-xs" : "text-[11px]",
      )}
    >
      <span className="w-11 text-right">
        {isSpeech ? (speech.total ? `${speech.index + 1}` : "0") : formatTime(time)}
      </span>
      <Slider
        aria-label="Position"
        min={0}
        max={max}
        step={isSpeech ? 1 : 1}
        value={[Math.min(value, max)]}
        onValueChange={([v]) => seek(v)}
        disabled={!item || (isSpeech ? speech.total < 2 : !duration)}
        className="[&_[role=slider]]:opacity-0 hover:[&_[role=slider]]:opacity-100 [&_[role=slider]]:transition-opacity"
      />
      <span className="w-11">
        {isSpeech ? `${speech.total}` : duration ? formatTime(duration) : "--:--"}
      </span>
    </div>
  );
}

function VolumeControl() {
  const { volume, setVolume, muted, setMuted } = usePlayer();
  const Icon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  return (
    <div className="flex items-center gap-1">
      <IconButton size="sm" label={muted ? "Ton an" : "Stumm"} onClick={() => setMuted(!muted)}>
        <Icon className="h-4 w-4" />
      </IconButton>
      <Slider
        aria-label="Lautstärke"
        className="w-24"
        min={0}
        max={1}
        step={0.02}
        value={[muted ? 0 : volume]}
        onValueChange={([v]) => {
          setVolume(v);
          setMuted(v === 0);
        }}
      />
    </div>
  );
}

function SleepTimerMenu({ size = "sm" }: { size?: "sm" | "md" }) {
  const { sleepAt, setSleepTimer } = usePlayer();
  const minutesLeft = sleepAt ? Math.max(1, Math.round((sleepAt - Date.now()) / 60_000)) : null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton size={size} label="Schlaf-Timer" active={!!sleepAt}>
          <Moon className="h-4 w-4" />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-48">
        <DropdownMenuLabel>
          {minutesLeft ? `Stoppt in ca. ${minutesLeft} Min.` : "Schlaf-Timer"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {[15, 30, 45, 60, 90].map((m) => (
          <DropdownMenuItem key={m} onSelect={() => setSleepTimer(m)}>
            In {m} Minuten
          </DropdownMenuItem>
        ))}
        {sleepAt && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setSleepTimer(null)}>Timer aus</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RateSelect() {
  const { rate, setRate, item } = usePlayer();
  if (item?.live || item?.kind === "speech") return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="h-8 min-w-12 rounded-full px-2 text-xs font-bold text-foreground/80 hover:bg-white/10 hover:text-foreground"
          aria-label="Wiedergabe-Geschwindigkeit"
        >
          {rate}×
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" side="top">
        {[0.75, 1, 1.25, 1.5, 1.75, 2].map((r) => (
          <DropdownMenuItem
            key={r}
            onSelect={() => setRate(r)}
            className={cn(r === rate && "font-bold text-primary")}
          >
            {r}×
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TrackText({ item, className }: { item?: MediaItem; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="truncate font-semibold leading-tight">{item?.title ?? "Nichts ausgewählt"}</p>
      <p className="truncate text-xs text-muted-foreground mt-0.5">
        {item
          ? [item.author, item.author ? null : item.source].filter(Boolean).join(" · ") ||
            item.source
          : "Wähle etwas zum Hören"}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- Player-Leiste

export function PlayerBar({ onOpenQueue }: { onOpenQueue: () => void }) {
  const player = usePlayer();
  const { item, items, next, prev, skip, repeat, setRepeat, playing } = player;
  const [expanded, setExpanded] = useState(false);
  const { time, duration } = usePlayerProgress();

  if (!items.length) return null;
  const canSkip = item && !item.live && item.kind !== "speech";
  const mobilePct = item?.live ? 100 : duration ? (time / duration) * 100 : 0;

  return (
    <>
      {/* Desktop */}
      <div className="glass fixed inset-x-0 bottom-0 z-50 hidden h-[88px] border-t border-white/5 lg:block">
        <div className="grid h-full grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] items-center gap-6 px-5">
          <button
            type="button"
            onClick={() => item && setExpanded(true)}
            className="flex min-w-0 items-center gap-3 text-left group"
            aria-label="Läuft gerade öffnen"
          >
            <ItemArtwork item={item} className="h-14 w-14 shadow-lg" rounded="rounded-xl" />
            <TrackText item={item} />
            {playing && <Equalizer className="ml-1 text-primary shrink-0" />}
          </button>

          <div className="flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-1">
              <IconButton
                size="sm"
                label="Playlist wiederholen"
                active={repeat}
                onClick={() => setRepeat(!repeat)}
              >
                <Repeat className="h-4 w-4" />
              </IconButton>
              {canSkip && (
                <IconButton size="sm" label="15 Sekunden zurück" onClick={() => skip(-15)}>
                  <RotateCcw className="h-4 w-4" />
                </IconButton>
              )}
              <IconButton label="Zurück" onClick={prev} disabled={!item}>
                <SkipBack className="h-5 w-5 fill-current" />
              </IconButton>
              <PlayButton />
              <IconButton label="Weiter" onClick={next} disabled={!item}>
                <SkipForward className="h-5 w-5 fill-current" />
              </IconButton>
              {canSkip && (
                <IconButton size="sm" label="30 Sekunden vor" onClick={() => skip(30)}>
                  <RotateCw className="h-4 w-4" />
                </IconButton>
              )}
              <RateSelect />
            </div>
            <div className="w-full max-w-xl">
              <Progress />
            </div>
          </div>

          <div className="flex items-center justify-end gap-1">
            <SleepTimerMenu />
            <IconButton size="sm" label={`Warteschlange (${items.length})`} onClick={onOpenQueue}>
              <ListMusic className="h-4 w-4" />
            </IconButton>
            <VolumeControl />
          </div>
        </div>
      </div>

      {/* Handy: Mini-Player über der Tab-Leiste */}
      <div className="fixed inset-x-2 bottom-[calc(64px+env(safe-area-inset-bottom))] z-50 lg:hidden">
        <div className="relative overflow-hidden rounded-2xl bg-card/95 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl">
          <div className="flex items-center gap-3 p-2 pr-1.5">
            <button
              type="button"
              onClick={() => item && setExpanded(true)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
              aria-label="Läuft gerade öffnen"
            >
              <ItemArtwork item={item} className="h-11 w-11" rounded="rounded-lg" />
              <TrackText item={item} />
            </button>
            <IconButton size="md" label={`Warteschlange (${items.length})`} onClick={onOpenQueue}>
              <ListMusic className="h-5 w-5" />
            </IconButton>
            <PlayButton size="sm" />
          </div>
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/10">
            <div
              className="h-full bg-brand transition-[width] duration-300"
              style={{ width: `${mobilePct}%` }}
            />
          </div>
        </div>
      </div>

      {expanded && item && (
        <NowPlaying onClose={() => setExpanded(false)} onOpenQueue={onOpenQueue} />
      )}
    </>
  );
}

// ---------------------------------------------------------------- "Läuft gerade" – Vollansicht

function NowPlaying({ onClose, onOpenQueue }: { onClose: () => void; onOpenQueue: () => void }) {
  const { item, next, prev, skip, speech, repeat, setRepeat, items } = usePlayer();
  if (!item) return null;
  const canSkip = !item.live && item.kind !== "speech";

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-background animate-in slide-in-from-bottom-8 fade-in duration-300"
      role="dialog"
      aria-label="Läuft gerade"
    >
      {/* Unscharfer Hintergrund aus dem Cover */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt=""
            className="h-full w-full scale-125 object-cover opacity-40 blur-3xl"
          />
        ) : (
          <div className="aurora h-full w-full" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
      </div>

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-4">
        <div className="flex items-center justify-between">
          <IconButton label="Schließen" onClick={onClose}>
            <ChevronDown className="h-6 w-6" />
          </IconButton>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {item.live ? "Radio" : item.kind === "speech" ? "Wird vorgelesen" : item.source}
          </p>
          <IconButton
            label="Warteschlange"
            onClick={() => {
              onClose();
              onOpenQueue();
            }}
          >
            <ListMusic className="h-5 w-5" />
          </IconButton>
        </div>

        <div className="flex flex-1 flex-col justify-center py-6">
          <ItemArtwork
            item={item}
            className="mx-auto aspect-square w-full max-w-[340px] shadow-2xl shadow-black/50"
            rounded="rounded-3xl"
          />

          <div className="mt-8 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-2xl font-display font-bold leading-tight line-clamp-2">
                {item.title}
              </h2>
              <p className="mt-1 truncate text-muted-foreground">{item.author ?? item.source}</p>
            </div>
            {item.pageUrl && (
              <a
                href={item.pageUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 shrink-0 rounded-full p-2 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                aria-label="Quelle öffnen"
                title="Quelle öffnen"
              >
                <ExternalLink className="h-5 w-5" />
              </a>
            )}
          </div>

          {item.kind === "speech" && speech.text && (
            <p className="mt-4 rounded-2xl bg-white/5 p-4 text-lg leading-relaxed">
              „{speech.text}“
            </p>
          )}
          {item.description && item.kind !== "speech" && (
            <p className="mt-3 text-sm text-muted-foreground line-clamp-3">{item.description}</p>
          )}

          <div className="mt-6">
            <Progress large />
          </div>

          <div className="mt-4 flex items-center justify-between">
            {canSkip ? (
              <IconButton label="15 Sekunden zurück" onClick={() => skip(-15)}>
                <RotateCcw className="h-5 w-5" />
              </IconButton>
            ) : (
              <IconButton
                label="Playlist wiederholen"
                active={repeat}
                onClick={() => setRepeat(!repeat)}
              >
                <Repeat className="h-5 w-5" />
              </IconButton>
            )}
            <IconButton size="lg" label="Zurück" onClick={prev}>
              <SkipBack className="h-7 w-7 fill-current" />
            </IconButton>
            <PlayButton size="xl" />
            <IconButton
              size="lg"
              label="Weiter"
              onClick={next}
              disabled={items.length < 2 && !repeat}
            >
              <SkipForward className="h-7 w-7 fill-current" />
            </IconButton>
            {canSkip ? (
              <IconButton label="30 Sekunden vor" onClick={() => skip(30)}>
                <RotateCw className="h-5 w-5" />
              </IconButton>
            ) : (
              <SleepTimerMenu size="md" />
            )}
          </div>

          <div className="mt-6 flex items-center justify-between">
            {canSkip ? <SleepTimerMenu size="md" /> : <span />}
            <RateSelect />
            <VolumeControl />
          </div>
          {item.license && (
            <p className="mt-6 text-center text-xs text-muted-foreground">Lizenz: {item.license}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Warteschlange

export function QueueSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { items, current, setCurrent, toggle, playing, remove, move, clear } = usePlayer();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border p-5 text-left">
          <SheetTitle className="font-display text-2xl">Warteschlange</SheetTitle>
          <SheetDescription>
            {items.length ? `${items.length} Einträge` : "Noch leer – such dir etwas aus."}
          </SheetDescription>
        </SheetHeader>
        <ol className="flex-1 overflow-y-auto py-2">
          {items.map((it, i) => {
            const active = i === current;
            return (
              <li
                key={it.id}
                className={cn(
                  "group flex items-center gap-3 px-4 py-2",
                  active ? "bg-white/[0.06]" : "hover:bg-white/[0.04]",
                )}
              >
                <button
                  type="button"
                  onClick={() => (active ? toggle() : setCurrent(i))}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <div className="relative">
                    <ItemArtwork item={it} className="h-11 w-11" rounded="rounded-lg" />
                    {active && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50 text-primary">
                        <Equalizer paused={!playing} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={cn("truncate text-sm font-semibold", active && "text-primary")}>
                      {it.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[it.author ?? it.source, it.live ? "Live" : it.license]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </button>
                <div className="flex shrink-0 items-center opacity-70 group-hover:opacity-100">
                  {it.local && it.url && (
                    <a
                      href={it.url}
                      download={it.fileName ?? it.title}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10"
                      aria-label="Herunterladen"
                      title="Herunterladen"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  )}
                  <IconButton
                    size="sm"
                    label="Nach oben"
                    onClick={() => move(it.id, -1)}
                    disabled={i === 0}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </IconButton>
                  <IconButton
                    size="sm"
                    label="Nach unten"
                    onClick={() => move(it.id, 1)}
                    disabled={i === items.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </IconButton>
                  <IconButton size="sm" label="Entfernen" onClick={() => remove(it.id)}>
                    <X className="h-4 w-4" />
                  </IconButton>
                </div>
              </li>
            );
          })}
        </ol>
        {items.length > 0 && (
          <div className="border-t border-border p-4">
            <button
              type="button"
              onClick={clear}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" /> Warteschlange leeren
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------- Video (und das eine Medienelement)

/**
 * Das einzige <video>-Element der App. Es spielt auch Audio (dann unsichtbar) –
 * bei Videos erscheint es als schwebendes Fenster über der Player-Leiste.
 */
export function MediaElement() {
  const { item, mediaRef, mediaEvents, toggle } = usePlayer();
  const isVideo = item?.kind === "video";

  return (
    <div
      className={cn(
        "fixed z-40 overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/10",
        "inset-x-2 bottom-[calc(136px+env(safe-area-inset-bottom))] lg:inset-x-auto lg:right-5 lg:bottom-[104px] lg:w-[420px]",
        !isVideo && "hidden",
      )}
    >
      <video
        ref={mediaRef}
        src={item && item.kind !== "speech" ? item.url : undefined}
        className="block aspect-video w-full bg-black"
        playsInline
        preload="metadata"
        onClick={toggle}
        {...mediaEvents}
      />
      {isVideo && (
        <button
          type="button"
          onClick={() => mediaRef.current?.requestFullscreen?.()}
          className="absolute right-2 top-2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
          aria-label="Vollbild"
          title="Vollbild"
        >
          <Maximize className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
