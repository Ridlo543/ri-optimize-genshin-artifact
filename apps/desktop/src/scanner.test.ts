import { beforeEach, describe, expect, it, vi } from "vitest";
import { classifyRegionArtifact, scanRegionArtifact } from "./scanner";

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn()
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock
}));

describe("scanner IPC parsing", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    installWindowTimers();
  });

  it("surfaces scanner JSON errors instead of returning malformed scan results", async () => {
    invokeMock.mockResolvedValue(JSON.stringify({ error: "Scanner sidecar failed to start.", available: false }));

    await expect(
      scanRegionArtifact({
        x: 0.68,
        y: 0.1,
        width: 0.27,
        height: 0.8,
        unit: "normalized-client"
      })
    ).rejects.toThrow("Scanner sidecar failed to start.");
  });

  it("keeps valid classification payloads working", async () => {
    invokeMock.mockResolvedValue(
      JSON.stringify({
        source: "screen",
        mode: "region-classification",
        confidence: {},
        artifact: null,
        screenState: {
          code: "artifact-bag-detail",
          readyForArtifactOcr: true,
          confidence: 0.93,
          message: "Artifact ROI detected."
        },
        capture: {
          resolution: "1920x1200",
          capturedAt: "2026-06-07T00:00:00.000Z",
          regionHash: "abc123"
        }
      })
    );

    await expect(
      classifyRegionArtifact({
        x: 0.68,
        y: 0.1,
        width: 0.27,
        height: 0.8,
        unit: "normalized-client"
      })
    ).resolves.toMatchObject({
      mode: "region-classification",
      capture: {
        regionHash: "abc123"
      }
    });
  });
});

function installWindowTimers() {
  globalThis.window = {
    setTimeout,
    clearTimeout
  } as unknown as Window & typeof globalThis;
}
