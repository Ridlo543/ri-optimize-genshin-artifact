import { describe, expect, it } from "vitest";
import { assessScannerResultTrust } from "./scan-confidence";
import { ScannerArtifactResult } from "./types";

function scannerResult(overrides: Partial<ScannerArtifactResult> = {}): ScannerArtifactResult {
  return {
    source: "fixture",
    mode: "screenshot-artifact",
    confidence: {
      setKey: 0.93,
      slotKey: 0.95,
      mainStatKey: 0.48,
      level: 0,
      substats: 0.8,
      lock: 0.98,
      equipped: 0.75,
      location: 0.75
    },
    artifact: {
      setKey: "CelestialGift",
      slotKey: "flower",
      rarity: 5,
      level: 20,
      mainStatKey: "hp",
      substats: [
        { key: "critRate_", value: 10.5 },
        { key: "enerRech_", value: 6.5 }
      ],
      unactivatedSubstats: [],
      lock: true,
      location: ""
    },
    capture: {
      resolution: "1920x1200",
      capturedAt: "2026-06-04T00:00:00.000Z",
      layout: "bag-inventory-card"
    },
    ...overrides
  };
}

describe("scanner confidence trust policy", () => {
  it("allows evaluation for sample screenshot confidence while still recommending OCR review", () => {
    const assessment = assessScannerResultTrust(scannerResult());

    expect(assessment.canEvaluate).toBe(true);
    expect(assessment.reviewRecommended).toBe(true);
    expect(assessment.blockingReasons).toEqual([]);
    expect(assessment.warningMessages.some((message) => message.includes("main stat"))).toBe(true);
  });

  it("blocks evaluation when scanner returns no artifact", () => {
    const assessment = assessScannerResultTrust(scannerResult({ artifact: null, error: "No artifact panel detected." }));

    expect(assessment.canEvaluate).toBe(false);
    expect(assessment.blockingReasons).toContain("No artifact panel detected.");
    expect(assessment.blockingReasons).toContain("Scanner did not return artifact data.");
  });

  it("uses artifact draft context when only a field is missing", () => {
    const assessment = assessScannerResultTrust(
      scannerResult({
        artifact: null,
        artifactDraft: {
          setKey: "NoblesseOblige",
          slotKey: "flower",
          rarity: 5,
          mainStatKey: "hp",
          substats: [{ key: "critRate_", value: 3.5 }]
        },
        missingFields: ["level"],
        error: "Region OCR missing required fields: level."
      })
    );

    expect(assessment.canEvaluate).toBe(false);
    expect(assessment.blockingReasons).toContain("Review artifact level before evaluating.");
    expect(assessment.blockingReasons).not.toContain("Scanner did not return artifact data.");
  });

  it("blocks evaluation when screen state is not ready for artifact OCR", () => {
    const assessment = assessScannerResultTrust(
      scannerResult({
        mode: "screen-classification",
        artifact: null,
        screenState: {
          code: "artifact-bag-grid",
          readyForArtifactOcr: false,
          confidence: 0.92,
          message: "Artifact inventory grid detected, but no artifact detail panel is visible."
        }
      })
    );

    expect(assessment.canEvaluate).toBe(false);
    expect(assessment.blockingReasons).toEqual(["Artifact inventory grid detected, but no artifact detail panel is visible."]);
    expect(assessment.warningMessages).toEqual([]);
  });

  it("keeps game-not-found guidance concise despite zero confidence fields", () => {
    const assessment = assessScannerResultTrust(
      scannerResult({
        mode: "region-classification",
        artifact: null,
        confidence: {
          setKey: 0,
          slotKey: 0,
          mainStatKey: 0,
          substats: 0
        },
        screenState: {
          code: "game-not-found",
          readyForArtifactOcr: false,
          confidence: 0,
          message: "Waiting for Genshin."
        },
        error: "Genshin process was not found."
      })
    );

    expect(assessment).toMatchObject({
      canEvaluate: false,
      reviewRecommended: false,
      blockingReasons: ["Waiting for Genshin."],
      warningMessages: []
    });
  });

  it("does not block evaluation when optional set identity confidence is low", () => {
    const assessment = assessScannerResultTrust(
      scannerResult({
        confidence: {
          setKey: 0.2,
          slotKey: 0.95,
          mainStatKey: 0.48,
          substats: 0.8
        }
      })
    );

    expect(assessment.canEvaluate).toBe(true);
    expect(assessment.blockingReasons).toEqual([]);
    expect(assessment.warningMessages).toContain("Set name confidence is 20.0%. Upgrade-roll analysis can still continue.");
  });

  it("allows evaluation when set key is unknown", () => {
    const result = scannerResult({
      confidence: {
        setKey: 0,
        slotKey: 0.95,
        mainStatKey: 0.95,
        level: 0.95,
        substats: 0.9
      },
      artifact: {
        slotKey: "sands",
        rarity: 5,
        level: 0,
        mainStatKey: "hp_",
        substats: [{ key: "critRate_", value: 3.1 }],
        unactivatedSubstats: []
      },
      optionalWarnings: ["Set name was not recognized. Upgrade-roll analysis can still continue."]
    });

    const assessment = assessScannerResultTrust(result);

    expect(assessment.canEvaluate).toBe(true);
    expect(assessment.warningMessages).toContain("Set name was not recognized. Upgrade-roll analysis can still continue.");
  });

  it("allows a 2-star +0 artifact with no visible substats", () => {
    const assessment = assessScannerResultTrust(
      scannerResult({
        confidence: {
          setKey: 0.93,
          slotKey: 0.95,
          mainStatKey: 0.95,
          level: 0.7,
          substats: 0
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
        }
      })
    );

    expect(assessment.canEvaluate).toBe(true);
    expect(assessment.blockingReasons).toEqual([]);
    expect(assessment.warningMessages.some((message) => message.includes("substats"))).toBe(false);
  });
});
