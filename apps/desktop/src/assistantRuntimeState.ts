import { useEffect, useState } from "react";

const WATCH_KEY = "ri-genshin.assistant.watch.enabled.v1";
const WATCH_EVENT = "ri-genshin-watch-state";

const SCANNING_KEY = "ri-genshin.assistant.scanning.v1";
const SCANNING_EVENT = "ri-genshin-scanning-state";
const STARTUP_RESET_KEY = "ri-genshin.assistant.runtimeReset.v1";

export function loadScanningState(): boolean {
  return window.localStorage.getItem(SCANNING_KEY) === "true";
}

export function saveScanningState(scanning: boolean): void {
  window.localStorage.setItem(SCANNING_KEY, scanning ? "true" : "false");
  window.dispatchEvent(new CustomEvent(SCANNING_EVENT, { detail: scanning }));
}

export function resetRuntimeState(): void {
  saveWatchEnabled(false);
  saveScanningState(false);
}

export function resetRuntimeStateOnce(): void {
  if (window.sessionStorage.getItem(STARTUP_RESET_KEY) === "true") {
    return;
  }

  resetRuntimeState();
  window.sessionStorage.setItem(STARTUP_RESET_KEY, "true");
}

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

export function useSharedScanningState(): [boolean, (next: boolean | ((current: boolean) => boolean)) => void] {
  const [scanning, setScanning] = useState(loadScanningState);

  useEffect(() => {
    const sync = () => setScanning(loadScanningState());
    const handleCustom = (event: Event) => {
      const detail = (event as CustomEvent<boolean>).detail;
      setScanning(typeof detail === "boolean" ? detail : loadScanningState());
    };

    window.addEventListener("storage", sync);
    window.addEventListener(SCANNING_EVENT, handleCustom);
    const interval = window.setInterval(sync, 400);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(SCANNING_EVENT, handleCustom);
      window.clearInterval(interval);
    };
  }, []);

  const update = (next: boolean | ((current: boolean) => boolean)) => {
    const value = typeof next === "function" ? next(loadScanningState()) : next;
    saveScanningState(value);
    setScanning(value);
  };

  return [scanning, update];
}
