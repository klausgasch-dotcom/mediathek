import { useCallback, useEffect, useState } from "react";

const EVENT = "mediathek:favorites";

function read<T>(storageKey: string): T[] {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

/**
 * Kleine, im Browser gespeicherte Favoritenliste (Radiosender, Podcasts).
 * Mehrere Komponenten mit demselben Schlüssel bleiben über ein Event synchron.
 */
export function useFavorites<T extends { id: string }>(key: string) {
  const storageKey = `mediathek:favorites:${key}`;
  const [items, setItems] = useState<T[]>([]);

  useEffect(() => {
    const sync = () => setItems(read<T>(storageKey));
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [storageKey]);

  const isFavorite = useCallback((id: string) => items.some((i) => i.id === id), [items]);

  const toggle = useCallback(
    (item: T) => {
      const prev = read<T>(storageKey);
      const next = prev.some((i) => i.id === item.id)
        ? prev.filter((i) => i.id !== item.id)
        : [item, ...prev];
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* ohne Speicher gilt die Änderung nur bis zum Neuladen */
      }
      setItems(next);
      window.dispatchEvent(new Event(EVENT));
    },
    [storageKey],
  );

  return { items, isFavorite, toggle };
}
