import { useEffect, useState } from "react";

const WATCH_KEY = "ri-genshin.assistant.watch.enabled.v1";
const WATCH_EVENT = "ri-genshin-watch-state";

export function loadWatchEnabled(): boolean {
  return window.localStorage.getItem(WATCH_KEY) === "true";
}

export function saveWatchEnabled(enabled: boolean): void {
  window.localStorage.setItem(WATCH_KEY, enabled ? "true" : "false");
  window.dispatchEvent(new CustomEvent(WATCH_EVENT, { detail: enabled }));
}

export function useSharedWatchState(): [boolean, (next: boolean | ((current: boolean) => boolean)) => void] {
  const [watching, setWatching] = useState(loadWatchEnabled);

  useEffect(() => {
    const sync = () => setWatching(loadWatchEnabled());
    const handleCustom = (event: Event) => {
      const detail = (event as CustomEvent<boolean>).detail;
      setWatching(typeof detail === "boolean" ? detail : loadWatchEnabled());
    };

    window.addEventListener("storage", sync);
    window.addEventListener(WATCH_EVENT, handleCustom);
    const interval = window.setInterval(sync, 500);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(WATCH_EVENT, handleCustom);
      window.clearInterval(interval);
    };
  }, []);

  const update = (next: boolean | ((current: boolean) => boolean)) => {
    const value = typeof next === "function" ? next(loadWatchEnabled()) : next;
    saveWatchEnabled(value);
    setWatching(value);
  };

  return [watching, update];
}
