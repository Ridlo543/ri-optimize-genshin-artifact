import { describe, expect, it } from "vitest";
import { ScannerArtifactResult } from "@ri-genshin/artifact-schema";
import {
  applyLevelCorrection,
  applyScannerCorrection,
  getArtifactMainStatOptions,
  getLevelCorrectionState,
  getScannerCorrectionState
} from "./scannerCorrection";

const missingLevelResult: ScannerArtifactResult = {
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

describe("scanner level correction", () => {
  it("offers manual correction when only level is missing", () => {
    expect(getLevelCorrectionState(missingLevelResult)).toMatchObject({
      available: true
    });
  });

  it("builds a complete scanner result after manual level correction", () => {
    const corrected = applyLevelCorrection(missingLevelResult, 10);

    expect(corrected.artifact).toMatchObject({
      setKey: "NoblesseOblige",
      slotKey: "flower",
      rarity: 5,
      level: 10,
      mainStatKey: "hp",
      location: "Xingqiu"
    });
    expect(corrected.missingFields).toEqual([]);
    expect(corrected.error).toBeUndefined();
    expect(corrected.confidence.level).toBe(1);
  });

  it("offers correction for missing slot and main stat without treating it as waiting", () => {
    const result: ScannerArtifactResult = {
      ...missingLevelResult,
      artifactDraft: {
        setKey: "ObsidianCodex",
        rarity: 5,
        level: 20,
        substats: [
          { key: "critDMG_", value: 18.7 },
          { key: "critRate_", value: 3.9 }
        ],
        unactivatedSubstats: [],
        lock: false,
        location: "Diluc"
      },
      missingFields: ["slotKey", "mainStatKey"],
      error: "Region OCR missing required fields: slotKey, mainStatKey."
    };

    expect(getScannerCorrectionState(result)).toMatchObject({
      available: true,
      needsSlotKey: true,
      needsMainStatKey: true,
      needsLevel: false
    });

    const corrected = applyScannerCorrection(result, { slotKey: "sands", mainStatKey: "atk_" });
    expect(corrected.artifact).toMatchObject({
      setKey: "ObsidianCodex",
      slotKey: "sands",
      mainStatKey: "atk_",
      level: 20
    });
    expect(corrected.missingFields).toEqual([]);
    expect(corrected.confidence.slotKey).toBe(1);
    expect(corrected.confidence.mainStatKey).toBe(1);
  });

  it("only offers valid main stats for fixed-main-stat slots", () => {
    expect(getArtifactMainStatOptions("flower")).toEqual(["hp"]);
    expect(getArtifactMainStatOptions("plume")).toEqual(["atk"]);
    expect(getArtifactMainStatOptions("sands")).toContain("enerRech_");
    expect(getArtifactMainStatOptions("sands")).not.toContain("hp");
  });

  it("rejects a manual correction with an invalid slot and main-stat pair", () => {
    const { mainStatKey: _mainStatKey, ...draftWithoutMainStat } = missingLevelResult.artifactDraft!;
    const result: ScannerArtifactResult = {
      ...missingLevelResult,
      artifactDraft: draftWithoutMainStat,
      missingFields: ["mainStatKey"],
      error: "Region OCR missing required fields: mainStatKey."
    };

    const corrected = applyScannerCorrection(result, { mainStatKey: "hp_" });

    expect(corrected.artifact).toBeNull();
    expect(corrected.missingFields).toEqual(["mainStatKey"]);
  });

  it("does not apply a missing slot and main-stat correction from empty placeholder selections", () => {
    const result: ScannerArtifactResult = {
      ...missingLevelResult,
      artifactDraft: {
        setKey: "ObsidianCodex",
        rarity: 5,
        level: 20,
        substats: [{ key: "critRate_", value: 6.6 }],
        unactivatedSubstats: [],
        lock: true,
        location: "Fischl"
      },
      missingFields: ["slotKey", "mainStatKey"],
      error: "Region OCR missing required fields: slotKey, mainStatKey."
    };

    const corrected = applyScannerCorrection(result, { slotKey: "", mainStatKey: "" });

    expect(corrected.artifact).toBeNull();
    expect(corrected.missingFields).toEqual(["slotKey", "mainStatKey"]);
  });
});
