import { useCallback, useEffect, useState } from "react";
import type { MediaItem } from "@/lib/media";

const STORAGE_KEY = "mediathek:playlist";

type State = { items: MediaItem[]; current: number };

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: [], current: -1 };
    const parsed = JSON.parse(raw) as MediaItem[] | State;
    // Ältere Version speicherte nur die Liste.
    if (Array.isArray(parsed)) return { items: parsed, current: -1 };
    const current = parsed.current < parsed.items.length ? parsed.current : -1;
    return { items: parsed.items, current };
  } catch {
    return { items: [], current: -1 };
  }
}

export function usePlaylist() {
  const [state, setState] = useState<State>({ items: [], current: -1 });
  const [loaded, setLoaded] = useState(false);

  // Erst im Browser laden (SSR kennt kein localStorage).
  useEffect(() => {
    setState(load());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      // Blob-URLs sind nach dem Neuladen ungültig – lokale Einträge nicht speichern.
      const items = state.items.filter((i) => !i.local);
      const currentItem = state.items[state.current];
      const current = currentItem && !currentItem.local ? items.indexOf(currentItem) : -1;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, current }));
    } catch {
      /* Speicher nicht verfügbar – Playlist gilt dann nur für diese Sitzung. */
    }
  }, [state, loaded]);

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

  return {
    items: state.items,
    current: state.current,
    loaded,
    setCurrent,
    add,
    remove,
    move,
    clear,
  };
}

export type Playlist = ReturnType<typeof usePlaylist>;
