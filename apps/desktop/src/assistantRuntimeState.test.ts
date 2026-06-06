import { beforeEach, describe, expect, it } from "vitest";
import { loadScanningState, loadWatchEnabled, resetRuntimeState, resetRuntimeStateOnce, saveScanningState, saveWatchEnabled } from "./assistantRuntimeState";

describe("assistant runtime state", () => {
  beforeEach(() => {
    installWindowStorage();
  });

  it("clears stale watch and scanning state for a fresh app run", () => {
    saveWatchEnabled(true);
    saveScanningState(true);

    resetRuntimeState();

    expect(loadWatchEnabled()).toBe(false);
    expect(loadScanningState()).toBe(false);
  });

  it("runs the startup reset once per webview session", () => {
    saveWatchEnabled(true);
    saveScanningState(true);

    resetRuntimeStateOnce();

    expect(loadWatchEnabled()).toBe(false);
    expect(loadScanningState()).toBe(false);

    saveWatchEnabled(true);
    saveScanningState(true);
    resetRuntimeStateOnce();

    expect(loadWatchEnabled()).toBe(true);
    expect(loadScanningState()).toBe(true);
  });
});

function installWindowStorage() {
  const values = new Map<string, string>();
  const sessionValues = new Map<string, string>();
  globalThis.window = {
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear()
    },
    sessionStorage: {
      getItem: (key: string) => sessionValues.get(key) ?? null,
      setItem: (key: string, value: string) => sessionValues.set(key, value),
      removeItem: (key: string) => sessionValues.delete(key),
      clear: () => sessionValues.clear()
    },
    dispatchEvent: () => true,
    addEventListener: () => undefined,
    removeEventListener: () => undefined
  } as unknown as Window & typeof globalThis;
}
