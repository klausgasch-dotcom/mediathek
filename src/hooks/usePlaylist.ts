import { useCallback, useEffect, useState } from "react";
import type { MediaItem } from "@/lib/media";

const STORAGE_KEY = "mediathek:playlist";

type State = { items: MediaItem[]; current: number };

function load(): MediaItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MediaItem[]) : [];
  } catch {
    return [];
  }
}

export function usePlaylist() {
  const [state, setState] = useState<State>({ items: [], current: -1 });
  const [loaded, setLoaded] = useState(false);

  // Erst im Browser laden (SSR kennt kein localStorage).
  useEffect(() => {
    setState({ items: load(), current: -1 });
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      // Blob-URLs sind nach dem Neuladen ungültig – lokale Einträge nicht speichern.
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items.filter((i) => !i.local)));
    } catch {
      /* Speicher nicht verfügbar – Playlist gilt dann nur für diese Sitzung. */
    }
  }, [state.items, loaded]);

  const setCurrent = useCallback((current: number) => {
    setState((s) => ({ ...s, current: current >= 0 && current < s.items.length ? current : -1 }));
  }, []);

  const add = useCallback((newItems: MediaItem | MediaItem[], playNow = false) => {
    const list = Array.isArray(newItems) ? newItems : [newItems];
    if (!list.length) return;
    setState((s) => ({
      items: [...s.items, ...list],
      current: playNow ? s.items.length : s.current,
    }));
  }, []);

  const remove = useCallback((id: string) => {
    setState((s) => {
      const idx = s.items.findIndex((i) => i.id === id);
      if (idx === -1) return s;
      const items = s.items.filter((i) => i.id !== id);
      let current = s.current;
      if (idx < current) current -= 1;
      else if (idx === current) current = current < items.length ? current : -1;
      return { items, current };
    });
  }, []);

  const move = useCallback((id: string, dir: -1 | 1) => {
    setState((s) => {
      const idx = s.items.findIndex((i) => i.id === id);
      const target = idx + dir;
      if (idx === -1 || target < 0 || target >= s.items.length) return s;
      const items = [...s.items];
      [items[idx], items[target]] = [items[target], items[idx]];
      const current = s.current === idx ? target : s.current === target ? idx : s.current;
      return { items, current };
    });
  }, []);

  const clear = useCallback(() => setState({ items: [], current: -1 }), []);

  return { items: state.items, current: state.current, setCurrent, add, remove, move, clear };
}

export type Playlist = ReturnType<typeof usePlaylist>;
