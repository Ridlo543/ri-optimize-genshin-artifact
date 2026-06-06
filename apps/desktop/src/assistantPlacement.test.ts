import { beforeEach, describe, expect, it } from "vitest";
import {
  clearAssistantPlacement,
  loadAssistantPlacement,
  placementFromPhysicalPosition,
  rectFromAssistantPlacement,
  saveAssistantPlacement
} from "./assistantPlacement";

describe("assistant placement", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          clear: () => values.clear(),
          getItem: (key: string) => values.get(key) ?? null,
          removeItem: (key: string) => values.delete(key),
          setItem: (key: string, value: string) => values.set(key, value)
        }
      }
    });
  });

  it("persists normalized client placement", () => {
    saveAssistantPlacement({ x: 0.25, y: 0.5, unit: "normalized-client" });
    expect(loadAssistantPlacement()).toEqual({ x: 0.25, y: 0.5, unit: "normalized-client" });
    clearAssistantPlacement();
    expect(loadAssistantPlacement()).toBeNull();
  });

  it("converts physical window movement to normalized client placement", () => {
    expect(
      placementFromPhysicalPosition(
        { x: 580, y: 350 },
        { available: true, screenX: 100, screenY: 50, clientWidth: 1920, clientHeight: 1200 }
      )
    ).toEqual({ x: 0.25, y: 0.25, unit: "normalized-client" });
  });

  it("clamps a restored expanded bubble inside the client", () => {
    expect(
      rectFromAssistantPlacement(
        { x: 1, y: 1, unit: "normalized-client" },
        { x: 100, y: 50, width: 1920, height: 1200 },
        { width: 540, height: 375 }
      )
    ).toEqual({ x: 1480, y: 875, width: 540, height: 375 });
  });
});
