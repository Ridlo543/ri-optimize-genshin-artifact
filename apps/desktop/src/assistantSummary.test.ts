import { describe, expect, it } from "vitest";
import { ScanConfidence, ScannerArtifactResult } from "@ri-genshin/artifact-schema";
import { buildAssistantSummary } from "./assistantSummary";

describe("buildAssistantSummary", () => {
  it("prompts for ROI when no scanner result exists", () => {
    expect(buildAssistantSummary(null)).toMatchObject({
      state: "setup",
      title: "Set Area"
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
      title: "Adjust Area"
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
    expect(summary.metrics.map((metric) => metric.label)).toEqual(["Active CV", "Known CV", "Expected CV", "Useful RV", "Reach target"]);
    expect(summary.detail).toContain("5-star Sands");
  });

  it("shows review level instead of waiting when only level OCR is missing", () => {
    const result: ScannerArtifactResult = {
      source: "screen",
      mode: "region-artifact",
      confidence: {
        setKey: 0.96,
        slotKey: 0.96,
        mainStatKey: 0.78,
        level: 0,
        substats: 0.6
      },
      artifact: null,
      artifactDraft: {
        setKey: "NoblesseOblige",
        slotKey: "flower",
        rarity: 5,
        mainStatKey: "hp",
        substats: [
          { key: "critRate_", value: 3.5 },
          { key: "eleMas", value: 23 }
        ],
        unactivatedSubstats: [],
        lock: false,
        location: "Xingqiu"
      },
      missingFields: ["level"],
      screenState: {
        code: "artifact-bag-detail",
        readyForArtifactOcr: true,
        confidence: 0.9,
        message: "Artifact ROI detected."
      },
      capture: {
        resolution: "1920x1200",
        capturedAt: "2026-06-05T00:00:00.000Z",
        regionHash: "royal"
      },
      error: "Region OCR missing required fields: level."
    };

    expect(buildAssistantSummary(result)).toMatchObject({
      state: "review",
      title: "Review Level"
    });
  });

  it("formats low-rarity valid artifacts as fodder instead of OCR review", () => {
    const result: ScannerArtifactResult = {
      source: "fixture",
      mode: "region-artifact",
      confidence: {
        setKey: 0.94,
        slotKey: 0.96,
        mainStatKey: 0.95,
        level: 0.7,
        substats: 0.9
      },
      artifact: {
        setKey: "Adventurer",
        slotKey: "plume",
        rarity: 2,
        level: 0,
        mainStatKey: "atk",
        substats: [],
        unactivatedSubstats: [],
        lock: false,
        location: "Amber"
      },
      screenState: {
        code: "artifact-bag-detail",
        readyForArtifactOcr: true,
        confidence: 0.9,
        message: "Artifact ROI detected."
      },
      capture: {
        resolution: "1920x1200",
        capturedAt: "2026-06-05T00:00:00.000Z",
        regionHash: "two-star"
      }
    };

    expect(buildAssistantSummary(result)).toMatchObject({
      state: "ready",
      title: "Fodder"
    });
  });

  it("shows combined title for multiple missing fields in correction path", () => {
    const result: ScannerArtifactResult = {
      source: "screen",
      mode: "region-artifact",
      confidence: {
        setKey: 0.96,
        slotKey: 0,
        mainStatKey: 0,
        level: 0,
        substats: 0.7
      },
      artifact: null,
      artifactDraft: {
        setKey: "NoblesseOblige",
        slotKey: "",
        rarity: 5,
        mainStatKey: "",
        substats: [
          { key: "critRate_", value: 3.5 },
          { key: "eleMas", value: 23 }
        ],
        unactivatedSubstats: [],
        lock: false,
        location: ""
      },
      missingFields: ["slotKey", "mainStatKey"],
      screenState: {
        code: "artifact-bag-detail",
        readyForArtifactOcr: true,
        confidence: 0.9,
        message: "Artifact ROI detected."
      },
      capture: {
        resolution: "1920x1200",
        capturedAt: "2026-06-05T00:00:00.000Z",
        regionHash: "multi-missing"
      },
      error: "Region OCR missing required fields: slotKey, mainStatKey."
    };

    expect(buildAssistantSummary(result)).toMatchObject({
      state: "review",
      title: "Review Slot & Main Stat"
    });
  });

  it("shows Review Main Stat when non-correction path has low main stat confidence", () => {
    const lowConfidence: ScanConfidence = {
      setKey: 0.9,
      slotKey: 0.96,
      mainStatKey: 0.28,
      level: 0.7,
      substats: 0.6
    };

    const result: ScannerArtifactResult = {
      source: "screen",
      mode: "region-artifact",
      confidence: lowConfidence,
      artifact: null,
      screenState: {
        code: "character-artifact-detail",
        readyForArtifactOcr: true,
        confidence: 0.9,
        message: "Artifact ROI detected."
      },
      capture: {
        resolution: "1920x1200",
        capturedAt: "2026-06-05T00:00:00.000Z",
        regionHash: "low-main"
      },
      error: "Review main stat before evaluating."
    };

    expect(buildAssistantSummary(result)).toMatchObject({
      state: "review",
      title: "Review Main Stat"
    });
  });

  it("shows Review Substats from blocking reasons", () => {
    const result: ScannerArtifactResult = {
      source: "screen",
      mode: "region-artifact",
      confidence: {
        setKey: 0.9,
        slotKey: 0.96,
        mainStatKey: 0.95,
        level: 0.7,
        substats: 0.3
      },
      artifact: null,
      screenState: {
        code: "artifact-bag-detail",
        readyForArtifactOcr: true,
        confidence: 0.9,
        message: "Artifact ROI detected."
      },
      capture: {
        resolution: "1920x1200",
        capturedAt: "2026-06-05T00:00:00.000Z",
        regionHash: "low-sub"
      },
      error: "Review substats before evaluating."
    };

    expect(buildAssistantSummary(result)).toMatchObject({
      state: "review",
      title: "Review Substats"
    });
  });
});
