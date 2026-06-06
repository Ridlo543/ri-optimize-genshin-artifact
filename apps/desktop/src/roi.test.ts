import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScannerArtifactResult } from "@ri-genshin/artifact-schema";
import { loadLatestScannerResultRevision, saveLatestScannerResult, subscribeLatestScannerResult } from "./roi";

describe("scanner result storage", () => {
  beforeEach(() => {
    installWindowStorage();
  });

  it("publishes a revision when a scanner result without scanId is saved", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeLatestScannerResult(listener);
    const result: ScannerArtifactResult = {
      source: "fixture",
      mode: "region-classification",
      confidence: {},
      artifact: null,
      screenState: {
        code: "unknown-game-screen",
        readyForArtifactOcr: false,
        confidence: 0.45,
        message: "Review ROI: artifact panel was not detected inside the selected box."
      },
      capture: {
        resolution: "1920x1200",
        capturedAt: "2026-06-06T00:00:00.000Z",
        regionHash: "abc123"
      }
    };

    saveLatestScannerResult(result);

    expect(loadLatestScannerResultRevision()).toContain("abc123");
    expect(listener).toHaveBeenCalledWith(expect.stringContaining("abc123"));
    unsubscribe();
  });
});

function installWindowStorage() {
  const values = new Map<string, string>();
  const listeners = new Map<string, Set<(event: Event) => void>>();
  globalThis.window = {
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear()
    },
    dispatchEvent: (event: Event) => {
      listeners.get(event.type)?.forEach((listener) => listener(event));
      return true;
    },
    addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => {
      const set = listeners.get(type) ?? new Set<(event: Event) => void>();
      set.add(listener as (event: Event) => void);
      listeners.set(type, set);
    },
    removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) => {
      listeners.get(type)?.delete(listener as (event: Event) => void);
    }
  } as unknown as Window & typeof globalThis;
}
