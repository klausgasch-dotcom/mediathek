import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import { toast } from "sonner";
import { usePlaylist } from "@/hooks/usePlaylist";
import { speak, speechSupported, useVoices, type SpeechController } from "@/lib/speech";
import type { MediaItem } from "@/lib/media";

// ---------------------------------------------------------------- Fortsetzen langer Titel

const RESUME_KEY = "mediathek:resume";
const RESUME_MIN_DURATION = 10 * 60; // nur Podcasts, Hörbücher & Co.

function resumeKey(item: MediaItem) {
  return item.refId ?? item.url ?? item.id;
}

function readResume(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(RESUME_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeResume(key: string, time: number | null) {
  try {
    const all = readResume();
    if (time === null) delete all[key];
    else all[key] = Math.round(time);
    // Liste klein halten: nur die letzten 200 Einträge
    const entries = Object.entries(all).slice(-200);
    localStorage.setItem(RESUME_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    /* ohne Speicher kein Fortsetzen */
  }
}

export function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  return h ? `${h}:${m.toString().padStart(2, "0")}:${s}` : `${m}:${s}`;
}

// ---------------------------------------------------------------- Kontext

type SpeechPos = { index: number; total: number; text: string };

type PlayerApi = ReturnType<typeof usePlayerState>["api"];

const PlayerContext = createContext<PlayerApi | null>(null);
// Zeit/Dauer ändern sich mehrmals pro Sekunde – eigener Kontext, damit nicht alle Karten neu rendern.
const ProgressContext = createContext({ time: 0, duration: 0 });

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer muss innerhalb von <PlayerProvider> verwendet werden");
  return ctx;
}

export function usePlayerProgress() {
  return useContext(ProgressContext);
}

function usePlayerState() {
  const playlist = usePlaylist();
  const { items, current, setCurrent, add, remove, move, clear, loaded } = playlist;
  const item = current >= 0 ? items[current] : undefined;
  const voices = useVoices();

  const mediaRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);

  const chunkRef = useRef(0);
  const [speech, setSpeech] = useState<SpeechPos>({ index: 0, total: 0, text: "" });
  const [speechRestart, setSpeechRestart] = useState(0);
  const lastSaved = useRef(0);
  const [sleepAt, setSleepAt] = useState<number | null>(null);

  const next = useCallback(() => {
    if (current < items.length - 1) setCurrent(current + 1);
    else if (repeat && items.length) setCurrent(0);
    else setPlaying(false);
  }, [current, items.length, repeat, setCurrent]);

  const prev = useCallback(() => {
    const el = mediaRef.current;
    if (item && item.kind !== "speech" && !item.live && el && el.currentTime > 3) {
      el.currentTime = 0;
      return;
    }
    if (item?.kind === "speech" && chunkRef.current > 0) {
      chunkRef.current = 0;
      setSpeechRestart((n) => n + 1);
      return;
    }
    if (current > 0) setCurrent(current - 1);
  }, [current, item, setCurrent]);

  // Nach dem Neuladen steht der zuletzt gehörte Titel bereit – er soll aber nicht von selbst losspielen.
  const skipAutoplay = useRef<string | undefined>(undefined);
  const playingRef = useRef(false);
  playingRef.current = playing;
  useEffect(() => {
    if (loaded) skipAutoplay.current = items[current]?.id;
  }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Neuer Titel: Fortschritt zurücksetzen und automatisch abspielen.
  const itemId = item?.id;
  useEffect(() => {
    chunkRef.current = 0;
    lastSaved.current = 0;
    setSpeech({ index: 0, total: 0, text: "" });
    setTime(0);
    setDuration(0);
    setBuffering(false);
    if (itemId && itemId === skipAutoplay.current) {
      skipAutoplay.current = undefined;
      return;
    }
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
      setBuffering(true);
      el.play().catch((err: DOMException) => {
        setBuffering(false);
        if (err.name === "AbortError") return;
        setPlaying(false);
        if (err.name === "NotAllowedError") return; // Autoplay blockiert – Nutzer drückt einfach Play.
        toast.error(`„${item.title}“ kann nicht abgespielt werden`, {
          description: item.live
            ? "Der Sender ist gerade nicht erreichbar."
            : "Das Format wird von diesem Browser evtl. nicht unterstützt.",
        });
      });
    } else {
      el.pause();
      // Livestreams nicht im Hintergrund weiterpuffern
      if (item.live) setBuffering(false);
    }
  }, [playing, item]);

  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;
    el.volume = volume;
    el.muted = muted;
    el.playbackRate = item?.live ? 1 : rate;
  }, [volume, muted, rate, item]);

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
        setSpeech({ index, total, text: chunks[index] });
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

  // Schlaf-Timer: pausiert zur eingestellten Zeit
  useEffect(() => {
    if (!sleepAt) return;
    const t = setTimeout(
      () => {
        setPlaying(false);
        setSleepAt(null);
        toast("Schlaf-Timer: Wiedergabe angehalten. Gute Nacht!");
      },
      Math.max(0, sleepAt - Date.now()),
    );
    return () => clearTimeout(t);
  }, [sleepAt]);

  const setSleepTimer = useCallback((minutes: number | null) => {
    setSleepAt(minutes ? Date.now() + minutes * 60_000 : null);
  }, []);

  const toggle = useCallback(() => {
    if (!item) {
      if (items.length) setCurrent(0);
      return;
    }
    setPlaying((p) => !p);
  }, [item, items.length, setCurrent]);

  const seek = useCallback(
    (value: number) => {
      if (!item || item.live) return;
      if (item.kind === "speech") {
        chunkRef.current = value;
        setSpeech((p) => ({ ...p, index: value }));
        setSpeechRestart((n) => n + 1);
      } else if (mediaRef.current) {
        mediaRef.current.currentTime = value;
        setTime(value);
      }
    },
    [item],
  );

  const skip = useCallback(
    (seconds: number) => {
      const el = mediaRef.current;
      if (!el || !item || item.live || item.kind === "speech") return;
      seek(Math.max(0, Math.min(el.currentTime + seconds, el.duration || Infinity)));
    },
    [item, seek],
  );

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
    try {
      ms.setActionHandler("seekbackward", item?.live ? null : () => skip(-15));
      ms.setActionHandler("seekforward", item?.live ? null : () => skip(30));
    } catch {
      /* nicht jeder Browser kennt diese Aktionen */
    }
  }, [item, next, prev, skip]);

  /** Spielt Einträge sofort ab. Ist ein Eintrag (gleiche Herkunft) schon in der Playlist, wird dorthin gesprungen. */
  const play = useCallback(
    (newItems: MediaItem | MediaItem[]) => {
      const list = Array.isArray(newItems) ? newItems : [newItems];
      if (!list.length) return;
      const first = list[0];
      if (list.length === 1 && first.refId) {
        const idx = items.findIndex((i) => i.refId === first.refId);
        if (idx !== -1) {
          if (idx === current) setPlaying(true);
          else setCurrent(idx);
          return;
        }
      }
      add(list, true);
    },
    [items, current, setCurrent, add],
  );

  const enqueue = useCallback((newItems: MediaItem | MediaItem[]) => add(newItems, false), [add]);

  const isCurrent = useCallback((refId?: string) => !!refId && item?.refId === refId, [item]);

  const mediaEvents = useMemo(
    () => ({
      onTimeUpdate: (e: SyntheticEvent<HTMLVideoElement>) => {
        const el = e.currentTarget;
        setTime(el.currentTime);
        if (item && !item.live && el.duration >= RESUME_MIN_DURATION) {
          if (Math.abs(el.currentTime - lastSaved.current) >= 5) {
            lastSaved.current = el.currentTime;
            writeResume(resumeKey(item), el.currentTime);
          }
        }
      },
      onDurationChange: (e: SyntheticEvent<HTMLVideoElement>) =>
        setDuration(e.currentTarget.duration),
      onLoadedMetadata: (e: SyntheticEvent<HTMLVideoElement>) => {
        const el = e.currentTarget;
        if (!item || item.live || !(el.duration >= RESUME_MIN_DURATION)) return;
        const saved = readResume()[resumeKey(item)];
        if (saved && saved > 30 && saved < el.duration - 30) {
          el.currentTime = saved;
          // Beim Wiederherstellen nach dem Neuladen still vorspulen, sonst Bescheid geben.
          if (!playingRef.current) return;
          toast(`Fortgesetzt bei ${formatTime(saved)}`, {
            action: { label: "Von vorn", onClick: () => (el.currentTime = 0) },
          });
        }
      },
      onWaiting: () => setBuffering(true),
      onPlaying: () => setBuffering(false),
      onCanPlay: () => setBuffering(false),
      onEnded: () => {
        if (item) writeResume(resumeKey(item), null);
        next();
      },
      onError: () => {
        if (!item || item.kind === "speech") return;
        setBuffering(false);
        setPlaying(false);
        toast.error(`„${item.title}“ kann nicht abgespielt werden`, {
          description: item.live
            ? "Der Sender ist gerade nicht erreichbar."
            : "Die Datei ist nicht erreichbar oder das Format wird nicht unterstützt.",
        });
      },
    }),
    [item, next],
  );

  const api = useMemo(
    () => ({
      items,
      current,
      setCurrent,
      remove,
      move,
      clear,
      item,
      playing,
      buffering,
      repeat,
      setRepeat,
      volume,
      setVolume,
      muted,
      setMuted,
      rate,
      setRate,
      speech,
      toggle,
      next,
      prev,
      seek,
      skip,
      play,
      enqueue,
      isCurrent,
      mediaRef,
      mediaEvents,
      sleepAt,
      setSleepTimer,
    }),
    [
      items,
      current,
      setCurrent,
      remove,
      move,
      clear,
      item,
      playing,
      buffering,
      repeat,
      volume,
      muted,
      rate,
      speech,
      toggle,
      next,
      prev,
      seek,
      skip,
      play,
      enqueue,
      isCurrent,
      mediaEvents,
      sleepAt,
      setSleepTimer,
    ],
  );
  const progress = useMemo(() => ({ time, duration }), [time, duration]);
  return { api, progress };
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { api, progress } = usePlayerState();
  return (
    <PlayerContext.Provider value={api}>
      <ProgressContext.Provider value={progress}>{children}</ProgressContext.Provider>
    </PlayerContext.Provider>
  );
}
