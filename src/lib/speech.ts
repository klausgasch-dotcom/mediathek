// Sprachausgabe über die Web Speech API des Browsers (läuft komplett lokal, ohne Server).
import { useEffect, useState } from "react";
import type { SpeechSettings } from "@/lib/media";

export function speechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Stimmen werden in Chrome asynchron geladen – daher als Hook. */
export function useVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (!speechSupported()) return;
    const update = () => setVoices(window.speechSynthesis.getVoices());
    update();
    window.speechSynthesis.addEventListener("voiceschanged", update);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", update);
  }, []);
  return voices;
}

export function pickVoice(voices: SpeechSynthesisVoice[], settings?: Partial<SpeechSettings>) {
  if (settings?.voiceURI) {
    const v = voices.find((v) => v.voiceURI === settings.voiceURI);
    if (v) return v;
  }
  const lang = (settings?.lang ?? "de").toLowerCase();
  return voices.find((v) => v.lang.toLowerCase().startsWith(lang)) ?? voices.find((v) => v.default);
}

/**
 * Zerlegt Text in Abschnitte von höchstens ~220 Zeichen an Satzgrenzen.
 * Chrome bricht lange Äußerungen sonst nach ca. 15 Sekunden kommentarlos ab.
 */
export function splitIntoChunks(text: string, max = 220): string[] {
  const sentences = text
    .replace(/\s+/g, " ")
    .trim()
    .match(/[^.!?…;:]+[.!?…;:]+["“”»«')\]]*\s*|[^.!?…;:]+$/g);
  if (!sentences) return [];
  const chunks: string[] = [];
  let current = "";
  for (const raw of sentences) {
    const s = raw.trim();
    if (!s) continue;
    if (s.length > max) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      // Überlange Sätze an Kommas bzw. Wortgrenzen teilen.
      let rest = s;
      while (rest.length > max) {
        let cut = rest.lastIndexOf(", ", max);
        if (cut < max / 2) cut = rest.lastIndexOf(" ", max);
        if (cut <= 0) cut = max;
        chunks.push(rest.slice(0, cut + 1).trim());
        rest = rest.slice(cut + 1).trim();
      }
      current = rest;
    } else if ((current + " " + s).length > max) {
      chunks.push(current);
      current = s;
    } else {
      current = current ? `${current} ${s}` : s;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export type SpeechController = {
  pause: () => void;
  resume: () => void;
  cancel: () => void;
};

export type SpeakOptions = {
  settings: SpeechSettings;
  voices: SpeechSynthesisVoice[];
  startAt?: number;
  onChunk?: (index: number, total: number, chunks: string[]) => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
};

/** Liest Text abschnittsweise vor. Gibt einen Controller zum Pausieren/Abbrechen zurück. */
export function speak(text: string, opts: SpeakOptions): SpeechController {
  const synth = window.speechSynthesis;
  const chunks = splitIntoChunks(text);
  const voice = pickVoice(opts.voices, opts.settings);
  let cancelled = false;

  synth.cancel();

  const next = (i: number) => {
    if (cancelled) return;
    if (i >= chunks.length) {
      opts.onEnd?.();
      return;
    }
    const u = new SpeechSynthesisUtterance(chunks[i]);
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? opts.settings.lang ?? "de-DE";
    u.rate = opts.settings.rate;
    u.pitch = opts.settings.pitch;
    u.onstart = () => opts.onChunk?.(i, chunks.length, chunks);
    u.onend = () => next(i + 1);
    u.onerror = (e) => {
      // "interrupted"/"canceled" entstehen durch unser eigenes cancel() – kein Fehler.
      if (cancelled || e.error === "interrupted" || e.error === "canceled") return;
      opts.onError?.(`Sprachausgabe fehlgeschlagen (${e.error}).`);
    };
    synth.speak(u);
  };

  next(Math.max(0, Math.min(opts.startAt ?? 0, chunks.length)));

  return {
    pause: () => synth.pause(),
    resume: () => synth.resume(),
    cancel: () => {
      cancelled = true;
      synth.cancel();
    },
  };
}

/** Entfernt Markdown-Auszeichnungen, damit nicht "Stern Stern" vorgelesen wird. */
export function markdownToSpeech(md: string) {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s*(.+)$/gm, "$1.")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/[*_~`]+/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
