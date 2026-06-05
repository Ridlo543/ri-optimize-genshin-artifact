import { describe, expect, it } from "vitest";
import { ScannerArtifactResult } from "@ri-genshin/artifact-schema";
import { buildAssistantSummary } from "./assistantSummary";

describe("buildAssistantSummary", () => {
  it("prompts for ROI when no scanner result exists", () => {
    expect(buildAssistantSummary(null)).toMatchObject({
      state: "setup",
      title: "Set ROI"
    });
  });

  it("blocks recommendation for review ROI states", () => {
    const result: ScannerArtifactResult = {
      source: "screen",
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
        capturedAt: "2026-06-05T00:00:00.000Z",
        regionHash: "abc"
      },
      error: "Review ROI: artifact panel was not detected inside the selected box."
    };

    expect(buildAssistantSummary(result)).toMatchObject({
      state: "review",
      title: "Review ROI"
    });
  });

  it("formats compact metrics for a valid artifact result", () => {
    const result: ScannerArtifactResult = {
      source: "fixture",
      mode: "region-artifact",
      confidence: {
        setKey: 0.95,
        slotKey: 0.96,
        mainStatKey: 0.97,
        level: 0.98,
        substats: 0.9
      },
      artifact: {
        setKey: "CelestialGift",
        slotKey: "sands",
        rarity: 5,
        level: 0,
        mainStatKey: "atk_",
        substats: [
          { key: "enerRech_", value: 4.5 },
          { key: "def", value: 19 },
          { key: "def_", value: 5.1 }
        ],
        unactivatedSubstats: [{ key: "critDMG_", value: 5.4 }],
        lock: true,
        location: ""
      },
      screenState: {
        code: "character-artifact-detail",
        readyForArtifactOcr: true,
        confidence: 0.9,
        message: "Artifact ROI detected."
      },
      capture: {
        resolution: "1920x1200",
        capturedAt: "2026-06-05T00:00:00.000Z",
        regionHash: "def"
      }
    };

    const summary = buildAssistantSummary(result);

    expect(["Upgrade", "Keep", "Stop"]).toContain(summary.title);
    expect(summary.state).toBe("ready");
    expect(summary.metrics.map((metric) => metric.label)).toEqual(["CV", "Exp CV", "Score", "P >= 30"]);
  });
});
